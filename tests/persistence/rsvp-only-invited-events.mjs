/**
 * tests/persistence/rsvp-only-invited-events.mjs
 *
 * A REPLY IS ONLY KEPT FOR AN EVENT THE GUEST IS INVITED TO.
 *
 * api/rsvp-submit.js sanitized submitted event rows and wrote every one that
 * was well formed. Well formed is not the same as allowed: the token proves
 * who is replying and says nothing about what they may reply to, so any
 * event_id with a valid shape became an RsvpResponse row, whether or not the
 * couple had invited this guest to that event and whether or not the event
 * still existed.
 *
 * It matters more now that the guest site shows a guest only their own events,
 * because the form can no longer be the check. A stale tab, a shared link, a
 * hand-made POST or a client bug each files a row under an event nobody
 * offered, and the dashboard counts it: a yes is a yes, whatever event it is
 * filed under, and nothing about the result looks wrong.
 *
 * The decision is exported, so this drives it directly rather than reading the
 * handler and hoping. Then four static checks for the things around it that a
 * future edit could undo without failing anything: the write, the summary and
 * the confirmation must all use the KEPT rows, and the count must come back.
 *
 * Also here, because it is the other half of the same goal item: the custom
 * event_id must be stamped in the Event details SAVE path and not only
 * backfilled on load. It already is, in both branches, and the assertion is
 * what keeps it that way.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

const WEDDING = {
  weddingDate: '2027-06-12',
  mainCeremony: { startTime: '14:00' },
  reception:    { startTime: '18:00' },
  preWeddingEvents:  [{ event_id: 'welcome_drinks', name: 'Welcome drinks', date: '2027-06-10' }],
  postWeddingEvents: [{ event_id: 'brunch', name: 'Recovery brunch', date: '2027-06-13' }],
};
const rows = (...ids) => ids.map((id) => ({ event_id: id, status: 'yes' }));

export async function runRsvpOnlyInvitedEvents() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));

  // Importing the endpoint instantiates Resend, which throws without a key.
  // The key is never used: nothing here sends, and the decision is pure.
  if (!process.env.RESEND_API_KEY) process.env.RESEND_API_KEY = 're_guard_placeholder';
  const { keepOnlyInvitedEvents } = await import('../../api/rsvp-submit.js');

  const decide = (guest, submitted) => {
    const { kept, droppedEventIds } = keepOnlyInvitedEvents(submitted, { wedding: WEDDING, guest });
    return [kept.map((r) => r.event_id), droppedEventIds];
  };

  check('a main event is kept with no stored entry at all, as it resolves invited',
        decide({ id: 'g', event_responses: [] }, rows('main-ceremony', 'reception')),
        [['main-ceremony', 'reception'], []]);

  check('a custom event nobody invited them to is dropped, not written',
        decide({ id: 'g', event_responses: [] }, rows('main-ceremony', 'welcome_drinks')),
        [['main-ceremony'], ['welcome_drinks']]);

  check('a custom event they were invited to is kept',
        decide({ id: 'g', event_responses: [{ event_id: 'welcome_drinks', invited: true }] },
               rows('welcome_drinks')),
        [['welcome_drinks'], []]);

  check('a main event they were explicitly removed from is dropped',
        decide({ id: 'g', event_responses: [{ event_id: 'reception', invited: false }] },
               rows('main-ceremony', 'reception')),
        [['main-ceremony'], ['reception']]);

  check('an event id that is not on this wedding at all is dropped',
        decide({ id: 'g', event_responses: [] }, rows('main-ceremony', 'an_event_that_was_deleted')),
        [['main-ceremony'], ['an_event_that_was_deleted']]);

  check('the good rows survive alongside the dropped one, rather than the submission failing',
        decide({ id: 'g', event_responses: [{ event_id: 'brunch', invited: true }] },
               rows('main-ceremony', 'reception', 'brunch', 'welcome_drinks')),
        [['main-ceremony', 'reception', 'brunch'], ['welcome_drinks']]);

  check('an empty submission decides nothing and drops nothing',
        decide({ id: 'g', event_responses: [] }, []), [[], []]);

  // ── THE WIRING AROUND THE DECISION ──────────────────────────────────────

  const api = fs.readFileSync(path.join(ROOT, 'api/rsvp-submit.js'), 'utf8');
  const wiring = [
    ['only the kept rows are written to RsvpResponse',
      /\.\.\.invitedResponses\.map\(r => createRsvpResponse\(\{/],
    ["the couple's notification counts the kept rows, not the submitted ones",
      /const attendingCount = invitedResponses\.filter[\s\S]{0,400}?const responseSummary/],
    ["the guest's own receipt reads the kept rows too",
      /const attending = invitedResponses\.some\(r => r\.status === 'yes'\);/],
    ['the drop is counted in the response',
      /\{ ok: true, confirmation, dropped: droppedEventIds\.length \}/],
    ['and logged, so a pattern of them is visible',
      /console\.warn\(`\[rsvp-submit\] dropped \$\{droppedEventIds\.length\}/],
    ['nothing writes a row straight from the sanitized set any more',
      /^(?![\s\S]*\.\.\.eventResponses\.map\(r => createRsvpResponse)[\s\S]*$/],
  ];
  for (const [label, re] of wiring) {
    results.push(re.test(api)
      ? pass(`rsvp-submit: ${label}`, 'present')
      : fail(`rsvp-submit: ${label}`, 'present', 'the line is gone'));
  }

  // ── THE OTHER HALF: event_id STAMPED ON SAVE ────────────────────────────

  const page = fs.readFileSync(path.join(ROOT, 'src/pages/EventDetails.jsx'), 'utf8');
  results.push(/const newEv = \{ \.\.\.saved, id: eid, event_id: eid \};/.test(page)
    ? pass('Event details: a new custom event is given its event_id on save', 'both ids, one value')
    : fail('Event details: a new custom event is given its event_id on save', 'both ids, one value', 'gone'));
  results.push(/\{ \.\.\.e, \.\.\.saved, id: e\.id, event_id: e\.event_id \|\| e\.id \}/.test(page)
    ? pass('  and an edited one keeps or gains one, never loses it', 'event_id || id')
    : fail('  and an edited one keeps or gains one, never loses it', 'event_id || id', 'gone'));
  results.push(/Lazy event_id backfill/.test(page)
    ? pass('  with the load-time backfill still there as the second line of defense', 'kept')
    : fail('  with the load-time backfill still there as the second line of defense', 'kept', 'removed'));

  return results;
}
