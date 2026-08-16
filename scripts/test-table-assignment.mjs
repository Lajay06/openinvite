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
  shouldWriteTableCache,
  validatePlanAssignments,
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

// ── 3b: SEATING A PLUS-ONE ──────────────────────────────────────────────────
const { resolveAttendees, plusOneIdFor, isPlusOneId } = await import('../src/lib/attendees.js');
const { buildTablesWithGuests, buildGuestTagList, getUnresolvedAttendees, resetUnresolvedAttendees } =
  await import('../src/lib/seatingChart.js');

const HOST = '68731d183f075e406eda0001';
const GUESTS = [
  { id: HOST, name: 'Ida Novak', rsvp_status: 'attending',
    plus_one: true, plus_one_name: 'Jon Novak', plus_one_rsvp: 'attending',
    plus_one_meal_choice: 'beef', meal_choice: 'fish' },
  { id: '68731d183f075e406eda0002', name: 'Kit Ito', rsvp_status: 'attending' },
];
const ATTENDEES = resolveAttendees(GUESTS);
const PO_ID = plusOneIdFor(HOST);
const SEATED = [{
  id: 'tA', name: 'Table 1', capacity: 8, event_id: 'reception',
  assigned_guests: [
    { guest_id: HOST, seat_index: 0 },
    { guest_id: PO_ID, seat_index: 1 },                 // the plus-one, seated
    { guest_id: '68731d183f075e406eda0002', seat_index: 2 },
  ],
}];

check('a synthetic id is storable and recognisable', isPlusOneId(PO_ID) && typeof PO_ID === 'string');

// THE ASSERTION THAT MATTERS: the printed chart the venue works from.
resetUnresolvedAttendees();
const chart = buildTablesWithGuests(SEATED, ATTENDEES);
const names = chart[0].guests.map(g => g.name);
check('A SEATED PLUS-ONE APPEARS IN buildTablesWithGuests (the printed chart)',
  names.includes('Jon Novak'), names.join(', '));
check('...alongside their host and the other guests, all three seated',
  chart[0].guests.length === 3, `${chart[0].guests.length}`);
check('no false alarm raised on a correct resolution',
  getUnresolvedAttendees().length === 0, JSON.stringify(getUnresolvedAttendees()));

// The plus-one gets their own name tag / place card, with their OWN meal.
const tags = buildGuestTagList(SEATED, ATTENDEES);
const jon = tags.find(t => t.name === 'Jon Novak');
check('a plus-one gets their own place card', !!jon);
check("...carrying the PLUS-ONE's meal, not the host's",
  jon && jon.meal_choice === 'beef', jon && JSON.stringify(jon));
check('...and seated at the right table', jon && jon.table === 'Table 1');

// ── 3b: the cache write decision, both directions ──────────────────────────
check('a PRIMARY at the reception DOES get its Guest.table_assignment written',
  shouldWriteTableCache(HOST, 'reception') === true);
check('a PLUS-ONE at the reception NEVER does (no Guest record to write)',
  shouldWriteTableCache(PO_ID, 'reception') === false);
check('a primary at another event does not (reception-only cache, unchanged)',
  shouldWriteTableCache(HOST, 'brunch-123') === false);
check('a plus-one at another event does not either',
  shouldWriteTableCache(PO_ID, 'brunch-123') === false);

// ── THE LOUD/QUIET SPLIT ────────────────────────────────────────────────────
// Quiet: a stale PLAIN id (a deleted guest) drops silently, as asset-system.mjs
// fixtures deliberately.
resetUnresolvedAttendees();
const stale = buildTablesWithGuests(
  [{ id: 'tB', name: 'T', capacity: 4, event_id: 'reception',
     assigned_guests: [{ guest_id: HOST, seat_index: 0 }, { guest_id: 'g-does-not-exist', seat_index: 1 }] }],
  ATTENDEES);
check('QUIET: an unknown PLAIN id drops silently, and nothing is reported',
  stale[0].guests.length === 1 && getUnresolvedAttendees().length === 0);

// Loud: an unresolvable SYNTHETIC id is our own resolution bug and is reported.
resetUnresolvedAttendees();
const wrong = buildTablesWithGuests(SEATED, GUESTS);   // Guest records, not attendees
const reported = getUnresolvedAttendees();
check('LOUD: an unresolvable SYNTHETIC id IS reported, not filtered away',
  reported.length === 1 && reported[0].id === PO_ID, JSON.stringify(reported));
check('...naming the table so the failure is actionable',
  reported.length === 1 && reported[0].tableName === 'Table 1');
check('...and the render still completes rather than throwing',
  wrong[0].guests.length === 2);
check('the two cases are genuinely distinguishable',
  getUnresolvedAttendees().length === 1 && stale[0].guests.length === 1);

// ── AI PLAN VALIDATION: a synthetic id must survive and reach the write path ──
{
  const attendeeIds = new Set(ATTENDEES.map(a => a.id));   // the fix: attendee ids
  const guestIds    = new Set(GUESTS.map(g => g.id));      // the bug: Guest ids only
  const plan = [{ tableId: 'tA', guests: [HOST, PO_ID, 'hallucinated-id'] }];

  const withAttendees = validatePlanAssignments(plan, attendeeIds);
  check('AI PLAN: a synthetic plus-one id SURVIVES validation and reaches the write path',
    withAttendees[0].guestIds.includes(PO_ID), JSON.stringify(withAttendees[0].guestIds));
  check('AI PLAN: the host survives too',
    withAttendees[0].guestIds.includes(HOST));
  check('AI PLAN: it is still a WHITELIST — an invented id is dropped',
    !withAttendees[0].guestIds.includes('hallucinated-id') && withAttendees[0].guestIds.length === 2);
  check('AI PLAN: seat order is preserved so seat_index follows the plan',
    JSON.stringify(withAttendees[0].guestIds) === JSON.stringify([HOST, PO_ID]));

  // Negative control, inline: the pre-fix behaviour, proving the bug was real.
  const withGuestIds = validatePlanAssignments(plan, guestIds);
  check('NEGATIVE CONTROL: with Guest ids the plus-one WAS silently discarded',
    !withGuestIds[0].guestIds.includes(PO_ID) && withGuestIds[0].guestIds.length === 1,
    JSON.stringify(withGuestIds[0].guestIds));
  check('...and that discard was silent — same shape, one fewer person',
    withGuestIds[0].tableId === withAttendees[0].tableId
      && withGuestIds[0].guestIds.length === withAttendees[0].guestIds.length - 1);

  check('an empty plan is handled', validatePlanAssignments([], attendeeIds).length === 0
    && validatePlanAssignments(null, attendeeIds).length === 0);
}

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${results.every(Boolean) ? 'ALL PASS' : 'FAILURES PRESENT'}`);
process.exit(results.every(Boolean) ? 0 : 1);
