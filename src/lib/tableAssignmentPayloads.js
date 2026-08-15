/**
 * src/lib/tableAssignmentPayloads.js
 *
 * The pure half of tableAssignment.js: everything that decides WHAT to write,
 * with nothing that performs a write.
 *
 * Split out for one reason — tableAssignment.js imports the base44 client, so
 * it cannot be loaded in plain Node. These functions can, which means the exact
 * Table.update payloads are assertable against fixtures with no network and no
 * auth. Same pattern as todoSort.js, which is how the inverted priority
 * comparator was caught.
 *
 * tableAssignment.js re-exports all of these, so callers import from there and
 * this file's existence is an implementation detail.
 */

// RELATIVE, not the '@/' alias: this module is loaded by a plain-Node test
// harness that has no Vite resolver. Same reason guestRsvpTally.js imports
// plusOne.js relatively.
import { RECEPTION_EVENT_ID } from './weddingEvents.js';

/**
 * A row's event, defaulting to the reception when unset. Mirrors Seating.jsx's
 * own local helper exactly.
 *
 * NOTE a pre-existing inconsistency, deliberately NOT changed here: the older
 * functions below filter with a strict `t.event_id !== eventId`, so they skip
 * tables whose event_id is unset even when eventId is the reception. Seating's
 * helper treats those as reception tables. The new seat-level functions match
 * SEATING's behaviour, because they replace Seating's code and this PR is a
 * refactor. Reconciling the older path is a behaviour change and belongs in its
 * own PR.
 */
export const resolveEventId = (row) => (row && row.event_id) || RECEPTION_EVENT_ID;

/* ── Pure payload builders ────────────────────────────────────────────────────
   Separated from the awaits so the exact Table.update payloads can be asserted
   against fixtures in plain Node, with no network and no auth — the pattern
   that caught the inverted comparator in todoSort.js. */

/** The assigned_guests array after seating `guestId` at `seatIndex`. */
export function buildSeatAssignmentPayload(table, guestId, seatIndex) {
  const current = (table && table.assigned_guests) || [];
  return [...current.filter(g => g.seat_index !== seatIndex), { guest_id: guestId, seat_index: seatIndex }];
}

/** The assigned_guests array after clearing `seatIndex`. */
export function buildSeatRemovalPayload(table, seatIndex) {
  return ((table && table.assigned_guests) || []).filter(g => g.seat_index !== seatIndex);
}

/**
 * Is this guest already seated somewhere else in this event?
 *
 * Excludes the exact target seat so an idempotent re-assign is not a conflict.
 * Returns the occupied table, or null.
 */
export function findSeatConflict(guestId, tables, eventId, targetTableId, targetSeatIndex) {
  for (const t of tables || []) {
    if (resolveEventId(t) !== eventId) continue;
    for (const a of t.assigned_guests || []) {
      if (a.guest_id !== guestId) continue;
      if (t.id === targetTableId && a.seat_index === targetSeatIndex) continue;
      return { tableId: t.id, tableName: t.name };
    }
  }
  return null;
}

