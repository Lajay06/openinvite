# Planner experience audit

Page-by-page reconnaissance of the planner half — load, empty, and error states,
visual inconsistency, and where the orientation layer hooks in.

**Observations only. Nothing changed.** 2026-08-18, `main` @ `b3655b5`.

Covers **44 dashboard pages**, machine-scanned for state handling and then read
where the scan flagged something.

---

# Ranked — what the feel pass should touch

## 1. 🔴 `DailyUpdate` renders a failed load as a pristine empty account

`src/pages/DailyUpdate.jsx` — 599 lines, **15 `catch` blocks, 0 error toasts**.

Every data source is loaded as `getMyRecords('X').catch(() => [])`:

```js
getMyGuestsWithRsvp().catch(() => []),
getMyRecords('Budget').catch(() => []),
getMyRecords('Vendor').catch(() => []),
getMyRecords('Schedule').catch(() => []),
getMyRecords('Note').catch(() => []),
getMyWeddingDetails().then(d => d ? [d] : []).catch(() => []),
```

A total backend outage and a brand-new account produce **byte-identical UI**. The
couple sees a calm, complete "nothing here yet" — on the page the sidebar lists
first and most couples land on. There is no retry, no error, no signal.

This is the same lesson as the deny-only probe: a page that always looks fine
cannot tell you it is broken. Highest-impact item here, and it is a correctness
problem wearing a UX costume.

It also has **no `loading` state at all**, so there is no moment where the page
admits it doesn't know yet.

## 2. 🔴 278 text colours below the WCAG AA threshold

`CLAUDE.md` fixes four text/icon alpha tokens (`0.6` muted, `0.58` placeholder,
`0.3` disabled, `0.45` icon-only). Measured as `color:` values in `src/`:

| Alpha | Instances | Status |
|---|---|---|
| `0.6` | 588 | ✅ token — AA (~5.25:1) |
| `0.45` | 95 | ✅ token — icon-only, 3:1 |
| `0.3` | 29 | ✅ token — disabled only |
| `0.35` | **98** | ❌ ~2.4:1 |
| `0.5` | **67** | ❌ below 4.5:1 |
| `0.55` | **39** | ❌ below 4.5:1 |
| `0.25` | **34** | ❌ ~1.8:1 |
| `0.2` | **26** | ❌ |
| `0.15` | **14** | ❌ |
| `0.65`/`0.7`/`0.75` | 29 | off-token but darker, so they pass |

**278 instances of readable text below AA.** `AUDIT_2026-07.md` S13/S14 already
established that the old `0.4`/`0.3` pair only reached ~2.7:1/~2.0:1 — this is
the same defect, unfixed at 278 more sites, and `0.35` is the single worst
offender at 98.

Mechanical and safe to codemod: `0.35`/`0.5`/`0.55` → `0.6`, `0.25`/`0.2`/`0.15`
→ `0.6` where it is text a user must read, `0.3` where it is genuinely disabled.
The judgement call is per-site, so it is a supervised sweep, not a blind replace.

## 3. 🟠 135 Tailwind gray classes, and two pages breaking the header rule

| Class | Count |
|---|---|
| `text-gray-900` | 61 |
| `text-gray-600` | 48 |
| `text-gray-700` | 17 |
| `text-gray-300` | 8 |
| `text-gray-800` | 1 |

`CLAUDE.md` bans `#888` and `gray-400/500` and mandates the token palette. These
are all off-token; `text-gray-300` (8) is far below AA for text.

**`CLAUDE.md` rule violation — "Every dashboard page must use
DashboardPageHeader":**

- `src/pages/PhotoGallery.jsx` — `<h1 className="text-3xl font-bold text-gray-900">Photo Gallery</h1>`
- `src/pages/OurStory.jsx` — `<h1 className="text-5xl font-bold text-gray-900">Our Story</h1>`

Two hand-rolled headers, at **two different sizes** (`text-3xl` vs `text-5xl`),
neither matching the shared component. On a page-to-page walk these are the two
that visibly jump.

## 4. 🟠 Four distinct loading vocabularies, and four pages with none

The scan found no single loading idiom:

| Pattern | Where |
|---|---|
| Grey skeleton block `rgba(10,10,10,0.06)` | 19 pages |
| Centred spinner | 26 pages |
| Both, inconsistently | 14 pages |
| Full-page centred spinner with inline `@keyframes` | `GuestSuiteExperience` |

**No loading state at all:** `DailyUpdate` (599 lines), `Music` (607),
`VendorMarketplace` (544), `ScheduleHub` (296).

The stat-strip skeleton is now hand-rolled inline at **16 call sites** (PR #484
added 8 of them, deliberately matching the existing 8 rather than inventing a
17th pattern mid-batch). Extracting one `<StatSkeleton>` is the obvious first
move of a feel pass and was explicitly deferred to here.

