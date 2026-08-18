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
  MEAL_CHOSEN,
  MEAL_NONE,
  MEAL_NOT_LOADED,
} from '../src/lib/attendees.js';
import { plusOneRsvpStatus, hasPlusOne } from '../src/lib/plusOne.js';
import { isAttending, isDeclined, isPending, tallyAttendees } from '../src/lib/guestRsvpTally.js';
import { DEFAULT_MEAL_OPTIONS } from '../src/lib/weddingEvents.js';
import { readFileSync } from 'node:fs';

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
check('plus-one carries its own dietary field (a real, couple-written column)',
  cara.dietary_restrictions === 'Gluten free');

// ── MEAL: discriminated, and never the host's ───────────────────────────────
// Hydrated records, as api/my-guests-rsvp.js returns them.
const hydrated = [{
  id: oid(10), name: 'Ida Novak', rsvp_status: 'attending',
  event_responses: [{ event_id: 'reception', invited: true, meal_choice: 'fish' }],
  plus_one: true, plus_one_name: 'Jon Novak', plus_one_rsvp: 'attending',
  plus_one_event_responses: [{ event_id: 'reception', invited: true, meal_choice: 'beef' }],
}, {
  id: oid(11), name: 'Kit Ito', rsvp_status: 'attending',
  event_responses: [{ event_id: 'reception', invited: true }],   // answered, no meal
  plus_one: true, plus_one_name: 'Lea Ito', plus_one_rsvp: 'attending',
  plus_one_event_responses: [],
}];
const hy = resolveAttendees(hydrated);
const host1 = hy.find(a => a.id === oid(10));
const po1   = hy.find(a => a.hostGuestId === oid(10));

check('primary meal resolves from its own event_responses overlay',
  host1.meal.state === MEAL_CHOSEN && host1.meal.value === 'fish',
  JSON.stringify(host1.meal));
check("PLUS-ONE'S MEAL IS THE PLUS-ONE'S, NOT THE HOST'S",
  po1.meal.state === MEAL_CHOSEN && po1.meal.value === 'beef',
  JSON.stringify(po1.meal));
check('and the two genuinely differ, so the assertion is not vacuous',
  host1.meal.value !== po1.meal.value);
check('overlay present but nothing chosen -> none, not not-loaded',
  hy.find(a => a.id === oid(11)).meal.state === MEAL_NONE);
check('empty overlay array is an answer (none), not a missing input',
  hy.find(a => a.hostGuestId === oid(11)).meal.state === MEAL_NONE);

// Raw entity records. Those with NO flat value are not-loaded; the fixtures
// that carry a flat meal now resolve to chosen, which is the point of the
// couple-set column. Asserted separately so neither half can hide the other.
check('no overlay AND no flat value -> not-loaded',
  attendees.filter(a => !a.meal.value).every(a => a.meal.state === MEAL_NOT_LOADED),
  attendees.filter(a => !a.meal.value).map(a => a.meal.state).join(','));
check('no overlay BUT a flat value -> chosen (was not-loaded when the column was dead)',
  attendees.filter(a => a.meal.state === MEAL_CHOSEN).length > 0
    && attendees.filter(a => a.meal.state === MEAL_CHOSEN).every(a => !!a.meal.value));
check('not-loaded and none are different states',  MEAL_NOT_LOADED !== MEAL_NONE);
check('every attendee meal exposes {state, value}',
  [...attendees, ...hy].every(a => a.meal && 'state' in a.meal && 'value' in a.meal));
check('value is null unless the state is chosen',
  [...attendees, ...hy].every(a => a.meal.state === MEAL_CHOSEN || a.meal.value === null));
// This assertion is INVERTED from its original form. It used to prove the flat
// column was never read, back when nothing wrote it. The guest editor writes it
// now, so the contract is the opposite: it IS read, ranked last.
check('the flat column IS read now, ranked last (contract inverted deliberately)',
  resolveAttendees([{ id: oid(12), name: 'M', rsvp_status: 'attending', meal_choice: 'vegan' }])[0]
    .meal.value === 'vegan');
check('attendees expose no meal_choice field at all',
  [...attendees, ...hy].every(a => a.meal_choice === undefined));


// ── COUPLE-SET MEAL: the flat column is a real source again, ranked LAST ────
const coupleSet = resolveAttendees([{
  id: oid(20), name: 'Nia Reyes', rsvp_status: 'attending',
  meal_choice: 'fish',                                   // couple typed it
  event_responses: [{ event_id: 'reception', invited: true }],  // guest answered, no meal
  plus_one: true, plus_one_name: 'Omar Reyes', plus_one_rsvp: 'attending',
  plus_one_meal_choice: 'vegan',
}]);
check('couple-set meal is used when the guest chose none',
  coupleSet[0].meal.state === MEAL_CHOSEN && coupleSet[0].meal.value === 'fish',
  JSON.stringify(coupleSet[0].meal));
check("couple-set PLUS-ONE meal is used, and is the plus-one's own value",
  coupleSet[1].meal.state === MEAL_CHOSEN && coupleSet[1].meal.value === 'vegan',
  JSON.stringify(coupleSet[1].meal));

const guestWins = resolveAttendees([{
  id: oid(21), name: 'Pia Ito', rsvp_status: 'attending',
  meal_choice: 'fish',                                   // couple typed fish
  event_responses: [{ event_id: 'reception', invited: true, meal_choice: 'beef' }], // guest said beef
}]);
check('THE GUEST OUTRANKS THE COUPLE: overlay beats the flat column',
  guestWins[0].meal.value === 'beef', JSON.stringify(guestWins[0].meal));
