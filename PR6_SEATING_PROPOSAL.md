# PR6 — Multi-event seating: proposal (Phase 1)

*Research and design only. No implementation code has been written. This
stops here for La's review (and her advisor's) before any build starts.*

---

## The problem, restated

Seating today (`src/pages/Seating.jsx`) assumes exactly one event. `Table`
and `VenueAsset` records are a flat, ungrouped pool per wedding — there is
no field on either entity that says "this table belongs to the welcome
drinks, not the reception." The guest pool shown while seating is the
*entire* guest list, and the unassigned counter is computed against the
entire guest list too. A wedding with a reception **and** a welcome
drinks **and** a recovery brunch — increasingly common — has nowhere to
keep those as separate charts.

---

## 1. Competitor research

I looked at how three wedding-specific tools and one seating-chart
specialist category handle this, plus general complaint patterns.

**Zola** — confirmed one-chart-per-event. Their table setup flow makes you
explicitly **"choose the event this seating chart will be used for — these
are the events your guests are invited to."** Two things worth taking
directly: (a) a chart is scoped to one event, full stop; (b) the event
picker is filtered to events guests are actually *invited to*, not every
item on a day-of schedule — so a "hair & makeup" logistics block never
shows up asking to be seated. No copy/duplicate-chart feature found in
their docs.

**Prismm** (formerly AllSeated) — the most sophisticated of the three,
built around a "floor plan" as the core object rather than "event."
Guest RSVP status, meal choice, party size, and freeform notes are
centralized on the guest record, then guests get placed per floor plan.
Marketing implies multiple floor plans per wedding are supported, but
couple-facing details on how the guest pool differs per plan aren't
public — this is enterprise/planner-grade software and the docs are thin
on the exact couple UX.

**Joy (withjoy.com)** — deliberately the simplest: one seating tool tied
to one guest list, explicitly positioned as "a simple tool for a simple
task." No multi-event support at all. Useful as the "what we're
deliberately not being" reference for couples with just a reception —
Joy's simplicity is a real product choice, not an oversight.

**Dedicated seating-chart apps** (the "Wedding Seating Chart Planner"
category, e.g. Seat Puzzle) go further than any wedding-specific
competitor: unlimited events per plan, and explicitly **"create templates
for common floor plans to quickly reuse across venues/events."** This is
the clearest evidence that a "copy layout from another event" action is a
real, wanted pattern the moment a tool supports more than one event — it
shows up as soon as the ceiling is raised at all.

**Complaints (Reddit r/weddingplanning, review sites)** — general seating
complaints cluster around: guests placed who shouldn't have been (wrong
pool, discovered at print time); a finished chart breaking when an RSVP
changes late; and private notes-about-guests leaking on export/share.
Nothing multi-event-specific surfaced directly, but an unfiltered guest
pool per event (someone not invited to welcome drinks showing up in that
tab) is the clear multi-event flavor of the #1 complaint.

**What this means for the design** (feeds directly into §3):
1. Scope each chart strictly to one event; populate the event picker only
   from events guests can actually be invited to (`getWeddingEvents()`,
   not the day-of `Schedule` — see §2, this distinction matters).
2. Filter the guest pool per tab to guests actually invited (and by
   default, attending) *that specific event* — this is the single most
   consequential decision in the whole feature.
3. Add a "copy layout from [event]" action — validated by the dedicated
   category as the natural next feature past a single event.
4. Surface RSVP status, plus-ones, meal choice, and dietary info directly
   in the per-event guest pool, matching Guest list, not a trip back to
   another page.
5. Make the unassigned count and guest pool live off *that event's*
   attending list, so a late RSVP change is visible in the tab
   immediately, not discovered at export.

---

## 2. Our data model today (grounded in code, not assumption)

One correction to how the ask described this: **events are not in the
`Schedule` entity.** I want to flag this clearly since it changes where
the seating tabs actually pull from.

