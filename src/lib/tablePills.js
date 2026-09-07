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
  letterSpacing: '0.08em',
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
export const CELL_MUTED  = { ...CELL_TEXT, fontWeight: 400, color: 'rgba(10,10,10,0.6)' };
export const CELL_NOWRAP = { whiteSpace: 'nowrap' };
