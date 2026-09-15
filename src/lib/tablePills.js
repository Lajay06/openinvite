/**
 * src/lib/tablePills.js — THE ROW PILL VOCABULARY (R37).
 *
 * The guest list's own `pillBase`, moved so a Type on the schedule reads as
 * the same object as a Category here rather than as a badge of its own
 * invention. Plain .js rather than living beside the component, because a
 * guard running under Node cannot import a .jsx file — the reason four other
 * modules in this repo were split the same way.
 */
export const PILL_BASE = {
  display: 'inline-block',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 10,
  fontWeight: 700,
  padding: '3px 9px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
};

/** The default for a dimension with no colour of its own: outlined, quiet. */
export const OUTLINE_PILL = {
  background: 'transparent',
  color: 'rgba(10,10,10,0.6)',
  border: '1px solid rgba(10,10,10,0.15)',
};


/**
 * CELL TYPOGRAPHY (R37) — the guest list's, so a schedule row and a guest row
 * are the same object at a glance.
 *
 * The guest list never set a font-size on a cell: it inherits the ui/table
 * default, and only ever varies WEIGHT for the primary column and COLOUR for
 * the secondary ones. The schedule's first pass set 14px inline on some cells
 * and left others to inherit, which is how two tables drift apart while both
 * "use the same component". These three are the whole vocabulary.
 */
/**
 * 13px, NOT 14. The <td> inherits 14px in both tables — which is why a
 * computed-style check on the CELL passed while the owner could see the
 * schedule was bigger. The guest list never shows text at that size: every
 * name, email and table number sits in a nested span at 13px, and the cell's
 * own 14px is never painted. Reading the leaf rather than the cell is what
 * found it, and it is what the guard reads now.
 */
export const CELL_TEXT   = { fontSize: 13, lineHeight: '20px', color: '#0A0A0A' };
export const CELL_STRONG = { ...CELL_TEXT, fontWeight: 600 };

/**
 * SECONDARY CELL — 12px, 600, muted. The guest list's email and phone.
 *
 * THE WEIGHT IS 600 AND IT IS MEASURED, not chosen. Owner: the schedule's Time
 * column "is rendering in a light weight we never use". He is right, and the
 * declaration is what misled every check: the guest list sets NO font-weight on
 * those spans, so the eye sees whatever the table paints — and every guest-list
 * leaf computes to 600 (its body carries the weight). The schedule declared
 * `fontWeight: 400` explicitly and so painted lighter than anything beside it.
 * Measured at 1440 on this build, first body row:
 *
 *   guest list  email/phone   12px / 600 / muted
 *   run sheet   Time          13px / 400 / muted     ← the light weight
 *
 * 600 IS THEREFORE THE FLOOR for every cell in the shell. Nothing below it,
 * which is what the typography guard now enforces with a planted 300.
 */
export const CELL_SECONDARY = { ...CELL_TEXT, fontSize: 12, fontWeight: 600, color: 'rgba(10,10,10,0.6)' };

/** Muted body text at the primary size — same weight floor, one step larger. */
export const CELL_MUTED  = { ...CELL_TEXT, fontWeight: 600, color: 'rgba(10,10,10,0.6)' };
export const CELL_NOWRAP = { whiteSpace: 'nowrap' };

/**
 * THE WORDS ON A PILL, WHICH ARE NOT THE VALUE UNDERNEATH IT.
 *
 * Owner, Run 4 S2: the guest list's category pills read "family" while the
 * tags beside them read "Family". They do, and it is not a casing bug — the
 * guest list was the only pill in this family rendering the STORED VALUE.
 * Every sibling renders a label: the schedule's Type pill takes
 * WHEN_LABEL[e.when] (ScheduleTable.jsx:105), and the guest list's own
 * CATEGORY_OPTIONS declares "Family", "Partner's family" and the rest four
 * lines above the render that ignored them.
 *
 * SO THE LABEL WINS, AND SENTENCE CASE IS THE FALLBACK. Casing the value
 * alone would give "Partners family" — the apostrophe only exists in the
 * declared label, and losing it is a worse sentence than the one we started
 * with. The fallback is for a value with no option declared, which is the
 * case an enum grows into before anyone updates the list beside it.
 *
 * TAGS ARE NOT TOUCHED, deliberately: they are whatever the couple typed, and
 * re-casing someone's own words is not a product's business.
 */
export function pillLabel(value, options) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return '';
  const declared = (options || []).find(o => o && o.value === v);
  if (declared && declared.label) return declared.label;
  const words = v.replace(/_/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}
