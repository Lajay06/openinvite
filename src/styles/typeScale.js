/**
 * src/styles/typeScale.js — THE SIZES, AND THE ONLY PLACE THEY ARE DECIDED.
 *
 * Owner ruling 2026-09-07: "we've already decided what the standard design
 * size is for these pills, so why are these massive?"
 *
 * NO PAGE OR COMPONENT DECLARES ITS OWN TYPE SCALE OR BUTTON SIZE. Body,
 * input, label, pill and button sizes come from here — which is not a new
 * scale invented for the rule, but the sizes GuestList, DataTable,
 * TableToolbar and the Theme tab already agreed on. Everything else in the
 * dashboard was a page's private opinion: a 16px "Send invites" beside a 12px
 * "Export CSV", a 15px modal input beside a 13px table cell.
 *
 * THE SET IS SMALL ON PURPOSE. Five sizes for every control surface in the
 * product. A sixth is not a design decision, it is a page forgetting the other
 * five exist — which is why the guard tests membership of this set rather than
 * a per-role lookup: a role can move within the scale, but nothing may leave
 * it.
 */

/** Every font-size a dashboard control may compute to, in px. */
export const TYPE_SCALE = [10, 11, 12, 13, 14];

/** What each role uses. Import the role, not the number. */
export const TYPE = {
  /** Table cells, form inputs, the body of a panel. */
  body: 13,
  /** Text a form takes: inputs and textareas. */
  input: 14,
  /** Field labels and column headings. */
  label: 11,
  /** Filter pills and the small controls beside them. */
  pill: 11,
  /** Row pills — status, category, tags. */
  rowPill: 10,
  /** Buttons: primary, secondary, and everything in a toolbar. */
  button: 12,
  /** Secondary cell text — a date, a time, a count under a name. */
  secondary: 12,
};

/** True when a computed size (px number or "13px") is on the scale. */
export function onScale(size) {
  const n = typeof size === 'string' ? parseFloat(size) : size;
  return TYPE_SCALE.includes(Math.round(n));
}
