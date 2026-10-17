/**
 * src/components/guest-website/layouts/markAnchor.js — WHERE A SECTION MARK
 * SITS, SHARED BY ALL TWENTY.
 *
 * Batch 2, layout parity (owner, 2026-09-17, still open on 2026-10-17): "hero
 * centered, text under it left, it all just looks off." Phase two made the body follow
 * each universe's mark, which fixed the edges inside a page but left
 * seventeen marks, and so seventeen bodies, on the left under a hero that is
 * centered in twelve of them. The owner's ask this time is parity ACROSS
 * universes: every placeholder block in the same place, aligned the same way,
 * in all twenty.
 *
 * So the anchor is no longer a per-universe property. Every mark centers on
 * the page's axis, and the body follows it exactly as before. The ornament
 * and the kicker are untouched artwork; only their placement is shared.
 *
 * Two shapes, because the marks come in two:
 *   STACKED  ornament above or below the kicker. A column, every child on the
 *            axis. The ornaments are display:block SVGs and 100%-wide rules,
 *            so textAlign alone would leave them on the left.
 *   ROW      ornament beside the kicker. Shrunk to its content and centered as
 *            a block, so the row (icon plus words) is what sits on the axis,
 *            and its box is an honest measure of where it painted.
 *
 * Hero mastheads are not marks and are not touched here.
 * Guard: scripts/test-page-anchor-parity.mjs (every universe, one axis) and
 * tests/persistence/section-mark-anchor.mjs (every mark declares it).
 */
export const PAGE_ANCHOR = 'center';

export const STACKED_MARK_ROOT = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
};

export const ROW_MARK_ROOT = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
  width: 'fit-content', marginLeft: 'auto', marginRight: 'auto',
};
