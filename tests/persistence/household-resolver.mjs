/**
 * tests/persistence/household-resolver.mjs
 *
 * ONE INVITATION, SEVERAL PEOPLE, AND ONE MODULE THAT DECIDES.
 *
 * Item 1 of goals/2026-10-07-households-and-children.md. src/lib/household.js
 * is the only place that knows what a household is; every surface in items 2
 * through 7 reads it. A resolver nothing holds to its rules becomes four
 * slightly different resolvers, which is how the Guests page and the daily
 * update came to disagree about replies before guestRsvpTally.js existed.
 *
 * Everything here is driven: the module is pure, so there is nothing to scan.
 *
 * ── THE THREE THINGS MOST LIKELY TO GO WRONG LATER ─────────────────────────
 *
 *   THE EMPTY STRING. household_id is free text written by a CSV column, and a
 *   blank cell arrives as ''. If '' were a household every row with a blank
 *   cell would group into one enormous invitation. Asserted directly.
 *
 *   THE id TIEBREAK. The import creates a whole file in one Promise.all, so two
 *   rows in a household can share created_date to the second. Without a final
 *   tiebreak the lead is whatever order the list arrived in, which is stable
 *   until the day it is not.
 *
 *   THE COPY THAT MUST NOT UNPUBLISH AN EVENT. entriesForNewMember copies only
 *   what the lead has stored, because a full resolved set would write
 *   invited:false for events the lead is not invited to and a false is a
 *   removal that takes the event off the public site. publicEventIds is
 *   asserted on both sides of the copy, which is the only way to catch it.
 */

import { pass, fail } from './_shared.mjs';
import {
  membersOf, leadOf, salutation, counts, householdIdOf, isChild, entriesForNewMember,
} from '../../src/lib/household.js';
import { publicEventIds } from '../../src/lib/guestEventVisibility.js';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

const WEDDING = {
  mainCeremony: { startTime: '14:00' },
  reception:    { startTime: '18:00' },
  preWeddingEvents: [{ event_id: 'wd', name: 'Welcome drinks', date: '2027-06-10' }],
};

/** The goal's own fixture: Priya leads, Dev is an adult, Mina is six. */
const g = (id, name, over = {}) => ({ id, name, created_date: '2027-01-01T00:00:00Z', ...over });
const PRIYA = g('g1', 'Priya Patel', { household_id: 'h1', email: 'priya@example.com' });
const DEV   = g('g2', 'Dev Patel',   { household_id: 'h1' });
const MINA  = g('g3', 'Mina Patel',  { household_id: 'h1', is_child: true, child_age: 6 });
const HOUSE = [DEV, MINA, PRIYA];   // deliberately not in lead order

