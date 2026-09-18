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

**PR.** #803.

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

**PR.** opens after #803 merges (one PR at a time).

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

**PR.** opens after M3 merges.

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

**PR.** opens after M1 merges.
