/**
 * tests/persistence/table-guest-sync.mjs
 *
 * Covers feat/guest-table-sort-and-sync: Table.assigned_guests is the sole
 * source of truth for seating, with Guest.table_assignment written as a
 * denormalized cache (src/lib/tableAssignment.js). Since that module goes
 * through the base44 SDK client (browser-only — appParams/import.meta.env
 * don't resolve under plain Node, the same reason resolveMyWedding.js isn't
 * imported directly here either), this test mirrors its exact logic via raw
 * REST calls, proving the underlying Base44 behaviour the real module
 * depends on: auto-create on an unknown table name, capacity growth instead
 * of dropping a guest, unassign clearing both sides, and a rename
 * propagating to every seated guest's cached table_assignment.
 */

import { APP_ID, api, pass, fail } from './_shared.mjs';

export async function runTableGuestSync(token) {
  const results = [];

  // ── Assigning to a not-yet-existing table name auto-creates it ──────────
  console.log('\n  Table/Guest sync — assigning an unknown table name auto-creates it:\n');
  let guestAId = null, autoTableId = null;
  try {
    const guest = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_TABLESYNC_A__', is_test: true }, token);
    guestAId = guest.id;

    // Mirrors assignGuestToTableByName: no existing table named this →
    // create one with AddTableModal's own defaults (capacity 8, round).
    const tableName = '__PERSISTENCE_TEST_AUTO_TABLE__';
    const created = await api('POST', `/apps/${APP_ID}/entities/Table`, {
      name: tableName, shape: 'round', capacity: 8, x: 100, y: 100, assigned_guests: [],
    }, token);
    autoTableId = created.id;
    await api('PUT', `/apps/${APP_ID}/entities/Table/${autoTableId}`,
      { assigned_guests: [{ guest_id: guestAId, seat_index: 0 }] }, token);
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${guestAId}`, { table_assignment: tableName }, token);

    const tableBack = await api('GET', `/apps/${APP_ID}/entities/Table/${autoTableId}`, undefined, token);
    const guestBack = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestAId}`, undefined, token);

    results.push(tableBack.capacity === 8 && tableBack.shape === 'round'
      ? pass('Auto-created table matches AddTableModal defaults (capacity 8, round)', `capacity=${tableBack.capacity}, shape=${tableBack.shape}`)
      : fail('Auto-created table matches AddTableModal defaults (capacity 8, round)', 'capacity=8, shape=round', `capacity=${tableBack.capacity}, shape=${tableBack.shape}`));
    results.push(tableBack.assigned_guests?.some(a => a.guest_id === guestAId)
      ? pass('Guest appears in the new table\'s assigned_guests (visualiser will show them seated)', 'found')
      : fail('Guest appears in the new table\'s assigned_guests', 'found', 'missing'));
    results.push(guestBack.table_assignment === tableName
      ? pass('Guest.table_assignment mirrors the resolved table name (guest list Table column)', guestBack.table_assignment)
      : fail('Guest.table_assignment mirrors the resolved table name', tableName, guestBack.table_assignment));
  } catch (err) {
    console.log(`  ❌ FAIL  auto-create table — error: ${err.message}`);
    results.push(false, false, false);
  } finally {
    if (guestAId) { try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${guestAId}`, undefined, token); } catch (e) { console.error(`  ⚠️  CLEANUP FAILED — Guest ${guestAId}: ${e.message}`); } }
    if (autoTableId) { try { await api('DELETE', `/apps/${APP_ID}/entities/Table/${autoTableId}`, undefined, token); } catch (e) { console.error(`  ⚠️  CLEANUP FAILED — Table ${autoTableId}: ${e.message}`); } }
  }

  // ── Assigning past capacity grows the table instead of dropping the guest ──
  console.log('\n  Table/Guest sync — assigning past capacity grows the table:\n');
  let fullTableId = null;
  const smallCapacityGuestIds = [];
  try {
    // Table with capacity 1, already holding one guest at seat 0.
    const firstGuest = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_TABLESYNC_FULL_1__', is_test: true }, token);
    smallCapacityGuestIds.push(firstGuest.id);

    const table = await api('POST', `/apps/${APP_ID}/entities/Table`, {
      name: '__PERSISTENCE_TEST_FULL_TABLE__', shape: 'round', capacity: 1, x: 100, y: 100,
      assigned_guests: [{ guest_id: firstGuest.id, seat_index: 0 }],
    }, token);
    fullTableId = table.id;

    // Mirrors assignGuestToTableByName's capacity-growth logic: seatIndex (1)
    // >= capacity (1) → grow to seatIndex + 1 rather than reject.
    const secondGuest = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_TABLESYNC_FULL_2__', is_test: true }, token);
    smallCapacityGuestIds.push(secondGuest.id);

    const current = table.assigned_guests || [];
    const usedSeats = new Set(current.map(a => a.seat_index));
    let seatIndex = 0;
    while (usedSeats.has(seatIndex)) seatIndex++;
    const grewCapacityTo = seatIndex >= table.capacity ? seatIndex + 1 : null;

    await api('PUT', `/apps/${APP_ID}/entities/Table/${fullTableId}`, {
      assigned_guests: [...current, { guest_id: secondGuest.id, seat_index: seatIndex }],
      ...(grewCapacityTo ? { capacity: grewCapacityTo } : {}),
    }, token);

    const tableBack = await api('GET', `/apps/${APP_ID}/entities/Table/${fullTableId}`, undefined, token);
    results.push(grewCapacityTo === 2
      ? pass('Capacity-growth calculation grows to fit the new seat (never silently drops)', `grewCapacityTo=${grewCapacityTo}`)
      : fail('Capacity-growth calculation grows to fit the new seat', 2, grewCapacityTo));
    results.push(tableBack.capacity === 2
      ? pass('Table.capacity actually persists the grown value', tableBack.capacity)
      : fail('Table.capacity actually persists the grown value', 2, tableBack.capacity));
    results.push(tableBack.assigned_guests?.length === 2
      ? pass('Both guests remain seated after the grow (no one silently dropped)', tableBack.assigned_guests.length)
      : fail('Both guests remain seated after the grow', 2, tableBack.assigned_guests?.length));
  } catch (err) {
    console.log(`  ❌ FAIL  capacity growth — error: ${err.message}`);
    results.push(false, false, false);
  } finally {
    for (const id of smallCapacityGuestIds) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${id}`, undefined, token); } catch (e) { console.error(`  ⚠️  CLEANUP FAILED — Guest ${id}: ${e.message}`); }
    }
    if (fullTableId) { try { await api('DELETE', `/apps/${APP_ID}/entities/Table/${fullTableId}`, undefined, token); } catch (e) { console.error(`  ⚠️  CLEANUP FAILED — Table ${fullTableId}: ${e.message}`); } }
  }

  // ── Unassigning clears both Table.assigned_guests and Guest.table_assignment ──
  console.log('\n  Table/Guest sync — unassigning clears both sides:\n');
  let unassignGuestId = null, unassignTableId = null;
  try {
    const guest = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_TABLESYNC_UNASSIGN__', is_test: true }, token);
    unassignGuestId = guest.id;

    const table = await api('POST', `/apps/${APP_ID}/entities/Table`, {
      name: '__PERSISTENCE_TEST_UNASSIGN_TABLE__', shape: 'round', capacity: 8, x: 100, y: 100,
      assigned_guests: [{ guest_id: unassignGuestId, seat_index: 0 }],
    }, token);
    unassignTableId = table.id;
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${unassignGuestId}`, { table_assignment: table.name }, token);

    // Mirrors unassignGuestFromTables: remove from assigned_guests, clear the cache.
    await api('PUT', `/apps/${APP_ID}/entities/Table/${unassignTableId}`, { assigned_guests: [] }, token);
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${unassignGuestId}`, { table_assignment: '' }, token);

    const tableBack = await api('GET', `/apps/${APP_ID}/entities/Table/${unassignTableId}`, undefined, token);
    const guestBack = await api('GET', `/apps/${APP_ID}/entities/Guest/${unassignGuestId}`, undefined, token);

    results.push((tableBack.assigned_guests || []).length === 0
      ? pass('Table.assigned_guests is empty after unassign (visualiser shows the seat free)', '[]')
      : fail('Table.assigned_guests is empty after unassign', '[]', tableBack.assigned_guests));
    results.push(!guestBack.table_assignment
      ? pass('Guest.table_assignment is cleared after unassign (guest list Table column shows blank)', JSON.stringify(guestBack.table_assignment))
      : fail('Guest.table_assignment is cleared after unassign', '(empty)', guestBack.table_assignment));
  } catch (err) {
    console.log(`  ❌ FAIL  unassign — error: ${err.message}`);
    results.push(false, false);
  } finally {
    if (unassignGuestId) { try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${unassignGuestId}`, undefined, token); } catch (e) { console.error(`  ⚠️  CLEANUP FAILED — Guest ${unassignGuestId}: ${e.message}`); } }
    if (unassignTableId) { try { await api('DELETE', `/apps/${APP_ID}/entities/Table/${unassignTableId}`, undefined, token); } catch (e) { console.error(`  ⚠️  CLEANUP FAILED — Table ${unassignTableId}: ${e.message}`); } }
  }

  // ── Renaming a table propagates to every seated guest's cached name ─────
  console.log('\n  Table/Guest sync — renaming a table propagates to seated guests:\n');
  let renameGuestId = null, renameTableId = null;
  try {
    const guest = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_TABLESYNC_RENAME__', is_test: true }, token);
    renameGuestId = guest.id;

    const oldName = '__PERSISTENCE_TEST_RENAME_TABLE_OLD__';
    const newName = '__PERSISTENCE_TEST_RENAME_TABLE_NEW__';
    const table = await api('POST', `/apps/${APP_ID}/entities/Table`, {
      name: oldName, shape: 'round', capacity: 8, x: 100, y: 100,
      assigned_guests: [{ guest_id: renameGuestId, seat_index: 0 }],
    }, token);
    renameTableId = table.id;
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${renameGuestId}`, { table_assignment: oldName }, token);

    // Mirrors propagateTableRename: rename the table, then push the new
    // name to every guest currently in its assigned_guests.
    await api('PUT', `/apps/${APP_ID}/entities/Table/${renameTableId}`, { name: newName }, token);
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${renameGuestId}`, { table_assignment: newName }, token);

    const guestBack = await api('GET', `/apps/${APP_ID}/entities/Guest/${renameGuestId}`, undefined, token);
    results.push(guestBack.table_assignment === newName
      ? pass('Guest.table_assignment reflects the renamed table (no stale name in the guest list)', guestBack.table_assignment)
      : fail('Guest.table_assignment reflects the renamed table', newName, guestBack.table_assignment));
  } catch (err) {
    console.log(`  ❌ FAIL  rename propagation — error: ${err.message}`);
    results.push(false);
  } finally {
    if (renameGuestId) { try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${renameGuestId}`, undefined, token); } catch (e) { console.error(`  ⚠️  CLEANUP FAILED — Guest ${renameGuestId}: ${e.message}`); } }
    if (renameTableId) { try { await api('DELETE', `/apps/${APP_ID}/entities/Table/${renameTableId}`, undefined, token); } catch (e) { console.error(`  ⚠️  CLEANUP FAILED — Table ${renameTableId}: ${e.message}`); } }
  }

  return results;
}