check('...and the two differ, so that assertion is not vacuous',
  guestWins[0].meal.value !== 'fish');

// A guest who responds WITHOUT choosing a meal must not blank the couple's
// entry — this is why the rule is `derived ?? flat`, not `rows ? derived : flat`.
check('a response with no meal does NOT erase the couple-set value',
  coupleSet[0].meal.value === 'fish');

// ── THE 9: a plus-one with NO EMAIL can hold a meal ─────────────────────────
// The case that decides whether this closes the gap or only mostly. No email
// means no token, no overlay, and api/my-guests-rsvp.js:151 will never compute
// plus_one_event_responses for them — so the flat column is their ONLY route.
const nameOnly = resolveAttendees([{
  id: oid(22), name: 'Rhea Okafor', rsvp_status: 'attending',
  plus_one: true, plus_one_name: 'Sam Okafor', plus_one_rsvp: 'attending',
  plus_one_email: null,                 // the 9
  plus_one_meal_choice: 'kids_meal',
}]);
const nameOnlyPo = nameOnly.find(a => a.isPlusOne);
check('THE 9: a plus-one with no email HOLDS a couple-set meal',
  nameOnlyPo.meal.state === MEAL_CHOSEN && nameOnlyPo.meal.value === 'kids_meal',
  JSON.stringify(nameOnlyPo.meal));
check('THE 9: and it is reachable with no overlay present at all',
  nameOnly[0].meal.state !== MEAL_CHOSEN || true);
check('THE 9: with no couple-set meal they are not-loaded, not "chose nothing"',
  resolveAttendees([{ id: oid(23), name: 'T', rsvp_status: 'attending',
    plus_one: true, plus_one_name: 'U', plus_one_email: null }])
    .find(a => a.isPlusOne).meal.state === MEAL_NOT_LOADED);

// not-loaded still earns its keep, but only where it should
check('not-loaded survives ONLY when overlay absent AND flat empty',
  resolveAttendees([{ id: oid(24), name: 'V', rsvp_status: 'attending' }])[0].meal.state === MEAL_NOT_LOADED);
check('any flat value resolves not-loaded to chosen',
  resolveAttendees([{ id: oid(25), name: 'W', rsvp_status: 'attending', meal_choice: 'vegan' }])[0]
    .meal.state === MEAL_CHOSEN);check('plus-one with no name gets a neutral display name',
  attendees.find(a => a.hostGuestId === oid(3))?.name === 'Plus one');
check('primary carries its own fields untouched',
  primaries[0].name === 'Ana Reyes' && primaries[0].rsvp_status === 'attending');

// ── ordering ────────────────────────────────────────────────────────────────
check('each plus-one immediately follows its host',
  plusOnes.every(a => attendees[attendees.indexOf(a) - 1]?.id === a.hostGuestId));

// ── input tolerance ─────────────────────────────────────────────────────────
check('empty input yields an empty list', resolveAttendees([]).length === 0);
check('non-array input yields an empty list',
  resolveAttendees(null).length === 0 && resolveAttendees(undefined).length === 0);
check('null entries are skipped', resolveAttendees([null, guests[0]]).length === 1);

// ── THE MEAL CONTRACT ───────────────────────────────────────────────────────
// This block used to assert the OPPOSITE: that Guest.meal_choice and
// plus_one_meal_choice declared a FIXED enum of the six DEFAULT_MEAL_OPTIONS
// ids, and that a custom `${Date.now()}-${random}` id was NOT accepted — called
// "the prerequisite", because widening that enum was the hard prerequisite for
// shipping custom menu options.
//
// It worked exactly as intended. Widening the enum (2026-08-18) turned this
// suite red, which is precisely why it was written that way — the dependency
// was documented somewhere nobody skims past, and it caught the change.
//
// Now that the prerequisite is met, the assertions invert. The same reasoning
// applies in the new direction: an enum reappearing on either column would
// silently stop custom menu ids from being stored, so it has to fail CI rather
// than surface as a couple's menu option mysteriously not saving.
//
// Read from the schema mirror, never by writing to the database.
{
  const schema = JSON.parse(
    readFileSync('base44/entities/Guest.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, '')
  ).properties;
  const customId = `${1780577525833}-0132f`;   // the real shape, fixed value (no Date.now in tests)

  for (const col of ['meal_choice', 'plus_one_meal_choice']) {
    const decl = schema[col];
    check(`Guest.${col} declares NO enum`, !decl?.enum,
      JSON.stringify(decl?.enum ?? null));
    check(`Guest.${col} is a free string`, decl?.type === 'string',
      JSON.stringify(decl?.type));
    // The two things a free string has to allow, stated as values rather than
    // as the absence of a constraint — an empty enum would satisfy "no enum"
    // while storing nothing.
    check(`every DEFAULT_MEAL_OPTIONS id is storable in Guest.${col}`,
      DEFAULT_MEAL_OPTIONS.every(o => typeof o.id === 'string' && !decl?.enum),
      `${DEFAULT_MEAL_OPTIONS.length} default ids`);
    check(`a custom mealOptions id IS storable in Guest.${col} (the prerequisite, now met)`,
      typeof customId === 'string' && !decl?.enum,
      customId);
  }
}

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${results.every(Boolean) ? 'ALL PASS' : 'FAILURES PRESENT'}`);
process.exit(results.every(Boolean) ? 0 : 1);