| Thing | Where it actually lives |
|---|---|
| Invitable "events" (Ceremony, Reception, + any custom pre/post-wedding events) | `WeddingDetails.mainCeremony` / `.reception` (fixed) + `.preWeddingEvents[]` / `.postWeddingEvents[]` (custom), each with a **stable `event_id`** — assembled by `getWeddingEvents(weddingDetails)` in `src/lib/weddingEvents.js` |
| Per-guest, per-event RSVP | `Guest.event_responses[]` — `{ event_id, invited, status: pending\|yes\|no, meal_choice, plus_ones, plus_one_names, responded_at }`, keyed by the `event_id` above (`src/lib/weddingEvents.js`'s `getGuestEventResponse()`/`toggleEventInvite()`) |
| Day-of run sheet (Rehearsal, Hair & makeup, Photography, Ceremony, Reception, After-party…) | The separate `Schedule` entity (PR5's Recent activity work touched this) — **not** guest-invitable, no RSVP concept, a different kind of "event" entirely (logistics timeline, not an invitation) |
| Current seating chart | `Table` — flat, no grouping field. `assigned_guests: [{ seat_index, guest_id }]` is the **sole source of truth** for who's seated where (`src/lib/tableAssignment.js`). `Guest.table_assignment` is a **denormalized display-only cache string**, written only through that one module, read by `DailyUpdate.jsx`, `avaContext.js`, `GuestList.jsx`'s Table column, `ImportGuestModal.jsx`/`GuestForm.jsx`, and the guest CSV export — none of these have any concept of "which event" today. |
| Venue layout markers (dance floor, bar, stage, DJ booth, entrance, bridal table, toilets) | `VenueAsset` — also flat, no grouping field |

This means `getWeddingEvents(weddingDetails)` — the exact same event list
the Guest list's per-event filter already uses — is the correct, only
correct source for seating's event tabs. It naturally excludes
`Schedule`-only logistics blocks, matching Zola's pattern in §1 for free.

### The guest list's existing per-event presentation (what "match it" means concretely)

`Guests.jsx` + `GuestList.jsx` already do exactly what La is asking
Seating to mirror:
- An event filter (currently a pill-style `Select`, only shown when
  `weddingEvents.length > 1`) that swaps the stat strip to
  event-scoped counts: *Invited to Reception / Yes / No / Pending*.
- Per-guest, the "Status" column collapses to a single `EventChip` for
  the active event — a coloured pill: green "· yes", red "· no", amber
  "· awaiting", or a dashed "not invited" chip — instead of the full
  multi-event chip row.
- `filteredGuests` excludes anyone not `invited` to the active event.

Seating's current guest panel, by contrast, hand-rolls its own bare
initials-circle + name + dietary text + tag pills — no RSVP status, no
profile photo (it doesn't even reuse the shared `GuestAvatar` component
`GuestList.jsx` uses), no per-event meal choice. That gap is exactly what
§3 closes.

---

## 3. Proposed design

### 3.1 Which events get a seating chart (opt-in, lazily)

Not every invitable event needs assigned seating (a casual welcome-drinks
mixer might not). Rather than a buried toggle in `EventDetails.jsx`,
seating tabs are created **on demand, from inside Seating itself** — a
trailing `+ Add event` tab, matching Zola's "choose the event this chart
is for" flow. Its dropdown lists only events from `getWeddingEvents()`
that don't already have a tab. Adding a tab does nothing to the event
itself elsewhere in the app (no new `Schedule`/`WeddingDetails` field) —
it's purely "does at least one `Table` or `VenueAsset` reference this
`event_id`." An event with zero tables gets no tab; the moment the couple
adds one (or uses "copy layout," below), the tab exists.

### 3.2 Tab UI

Reuses the same inline button-tab visual language already established on
`ScheduleHub`/`Budget`/`TodoList` (`Tabs`/`TabsList`/`TabsTrigger` from
`src/components/ui/tabs.jsx` — red underline on the active tab, sentence
case labels, no new pattern invented). The migrated original chart (see
3.5) is always the first tab and can't be deleted, only renamed/added-to,
so nobody accidentally loses their only chart.

### 3.3 Guest pool per tab — mirrors the guest list, adapted for seating

Default pool = guests `invited` **and** `status === 'yes'` for the active
event (§1 recommendation #2 — you seat who's actually coming). A
secondary pill — `Attending (94)` / `Awaiting reply (12)` — lets the
couple pull in not-yet-confirmed guests early, same spirit as Guests.jsx's
filter pills, scoped down to what's relevant while seating (declined
guests are excluded outright, not just filtered — they're not coming).

Each guest row in the panel gets, reusing existing pieces rather than
inventing new ones:
- `GuestAvatar` (the same component `GuestList.jsx` uses — photo or
  initials), not Seating's current hand-rolled circle.
- The same `EventChip` used in the guest list, scoped to the active
  event — "· yes", plus-one count/names if any.
- Per-event `meal_choice` (already computed today for the guest list's
  RSVP detail row — `r.invited && r.meal_choice`) and the guest's
  dietary pill, styled like `GuestList.jsx`'s `DIETARY_COLOURS`.
- Existing tag pills (`MiniTags`, unchanged).

This directly is "guest details match the guest list" — same chip, same
avatar, same dietary colour system, not a re-skin.

### 3.4 Unassigned counter, per event

`stats.unassigned` currently counts against the whole guest list. It
becomes scoped to the active tab's attending pool (§3.3's default filter)
— fixes exactly the "does this event's chart actually cover everyone
coming" question competitors' docs gloss over (§1).

### 3.5 Existing chart migration — no couple loses work

Every existing `Table`/`VenueAsset` row gets backfilled to
`event_id: RECEPTION_EVENT_ID` (the stable `'reception'` constant already
exported from `src/lib/weddingEvents.js` — not a new id scheme). The
Reception tab is what every current couple sees on first load post-ship,
pixel-identical to today's single chart, just now living under a tab
labelled "Reception." This is a one-time, all-users backfill script — the
same shape as the precedent set by
`scripts/migrate-photographer-to-vendor.mjs` (PR3b). It runs once,
against every wedding, not just the seed account.

### 3.6 "Copy layout from [event]" action

Available per tab once at least one *other* tab has tables. Duplicates
the source event's `Table` records (name, capacity, shape, x/y, rotation)
and `VenueAsset` records into the active event — **without** copying
`assigned_guests`, since the two events' guest pools usually differ
(reception vs. recovery brunch). Non-destructive by default: if the
active tab already has tables, copying *adds* the source layout
alongside them (duplicate names get a "(copy)" suffix) rather than
replacing — avoids a "copy layout" click accidentally wiping in-progress
work. This is the single feature every dedicated multi-event seating tool
in §1 converges on once >1 event exists.

### 3.7 Schema changes

**`base44/entities/Table.jsonc`** — add:
```jsonc
"event_id": {
  "type": "string",
  "description": "Stable id of the WeddingDetails event (see src/lib/weddingEvents.js's getWeddingEvents()) this table's chart belongs to. Existing rows backfilled to RECEPTION_EVENT_ID ('reception') — see migration precedent in migrate-photographer-to-vendor.mjs."
}
```

**`base44/entities/VenueAsset.jsonc`** — same addition, same backfill
value, so a venue-layout marker (dance floor, bar, etc.) is scoped the
same way a table is. Copying a layout (3.6) copies both together.

**`Guest.table_assignment` stays as-is, scope unchanged.** It remains a
display-only cache of "table at the guest's *main* (Reception) event,"
which is genuinely all several existing read-only consumers
(`DailyUpdate.jsx`, `avaContext.js`, the guest CSV export,
`GuestList.jsx`'s Table column) mean by "table" today — none of them
carry any event context to disambiguate a second event's table anyway.
Seating's own multi-event views read `Table.assigned_guests` filtered by
`event_id` directly (exactly how Seating already treats `Table` as the
sole source of truth today — `table_assignment` was always a cache, never
authoritative). A guest's welcome-drinks table is visible inside the
Welcome drinks tab; it just isn't echoed into that one legacy string
field. If those other surfaces want per-event table awareness later,
that's a clean, separable follow-up — not a blocker here.

**Drift-guard housekeeping** (per CLAUDE.md — declare before release,
update the snapshot):
- `scripts/lib/schemaDropScan.mjs`'s `Table` entry gains `event_id:1`;
  same for `VenueAsset`.
- `tests/persistence/schema-drift-guard.mjs`'s `GUARDED_ENTITIES` list
  currently does **not** include `Table` or `VenueAsset` at all (only
  `WeddingDetails, Guest, Note, Music, Notification, Vendor`). I'd add
  both — this field is exactly the kind of "silently drops, only a
  persistence test catches it" risk that guard exists for, and a new
  event-scoping field failing to persist would quietly re-merge every
  wedding's charts back into one pool.
- `scripts/test-persistence.mjs` gets a round-trip case: write
  `event_id` on a Table, reload fresh, assert not undefined.

### 3.8 Seed updates

`scripts/seed-demo-data.mjs`'s existing "Section 2: Table assignments"
becomes the Reception seed (tagged `event_id: RECEPTION_EVENT_ID`,
otherwise unchanged — 10-seat tables, round-robin over attending guests).
A new, smaller section seeds a second event — Welcome drinks or Recovery
brunch, whichever John & Suzanne's `preWeddingEvents`/`postWeddingEvents`
already contains — with 2–3 tables and a partial (not full) guest
assignment, so the demo account visibly demonstrates: two tabs, two
independent unassigned counts, and a non-trivial "copy layout" starting
point.

---

## 4. Layout sketch

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Seating                                    Plan tables for every event    │
├──────────────────────────────────────────────────────────────────────────┤
│ Tables 8      Seats 64      Attending 121      Unassigned 12   (90% seated)│
├──────────────────────────────────────────────────────────────────────────┤
│  Reception ●    Welcome drinks    Recovery brunch    [+ Add event ▾]      │
├─────────────────────────────────────────────────┬────────────────────────┤
│                                                    │ Copy layout from ▾   │
│                                                    │  Welcome drinks       │
│              [ canvas — tables + venue assets,     ├────────────────────────┤
│                drag/zoom, unchanged from today,     │ Attending 94 (12)  │
│                just scoped to this tab's Tables ]   │ Awaiting reply     │
│                                                    ├────────────────────────┤
│                                                    │ 🔍 Search guests…     │
│                                                    ├────────────────────────┤
│                                                    │ ── Unassigned (12) ── │
│                                                    │ (●) Min Hussein       │
│                                                    │     Reception · yes   │
│                                                    │     +1 · vegetarian   │
│                                                    │ (●) Samuel Munteanu   │
│                                                    │     Reception · yes   │
└─────────────────────────────────────────────────┴────────────────────────┘
```

Tab bar sits above the existing two-pane canvas/panel layout, unchanged
otherwise. Switching tabs swaps which `Table`/`VenueAsset` rows the
canvas renders and which guests the right panel pool contains — the
canvas interaction model itself (drag tables, click a seat, assign from
the panel) is untouched.

---

## Open questions for La / her advisor

1. **Default attending-only pool (§3.3)** — agree, or should "awaiting
   reply" guests be included by default too, given couples often start
   seating before every RSVP is in?
2. **`Guest.table_assignment` scope (§3.7)** — comfortable leaving it
   Reception-only for now, with other events' tables visible only inside
   Seating itself, deferring full per-event awareness on those other
   surfaces to a later PR?
3. **"Copy layout" destructiveness (§3.6)** — additive-by-default (never
   silently replaces) is the safer call; confirm that's the right
   default rather than a straight overwrite with a warning.
4. Anything from the competitor patterns in §1 that's a deliberate
   non-goal for openinvite (e.g. Prismm's 3D floor plans) — worth
   stating explicitly so it doesn't come back as scope creep later.

---

**Nothing has been built.** Once this is approved, Phase 2 is: schema +
migration + seed + UI, full suite green, verify the existing chart
survived the migration intact on John & Suzanne's account, then stop
again on preview for visual approval before merging — same as PR5.
