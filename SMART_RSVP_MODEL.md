# Openinvite — Smart RSVP (D1) Data Model

*Build-ready spec for per-event RSVP — roadmap D1, the #1 competitive table-stakes feature. Resolves the roadmap's open question: "how per-event invites map to the existing schedule/guest entities." Written to be reviewed cold on return, then turned into one-PR-per-slice prompts. Nothing here has touched live.*

---

## The one decision (resolved)

**Question:** Where do per-event invitations and responses live, given events are embedded in WeddingDetails and RSVP data already lives on the Guest entity?

**Answer — evolve the Guest entity with an `event_responses` array now; design it so it maps cleanly to a relational join table at the Supabase migration.** Do *not* introduce a separate Invitation/RSVP entity pre-PMF.

**Why this over a join entity:**
- It matches the architecture you already have — RSVP data is *already* on Guest (`song_request`, `rsvp_note`, `poll_votes`). This is continuous with that, not a new pattern.
- Base44 is document-oriented. A guest×event join table means N extra records per guest and multi-record reads/writes per RSVP submission — more surface for the silent-drop and stale-state bugs that have cost us days.
- A guest's full RSVP (all events) loads in one Guest read — simplest possible RSVPPage and dashboard query.
- It still maps cleanly forward: each `event_responses` entry becomes one row in an `rsvp` join table on Supabase (see *Supabase-forward* below). We lose nothing by waiting.

**The trade-off, stated honestly:** querying "everyone coming to the welcome drinks" means scanning all Guests and filtering the array, rather than querying a join table by `event_id`. At your guest-list scale (tens to low hundreds) this is a non-issue. It would only matter at thousands of guests per wedding, which is not your product.

---

## Current state (grounded, verify line 1 on return)

| Thing | What it is today |
|---|---|
| `Guest` entity | One record per guest. Holds contact info + whole-wedding RSVP fields: `song_request` (string), `rsvp_note` (string), `poll_votes` (object/array). **This is the RSVP record.** |
| Events | An **array embedded inside the `WeddingDetails` record** — not their own entity. Items are things like Ceremony, Reception, Welcome, Recovery Brunch. |
| `RSVPPage.jsx` | Public guest-facing RSVP form. Writes to the Guest entity. |
| RSVP today | **One RSVP per guest, whole-wedding** — a guest is "in" or "out" for the wedding as a whole. No per-event concept. |
| Plan/subscription | On the `User` entity (`plan`, `planActivatedAt`) — unrelated, noted so it's not confused with guest data. |

