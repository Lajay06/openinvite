# Marketing pass report — the M1–M6 box

Owner's 390px findings from the phone walkthrough of 2026-09-17. Run order
M6 → M3 → M1 → M4 → M2 (draft only) → M5, one PR at a time, prerender
snapshots in the same PR, never merged red, product-lane merges waited for.
Every verdict below is a measurement on a rendered page, not a screenshot
read by eye.

## M6 — Contact stacks on the phone

**Finding.** `/contact` was a fixed `grid-template-columns: 1fr 1fr` at every
width: at 390 that is a 195px form beside a 195px photo.

**Change.** `src/pages/Contact.jsx`: the shell, form column and photo column
take classes driven by a scoped `<style>` block (the Ava.jsx idiom). Stacked
by default; the two-column, 100vh grid and the column divider come in at
`min-width: 1024px`, the same lg break every other marketing split uses.
The phone photo panel gets `height: 60vh; min-height: 420px` so its
bottom-anchored contact details keep a definite 100% to anchor against.
CSS-only, so the prerendered snapshot is right without a hydration flip.

DOM order is unchanged: headline, form, then the photo panel with the email
addresses. "Form below the intro" is read as the headline above the form,
which keeps the page's own rule (the form starts above the fold).

**Measured** (local `vite preview` of the production build):

| viewport | form column | photo panel | inputs | stacked | horizontal scroll |
|---|---|---|---|---|---|
| 390×844 | 390 wide, y 64–747 | 390 wide, y 747–1253 | 326 | yes | none (scrollWidth 390) |
| 768×1024 | 768 wide | 768 wide, below | 676 | yes | none |
| 1440×900 | 720 wide, 836 tall | 720 wide, x 720, 836 tall | 559 | no (side by side) | none |

**Snapshot.** `prerendered/contact/index.html` body changed and is in the
PR. Features and Home regenerated with only the ScrollProgress `pulse`
opacity flipped (capture timing, not source) and were reverted.

**Gate.** prerendered-freshness ✓ (14/14 bodies match), marketing-routes
14/14, marketing-images 15 photos / 71 URLs, lint, test:ci, page-gate all 0.

**PR.** #803, merged `bae218c`. Verified on production: 390 form 390 wide with the photo panel below, 1440 side by side 720/720.

## M3 — Ava page, three phone breaks

**Findings and causes** (all at 390; desktop was fine):

- (a) Carousel: five tab buttons at `flex: 1` in one row are 78px each, so
  every label wrapped and the description clamp cut mid-word. The image
  caption was pinned at `left: 48` with a 600px maxWidth and no right inset,
  so its paragraph ran off the right edge.
- (b) "Ava learns. Ava plans. Ava delivers." pillars: `repeat(3, 1fr)` gave
  114px cards, one word per line.
- (c) "Planning with Ava vs. planning without": every row is its own
  `1fr 1fr 1fr` grid, so a long word (`Personalized`) widened a column in
  one row and not the next. That is the alternate-row misalignment, and it
  was there on desktop too, just less visible. At 390 it was also three
  114px columns.

**Change** (`src/pages/Ava.jsx`, class rules in the page's existing scoped
style block, media query at 768):

- (a) Below md the tab row is a snap-scrolling strip of 300px cards
  (`.ava-tabs` / `.ava-tab`); from md the five equal columns are unchanged.
  The strip scrolls itself to the active tab on auto-advance (never the
  page; `scrollTo` on the strip, not `scrollIntoView`; instant under
  reduced motion). The caption is inset `clamp(20px, 4vw, 48px)` on both
  sides.
- (b) `.ava-how` is one column below md, three from it; card padding
  `clamp(28px, 4vw, 40px)`.
- (c) `.ava-cmp-row` is one column below md with each cell carrying its own
  small caption ("Without Ava" / "With Ava"); the header row exists only
  from md. From md the columns are `minmax(0, 1fr)` ×3 so every row shares
  the same edges. Cell padding moved from inline into the class rules so
  the breakpoint owns it — no `!important` (the page's own comment records
  why that pattern broke the tour once).

**Measured** (production build on vite preview, guard = no clipped text,
no card under ~300px, comparison rows on one left edge):

