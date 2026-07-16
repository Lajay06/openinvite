/**
 * src/lib/tableAssignment.js
 *
 * Single write path for "which table is this guest at." Table.assigned_guests
 * (seat_index + guest_id pairs) is the sole source of truth for seating —
 * the guest list's "Table" column and the seating visualiser both read and
 * write through these functions instead of each keeping their own copy.
 * Guest.table_assignment is written here as a denormalized display cache
 * (several unrelated surfaces — DailyBriefing, DailyUpdate, asset previews —
 * read that plain string without loading Table data at all); it is never the
 * authority and is never written anywhere else.
 */

import { base44 } from '@/api/base44Client';

const Table = base44.entities.Table;
const Guest = base44.entities.Guest;

export const DEFAULT_TABLE_CAPACITY = 8;
export const DEFAULT_TABLE_SHAPE = 'round';

/** Live lookup — which table (if any) a guest is currently seated at. */
export function getGuestTableName(guestId, tables) {
  for (const t of tables) {
    if ((t.assigned_guests || []).some(a => a.guest_id === guestId)) return t.name;
  }
  return null;
}

export function findTableByName(tables, name) {
  const target = name.trim().toLowerCase();
  return tables.find(t => (t.name || '').trim().toLowerCase() === target) || null;
}

async function removeGuestFromAllTables(guestId, tables) {
  const changed = [];
  for (const t of tables) {
    const current = t.assigned_guests || [];
    if (!current.some(a => a.guest_id === guestId)) continue;
    const updated = current.filter(a => a.guest_id !== guestId);
    await Table.update(t.id, { assigned_guests: updated });
    changed.push(t.id);
  }
  return changed;
}

/**
 * Assigns a guest to a table by name — resolving an existing table
 * case-insensitively, auto-creating one (matching AddTableModal's own
 * defaults) if none exists, and growing capacity rather than dropping the
 * guest if the table is already full. Always fills the next free seat;
 * for a specific seat, use the seat-index-aware path in Seating.jsx instead.
 *
 * @returns {Promise<{tableId: string, tableName: string, created: boolean, grewCapacityTo: number|null}>}
 */
export async function assignGuestToTableByName({ guestId, tableName, tables }) {
  const trimmed = (tableName || '').trim();
  if (!trimmed) throw new Error('assignGuestToTableByName requires a non-empty tableName — use unassignGuestFromTables to clear.');

  await removeGuestFromAllTables(guestId, tables);

  let table = findTableByName(tables, trimmed);
  let created = false;
  if (!table) {
    table = await Table.create({
      name: trimmed,
      shape: DEFAULT_TABLE_SHAPE,
      capacity: DEFAULT_TABLE_CAPACITY,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      assigned_guests: [],
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
  await Guest.update(guestId, { table_assignment: table.name });

  return { tableId: table.id, tableName: table.name, created, grewCapacityTo };
}

/** Clears a guest's seat at whichever table(s) they're currently assigned to. */
export async function unassignGuestFromTables({ guestId, tables }) {
  const changedTableIds = await removeGuestFromAllTables(guestId, tables);
  if (changedTableIds.length > 0) {
    await Guest.update(guestId, { table_assignment: '' });
  }
  return changedTableIds;
}

/** Keeps every seated guest's cached table_assignment in step with a rename. */
export async function propagateTableRename({ tableId, newName, tables }) {
  const table = tables.find(t => t.id === tableId);
  if (!table) return [];
  const guestIds = (table.assigned_guests || []).map(a => a.guest_id);
  await Promise.all(guestIds.map(id => Guest.update(id, { table_assignment: newName })));
  return guestIds;
}
