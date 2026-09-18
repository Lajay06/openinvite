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

**PR.** pending below.
