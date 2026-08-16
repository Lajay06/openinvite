/**
 * src/lib/tableAssignment.js
 *
 * Single write path for "which table is this guest at." Table.assigned_guests
 * (seat_index + guest_id pairs) is the sole source of truth for seating —
 * the guest list's "Table" column and the seating visualiser both read and
 * write through these functions instead of each keeping their own copy.
 *
 * PR6 (multi-event seating): every function here now takes an `eventId`
 * (default RECEPTION_EVENT_ID), scoping table lookup/creation/assignment to
 * one event's tables — a guest can be seated at different tables for
 * different events without collision.
 *
 * PLUS-ONES: seated by SYNTHETIC id (`<hostId>::plus-one`, see attendees.js).
 * Table.assigned_guests.guest_id is an unconstrained string and holds one
 * without complaint. The Guest.update below is SKIPPED for them — there is no
 * Guest record and therefore no cache row. Guest.table_assignment is a
 * primaries-only cache by nature; anything that must reflect a plus-one's seat
 * derives it from Table.assigned_guests keyed by attendee id.
 *
 * Guest.table_assignment is written here as a denormalized display cache
 * (several unrelated surfaces — DailyUpdate, avaContext, the guest CSV
 * export — read that plain string without loading Table data at all, and
 * have no concept of "which event"); it is never the authority. PR6
 * deliberately keeps it scoped to the Reception/main event ONLY — these
 * functions only touch it when `eventId === RECEPTION_EVENT_ID`. A guest's
 * table for any other event is visible inside Seating itself
 * (Table.assigned_guests filtered by event_id), never echoed into this
 * field. It is still never written anywhere else — this remains the one
 * writer path, just conditionally scoped.
 */

import { base44 } from '@/api/base44Client';
import { RECEPTION_EVENT_ID } from '@/lib/weddingEvents';
import {
  resolveEventId, buildSeatAssignmentPayload, buildSeatRemovalPayload, findSeatConflict,
  shouldWriteTableCache, validatePlanAssignments,
} from '@/lib/tableAssignmentPayloads';
import { isPlusOneId } from '@/lib/attendees';

// Re-exported so callers have one import site; the split exists only so the
// pure half can be loaded without the base44 client. See that file's header.
export { resolveEventId, buildSeatAssignmentPayload, buildSeatRemovalPayload, findSeatConflict, shouldWriteTableCache, validatePlanAssignments };

const Table = base44.entities.Table;
const Guest = base44.entities.Guest;

export const DEFAULT_TABLE_CAPACITY = 8;
export const DEFAULT_TABLE_SHAPE = 'round';

/**
 * Seats a guest at a SPECIFIC seat of a SPECIFIC table.
 *
 * WHY THIS REFUSES WHERE assignGuestToTableByName MOVES
 * -----------------------------------------------------
 * Two functions, two rules, both deliberate:
 *
 *   assignGuestToTableByName — removes the guest from their other tables first,
 *     then seats them. That is a bulk/by-name path (the guest list's Table
 *     column, imports), where "put them here" should just work.
 *
 *   assignGuestToSeat — REFUSES if the guest is already seated elsewhere in
 *     this event, returning { ok: false, reason: 'already-seated-in-event' }.
 *     This is a couple clicking a seat, and a silent move is a surprise. The
 *     caller renders the same message it always has.
 *
 * The rule lives here rather than in the caller so the single write path
 * actually enforces the single most important rule — a consolidation that left
 * it outside would be consolidation in name only.
 *
 * @returns {Promise<{ok:true, tableName:string} | {ok:false, reason:string, tableName?:string}>}
 */
export async function assignGuestToSeat({ guestId, tableId, seatIndex, tables, eventId }) {
  const table = (tables || []).find(t => t.id === tableId);
  if (!table) return { ok: false, reason: 'table-not-found' };
  const scope = eventId || resolveEventId(table);

  const conflict = findSeatConflict(guestId, tables, scope, tableId, seatIndex);
  if (conflict) return { ok: false, reason: 'already-seated-in-event', tableName: conflict.tableName };

  await Table.update(tableId, { assigned_guests: buildSeatAssignmentPayload(table, guestId, seatIndex) });
  // A plus-one has no Guest record, so there is no display cache to maintain —
  // see the cache note in this file's header. Table.assigned_guests is the
  // authority for both; Guest.table_assignment is a primaries-only convenience
  // by nature, not by omission.
  if (shouldWriteTableCache(guestId, scope)) {
    await Guest.update(guestId, { table_assignment: table.name });
  }
  return { ok: true, tableName: table.name };
}

/** Clears one seat. Mirrors the assignment path's event scoping. */
export async function unassignSeat({ guestId, tableId, seatIndex, tables, eventId }) {
  const table = (tables || []).find(t => t.id === tableId);
  if (!table) return { ok: false, reason: 'table-not-found' };
  const scope = eventId || resolveEventId(table);

  await Table.update(tableId, { assigned_guests: buildSeatRemovalPayload(table, seatIndex) });
  if (guestId && shouldWriteTableCache(guestId, scope)) {
    await Guest.update(guestId, { table_assignment: '' });
  }
  return { ok: true, tableName: table.name };
}

/**
 * Applies a whole seating plan to one event: clears every table of that event,
 * then seats each assignment's ids in seat order.
 *
 * The ok/err counting is preserved EXACTLY as the code this replaces did it,
 * because it feeds a user-visible toast ("N guests assigned, M errors"):
 *   - a missing table counts as ONE error
 *   - a failed Table.update counts as ONE error
 *   - outside the reception, every seated guest counts as ok with no cache write
 *   - at the reception, each Guest.update is counted individually, and a failed
 *     cache write is an error without unseating anyone
 *
 * @param assignments [{ tableId, guestIds: string[] }]
 * @returns {Promise<{ok:number, err:number}>}
 */