> **Assumptions to confirm before building (don't build blind):**
> 1. There is **no household/party grouping** entity yet (needed for +1s and families responding together). Confirm — if one exists, reuse it.
> 2. The embedded events in WeddingDetails **do not yet have stable IDs** (likely referenced by array index). This must be fixed first — see PR 1.
> 3. Exact current Guest fields beyond the three RSVP ones above — pull the live schema and reconcile before adding fields.

---

## What becomes per-event vs what stays wedding-level

A key insight: **not everything should fragment to per-event.** Forcing it all per-event is over-engineering and worsens the guest experience.

**Per-event (moves into `event_responses`):**
- Invited? (is this guest invited to *this* event)
- Attendance status (yes / no / pending)
- Meal choice (menus differ per event)
- Plus-one count / plus-one names (a guest may get +1 to the reception but not the welcome drinks)

**Wedding-level (stays on the Guest record, as today):**
- Contact info, household link
- `song_request`, `rsvp_note`, `poll_votes` — one song request, one note, one set of poll answers. These do **not** become per-event. Leave them exactly as they are.
- Overall dietary restrictions / allergies (a guest's allergy is constant across events). *Optional:* allow a per-event meal override while keeping the wedding-level dietary flag as the source of truth.

This split is the spine of the whole model. Hold it.

---

## Entity shapes

### Guest (additions only — keep all existing fields)

```
Guest {
  // ... all existing fields unchanged (name, contact, song_request,
  //     rsvp_note, poll_votes, etc.) ...

  household_id: string | null        // links guests who respond together (see Households)
  dietary: string | null             // wedding-level allergies/restrictions

  event_responses: [                 // NEW — the per-event matrix. Array of objects.
    {
      event_id: string               // STABLE id of a WeddingDetails event (NOT array index)
      invited: boolean               // is this guest invited to this event
      status: "pending" | "yes" | "no"
      meal_choice: string | null     // option id/label for this event's menu
      plus_ones: number              // count granted/used for this event
      plus_one_names: string[] | null
      responded_at: string | null    // ISO timestamp
    }
  ]
}
```

> **Base44 silent-drop warning:** `event_responses` is a nested array of objects. Base44 drops unregistered fields, **including nested ones**. The earlier time/dress-code bug was this exact failure mode at the embedded level. Register `event_responses` *and* its object shape explicitly. Round-trip test every nested field (write → read fresh → assert not undefined) and add it to `scripts/test-persistence.mjs`.

### WeddingDetails events (give each a stable id)

Each embedded event needs a stable `event_id` that survives reordering/editing — the chronological sort we just shipped reorders the array, so **array index is not a safe reference.** `event_responses[].event_id` points at this.

```
WeddingDetails.events: [
  {
    event_id: string        // NEW — stable, generated once on create (uuid/nanoid), never reused
    name, date, start_time, end_time, dress_code, venue, ...   // existing
  }
]
```

### Household / Party (new — only if confirmed not to exist)

For +1s and families responding in one go.

```
Household {
  id: string
  label: string | null            // e.g. "The Smith family"
  primary_guest_id: string        // who receives/manages the invite
  // members are Guests with household_id === this.id
}
```

> If you'd rather not add an entity pre-PMF, a lighter version is a `household_id` string on Guest with **no** Household entity — guests sharing the same id are a household, the lowest member or a flag marks the primary. Cheaper, slightly less explicit. Either is fine; pick on return.

---

## Per-event invitation mechanics (the open question, resolved)

**Inviting:** On the couple's guest dashboard, each guest shows the event list with checkboxes — tick which events they're invited to. Ticking creates/sets an `event_responses` entry with `invited: true, status: "pending"`. Default a new guest to invited for "main" events, off for additional — couple adjusts.

**Guest responding (`RSVPPage.jsx`):** The guest sees **only the events they're invited to** (`invited: true`). For each, they pick yes/no, meal, and +1s where granted. Submitting writes back the matching `event_responses` entries on their Guest record. Wedding-level fields (song request, note) render once, not per event.

**Couple viewing:** Per-event counts (e.g. "Reception: 84 yes / 12 no / 20 pending"), computed by scanning Guests and filtering `event_responses` by `event_id`. Meal totals per event for catering.

**Reminders (auto, WithJoy parity):** A guest is a "non-responder" for an event if `invited && status === "pending"`. Reminder targets the guest for their pending events. (Sending mechanism = Resend, already integrated. Scheduling is a later slice, not PR 1.)

**Custom per-event questions (WithJoy parity, later slice):** add an optional `questions` array to each WeddingDetails event and a parallel `answers` map inside the matching `event_responses` entry. Deferred — get the core matrix working first.

---

## Connection to per-guest privacy / section visibility

The roadmap flags per-guest visibility as a WithJoy strength worth taking. **It falls out of this model for free, partly.** `invited` already gates which events a guest sees on the RSVP form. The same `event_responses` (or a small `visible_sections` field on Guest) can gate which *guest-site sections* a guest sees — e.g. don't show the after-party section to the daytime-only crowd. Build the RSVP matrix first; visibility is a natural follow-on reading the same data, not a separate system. Worth designing the two together so they share the invited/visibility source of truth.

---

## Base44 gotchas baked in (carry into every prompt)

- **Register `event_responses` and its nested object shape** — nested fields silent-drop otherwise. Round-trip test every field.
- **Stable `event_id`, never array index** — the chronological sort reorders the array; index references would corrupt on reorder.
- **Save pattern:** compute next `event_responses` → setState → persist as a *separate* side-effect using the computed value. Never persist inside the setState updater. (This is the exact pattern that fixed the event-dialog save.)
- **Verify on live/preview**, hard-reload, watch the Network tab for the Guest write returning 2xx — optimistic in-session render can mask a silent drop.
- **Extend `scripts/test-persistence.mjs`** with the new fields for regression cover, as we did for the RSVP three.

---

## Supabase-forward (post-PMF migration)

`event_responses` is deliberately shaped to become a relational join with zero redesign:

```
rsvp ( guest_id, event_id, invited, status, meal_choice, plus_ones, responded_at )
   PRIMARY KEY (guest_id, event_id)
events ( event_id, wedding_id, name, date, start_time, ... )   // promoted out of WeddingDetails
households ( id, wedding_id, label, primary_guest_id )
```

Each array entry → one `rsvp` row. Embedded WeddingDetails events → an `events` table keyed by the same `event_id` we're assigning now. The stable id work in PR 1 is what makes the future migration mechanical instead of a rewrite.

---

## Return runway — first PRs (sequenced, one slice each, verify live)

1. **Stable event IDs.** Add `event_id` to each embedded WeddingDetails event; backfill existing events once; update the events list, edit dialog, sort, and Celebration page to key off `event_id` not index. *Pure plumbing, no behaviour change — but it's the foundation; nothing per-event is safe until events have stable ids.* Verify: reorder events, confirm references hold.
2. **Register `event_responses` on Guest.** Schema + nested shape + round-trip test + `test-persistence.mjs` cover. No UI yet. Verify: write a full matrix to a test Guest, hard-reload, all nested fields persist.
3. **Couple-side per-event invite UI.** Guest dashboard: per-guest event checkboxes writing `invited`/`status`. Verify: invite a guest to a subset, reload, persists.
4. **Guest-side per-event RSVP.** `RSVPPage.jsx`: show only invited events, capture yes/no + meal + plus-ones per event, write back. Keep wedding-level fields (song/note/polls) as-is. Verify: respond as a test guest, hard-reload, couple dashboard reflects it.
5. *(Later)* Per-event counts/meal totals dashboard → auto-reminders → custom per-event questions → per-guest section visibility.

---

## Verify-first checklist for day one back

- [ ] Pull live Guest schema; reconcile against the additions above.
- [ ] Confirm whether a household/party grouping already exists.
- [ ] Confirm embedded events currently lack stable ids (assume yes → PR 1).
- [ ] Confirm `RSVPPage.jsx` write path and where the couple reads RSVPs today.
- [ ] Re-confirm the five dangling pre-holiday items were merged or cleanly parked (Celebration redesign, save fix, time picker, Overview card, sort).

---

*Status: model agreed on paper, grounded in real entities. Next action on return — PR 1 (stable event IDs). Update UNIVERSE_ROADMAP.md D1 from "open question" to "model resolved, building."*
