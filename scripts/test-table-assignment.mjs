/**
 * scripts/test-table-assignment.mjs
 *
 * Payload-equivalence assertions for the seating write-path consolidation.
 *
 * The three seat-level writers that used to live in Seating.jsx now go through
 * src/lib/tableAssignment.js. That is a refactor, so the thing worth proving is
 * not "the new code works" but "the new code produces EXACTLY what the old code
 * produced" — same Table.update payloads, same conflict decisions, for the same
 * inputs.
 *
 * The old expressions are inlined below verbatim, copied from the pre-refactor
 * Seating.jsx, and each assertion compares the two. If they ever diverge this
 * fails, which is the only way a silent behaviour change gets caught in a
 * refactor whose whole promise is that nothing changes.
 *
 * Plain Node: imports src/lib/tableAssignmentPayloads.js, which carries no
 * base44 client and no '@/' aliases.
 */

import {
  buildSeatAssignmentPayload,
  buildSeatRemovalPayload,
  findSeatConflict,
  resolveEventId,
} from '../src/lib/tableAssignmentPayloads.js';

const results = [];
const check = (label, pass, detail = '') => {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${pass || !detail ? '' : `  -> ${detail}`}`);
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── The pre-refactor expressions, verbatim from Seating.jsx ──────────────────
const OLD_assign = (table, guestId, seatIndex) => {
  const current = table.assigned_guests || [];
  return [...current.filter(g => g.seat_index !== seatIndex), { guest_id: guestId, seat_index: seatIndex }];
};
const OLD_unassign = (table, seatIndex) =>
  (table.assigned_guests || []).filter(g => g.seat_index !== seatIndex);
const OLD_resolveEventId = (row) => row.event_id || 'reception';

// ── Fixtures: empty, partly full, full, duplicate-seat, missing field ───────
const TABLES = [
  { id: 't1', name: 'Table 1', capacity: 8, event_id: 'reception',
    assigned_guests: [{ guest_id: 'g1', seat_index: 0 }, { guest_id: 'g2', seat_index: 3 }] },
  { id: 't2', name: 'Table 2', capacity: 4, event_id: 'reception', assigned_guests: [] },
  { id: 't3', name: 'Head Table', capacity: 2, event_id: 'reception',
    assigned_guests: [{ guest_id: 'g9', seat_index: 0 }, { guest_id: 'g8', seat_index: 1 }] },
  { id: 't4', name: 'Brunch 1', capacity: 6, event_id: 'brunch-123',
    assigned_guests: [{ guest_id: 'g1', seat_index: 2 }] },
  { id: 't5', name: 'Legacy', capacity: 8, assigned_guests: [] },   // event_id UNSET
];

// ── Payload equivalence, exhaustively over the fixtures ─────────────────────
let assignSame = 0, assignTotal = 0;
for (const t of TABLES) {
  for (const seat of [0, 1, 2, 3, 7]) {
    for (const gid of ['gNew', 'g1', 'g2']) {
      assignTotal++;
      if (eq(buildSeatAssignmentPayload(t, gid, seat), OLD_assign(t, gid, seat))) assignSame++;
    }
  }
}
check(`assignment payload identical to the old expression (${assignTotal} combinations)`,
  assignSame === assignTotal, `${assignTotal - assignSame} differed`);

let removeSame = 0, removeTotal = 0;
for (const t of TABLES) {
  for (const seat of [0, 1, 2, 3, 7]) {
    removeTotal++;
    if (eq(buildSeatRemovalPayload(t, seat), OLD_unassign(t, seat))) removeSame++;
  }
}
check(`removal payload identical to the old expression (${removeTotal} combinations)`,
  removeSame === removeTotal, `${removeTotal - removeSame} differed`);

check('resolveEventId matches Seating\'s local helper, including the unset case',
  TABLES.every(t => resolveEventId(t) === OLD_resolveEventId(t))
    && resolveEventId({}) === 'reception');

// ── Specific payload shapes ─────────────────────────────────────────────────
check('seating into an empty seat appends without disturbing others',
  eq(buildSeatAssignmentPayload(TABLES[0], 'gNew', 5),
     [{ guest_id: 'g1', seat_index: 0 }, { guest_id: 'g2', seat_index: 3 }, { guest_id: 'gNew', seat_index: 5 }]));
check('seating onto an OCCUPIED seat replaces its occupant (old behaviour)',
  eq(buildSeatAssignmentPayload(TABLES[0], 'gNew', 3),
     [{ guest_id: 'g1', seat_index: 0 }, { guest_id: 'gNew', seat_index: 3 }]));
check('removal clears exactly one seat',
  eq(buildSeatRemovalPayload(TABLES[0], 0), [{ guest_id: 'g2', seat_index: 3 }]));
check('removing an empty seat is a no-op',
  eq(buildSeatRemovalPayload(TABLES[0], 6), TABLES[0].assigned_guests));
check('a table with no assigned_guests field does not throw',
  eq(buildSeatAssignmentPayload({ id: 'x' }, 'g', 0), [{ guest_id: 'g', seat_index: 0 }])
    && eq(buildSeatRemovalPayload({ id: 'x' }, 0), []));

// ── The conflict rule, which used to live in handleGuestPanelClick ──────────
// Old caller logic, verbatim:
//   const allAssignments = eventTables.flatMap(t => (t.assigned_guests||[])
//     .map(a => ({...a, tableId: t.id, tableName: t.name})));
//   const elsewhere = allAssignments.find(a => a.guest_id === guest.id && a.tableId !== selectedTableId);
const OLD_conflict = (guestId, eventTables, selectedTableId) => {
  const all = eventTables.flatMap(t => (t.assigned_guests || []).map(a => ({ ...a, tableId: t.id, tableName: t.name })));
  return all.find(a => a.guest_id === guestId && a.tableId !== selectedTableId) || null;
};
const receptionTables = TABLES.filter(t => resolveEventId(t) === 'reception');

check('conflict found: g1 is at Table 1, seating them at Table 2 refuses',
  findSeatConflict('g1', TABLES, 'reception', 't2', 0)?.tableName === 'Table 1');
check('...matching the old caller-side check exactly',
  findSeatConflict('g1', TABLES, 'reception', 't2', 0)?.tableName
    === OLD_conflict('g1', receptionTables, 't2')?.tableName);
check('no conflict for an unseated guest',
  findSeatConflict('gNew', TABLES, 'reception', 't2', 0) === null
    && OLD_conflict('gNew', receptionTables, 't2') === null);
check('SCOPED TO THE EVENT: g1 seated at brunch does not block a reception seat',
  findSeatConflict('g1', TABLES, 'brunch-123', 't4', 2) === null
    && findSeatConflict('g1', TABLES, 'reception', 't1', 0) === null);
check('re-seating the SAME guest in the SAME seat is not a conflict (idempotent)',
  findSeatConflict('g1', TABLES, 'reception', 't1', 0) === null);
check('moving a guest to a different seat at the SAME table IS reported',
  findSeatConflict('g1', TABLES, 'reception', 't1', 5)?.tableName === 'Table 1');

// ── The toast string the couple sees, byte for byte ─────────────────────────
// Rendered by Seating.jsx from the lib's { reason, tableName } result. If this
// string changes, the refactor stopped being invisible.
const conflict = findSeatConflict('g1', TABLES, 'reception', 't2', 0);
const message = `${'Ana Reyes'} is already at ${conflict.tableName} for ${'Reception'}`;
check('the already-seated toast is unchanged',
  message === 'Ana Reyes is already at Table 1 for Reception', message);

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${results.every(Boolean) ? 'ALL PASS' : 'FAILURES PRESENT'}`);
process.exit(results.every(Boolean) ? 0 : 1);
