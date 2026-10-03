/**
 * tests/persistence/event-deletion.mjs
 *
 * DELETING A CUSTOM EVENT MUST NOT LEAVE ITS ANSWERS BEHIND.
 *
 * The old delete was one line: filter the event out of preWeddingEvents or
 * postWeddingEvents and stop. Every guest's event_responses entry for that
 * event stayed in the database pointing at nothing, and so did every
 * RsvpResponse row. Nothing broke, because nothing joins on them, which is
 * exactly why nobody would have found it: the orphans only surface the day a
 * later event is given the same id and inherits a stranger's yes.
 *
 * Two halves, guarded separately:
 *
 *   The decision   src/lib/eventDeletion.js is pure, so it is exercised here
 *                  against a fixture rather than inferred from the page.
 *   The wiring     EventDetails has to actually ASK before it deletes, refuse
 *                  when there are answers, and leave the event in place if the
 *                  clearing writes fail. Each of those is a line that could be
 *                  deleted without any test noticing, so each is checked.
 *
 * And one tripwire: Schedule has no event_id today, which is the whole reason
 * schedule items are left alone. If it ever gains one, this guard fails and
 * says to extend the cleanup, rather than the omission living on as a comment.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { repliesForEvent, guestsToClear } from '../../src/lib/eventDeletion.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

/**
 * The fixture guests, shaped like the seeded wedding the render harness uses:
 * one answered yes, one answered no, one invited but silent, one never set.
 */
const GUESTS = [
  { id: 'g1', name: 'Grace Hopper', event_responses: [
    { event_id: 'welcome_drinks', invited: true, status: 'yes' },
    { event_id: 'recovery_brunch', invited: true, status: 'pending' },
  ] },
  { id: 'g2', name: 'Katherine J.', event_responses: [
    { event_id: 'welcome_drinks', invited: true, status: 'no' },
  ] },
  { id: 'g3', name: 'Alan Turing', event_responses: [
    { event_id: 'recovery_brunch', invited: true, status: 'pending' },
  ] },
  { id: 'g4', name: 'Edsger D.', event_responses: [] },
];

export async function runEventDeletion() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));

  // ── The decision ────────────────────────────────────────────────────────

  const answered = repliesForEvent(GUESTS, 'welcome_drinks');
  check('an answered event reports both answers, a yes and a no',
        [answered.count, answered.names], [2, ['Grace Hopper', 'Katherine J.']]);

  const silent = repliesForEvent(GUESTS, 'recovery_brunch');
  check('invited-but-pending is not an answer, so the event stays deletable',
        [silent.count, silent.names], [0, []]);

  check('an event nobody was set for has no answers',
        repliesForEvent(GUESTS, 'never_created').count, 0);

  check('a missing event_responses array is not a crash',
        repliesForEvent([{ id: 'x', name: 'X' }], 'anything').count, 0);

  const clears = guestsToClear(GUESTS, 'recovery_brunch');
  check('clearing returns only the guests who mention the event',
        clears.map(c => c.id), ['g1', 'g3']);
  check('clearing drops that event and keeps every other entry',
        clears[0].event_responses, [{ event_id: 'welcome_drinks', invited: true, status: 'yes' }]);
  check('clearing an event nobody mentions writes nothing',
        guestsToClear(GUESTS, 'never_created'), []);

  // ── The wiring ──────────────────────────────────────────────────────────

  const page = fs.readFileSync(path.join(ROOT, 'src/pages/EventDetails.jsx'), 'utf8');

  const wiring = [
    ['the delete path reads the guest list before it decides',
      /handleDeleteCustom[\s\S]{0,1200}?await getMyGuestsWithRsvp\(\)/],
    ['it asks the shared helpers rather than counting inline',
      /repliesForEvent\(guests, eventId\)[\s\S]{0,200}?guestsToClear\(guests, eventId\)/],
    ['a failed guest-list read stops the delete instead of assuming no replies',
      /catch\s*\{[\s\S]{0,400}?Could not check this event for replies[\s\S]{0,80}?return;/],
    ['replies produce a refusal, not a confirm button',
      /deleteTarget\.replies\.count > 0 \?/],
    ['the array write is abandoned when the clearing writes fail',
      /if \(failed > 0\)[\s\S]{0,500}?The event was not deleted[\s\S]{0,80}?return;/],
    ['every clear goes through updateGuest with the whole resolved array',
      /updateGuest\(g\.id, \{ event_responses: g\.event_responses \}\)/],
  ];
  for (const [label, re] of wiring) {
    results.push(re.test(page)
      ? pass(`EventDetails: ${label}`, 'present')
      : fail(`EventDetails: ${label}`, 'present', 'the line is gone'));
  }

  // The native dialog is barred repo-wide, but this one is worth naming here:
  // window.confirm cannot state a count, which is the whole of this item.
  results.push(!/window\.confirm\([^)]*[Rr]emove this event/.test(page)
    ? pass('EventDetails: the delete no longer goes through window.confirm', 'in-app dialog')
    : fail('EventDetails: the delete no longer goes through window.confirm', 'in-app dialog',
           'window.confirm is back, and it cannot state the reply count'));

  // ── The tripwire ────────────────────────────────────────────────────────

  const schedule = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'base44/entities/Schedule.jsonc'), 'utf8')
      .replace(/^\s*\/\/.*$/gm, ''));
  results.push(!schedule.properties?.event_id
    ? pass('Schedule still has no event_id, so leaving schedule items alone is the only honest option',
           Object.keys(schedule.properties || {}).join(', '))
    : fail('Schedule still has no event_id, so leaving schedule items alone is the only honest option',
           'no event_id',
           'Schedule now has event_id: extend src/lib/eventDeletion.js to clear schedule items too'));

  return results;
}
