/**
 * scripts/test-attendees.mjs
 *
 * Assertions for src/lib/attendees.js — the canonical attendee resolver.
 *
 * Plain Node, no browser, no auth, no network. These are the properties that
 * must hold for ANY input, so they are asserted against constructed records
 * that deliberately cover every branch, including the ones the 202 live records
 * do not currently exercise.
 *
 * The live-data identity (242 attendees = 202 primaries + 40 plus-ones) is a
 * fact about one specific database, not a property of the function, and is
 * verified separately by scripts/verify-attendees-live.mjs, which needs
 * credentials this environment does not have.
 */

import {
  resolveAttendees,
  attendsAsPlusOne,
  plusOneIdFor,
  isPlusOneId,
  hostIdFromAttendeeId,
  PLUS_ONE_ID_SUFFIX,
} from '../src/lib/attendees.js';
import { plusOneRsvpStatus, hasPlusOne } from '../src/lib/plusOne.js';
import { isAttending, isDeclined, isPending, tallyAttendees } from '../src/lib/guestRsvpTally.js';

const results = [];
function check(label, pass, detail = '') {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${pass || !detail ? '' : `  -> ${detail}`}`);
}

// Real Base44 ids are 24-char lowercase hex (Mongo ObjectId shape).
// Built by string concatenation, NOT arithmetic: 68731d183f075e406eda2236 as a
// Number is ~6.9e25, far past MAX_SAFE_INTEGER, so `base + n` returns the same
// float for every n and every fixture silently shares one id. That produced 7
// duplicate ids across 9 attendees on the first run of this file.
const oid = (n) => `68731d183f075e406eda${String(n).padStart(4, '0')}`;

const guests = [
  // plain primary, no plus-one
  { id: oid(1), name: 'Ana Reyes', email: 'ana@example.com', rsvp_status: 'attending', meal_choice: 'Fish', dietary_restrictions: 'None' },
  // plus-one with a name only (no email) — the 9 records #416 was about
  { id: oid(2), name: 'Ben Ford', email: 'ben@example.com', rsvp_status: 'attending',
    plus_one: true, plus_one_name: 'Cara Ford', plus_one_rsvp: 'attending',
    plus_one_meal_choice: 'Beef', plus_one_dietary_restrictions: 'Gluten free' },
  // plus-one with an email only, no name -> display name falls back
  { id: oid(3), name: 'Dee Okafor', email: 'dee@example.com', rsvp_status: 'pending',
    plus_one: true, plus_one_email: 'guest@example.com' },
  // DERIVED status present -> must win over the flat column
  { id: oid(4), name: 'Eli Novak', email: 'eli@example.com', rsvp_status: 'attending',
    plus_one: true, plus_one_name: 'Fay Novak', plus_one_rsvp: 'pending', plus_one_rsvp_status: 'declined' },
  // the PERMISSION case: flag set, nobody named -> NOT an attendee
  { id: oid(5), name: 'Gus Pratt', email: 'gus@example.com', rsvp_status: 'pending', plus_one: true },
  // flag set, whitespace-only name -> still nobody
  { id: oid(6), name: 'Hana Ito', email: 'hana@example.com', rsvp_status: 'pending', plus_one: true, plus_one_name: '   ' },
  // no id -> skipped entirely
  { name: 'No Id', email: 'noid@example.com', rsvp_status: 'attending', plus_one: true, plus_one_name: 'Ghost' },
];

const attendees = resolveAttendees(guests);
const primaries = attendees.filter(a => !a.isPlusOne);
const plusOnes = attendees.filter(a => a.isPlusOne);

// ── shape and totals ────────────────────────────────────────────────────────
check('6 primaries (the record with no id is skipped)', primaries.length === 6, `got ${primaries.length}`);
check('3 plus-ones (name-only, email-only, derived)', plusOnes.length === 3, `got ${plusOnes.length}`);
check('total is primaries + plus-ones', attendees.length === primaries.length + plusOnes.length);

// ── the permission flag is not a person ─────────────────────────────────────
check('plus_one:true with no name/email yields NO attendee',
  !attendees.some(a => a.hostGuestId === oid(5)),
  'a bare permission flag was counted as a head');
check('plus_one:true with whitespace-only name yields NO attendee',
  !attendees.some(a => a.hostGuestId === oid(6)));
check('attendsAsPlusOne() is false for the bare flag', attendsAsPlusOne(guests[4]) === false);
check('...while plusOne.js hasPlusOne() is true for it (the deliberate divergence)',
  hasPlusOne(guests[4]) === true);

// ── ids: unique, deterministic, non-colliding, reversible ───────────────────
const ids = attendees.map(a => a.id);
check('every attendee id is unique', new Set(ids).size === ids.length,
  `${ids.length - new Set(ids).size} duplicate(s)`);

const second = resolveAttendees(guests);
check('ids are deterministic across two runs',
  JSON.stringify(second.map(a => a.id)) === JSON.stringify(ids));

const realIds = new Set(guests.filter(g => g.id).map(g => g.id));
check('no synthetic id collides with any real guest id',
  plusOnes.every(a => !realIds.has(a.id)));
check('no synthetic id is 24-char hex (cannot be mistaken for a Base44 id)',
  plusOnes.every(a => !/^[0-9a-f]{24}$/.test(a.id)));

check('host id round-trips out of every synthetic id',
  plusOnes.every(a => hostIdFromAttendeeId(a.id) === a.hostGuestId));
check('hostIdFromAttendeeId returns null for a real id',
  primaries.every(a => hostIdFromAttendeeId(a.id) === null));
check('isPlusOneId agrees with isPlusOne on every attendee',
  attendees.every(a => isPlusOneId(a.id) === a.isPlusOne));
check('plusOneIdFor is pure', plusOneIdFor('abc') === `abc${PLUS_ONE_ID_SUFFIX}`);

// ── RSVP must match plusOne.js byte for byte ────────────────────────────────
const byHost = new Map(guests.filter(g => g.id).map(g => [g.id, g]));
const rsvpMismatches = plusOnes.filter(a => a.rsvp_status !== plusOneRsvpStatus(byHost.get(a.hostGuestId)));
check('every plus-one RSVP equals plusOne.js plusOneRsvpStatus()',
  rsvpMismatches.length === 0,
  rsvpMismatches.map(a => `${a.id}: ${a.rsvp_status}`).join('; '));
check('derived status beats the flat column',
  attendees.find(a => a.hostGuestId === oid(4))?.rsvp_status === 'declined');
check('flat column is used when no derived status exists',
  attendees.find(a => a.hostGuestId === oid(2))?.rsvp_status === 'attending');
check('defaults to pending when neither exists',
  attendees.find(a => a.hostGuestId === oid(3))?.rsvp_status === 'pending');

// ── THE REGRESSION GUARD ────────────────────────────────────────────────────
// The whole reason the Attendee is snake_case. With `.rsvpStatus` these three
// predicates returned false for EVERY attendee, silently, and five counters
// would have become zero without a single error.
const predicateDrift = primaries.filter(a => {
  const g = byHost.get(a.id);
  return isAttending(a) !== isAttending(g)
      || isDeclined(a)  !== isDeclined(g)
      || isPending(a)   !== isPending(g);
});
check('isAttending/isDeclined/isPending agree between a primary attendee and its Guest',
  predicateDrift.length === 0,
  predicateDrift.map(a => `${a.id}: attendee=${a.rsvp_status} guest=${byHost.get(a.id)?.rsvp_status}`).join('; '));
check('at least one attendee of each status is covered by that guard',
  new Set(primaries.map(a => a.rsvp_status)).size >= 2,
  `only ${new Set(primaries.map(a => a.rsvp_status)).size} distinct status(es) in the fixtures`);
check('the predicates actually fire on attendees (not vacuously false)',
  primaries.some(a => isAttending(a)) && primaries.some(a => isPending(a)));

// ── guest-only fields are absent BY DESIGN ──────────────────────────────────
check('attendees carry no guest-only fields (invite_sent_at/table_assignment/event_responses/guest)',
  attendees.every(a => a.invite_sent_at === undefined && a.table_assignment === undefined
    && a.event_responses === undefined && a.guest === undefined));

// ── tallyAttendees ──────────────────────────────────────────────────────────
const t = tallyAttendees(attendees);
check('tallyAttendees halves sum to the combined total',
  t.primaries.total + t.plusOnes.total === t.combined.total && t.combined.total === attendees.length);
check('tallyAttendees partitions on isPlusOne',
  t.primaries.total === primaries.length && t.plusOnes.total === plusOnes.length);
check('tallyAttendees attending matches a manual count',
  t.combined.attending === attendees.filter(a => a.rsvp_status === 'attending').length);
check('tallyAttendees responded excludes pending',
  t.combined.responded === t.combined.total - t.combined.pending);

// ── carried fields ──────────────────────────────────────────────────────────
const cara = attendees.find(a => a.hostGuestId === oid(2));
check('plus-one carries its own meal and dietary fields',
  cara.meal_choice === 'Beef' && cara.dietary_restrictions === 'Gluten free');
check('plus-one with no name gets a neutral display name',
  attendees.find(a => a.hostGuestId === oid(3))?.name === 'Plus one');
check('primary carries its own fields untouched',
  primaries[0].name === 'Ana Reyes' && primaries[0].meal_choice === 'Fish' && primaries[0].rsvp_status === 'attending');

// ── ordering ────────────────────────────────────────────────────────────────
check('each plus-one immediately follows its host',
  plusOnes.every(a => attendees[attendees.indexOf(a) - 1]?.id === a.hostGuestId));

// ── input tolerance ─────────────────────────────────────────────────────────
check('empty input yields an empty list', resolveAttendees([]).length === 0);
check('non-array input yields an empty list',
  resolveAttendees(null).length === 0 && resolveAttendees(undefined).length === 0);
check('null entries are skipped', resolveAttendees([null, guests[0]]).length === 1);

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${results.every(Boolean) ? 'ALL PASS' : 'FAILURES PRESENT'}`);
process.exit(results.every(Boolean) ? 0 : 1);
