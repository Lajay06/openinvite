/**
 * tests/persistence/rsvp-status-derived.mjs
 *
 * A GUEST'S STATUS HAS ONE SOURCE, AND IT IS event_responses.
 *
 * Item 1 of goals/2026-10-07-rsvp-status-source.md, the advisor's ruling on
 * the report in goals/2026-10-06-per-event-follow-up.md item 3.
 *
 * THE DASHBOARD ANSWERED ONE QUESTION TWICE. api/my-guests-rsvp.js overlaid
 * rsvp_status as `eventRows ? derived : guest.rsvp_status`, so the flat stored
 * column survived for every guest who had not replied through the guest site.
 * The per-event chips, drawn from event_responses, said awaiting; the tally,
 * the RSVP chart and the search, reading the flat column, said attending. Both
 * were on screen at once and neither was wrong about its own source.
 *
 * THREE GATES STOOD BETWEEN THE RULING AND ITS OUTCOME, and only one of them
 * was in the goal. They are checked separately below because each one alone is
 * enough to make the derivation unreachable:
 *
 *   the whole-wedding early return   `if (rows.length === 0) return {}` decided
 *                                    for every guest before reading one. A
 *                                    wedding where nobody has replied yet is
 *                                    the common state and the fixture's state.
 *   the per-guest skip               `!eventRows && !guestLevel && !plusOne`
 *                                    excluded exactly the guests whose answers
 *                                    the COUPLE had recorded.
 *   the conditional derivation       the line the goal names.
 *
 * The decisions are exported, so this drives them rather than reading the
 * handler and hoping, which is the pattern api/rsvp-submit.js already uses.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { overlayStatusForGuest, hasNothingToOverlay } from '../../api/my-guests-rsvp.js';
import { deriveRsvpStatus } from '../../src/lib/rsvpAggregation.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/**
 * Comments stripped before any NEGATIVE assertion. The first draft asserted
 * that TopBarSearch.jsx no longer contains `getMyRecords('Guest'` and went red
 * against the fixed file, because the comment recording the change QUOTES the
 * old call. Twice now in this programme a comment has satisfied or broken a
 * check about code (see tests/persistence/per-event-copy.mjs), so the rule is
 * the same both ways: assert against what runs.
 */
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[^\n]*?\/\/.*$/gm, (l) => l.slice(0, l.indexOf('//')));
const readCode = (p) => stripComments(read(p));

/** Grace as the ruling describes her: a flat status the couple typed, no rows. */
const GRACE = { id: 'g1', name: 'Grace Hopper', rsvp_status: 'attending', event_responses: [] };

