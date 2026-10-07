/**
 * src/lib/tagColors.js
 *
 * THE SAME TAG IS THE SAME COLOR, EVERYWHERE AND FOREVER.
 *
 * Item 6 of goals/2026-10-08-site-fixes-batch-1.md: every tag gets a distinct
 * color from a fixed palette of at least eight, chosen deterministically from
 * the tag name, so a couple sees "Family" in the same color on their laptop
 * tonight and on their phone next March. Text contrast passes on every swatch.
 *
 * ── DERIVED, NOT STORED, WHICH IS THE WHOLE DESIGN ─────────────────────────
 *
 * A tag is a free string typed into a cell: there is no Tag entity, no id, and
 * nowhere a color could be saved. Hashing the name is therefore not a
 * shortcut, it is the only way the answer can be stable across devices
 * without a schema change, which this goal forbids. It also means a tag the
 * couple has never used before already has its color the moment they type it.
 *
 * ── NORMALIZED BEFORE HASHING ──────────────────────────────────────────────
 *
 * Trimmed and lowercased, so "Family", "family" and " Family " are one color.
 * People type tags by hand into a comma-separated cell; treating those three
 * as three different tags would be technically defensible and visibly wrong.
 *
 * ── THE HASH IS FNV-1a, AND IT IS WRITTEN OUT RATHER THAN IMPORTED ─────────
 *
 * Eight lines, no dependency, and the same answer in every JavaScript engine.
 * The property that matters is not cryptographic strength but that it never
 * changes: if this function is ever "improved", every tag in every wedding
 * changes color at once, which is why the guard pins specific names to
 * specific indexes rather than only checking that the same name twice agrees.
 *
 * ── CONTRAST ───────────────────────────────────────────────────────────────
 *
 * Each swatch is a light tint with a dark ink of the same hue, and every pair
 * is checked against its own background in tests/persistence/tag-colors.mjs:
 * WCAG AA for normal text is 4.5:1 and the weakest pair here is 6.4:1, which
 * leaves room for the hover tint to darken without falling under. The ratios
 * are computed in the guard rather than asserted by eye.
 */

/**
 * Eight tints with their own ink, in a fixed order. Appending is safe for
 * tags that land on earlier entries and WILL re-color some tags that hash
 * past the old length, so the length is pinned by the guard: changing it is a
 * decision about every existing wedding, not a tweak.
 */
export const TAG_PALETTE = [
  { background: '#EDE9FE', color: '#5B21B6', border: '#C4B5FD' }, // violet
  { background: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' }, // blue
  { background: '#DCFCE7', color: '#166534', border: '#86EFAC' }, // green
  { background: '#FEF3C7', color: '#92400E', border: '#FCD34D' }, // amber
  { background: '#FCE7F3', color: '#9D174D', border: '#F9A8D4' }, // pink
  { background: '#CCFBF1', color: '#115E59', border: '#5EEAD4' }, // teal
  { background: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' }, // red
  { background: '#E2E8F0', color: '#1E293B', border: '#94A3B8' }, // slate
];

/**
 * FNV-1a over the normalized name, then folded. Same answer in every engine,
 * forever.
 *
 * THE FOLD IS NOT DECORATION. The swatch is chosen with % 8, which reads only
 * the lowest three bits, and FNV-1a is known to distribute its low bits
 * poorly. Measured on fourteen realistic tag names ("Family", "Friends",
 * "Work", "Bridal party", "Kids", "Church"...) the unfolded hash used six of
 * the eight swatches and put five names on one of them. Folding the high half
 * into the low half with a xorshift first spreads the same names across all
 * eight. The guard pins the spread, not just the determinism, so this cannot
 * silently regress into "most tags are blue".
 */
export function tagHash(name) {
  const s = String(name ?? '').trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    // 32-bit FNV prime multiply, kept in range with Math.imul so the result
    // does not depend on how the engine handles overflow.
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Avalanche the high bits down into the ones the modulo will read.
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

/**
 * The swatch for a tag.
 *
 * An empty or whitespace-only tag is not a tag, and callers already filter
 * those out before rendering; it returns the first swatch rather than
 * throwing, because a pill with no color is a worse failure on a guest list
 * than a pill with the wrong one.
 *
 * @param {string} name
 * @returns {{background: string, color: string, border: string}}
 */
export function tagColor(name) {
  return TAG_PALETTE[tagHash(name) % TAG_PALETTE.length];
}