| | 390 | 1440 |
|---|---|---|
| tab card width | 300 ×5, strip scrollWidth 1500, no label clipped | 288 ×5, no overflow |
| caption inset l / r | 20 / 20, 350 wide, not clipped | 48 / —, 600 wide |
| pillar card width | 342 ×3, headings 1 line, none clipped | 399 ×3 |
| comparison cell left edges | 25, 25, 25 on all 7 rows | 221, 554, 886 on all 7 rows |
| header row / cell captions | hidden / shown | shown / hidden |
| horizontal page scroll | none | none |

**Snapshot.** `prerendered/ava/index.html` body changed and is in the PR;
the other 13 regenerated head-only and were reverted.

**Gate.** prerendered-freshness 14/14, marketing-routes 14/14,
marketing-images 15/71, lint, test:ci, page-gate, us-english-spelling all 0.

**PR.** #805, merged `d7d97f5`. Verified on production: tabs 300 wide, pillars 342, comparison edges 25/25/25 at 390; 221/554/886 at 1440.

## M1 — Six universes, 2×3 on the phone and 3×2 on desktop

**Finding.** Home's "One aesthetic vision" block (`UniverseTeaserSection`)
showed five universes in `repeat(auto-fit, minmax(180px, 1fr))`: one row of
five on desktop, and on a phone either a single column (390) or 2·2·1 with
an orphan (430), depending on the width.

**Change.** `src/components/home/UniverseTeaserSection.jsx`: Shanghai is
the sixth card, and the grid is a fixed two columns, three from md
(`grid grid-cols-2 md:grid-cols-3`). Shanghai over London: it is the one
cool, luminous, urban tile against five warm or coastal ones; London's
rain-and-black-cab frame is mostly black and would read as a hole on the
black section. It also adds a continent to the set. Both tiles come from
the same `universeTileImage` 3:4 face-cropped CDN path as the other five.

The Universes page's own showcase is a full-bleed crossfade of the same
five (`SHOWCASE_UNIVERSE_IDS`), not a card grid, and its comment records
that leaving London out of it was a separate editorial call. Not changed;
adding a sixth there is the owner's call.

**Measured** (production build on vite preview):

| viewport | cards | card width | rows |
|---|---|---|---|
| 390 | 6 | 165 | 2 · 2 · 2 |
| 430 | 6 | 183 | 2 · 2 · 2 |
| 768 | 6 | 217 | 3 · 3 |
| 1440 | 6 | 359 | 3 · 3 |

**Snapshot.** `prerendered/index.html` body changed (three hunks: the
class, the sixth card, the grid) and is in the PR.

**Gate.** prerendered-freshness 14/14, marketing-routes 14/14, lint,
test:ci, page-gate all 0.

**PR.** #806, merged `5eb7663`. Verified on production: 6 cards, 2·2·2 at 390, 3·3 at 1440.

## M4 — Universes hero: slight scrim, owner 2026-09-17

**Finding.** The owner's quote ("…wants to plan your entire wedding") does
not appear in the codebase; the Universes hero heading is "Your universe.
One aesthetic vision for every piece of your wedding." and the instruction
names the Universes hero explicitly, so that is the target. The photo is
pale sand edge to edge with no darker region to move the heading onto.

**Measured before** (scrim method: hide the copy, sample the painted pixels
inside the heading's box, contrast of #FFF against them): 99th-percentile
backdrop 1.61:1 at 390 and 1.63:1 at 1440; lightest pixel 1.17:1 / 1.30:1;
64% of pixels under 3:1.

**Threshold search** (uniform black scrim, painted, both widths):

| scrim | p99 contrast 390 / 1440 | pixels under 3:1 |
|---|---|---|
| 0.20 | 2.52 / 2.54 | 51% / 52% |
| 0.25 | 2.86 / 2.87 | 8% / 12% |
| **0.28** | **3.08 / 3.09** | 0.8% / 0.1% |
| 0.30 | 3.27 / 3.29 | 0.5% / 0% |
| 0.35 | 3.71 / 3.74 | 0% / 0% |

0.28 is the exact minimum reaching 3:1 at the 99th percentile at both
widths. Shipped **0.30** for a small margin; the pixels still short are
specular highlights on the water. (The earlier linear-light estimate of
~0.5 was wrong: the browser composites in sRGB, which darkens more per unit
of alpha. Measured painted pixels, not the formula, decide.)

**Change.** `src/pages/Universes.jsx`: `overlay={0.3}` on the hero, with the
code comment "Universes hero: slight scrim, owner 2026-09-17" and the
numbers above. `MarketingHero` itself is untouched — `overlay` is its
existing opt-in, the same one Features uses at 0.2.

**Measured after, as shipped:** p99 3.27:1 at 390, 3.29:1 at 1440; median
3.79 / 3.70; 0.5% / 0% of pixels under 3:1.

**Snapshot.** `prerendered/universes/index.html` body changed (the overlay
div) and is in the PR. Home regenerated with only the ScrollProgress pulse
flip and was reverted.

**Gate.** prerendered-freshness 14/14, marketing-routes 14/14,
marketing-images 15/71, lint, test:ci, page-gate all 0.

**PR.** #808, merged `2a9860b`. Verified on production: p99 3.27:1 at 390, 3.29:1 at 1440.

## M2 — Features accordion, draft for owner approval

**Finding.** The accordion's first three items ("Advanced guest management",
"Smart budget tracking", "Timeline & schedule planning") restated the three
deep-dive sections directly below it, bullet for bullet. The fourth was
"Collaborative playlists" (Spotify search, guest track submissions, DJ
collaboration, music timeline).