export async function runRsvpStatusDerived() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE GRACE CASE ──────────────────────────────────────────────────────

  check('a flat attending with no per-event answers reads awaiting',
        overlayStatusForGuest(GRACE, undefined).rsvp_status, 'pending');

  ok('  and the flat column is not carried through in its place',
     overlayStatusForGuest(GRACE, undefined).rsvp_status !== GRACE.rsvp_status,
     `stored "${GRACE.rsvp_status}", overlaid "pending"`);

  check('  her event_responses come back as the empty set they are',
        overlayStatusForGuest(GRACE, undefined).eventResponses, []);

  // ── ONCE THE COUPLE RECORDS IT, THE SAME FIELD CARRIES IT ───────────────

  const recorded = { ...GRACE, event_responses: [
    { event_id: 'main-ceremony', invited: true, status: 'yes' },
    { event_id: 'reception',     invited: true, status: 'yes' },
  ] };
  check('a stored per-event yes reads attending',
        overlayStatusForGuest(recorded, undefined).rsvp_status, 'attending');

  const declined = { ...GRACE, event_responses: [
    { event_id: 'main-ceremony', invited: true, status: 'no' },
    { event_id: 'reception',     invited: true, status: 'no' },
  ] };
  check('  a no to every invited event reads declined',
        overlayStatusForGuest(declined, undefined).rsvp_status, 'declined');

  const partial = { ...GRACE, event_responses: [
    { event_id: 'main-ceremony', invited: true, status: 'yes' },
    { event_id: 'reception',     invited: true, status: 'no' },
  ] };
  check('  a yes to one and a no to another reads attending',
        overlayStatusForGuest(partial, undefined).rsvp_status, 'attending');

  const uninvitedYes = { ...GRACE, event_responses: [
    { event_id: 'welcome_drinks', invited: false, status: 'yes' },
  ] };
  check('  a yes on an event they are NOT invited to counts for nothing',
        overlayStatusForGuest(uninvitedYes, undefined).rsvp_status, 'pending');

  // ── THE GUEST'S OWN WORD BEATS THE COUPLE'S RECORD OF IT ────────────────

  const both = { ...GRACE, event_responses: [{ event_id: 'main-ceremony', invited: true, status: 'yes' }] };
  check("rows win over a stored array, because the rows are the guest's own",
        overlayStatusForGuest(both, [{ event_id: 'main-ceremony', status: 'no' }]).rsvp_status, 'declined');

  // ── THE PER-GUEST SKIP ──────────────────────────────────────────────────

  const skip = (over) => hasNothingToOverlay({
    eventRows: undefined, guestLevel: undefined, plusOneRsvpStatus: null, storedEventResponses: [], ...over });
  check('a guest with nothing in either place is still skipped', skip({}), true);
  check('  a stored array alone is enough to get an entry',
        skip({ storedEventResponses: [{ event_id: 'main-ceremony' }] }), false);
  check('  rows alone, as before', skip({ eventRows: [{}] }), false);
  check('  a guest-level row alone, as before', skip({ guestLevel: {} }), false);
  check('  a plus-one status alone, as before', skip({ plusOneRsvpStatus: 'attending' }), false);
  check('  and an undefined stored array is not a crash', skip({ storedEventResponses: undefined }), true);

  // ── THE THREE GATES, IN THE ENDPOINT ────────────────────────────────────

  const api = readCode('api/my-guests-rsvp.js');
  ok('the whole-wedding early return on an empty row set is gone',
     !/if \(rows\.length === 0\) \{\s*return res\.status\(200\)\.json\(\{ byGuestId: \{\} \}\);/.test(api),
     'a wedding with no replies yet still gets an overlay');
  ok('  the per-guest skip goes through the named decision',
     /if \(hasNothingToOverlay\(\{ eventRows, guestLevel, plusOneRsvpStatus,/.test(api), 'hasNothingToOverlay');
  ok('  and the status is the derived one, with no condition left on it',
     /rsvp_status: derivedStatus,/.test(api) && !/eventRows \? deriveRsvpStatus/.test(api),
     'unconditional');
  ok('  the guests query and the wedding guard are untouched',
     /if \(guests\.length === 0\)/.test(api) && /if \(!wedding\?\.id\)/.test(api),
     'both early returns that are about having nothing to read at all');

  // ── THE TWO READERS THE RULING NAMED ────────────────────────────────────

  const search = readCode('src/components/layout/TopBarSearch.jsx');
  ok('the search reads the overlaid guests, not the raw rows',
     /getMyGuestsWithRsvp\(undefined, 500\)/.test(search) && !/getMyRecords\('Guest'/.test(search),
     'getMyGuestsWithRsvp');
  ok('  and still prints a status as the sub label, so the fix is visible there',
     /rsvp_status/.test(search), 'sub label kept');

  const list = readCode('src/components/guests/GuestList.jsx');
  ok('the Invited to column sorts by the derived status',
     /STATUS_SORT_RANK\[deriveRsvpStatus\(guest\.event_responses \|\| \[\]\)\]/.test(list), 'derived rank');
  ok('  not by the flat column it does not display',
     !/STATUS_SORT_RANK\[guest\.rsvp_status\]/.test(list), 'flat rank gone');
  ok('  and the "Not yet invited" bucket #886 deleted the chip for is gone',
     !/return 3; \/\/ "Not yet invited"/.test(list), 'three buckets, not four');

  // THE RANK AGREES WITH THE CHIPS, driven rather than read. Both sides go
  // through deriveRsvpStatus, so the order a couple sees is the order of the
  // words in front of them.
  const rank = { attending: 0, pending: 1, declined: 2 };
  const cases = [
    ['a stored yes',      recorded.event_responses,     'attending'],
    ['a stored no',       declined.event_responses,     'declined'],
    ['nothing stored',    [],                           'pending'],
    ['invited, unanswered', [{ event_id: 'main-ceremony', invited: true, status: 'pending' }], 'pending'],
  ];
  for (const [label, responses, expected] of cases) {
    const derived = deriveRsvpStatus(responses);
    check(`the sort rank for ${label} is the ${expected} bucket`,
          [derived, rank[derived]], [expected, rank[expected]]);
  }

  // ── THE FIXTURE CARRIES THE DISAGREEMENT, AND THE STUB SERVES IT ────────
  //
  // Everything above is the decision in isolation. These three hold the
  // fixture to being able to SHOW it, because a ruling nothing can render is a
  // ruling nothing will notice breaking.
  const { SEED } = await import('../../scripts/lib/renderHarness.mjs');
  const alan = (SEED.Guest || []).find((g) => g.id === 'g3');
  ok('the render fixture has a guest whose flat status disagrees with their rows',
     !!alan && alan.rsvp_status === 'attending'
     && overlayStatusForGuest(alan, undefined).rsvp_status === 'pending',
     alan ? `${alan.name}: flat ${alan.rsvp_status}, derived pending` : 'g3 missing');

  ok('  and no other seeded guest disagrees, so one row carries the case',
     (SEED.Guest || []).filter((g) => overlayStatusForGuest(g, undefined).rsvp_status !== g.rsvp_status).length === 1,
     'exactly one');

  const harness = readCode('scripts/lib/renderHarness.mjs');
  ok('the harness answers /api/my-guests-rsvp with byGuestId, not with guests',
     /\/api\\\/my-guests-rsvp/.test(harness) && /return json\(\{ byGuestId \}\)/.test(harness),
     'the envelope the endpoint returns');
  ok('  through the endpoint\'s own exported decision, not a second copy',
     /overlayStatusForGuest\(g, undefined\)/.test(harness), 'one decision');

  return results;
}
