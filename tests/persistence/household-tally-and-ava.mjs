/**
 * tests/persistence/household-tally-and-ava.mjs
 *
 * THE GUEST LIST, COUNTED BOTH WAYS, WHEREVER IT IS REPORTED.
 *
 * Item 7 of goals/2026-10-07-households-and-children.md. The Guests page
 * learned the four numbers in item 2; this is the daily update and Ava.
 *
 * ── TWO LIVE DEFINITIONS OF "INVITATION", AND ONLY ONE IS CHANGING ─────────
 *
 * guestRsvpTally.js counts one invitation per GUEST ROW. That is the owner's
 * 94-versus-61 ruling and the daily update's "Invitations pending" tile reads
 * it. household.js counts one invitation per HOUSEHOLD. Once a household
 * exists the two disagree: three people on one card are three by the first and
 * one by the second.
 *
 * Nothing here moves the ruled number. The household count gets its own strip
 * in the words the Guests page already uses, and this guard pins BOTH
 * definitions so the disagreement is on the record rather than discovered by a
 * couple comparing two numbers on one screen.
 *
 * Everything is driven: the counts and the sentence are pure, and Ava's
 * context builder is the one that was split out to be testable.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { householdCountLine } from '../../src/lib/eventTallies.js';
import { counts } from '../../src/lib/household.js';
import { guestCounts } from '../../src/lib/guestRsvpTally.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const g = (id, name, over = {}) => ({
  id, name, rsvp_status: 'pending', created_date: '2027-01-01T00:00:00Z', event_responses: [], ...over,
});
const HOUSE = [
  g('g1', 'Priya Patel', { household_id: 'h1', email: 'priya@example.com' }),
  g('g2', 'Dev Patel', { household_id: 'h1' }),
  g('g3', 'Mina Patel', { household_id: 'h1', is_child: true, child_age: 6 }),
  g('g4', 'Anna Singh'),
];

export async function runHouseholdTallyAndAva() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE SENTENCE AVA IS GIVEN ───────────────────────────────────────────

  check('the four numbers, as one line',
        householdCountLine(HOUSE), '4 people across 2 invitations, of whom 3 adults and 1 child');

  // PLURALISED, INCLUDING THE AWKWARD ONES. A model reproduces "1 adults" in
  // an answer to the couple.
  check('one of everything reads correctly',
        householdCountLine([g('a', 'A')]), '1 person across 1 invitation, of whom 1 adult and 0 children');
  check('one adult and one child',
        householdCountLine([g('a', 'A'), g('b', 'B', { is_child: true })]),
        '2 people across 2 invitations, of whom 1 adult and 1 child');
  check('an empty list says so rather than throwing',
        householdCountLine([]), '0 people across 0 invitations, of whom 0 adults and 0 children');
  check('  and so does no argument at all', householdCountLine(), '0 people across 0 invitations, of whom 0 adults and 0 children');

  // ONE SOURCE. The sentence must agree with the resolver, digit for digit,
  // because the Guests page renders the resolver and Ava reads the sentence.
  const c = counts(HOUSE);
  ok('the sentence agrees with the resolver it came from',
     householdCountLine(HOUSE).includes(`${c.people} people`)
     && householdCountLine(HOUSE).includes(`${c.invitations} invitations`)
     && householdCountLine(HOUSE).includes(`${c.adults} adults`)
     && householdCountLine(HOUSE).includes(`${c.children} child`),
     `people ${c.people}, invitations ${c.invitations}, adults ${c.adults}, children ${c.children}`);

  ok('and it is routed through eventTallies.js, next to the per-event numbers',
     /export function householdCountLine/.test(read('src/lib/eventTallies.js'))
     && /counts as householdCounts \} from '\.\/household\.js'/.test(read('src/lib/eventTallies.js')),
     'one module for Ava\'s guest-list numbers, one place that counts');

  // ── THE TWO DEFINITIONS, BOTH PINNED ────────────────────────────────────
  //
  // This is the finding this guard exists to hold. If either number is ever
  // made to agree with the other, that is a ruling and this check should fail
  // until it is recorded.
  const byRow = guestCounts(HOUSE);
  check('guestRsvpTally counts one invitation per GUEST ROW: four',
        byRow.invitations.total, 4);
  check('household.js counts one per HOUSEHOLD: two', counts(HOUSE).invitations, 2);
  ok('  so the two disagree on this list, deliberately and on the record',
     byRow.invitations.total !== counts(HOUSE).invitations,
     `${byRow.invitations.total} rows versus ${counts(HOUSE).invitations} households`);

  // ── AVA'S CONTEXT, DRIVEN ───────────────────────────────────────────────

  if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = { getItem: () => null };
  }
  const { formatWeddingContext } = await import('../../src/lib/avaContextFormat.js');
  const ctx = formatWeddingContext({
    guests: HOUSE,
    wd: { weddingDate: '2027-06-12', mainCeremony: { startTime: '14:00', venueName: 'X' },
          reception: { startTime: '18:00', venueName: 'Y' } },
    user: { full_name: 'A', email: 'a@b.c' },
  });

  ok('Ava is given the line', ctx.includes('4 people across 2 invitations, of whom 3 adults and 1 child'),
     'present, verbatim');
  ok('  and told the two questions are different before she reads it',
     /different questions and must not be mixed/.test(ctx), 'stated, not implied');
  ok('  above the per-event block, which refers to invitations too',
     ctx.indexOf('HOW MANY PEOPLE, AND HOW MANY INVITATIONS') < ctx.indexOf('EVENTS. REPLIES ARE COUNTED PER INVITATION'),
     'ordered');
  // MATCHED ON THE BLOCK'S OWN MARKER, not on "GUEST LIST". The first draft of
  // this check compared indexOf('GUEST LIST') against a heading that itself
  // began "THE GUEST LIST, COUNTED BOTH WAYS", so it compared my own line with
  // itself and failed for a reason that had nothing to do with order. The
  // heading is renamed as well, because two blocks opening with the same four
  // words is also worse for the model reading them.
  ok('  and above the guest list itself',
     ctx.indexOf('HOW MANY PEOPLE, AND HOW MANY INVITATIONS') < ctx.indexOf('GUEST LIST \u2014 individual RSVPs'),
     'ordered');
  ok('  and nothing else in the context opens with those four words',
     (ctx.match(/THE GUEST LIST/g) || []).length === 0, 'no shadowing heading');

  // ── THE DAILY UPDATE ────────────────────────────────────────────────────

  const page = read('src/pages/DailyUpdate.jsx');
  ok('the daily update counts through the one resolver',
     /householdCounts\(guests\)/.test(page), 'household.js');
  ok('  and renders the words the Guests page uses',
     /\{hhCounts\.people\} guests across \{hhCounts\.invitations\} invitations/.test(page),
     "the owner's approved copy");
  ok('  with adults and children only when there are children',
     /hhCounts\.children > 0 && \(/.test(page), 'conditional');
  ok('  in its own strip, not as a tile beside "Invitations pending"',
     /data-household-counts/.test(page) && /By household/.test(page), 'its own heading');

  // THE RULED TILE IS UNTOUCHED. Changing what it means would move the
  // 94-versus-61 ruling, which is not this item's to move.
  ok('the "Invitations pending" tile still reads guestRsvpTally',
     /\{ label: 'Invitations pending', *value: String\(counts\.invitations\.pending\) \}/.test(page),
     'unchanged');
  ok('  and guestRsvpTally itself is not household-aware',
     !/household/i.test(read('src/lib/guestRsvpTally.js')), 'the ruled number is unmoved');

  return results;
}