export async function runHouseholdResolver() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── GROUPING ────────────────────────────────────────────────────────────

  check('a household reads lead first, whatever order it arrived in',
        membersOf(DEV, HOUSE).map((x) => x.name), ['Priya Patel', 'Dev Patel', 'Mina Patel']);

  check('  and the order is the same read from any member',
        membersOf(MINA, HOUSE).map((x) => x.id), membersOf(PRIYA, HOUSE).map((x) => x.id));

  check('a guest with no household_id is their own invitation',
        membersOf(g('s', 'Solo'), HOUSE).map((x) => x.name), ['Solo']);

  check('  and so is one whose household_id is blank',
        membersOf(g('s', 'Solo', { household_id: '   ' }), HOUSE).map((x) => x.name), ['Solo']);

  check('the key is trimmed, so " h1 " is the same household as "h1"',
        [householdIdOf({ household_id: ' h1 ' }), householdIdOf({ household_id: '' }),
         householdIdOf({ household_id: '  ' }), householdIdOf({})],
        ['h1', null, null, null]);

  // A FRESH ROW, OR A FILTERED VIEW. The guest handed in may not be in the
  // list, and leaving them out of their own household is a worse answer than
  // including them. Written as a literal expectation: the first draft of this
  // case compared membersOf against ITSELF, which is a check that cannot fail
  // and reads exactly like one that can.
  const LATE = g('g9', 'Late Arrival', { household_id: 'h1', created_date: '2027-01-02T00:00:00Z' });
  check('a guest missing from the list given is still in their own household',
        membersOf(LATE, HOUSE).map((x) => x.name),
        ['Priya Patel', 'Dev Patel', 'Mina Patel', 'Late Arrival']);
  ok('  and is not duplicated when they ARE in the list',
     membersOf(LATE, [...HOUSE, LATE]).length === 4, '4 members, not 5');

  // A ROW WITH NO id YET, WHICH IS NOT HYPOTHETICAL. The CSV import groups
  // rows BEFORE they are created, so every row in that list has no id and an
  // id-only identity check duplicated each of them. Found by item 6's
  // round-trip guard, which asked for the members of an imported household and
  // got four names for three people.
  {
    const a = { name: 'Priya', household_id: 'h9' };
    const b = { name: 'Dev', household_id: 'h9' };
    const c = { name: 'Mina', household_id: 'h9' };
    check('a household of rows with no ids yet is not duplicated',
          membersOf(a, [a, b, c]).map((x) => x.name).sort(), ['Dev', 'Mina', 'Priya']);
    check('  and one genuinely absent from the list is still added once',
          membersOf({ name: 'Rohan', household_id: 'h9' }, [a, b, c]).length, 4);
  }

  // ── THE LEAD RULE, CLAUSE BY CLAUSE ─────────────────────────────────────

  check('the member with an email leads', leadOf(HOUSE).name, 'Priya Patel');

  check('  an email beats an earlier created_date',
        leadOf([g('a', 'Abe', { created_date: '2026-01-01T00:00:00Z' }),
                g('b', 'Bea', { created_date: '2027-06-01T00:00:00Z', email: 'bea@example.com' })]).name,
        'Bea');

  check('  among several emails, the earliest created leads',
        leadOf([g('a', 'Abe', { created_date: '2027-02-01T00:00:00Z', email: 'a@example.com' }),
                g('b', 'Bea', { created_date: '2027-01-01T00:00:00Z', email: 'b@example.com' })]).name,
        'Bea');

  check('  with no email at all, the earliest created leads',
        leadOf([g('a', 'Abe', { created_date: '2027-02-01T00:00:00Z' }),
                g('b', 'Bea', { created_date: '2027-01-01T00:00:00Z' })]).name,
        'Bea');

  // A MALFORMED ADDRESS IS NOT AN ADDRESS. The lead is who the card is sent to.
  check('  a typo for an email does not win the lead',
        leadOf([g('a', 'Abe', { created_date: '2027-01-02T00:00:00Z', email: 'not-an-address' }),
                g('b', 'Bea', { created_date: '2027-01-01T00:00:00Z' })]).name,
        'Bea');

  // THE TIEBREAK. Same date, no emails: id ascending, every time, from any
  // starting order.
  const tieA = g('gA', 'Abe', { created_date: '2027-01-01T00:00:00Z' });
  const tieB = g('gB', 'Bea', { created_date: '2027-01-01T00:00:00Z' });
  check('ties on created_date break by id ascending',
        [leadOf([tieA, tieB]).id, leadOf([tieB, tieA]).id], ['gA', 'gA']);

  check('  and the tiebreak applies among emailed members too',
        leadOf([g('gB', 'Bea', { created_date: '2027-01-01T00:00:00Z', email: 'b@example.com' }),
                g('gA', 'Abe', { created_date: '2027-01-01T00:00:00Z', email: 'a@example.com' })]).id,
        'gA');

  check('an empty household has no lead', leadOf([]), null);
  check('  and neither does a list of nothing', leadOf(undefined), null);

  // ── THE SALUTATION ──────────────────────────────────────────────────────

  check('the fixture reads "Priya and Dev", with Mina left out',
        salutation(HOUSE), 'Priya and Dev');

  const adult = (n, name) => g(n, name, { created_date: `2027-01-0${n}T00:00:00Z` });
  check('one adult', salutation([adult(1, 'Priya P')]), 'Priya');
  check('two adults', salutation([adult(1, 'Priya P'), adult(2, 'Dev P')]), 'Priya and Dev');
  check('three adults, no Oxford comma',
        salutation([adult(1, 'Priya P'), adult(2, 'Dev P'), adult(3, 'Mina P')]),
        'Priya, Dev and Mina');
  check('four adults', salutation([adult(1, 'A A'), adult(2, 'B B'), adult(3, 'C C'), adult(4, 'D D')]),
        'A, B, C and D');

  check('children never appear, however many there are',
        salutation([PRIYA, MINA, g('g4', 'Rohan Patel', { household_id: 'h1', is_child: true })]),
        'Priya');

  check('a household of only children has no salutation',
        salutation([MINA]), null);

  // greetableFirstName's #825 rule: a household-shaped name yields nothing.
  check('a member whose name is a household phrase contributes nothing',
        salutation([g('f', 'The Patel Family')]), null);
  check('  and is skipped rather than blanking the whole line',
        salutation([g('f', 'The Patel Family'), adult(2, 'Dev P')]), 'Dev');

  // ── THE COUNTS ──────────────────────────────────────────────────────────

  check('the fixture plus two singles',
        counts([...HOUSE, g('s1', 'Solo'), g('s2', 'Tiny', { is_child: true })]),
        { people: 5, adults: 3, children: 2, invitations: 3 });

  check('one household of three is one invitation',
        counts(HOUSE), { people: 3, adults: 2, children: 1, invitations: 1 });

  check('three people with no household are three invitations',
        counts([g('a', 'A'), g('b', 'B'), g('c', 'C')]),
        { people: 3, adults: 3, children: 0, invitations: 3 });

  check('a blank household_id counts as its own invitation, not a shared one',
        counts([g('a', 'A', { household_id: '' }), g('b', 'B', { household_id: '   ' })]).invitations, 2);

  check('an empty list is all zeros',
        counts([]), { people: 0, adults: 0, children: 0, invitations: 0 });

  ok('is_child is strict: only true is a child',
     isChild({ is_child: true }) && !isChild({ is_child: 'yes' })
     && !isChild({ is_child: 1 }) && !isChild({}), 'true only');

  // ── THE COPY, AND THE PUBLIC SET IT MUST NOT MOVE ───────────────────────

  const copyCase = (label, lead, others, expectRows) => {
    const rows = entriesForNewMember(lead);
    check(label, rows.map((r) => [r.event_id, r.invited, r.status, r.responded_at]), expectRows);
    const before = publicEventIds(WEDDING, [lead, ...others]);
    const after = publicEventIds(WEDDING, [lead, ...others, { id: 'new', event_responses: rows }]);
    check('  and publicEventIds does not move', after, before);
  };

  copyCase('a lead with no stored entries gives the member none',
           { id: 'L', event_responses: [] }, [], []);

  copyCase('stored entries are copied with status reset and the date cleared',
           { id: 'L', event_responses: [
             { event_id: 'main-ceremony', invited: true, status: 'yes', responded_at: '2027-01-01T00:00:00Z' },
             { event_id: 'reception', invited: true, status: 'no', responded_at: '2027-01-01T00:00:00Z' },
           ] }, [],
           [['main-ceremony', true, 'pending', null], ['reception', true, 'pending', null]]);

  copyCase("the lead's own invited:false is carried, not invented",
           { id: 'L', event_responses: [
             { event_id: 'main-ceremony', invited: true, status: 'no' },
             { event_id: 'wd', invited: false, status: 'pending' },
           ] }, [],
           [['main-ceremony', true, 'pending', null], ['wd', false, 'pending', null]]);

  // THE PROPERTY, STATED DIRECTLY: no event gains a false it did not have.
  const falses = (rows) => rows.filter((r) => r.invited === false).map((r) => r.event_id).sort();
  for (const [label, stored] of [
    ['none stored', []],
    ['all invited', [{ event_id: 'wd', invited: true }]],
    ['one removal', [{ event_id: 'wd', invited: false }]],
    ['two removals', [{ event_id: 'wd', invited: false }, { event_id: 'reception', invited: false }]],
  ]) {
    const lead = { id: 'L', event_responses: stored };
    results.push(JSON.stringify(falses(entriesForNewMember(lead))) === JSON.stringify(falses(stored))
      ? pass(`${label}: the copy creates no removal of its own`, JSON.stringify(falses(stored)))
      : fail(`${label}: the copy creates no removal of its own`,
             JSON.stringify(falses(stored)), JSON.stringify(falses(entriesForNewMember(lead)))));
  }

  check('the answer is not inherited: meal, plus-ones and names reset',
        entriesForNewMember({ event_responses: [
          { event_id: 'x', invited: true, status: 'yes', meal_choice: 'fish',
            plus_ones: 1, plus_one_names: ['Sam'], responded_at: '2027-01-01T00:00:00Z' },
        ] })[0],
        { event_id: 'x', invited: true, status: 'pending', meal_choice: null,
          plus_ones: 0, plus_one_names: [], responded_at: null });

  // AN ENTRY WITH NO invited KEY IS NOT AN INVITATION. The resolver reads an
  // absent key as not-invited, and `invited: r.invited === true` is what keeps
  // the copy agreeing with it. Pinned because the obvious alternative,
  // `!== false`, is identical on every entry a real row carries and differs
  // only here: a revert to it left this guard green on the first attempt.
  check('an entry with no invited key copies as not invited',
        entriesForNewMember({ event_responses: [{ event_id: 'x', status: 'yes' }] })[0].invited, false);

  check('an entry with no event_id is dropped rather than copied blank',
        entriesForNewMember({ event_responses: [{ invited: true }, { event_id: 'x', invited: true }] })
          .map((r) => r.event_id), ['x']);

  // NO UNDECLARED KEY. Base44 drops them silently, so a typo would look like
  // data loss months later. Read from the mirror rather than written out again.
  const guestSchema = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'base44/entities/Guest.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  const declared = new Set(Object.keys(guestSchema.properties.event_responses.items.properties));
  const written = new Set();
  for (const r of entriesForNewMember({ event_responses: [{ event_id: 'x', invited: true }] })) {
    Object.keys(r).forEach((k) => written.add(k));
  }
  check('every key the copy writes is declared in the Guest mirror',
        [...written].filter((k) => !declared.has(k)), []);

  // ── THE THREE FIELDS THIS GOAL RUNS ON ARE DECLARED ─────────────────────

  ok('household_id, is_child and child_age are all in the mirror',
     ['household_id', 'is_child', 'child_age'].every((k) => k in guestSchema.properties),
     'mirrored in #899');

  // ── statusWrite.js NAMES THIS AS THE THIRD RULE ─────────────────────────
  //
  // The goal asks for it explicitly: a reader looking for the rules about
  // event_responses looks there, and a third kind of write that is only
  // documented in its own file is a rule nobody finds.
  const sw = fs.readFileSync(path.join(ROOT, 'src/lib/statusWrite.js'), 'utf8');
  ok('statusWrite.js says there are three kinds of write',
     /THREE KINDS OF WRITE TO event_responses/.test(sw), 'three, not two');
  ok('  and names the household copy and where it lives',
     /A HOUSEHOLD COPY/.test(sw) && /household\.js as entriesForNewMember/.test(sw), 'pointed at');
  ok('  and gives the public-site reason it is not the full set',
     /unpublishes the event/.test(sw), 'the reason, not just the rule');

  return results;
}