**Draft.** `src/pages/Features.jsx` `ALL_FEATURES`, six items, none of which
the Quick start wizard, Customizable Dashboard (collaborators) or the three
deep dives already say. All music material removed. Every bullet is checked
against the product as it stands:

| item | bullets rest on |
|---|---|
| Ava, on every page | daily briefing, personalized checklist, vow drafts (Ava page); AvaChatPod on every page ("Ask Ava anything") |
| A guest suite, written for you | Ava writes welcome/story/FAQ; Stay, Transport, Experience, Good to know, Polls, custom pages in `guest-website/pages` |
| Twenty universes | 20 in the catalog ("Explore all 20 universes"); studio previews; universe swap |
| Invitations and RSVP | save the date as an invitation type (#792); per-guest link opens the site as the invited guest (#791); email and WhatsApp share (StudioShareTab); meal choices (dietaryPills); latest answer counts (#795) |
| Registry and cash funds | Registry page: "products and cash funds"; honeymoon custom gift |
| Vendors, seating and your calendar | My vendors + Marketplace ("real wedding vendors"); seating: "design your venue layout and assign guests to tables", drag state; `api/schedule.ics` subscribe feed, "Subscribe in Google Calendar" |

Two claims were trimmed during checking: Apple Calendar (the subscribe
component names only Google) and "a house" as a cash-fund example.

Copy rules checked: US English (guard passes), no em dashes, sentence-case
titles, "Ava" never "she". "Collaborators" was left out on purpose: the
Customizable Dashboard card above already covers inviting a partner or
planner and permissions.

**Measured.** Six items render at 390 and 1440 with no clipped titles and
no horizontal scroll; accordion still collapsed by default.

**Snapshot.** `prerendered/features/index.html` body changed (seven hunks)
and is in the PR.

**PR.** #811, merged `10a781b4` (2026-09-18) after the owner's copy
approval. Verified live 2026-09-19 (prior session). The one bullet dropped
from it came back as #816, below, once the feed it describes worked.

## M5 — Pricing end cap stacks its three buttons on the phone

**Finding.** At 390 the three pills in the shared end-cap row wrapped 2 + 1:
"Start free trial" (159) and "Get Pro" (169) side by side from x 25 to
x 365, "Get Ultra" alone beneath.

**Decision test.** Dropping to two would be a decision (which one, and all
three carry billing navigation and analytics), so the only no-decision
option was a stack. A stack moves the buttons onto different backdrop
pixels, and the end cap's 0.35 scrim was chosen against the row layout, so
the check was whether the existing scrim still holds. Measured with the
buttons hidden and the ghost button's 0.1 white fill composited in,
lightest backdrop pixel under each button at 390:

| button | today's row (production) | stacked |
|---|---|---|
| Start free trial (ghost) | 2.69:1 | 2.66:1 |
| Get Pro (solid red) | backdrop irrelevant | backdrop irrelevant |
| Get Ultra (solid amber) | backdrop irrelevant | backdrop irrelevant |

The stack lands the ghost button on the same class of backdrop as today,
so nothing about the scrim decision changes. No new decision; shipped.

**Method note for the owner, not acted on.** The same strictest-pixel
measure gives 2.69:1 for the ghost button on the row that is live now,
where the code comment records 4.81:1 for scrim 0.35. That comment's
sampling was evidently less strict (a percentile, or the glyph area only).
Whether the ghost button meets 4.5:1 today is a separate question from
this item and is left as is.

**Change.** `src/pages/Pricing.jsx`: the three end-cap buttons carry
`className="pricing-endcap-btn"`, and a page-scoped rule below 768 gives
each `flex: 0 0 100%; max-width: 320px`, so the shared row stacks them,
centered. Pricing-only; `MarketingEndCap` is untouched and every other
page has one button there.

**Measured.** 390: three rows, each 320 wide at x 35, tops 275 / 338 / 399.
1440: one row, unchanged (159 / 169 / 178 wide at x 455 / 626 / 807).

**Snapshot.** `prerendered/pricing/index.html` body changed and is in the
PR.

**PR.** #812, merged `cc3011b`. Verified on production: three rows of 320 at 390, one row at 1440.

## Slotted between box items

**Auth carousel slide 2** (owner, standalone): `src/components/AuthLayout.jsx`
`CAROUSEL_IMAGES[1]` → `hf_20260917_162932_…_cjv7wi`. Verified on the
preview and on production: slide 2 on /login and /register at 1440 paints
the new photo in the 720×836 panel, 0 px cropped horizontally, 355 px
top and bottom of the 2048-tall master, both subjects in frame. The
freshness guard did not ask for a regeneration, so none. PR #810, merged
`b5ce14d`.

## Closing (updated 2026-09-20)

All six box items merged and verified on openinvite.com.au (M6 #803, M3
#805, M1 #806, M4 #808, M2 #811, M5 #812) plus the auth slide swap (#810).
No product-lane PR was merged by this lane; #802 landed mid-run and every
branch was rebased onto it before merging. Every PR carried its
regenerated prerendered snapshot (body diffs only) and merged with Build
& test green.

The two open questions from the first closing were both answered by the
owner and shipped as the three closing items, verified live 2026-09-19:

1. **Universes page showcase** now walks six universes; Shanghai joins the
   crossfade. #814, merged `863a5466`.
2. **Pricing ghost button** reads on a phone: dark glass, measured. #815,
   merged `708c4a61`.
3. **The marketing pass report** closes out with PR numbers and production
   verdicts. #813, merged `ef9ace38`.

## The calendar subscribe feed (2026-09-20)

Not a box item. The Features accordion's one dropped bullet ("Subscribe to
your schedule in Google Calendar") could not ship until the thing it
describes worked on production, and it did not. Three PRs, in the order
they were understood, each merged on a five-marks line with Build & test
and the Vercel preview green.

**#817 — the feed finds the couple's wedding.** Merged `8af37819`
08:25Z. `api/schedule-feed-url.js` listed WeddingDetails with `?api_key=`,
which Base44 answers `200 []` for every entity, so the owner's Calendar
tab said no-wedding with both env vars set. Bearer plus an unwrapped
`{data:[…]}`, like every working endpoint. Same PR: every VEVENT carried
`UID:schedule-undefined@` because the allowlist pick dropped the row id
and the UID was built from it; calendar clients deduped the whole
schedule to one event — "only the after party arrived". The id now rides
along for the UID and nothing else.

*What the 404 after it was.* The owner's browser got a raw 404 on
`/api/schedule.ics?…` on www. Tokenless probes could not diagnose it: the
handler answers a blank 404 for every refusal by design ("404, never
401"), and the route IS mounted — the 404 carried `iad1` in `x-vercel-id`
and no `x-vercel-error`, where a genuinely unmapped path gets
`x-vercel-error: NOT_FOUND`. A proposed rename to `schedule-ics` was
refused on that evidence. Production runtime logs, grouped by status and
deployment only (no request paths fetched, so no token entered the
session), showed the git deploy of #817 serving a 200 and a manual
redeploy of the same commit five minutes later serving only 404s. Same
code, different environment: `CALENDAR_FEED_SECRET` had been rotated, and
every link minted under the previous secret died with it — the documented
cost of a derived token. The owner rotated once more, redeployed, and
minted fresh.

**#818 — the feed carries the schedule.** Merged `992ed134` 13:58Z.
With a correct, fresh token the feed served a valid, EMPTY calendar.
`Schedule.read` is owner-scoped and the admin key is not a superuser: an
owner-scoped list answers `200 []`, silently (BASE44_PLATFORM_NOTES.md).
The feed has no session — Google and Apple fetch it — so it can only ever
hold the admin key. Fix: the six allowlisted fields of every Schedule
row, plus the row id for the UID, are projected onto
`WeddingDetails.calendarFeed` (schema added by the owner in the Base44
chat, confirmed with `list_entity_schemas` first, mirror updated) by the
couple's own session through `/api/my-wedding-details`, from one
chokepoint (`ScheduleHub.loadItems()`, which all four hub writers end in
and which self-heals on load; Ava's `create_schedule` is the fifth
writer). `api/schedule.ics.js` reads that row, which is `read: null` and
which it already read, and never asks Schedule. Strictly narrower
exposure than opening `Schedule.read`. The guard's stub now answers `[]`
for Schedule as the platform does; the plant was red on the old handler
(0 VEVENTs) and green on the new (3). Verified live by the owner on
production: Apple Calendar subscription refreshed, only the subscribed
calendar visible, all 21 events present, correct days and times.

**#816 — the Features bullet.** Merged `7cbb6b04` 14:06Z, under MINOR,
after the owner's 21-event verification. `src/pages/Features.jsx`, one
data line: "Subscribe to your schedule in Google Calendar, so an edit
here reaches your phone on its own". Collapsed accordion content, not in
the prerendered body, so the freshness guard asked for no regeneration.

**Not verified by this lane, on purpose:** no feed URL, token, secret,
Vercel bypass link or production row was read or printed. The connector
was used for `list_entity_schemas` only.

## Open ticket — the weekly digest's owner-scoped reads (logged 2026-09-20, no fix now)

Found while diagnosing the calendar subscribe feed, which served a valid,
empty calendar to a correct token because `Schedule.read` is owner-scoped
and the admin key gets `200 []` from an owner-scoped list
(BASE44_PLATFORM_NOTES.md, "The admin key is not a superuser bypass").
The feed fix projects the schedule onto `WeddingDetails.calendarFeed`
(#818, merged `992ed134`).

`api/cron/send-weekly-digest.js` has the same shape, unfixed:

| Line | Entity | `read` RLS (list_entity_schemas, 2026-09-20) | What the cron does with it |
|---|---|---|---|
| 119 | `Table` | `{created_by_id: "{{user.id}}"}` | "finish seating" action |
| 136 | `Note` | `{created_by_id: "{{user.id}}"}` | "close out your checklist" action |
| 152 | `VendorTask` | `{created_by_id: "{{user.id}}"}` | "check in with vendors" action |

Each list comes back `[]` under the admin key, so those three digest
actions can silently never fire. The digest still sends (Guest,
RsvpResponse, WeddingDetails are `read: null`), so nothing looks broken.
Candidates, undecided: project the counts the digest needs onto the
WeddingDetails row the way the feed now does; or a hosted Base44
function with `asServiceRole` (notes, "hosted functions"), which is new
infrastructure. Not a marketing-lane fix; logged for the product lane.

## Flake to watch — `test:ci` FAIL inside `npm run verify`, unreproducible (2026-09-21)

Logged so it is chased next time rather than rerun past.

- **When:** shipping PR #820 (page-anchor parity), first `./scripts/ship.sh`
  run, 2026-09-21 ~00:10Z, on branch `fix/page-anchor-parity` at `43ee7abd`.
- **What:** `npm run verify` reported `npm run test:ci  FAIL`, 25/26; the
  other 25 steps passed. verify-all.mjs does not echo the step's transcript,
  so the failing assertion was never seen.
- **Immediately after:** `npm run test:ci` alone → 3216/3216. `npm run
  verify` alone → 26/26. Second `./scripts/ship.sh` → verify passed, PR
  opened. GitHub Build & test → pass. Three consecutive green runs on the
  identical tree.
- **Context that may matter:** in the minutes before the failing run, two
  `vite preview` servers (ports 4212/4213) and a detached git worktree of an
  earlier commit had just been torn down, and a temporary untracked script
  under `scripts/` had just been deleted. A guard that reads `dist/` or
  scans `scripts/` while the tree is settling is the first suspect; a
  timing-sensitive check is the second.
- **Rule:** if it appears again, capture the `test:ci` transcript
  (`npm run test:ci > log 2>&1` inside the same verify run) and chase the
  named check. Do not rerun past it a second time.

## Pass closed (2026-09-20)

Box M1–M6 shipped, the three closing items shipped, the calendar feed
fixed twice and its Features bullet shipped, all merged to main and
verified on openinvite.com.au. One open ticket remains, above, for the
product lane: the weekly digest's admin-key reads of owner-scoped
entities. No PR from this lane is open.