export async function applyEventSeatingPlan({ assignments, tables, eventId }) {
  const scoped = (tables || []).filter(t => resolveEventId(t) === eventId);
  await Promise.all(scoped.map(t => Table.update(t.id, { assigned_guests: [] })));

  let ok = 0, err = 0;
  for (const a of assignments || []) {
    const table = scoped.find(t => t.id === a.tableId);
    if (!table) { err++; continue; }
    const ids = a.guestIds || [];
    if (ids.length === 0) continue;
    const assigned_guests = ids.map((id, i) => ({ guest_id: id, seat_index: i }));
    try {
      await Table.update(a.tableId, { assigned_guests });
      if (resolveEventId(table) === RECEPTION_EVENT_ID) {
        for (const id of ids) {
          // Plus-ones are seated but have no cache row; they still count as ok.
          if (isPlusOneId(id)) { ok++; continue; }
          try { await Guest.update(id, { table_assignment: table.name }); ok++; }
          catch { err++; }
        }
      } else {
        ok += ids.length;
      }
    } catch { err++; }
  }
  return { ok, err };
}


/** Live lookup — which table (if any) a guest is currently seated at, for one event. */
export function getGuestTableName(guestId, tables, eventId = RECEPTION_EVENT_ID) {
  for (const t of tables) {
    if (t.event_id !== eventId) continue;
    if ((t.assigned_guests || []).some(a => a.guest_id === guestId)) return t.name;
  }
  return null;
}

export function findTableByName(tables, name, eventId = RECEPTION_EVENT_ID) {
  const target = name.trim().toLowerCase();
  return tables.find(t => t.event_id === eventId && (t.name || '').trim().toLowerCase() === target) || null;
}

async function removeGuestFromAllTables(guestId, tables, eventId) {
  const changed = [];
  for (const t of tables) {
    if (t.event_id !== eventId) continue;
    const current = t.assigned_guests || [];
    if (!current.some(a => a.guest_id === guestId)) continue;
    const updated = current.filter(a => a.guest_id !== guestId);
    await Table.update(t.id, { assigned_guests: updated });
    changed.push(t.id);
  }
  return changed;
}

/**
 * Assigns a guest to a table by name, within one event — resolving an
 * existing table (of that event) case-insensitively, auto-creating one
 * (matching AddTableModal's own defaults, tagged with the same event_id) if
 * none exists, and growing capacity rather than dropping the guest if the
 * table is already full. Always fills the next free seat; for a specific
 * seat, use the seat-index-aware path in Seating.jsx instead.
 *
 * @returns {Promise<{tableId: string, tableName: string, created: boolean, grewCapacityTo: number|null}>}
 */
export async function assignGuestToTableByName({ guestId, tableName, tables, eventId = RECEPTION_EVENT_ID }) {
  const trimmed = (tableName || '').trim();
  if (!trimmed) throw new Error('assignGuestToTableByName requires a non-empty tableName — use unassignGuestFromTables to clear.');

  await removeGuestFromAllTables(guestId, tables, eventId);

  let table = findTableByName(tables, trimmed, eventId);
  let created = false;
  if (!table) {
    table = await Table.create({
      name: trimmed,
      shape: DEFAULT_TABLE_SHAPE,
      capacity: DEFAULT_TABLE_CAPACITY,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      assigned_guests: [],
      event_id: eventId,
    });
    created = true;
  }

  const current = (table.assigned_guests || []).filter(a => a.guest_id !== guestId);
  const usedSeats = new Set(current.map(a => a.seat_index));
  let seatIndex = 0;
  while (usedSeats.has(seatIndex)) seatIndex++;

  let grewCapacityTo = null;
  const capacity = table.capacity || DEFAULT_TABLE_CAPACITY;
  if (seatIndex >= capacity) grewCapacityTo = seatIndex + 1;

  const updatedAssignedGuests = [...current, { guest_id: guestId, seat_index: seatIndex }];
  await Table.update(table.id, {
    assigned_guests: updatedAssignedGuests,
    ...(grewCapacityTo ? { capacity: grewCapacityTo } : {}),
  });
  if (eventId === RECEPTION_EVENT_ID) {
    await Guest.update(guestId, { table_assignment: table.name });
  }

  return { tableId: table.id, tableName: table.name, created, grewCapacityTo };
}

/** Clears a guest's seat at whichever table(s) they're currently assigned to, for one event. */
export async function unassignGuestFromTables({ guestId, tables, eventId = RECEPTION_EVENT_ID }) {
  const changedTableIds = await removeGuestFromAllTables(guestId, tables, eventId);
  if (changedTableIds.length > 0 && eventId === RECEPTION_EVENT_ID) {
    await Guest.update(guestId, { table_assignment: '' });
  }
  return changedTableIds;
}

/** Keeps every seated guest's cached table_assignment in step with a rename — only for the Reception table (see file header). */
export async function propagateTableRename({ tableId, newName, tables }) {
  const table = tables.find(t => t.id === tableId);
  if (!table || table.event_id !== RECEPTION_EVENT_ID) return [];
  const guestIds = (table.assigned_guests || []).map(a => a.guest_id);
  await Promise.all(guestIds.map(id => Guest.update(id, { table_assignment: newName })));
  return guestIds;
}
