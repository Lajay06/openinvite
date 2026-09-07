/**
 * src/lib/tableSort.js — HOW A DASHBOARD TABLE SORTS, ONCE.
 *
 * The guest list's sorting lived inside GuestList.jsx, private to a
 * 1194-line component: a numeric-aware compare, a blanks-always-last rule,
 * and a header that cycles asc → desc → unsorted. The schedule's List tab
 * needs exactly that behaviour, and the owner's instruction is to consume it
 * rather than fork it — so it moved here first, with GuestList importing it
 * and nothing about it changing.
 *
 * WHAT IS SHARED AND WHAT IS NOT. The machinery is shared; the COLUMN MAP is
 * not. Which fields a table can sort by, and how each one reads off a row, is
 * that table's own business — guests sort by a derived RSVP rank, events by a
 * date. Each table declares its own map and hands it in.
 *
 * ── BLANKS ARE ALWAYS LAST, IN BOTH DIRECTIONS ─────────────────────────────
 *
 * Not "last ascending, first descending". A row with no table assignment is
 * not the smallest table assignment; it is the absence of one, and a couple
 * reversing the sort to see the other end does not expect the empties to
 * march to the top. Deliberate, and guarded.
 *
 * ── THE THIRD STATE IS UNSORTED, NOT A THIRD ORDER ─────────────────────────
 *
 * Clicking a sorted-descending header returns the table to the order the page
 * loaded it in — for guests, the order the store returned; for the schedule,
 * date ascending. That is why `sortRows` returns the input untouched for a
 * null state rather than applying a default: the caller owns its own order.
 */

/** Numeric-aware, case- and accent-insensitive: "Table 2" before "Table 10". */
export function naturalCompare(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * @param {Array} rows
 * @param {{field: string, direction: 'asc'|'desc'}|null} sortState
 * @param {Record<string, {getValue: Function, compare: Function}>} columns
 * @returns {Array} a new array, or `rows` itself when unsorted
 */
export function sortRows(rows, sortState, columns) {
  if (!sortState?.field) return rows;
  const column = columns[sortState.field];
  if (!column) return rows;
  const { getValue, compare } = column;
  const dir = sortState.direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    const aBlank = va === '' || va == null;
    const bBlank = vb === '' || vb == null;
    if (aBlank && bBlank) return 0;
    if (aBlank) return 1;  // blanks always last, regardless of direction
    if (bBlank) return -1;
    return compare(va, vb) * dir;
  });
}

/**
 * The header click cycle: asc → desc → unsorted → asc.
 *
 * @param {string} field  the column just clicked
 * @param {{field: string, direction: string}|null} current
 * Returns the SAME SHAPE in all three states — `{ field: null }` rather than
 * a bare null — because that is the shape GuestList's useState has always
 * held, and this extraction is meant to change nothing. sortRows treats a null
 * field as unsorted either way.
 *
 * @returns {{field: string|null, direction: 'asc'|'desc'}}
 */
export function nextSortState(field, current) {
  if (current?.field !== field) return { field, direction: 'asc' };
  if (current.direction === 'asc') return { field, direction: 'desc' };
  return { field: null, direction: 'asc' };
}
