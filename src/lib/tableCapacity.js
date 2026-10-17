/**
 * src/lib/tableCapacity.js
 *
 * THE ONE CAPACITY RULE, for adding a table and for changing one.
 *
 * AddTableModal used to carry the rule inline (a whole number from 1 to 20)
 * and nothing could change a capacity afterwards. Editing reuses the same
 * check with one more condition, so the two can never disagree about what a
 * valid capacity is: a table cannot be made smaller than the number of
 * guests already seated at it.
 */

export const MIN_TABLE_CAPACITY = 1;
export const MAX_TABLE_CAPACITY = 20;

/**
 * Why `raw` is not a valid capacity for a table with `seatedCount` guests
 * seated, or null when it is. The returned string is shown to the couple.
 */
export function tableCapacityError(raw, seatedCount = 0) {
  const n = Number(raw);
  if (raw === '' || raw == null || !Number.isInteger(n)) return 'Capacity must be a whole number.';
  if (n < MIN_TABLE_CAPACITY || n > MAX_TABLE_CAPACITY) {
    return `Capacity must be between ${MIN_TABLE_CAPACITY} and ${MAX_TABLE_CAPACITY}.`;
  }
  if (n < seatedCount) {
    return `${seatedCount} guest${seatedCount === 1 ? ' is' : 's are'} seated here, so capacity can't go below ${seatedCount}.`;
  }
  return null;
}

/**
 * The table's assigned_guests with every seat index inside `capacity`.
 *
 * Seats are numbered, not packed: a table of 10 with three guests can have
 * them at seats 0, 4 and 9. Lowering it to 5 passes the count check and would
 * strand the guest at seat 9 on a seat that no longer exists. Seats already
 * inside the new capacity keep their number; anyone outside moves to the
 * lowest free seat. Callers validate first, so a free seat always exists.
 */
export function fitSeatsToCapacity(assigned = [], capacity) {
  const kept = assigned.filter(a => a.seat_index < capacity);
  const used = new Set(kept.map(a => a.seat_index));
  const moved = [];
  let next = 0;
  for (const a of assigned) {
    if (a.seat_index < capacity) continue;
    while (used.has(next)) next++;
    used.add(next);
    moved.push({ ...a, seat_index: next });
  }
  return assigned.map(a => (a.seat_index < capacity ? a : moved.shift()));
}
