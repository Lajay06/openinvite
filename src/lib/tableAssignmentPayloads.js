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
import { isPlusOneId } from './attendees.js';

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

/**
 * Should this seat write also update Guest.table_assignment?
 *
 * Two conditions, both necessary:
 *   - the reception only — other events' seating is visible inside Seating's
 *     own tabs and is deliberately never echoed into this field
 *   - primaries only — a plus-one has NO GUEST RECORD, so there is no row to
 *     update and no cache entry to maintain. Table.assigned_guests is the
 *     authority for both; this cache is primaries-only by nature, not by
 *     omission. Anything needing a plus-one's seat derives it from
 *     Table.assigned_guests keyed by attendee id.
 *
 * Extracted so the decision is assertable without the base44 client.
 */
export function shouldWriteTableCache(guestId, eventId) {
  return eventId === RECEPTION_EVENT_ID && !isPlusOneId(guestId);
}

/**
 * Validates an AI seating plan against the population that may actually be
 * seated, returning the shape applyEventSeatingPlan expects.
 *
 * `validIds` must be ATTENDEE ids, not Guest ids. Built from Guest ids, this
 * filter silently discarded every plus-one the model placed — the plan looked
 * applied and those people were simply never seated.
 *
 * It remains a WHITELIST: the model cannot invent an id, only place people who
 * are genuinely in this event's population. An id it hallucinates is dropped,
 * which is the correct behaviour and is asserted.
 */
export function validatePlanAssignments(planAssignments, validIds) {
  return (planAssignments || []).map(a => ({
    tableId: a.tableId,
    guestIds: (a.guests || []).filter(id => validIds.has(id)),
  }));
}

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