`GuestSuiteExperience.jsx` injects a `<style>{'@keyframes spin'}</style>` inline
on every render — a fifth spinner implementation, in a 33-line file.

## 5. 🟡 Failures that reach nobody

**Silent `catch {}` — 9 blocks:** `DailyUpdate` (5), `Polls`, `Checklist`,
`GuestSuiteAccommodation`, `GuestSuiteTransport`.

**Zero error toasts despite doing async work — 8 pages:** `DailyUpdate`,
`GuestSuiteSchedule`, `GuestSuiteRegistry`, `GuestSuiteLiveStream`,
`GuestSuiteExperience`, `GuestSuitePolls`, `Considerations`, `Checklist`.

`GuestSuiteExperience` logs its load failure to `console.error` and renders as
though the load succeeded.

Meanwhile the best-behaved pages already have the right pattern —
`Accommodation`, `Transport`, `FoodBeverage` and others use
`toast.error('Failed to load — please refresh and try again.')`. **17 of 44
pages** offer a retry affordance; the fix is propagating what already exists,
not designing something new.

## 6. 🟡 Empty states are present but unaudited for tone

30 of 44 pages have something matching an empty-state pattern; 14 do not:
`Dashboard`, `Schedule`, `Styling`, `Photography`, `WeddingFavours`,
`VendorMarketplace`, `CeremonyDetails`, `Transport`, `EmergencyContact`,
`Registry`, `GuestSuiteExperience`, `Honeymoon`, `Considerations`, `ScheduleHub`,
`Calendar`.

Most of those are form pages where an empty form is a reasonable empty state.
The scan cannot judge tone or whether the empty state suggests a next action —
that needs a human walk-through, and it is the part of "Nespresso-grade" a grep
cannot reach. Flagged as the one item here needing eyes, not tooling.

## 7. 🟢 Page-weight outliers worth a structural look

`Seating` 1525 · `EventDetails` 1021 · `Guests` 938 · `Considerations` 932 ·
`TodoList` 853.

Not defects. But `Seating` at 1525 lines with 18 error toasts and 15 catches is
where inconsistency will accumulate fastest, and `TodoList` is the page whose
kanban was silently broken until yesterday.

---

# Where the orientation layer hooks in

`src/lib/setupJourney.js` (129 lines) is already the single source of truth for
the empty-account → launched-wedding path, and it is well built: every
`isComplete()` reads persisted data, so a step finished from onboarding, a
dashboard page, or Ava Studio reflects everywhere with no sync step.

**Seven steps, routing to five destinations:**

| Route | Steps | Ultra-gated |
|---|---|---|
| `/studio/guest-suite` | 3 (incl. `/share`) | yes |
| `/Guests?ava_focus=guests` | 1 | no |
| `/Budget?ava_focus=budget` | 1 | no |
| `/Vendors?ava_focus=vendors` | 1 | no |
| `/event-details?ava_focus=day` | 1 | no |

**The hook already exists**: the `?ava_focus=` parameter, consumed by
`useAvaFocus`. The file's own header notes the limitation — `route` is
"guide-and-route only… does not deep-link to a specific field", with the
highlight mechanism marked as future work.

**Observations for the orientation layer:**

1. **Only 5 of 44 pages are reachable from the journey.** The other 39 have no
   orientation story — a couple who wanders into `Beauty` or `Considerations`
   gets no sense of where it sits or whether it matters yet.
2. **The three Ultra-gated steps all point at one destination**
   (`/studio/guest-suite`), so a free-plan couple sees three of seven steps
   pointing somewhere they cannot go. Worth checking what that renders as.
3. **`DailyUpdate` is the natural home for orientation and is the weakest page**
   (item 1). It is where "what should I do next" belongs, and it currently
   cannot distinguish an outage from a fresh account — so it would happily
   render an orientation layer built on silently-empty data.

Fixing item 1 is a prerequisite for the orientation layer, not merely adjacent
to it.

---

# Suggested sequence

| # | Item | Type | Risk |
|---|---|---|---|
| 1 | `DailyUpdate` load-failure vs empty | correctness | low, isolated |
| 2 | `StatSkeleton` extraction (16 sites) | consistency | low, mechanical |
| 3 | `PhotoGallery` + `OurStory` → `DashboardPageHeader` | rule compliance | low |
| 4 | 278 sub-AA text colours | accessibility | medium — supervised, per-site |
| 5 | 135 Tailwind gray classes | token drift | medium — same sweep as 4 |
| 6 | Error toasts + retry on the 8 silent pages | correctness | low, pattern exists |
| 7 | Loading-idiom convergence | consistency | medium |
| 8 | Empty-state tone walk-through | craft | needs eyes, not tooling |

1–3 are safe to batch. 4–5 belong together as one supervised sweep. 8 is the
one item that cannot be delegated to a scan.
