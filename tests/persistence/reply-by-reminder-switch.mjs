/**
 * tests/persistence/reply-by-reminder-switch.mjs
 *
 * THE SWITCH CANNOT PROMISE A SEND THE CRON WILL NOT MAKE.
 *
 * Item 1 of goals/2026-10-11-reply-by-reminders.md. The couple sets a reply-by
 * date and a switch beside it emails anyone still to reply, ten days before
 * and two days before, at 9 am in their own timezone.
 *
 * ── WHAT IS DRIVEN ─────────────────────────────────────────────────────────
 *
 * src/lib/rsvpReminders.js, for real: the two dates, which sends are still
 * ahead of a fixed clock, whether the switch may be turned on at all, the four
 * lines the owner wrote, and the object the switch writes. Item 2's cron will
 * read the same functions, which is the whole reason they are not inside the
 * component: a second copy of this arithmetic is exactly how a switch comes to
 * promise a send that never happens.
 *
 * ── WHAT IS READ ───────────────────────────────────────────────────────────
 *
 * RsvpDeadlineField.jsx cannot be imported by a node guard, so its wiring is
 * read as source: one component, rendered in both modes, so "the same state in
 * both places" is true by construction rather than by two call sites agreeing.
 *
 * ── WHAT THIS FILE DOES NOT PROVE ──────────────────────────────────────────
 *
 * That the three keys actually persist. rsvpContent is declared as a bare
 * object, so Base44 stores whatever is put in it, but "declared as an object"
 * is an argument and not a round trip, and this platform returns 200 for a
 * dropped field. tests/persistence/reply-by-reminders-persistence.mjs writes
 * all three to a real record and reads them back on a separate GET. It is a
 * live-credential guard and runs outside CI, by the owner's instruction that
 * it pass before this item merges.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SEND_OFFSETS, SEND_HOUR, FALLBACK_TIMEZONE,
  reminderSendDates, upcomingSends, switchAvailability,
  reminderTimezoneOf, sentSends, withRemindersSwitch, reminderLine, writtenDay,
  LABEL, NO_DATE_LINE, OFF_LINE, BOTH_SENT_LINE,
} from '../../src/lib/rsvpReminders.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8');

/** A fixed clock, so every boundary below is a stated fact and not today's. */
const NOW = new Date('2026-05-01T00:00:00Z');
const DEADLINE = '2026-06-01';

export async function runReplyByReminderSwitch() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const field = code('src/components/shared/RsvpDeadlineField.jsx');
  const live = stripComments(field, { trailing: true });
  const lib = code('src/lib/rsvpReminders.js');

  // ── 1. TWO SENDS, AT THE OWNER'S OFFSETS ──────────────────────────────
  ok('there are exactly two sends', SEND_OFFSETS.length === 2, `${SEND_OFFSETS.length}`);
  ok('  ten days before, then two', SEND_OFFSETS.map((s) => s.daysBefore).join(',') === '10,2',
     SEND_OFFSETS.map((s) => s.daysBefore).join(','));
  ok('  and the hour is 9', SEND_HOUR === 9, String(SEND_HOUR));

  const dates = reminderSendDates(DEADLINE);
  ok('the dates are ten and two days before the deadline',
     dates.map((d) => d.date).join(',') === '2026-05-22,2026-05-30',
     dates.map((d) => d.date).join(','));
  ok('  numbered in the order they go', dates.map((d) => d.send).join(',') === '1,2',
     dates.map((d) => d.send).join(','));
  ok('  and an unreadable date yields none rather than a guess',
     reminderSendDates('').length === 0 && reminderSendDates('next June').length === 0
       && reminderSendDates(null).length === 0,
     'empty');

  // A MONTH BOUNDARY, because ten days before the first of a month is the
  // previous month and off-by-one arithmetic looks right until it crosses one.
  ok('  crossing a month end is still ten days',
     reminderSendDates('2026-03-05').map((d) => d.date).join(',') === '2026-02-23,2026-03-03',
     reminderSendDates('2026-03-05').map((d) => d.date).join(','));

  // ── 2. NEVER AFTER THE FACT ───────────────────────────────────────────
  ok('both sends are ahead when the deadline is a month out',
     upcomingSends(DEADLINE, NOW).length === 2, `${upcomingSends(DEADLINE, NOW).length}`);
  ok('  only the second when the first has passed',
     upcomingSends(DEADLINE, new Date('2026-05-25T00:00:00Z')).map((s) => s.send).join(',') === '2',
     upcomingSends(DEADLINE, new Date('2026-05-25T00:00:00Z')).map((s) => s.send).join(','));
  ok('  neither once both have',
     upcomingSends(DEADLINE, new Date('2026-05-31T00:00:00Z')).length === 0, 'none');
  ok('  and nothing at all after the deadline itself',
     upcomingSends(DEADLINE, new Date('2026-06-02T00:00:00Z')).length === 0, 'none');
  // THE DAY ITSELF IS STILL AHEAD, tested ON that day and not the day before.
  // The first version of this check used the day before, so it passed against
  // a `date > today` filter that dropped the send day even at breakfast. A
  // plant that could not change the behaviour is what exposed it.
  ok('  a send day is still ahead on its own morning',
     upcomingSends(DEADLINE, new Date('2026-05-22T00:30:00Z')).map((s) => s.send).join(',') === '1,2',
     upcomingSends(DEADLINE, new Date('2026-05-22T00:30:00Z')).map((s) => s.send).join(','));
  ok('  and gone the day after it',
     upcomingSends(DEADLINE, new Date('2026-05-23T00:30:00Z')).map((s) => s.send).join(',') === '2',
     upcomingSends(DEADLINE, new Date('2026-05-23T00:30:00Z')).map((s) => s.send).join(','));
  ok('  the deadline day itself leaves nothing',
     upcomingSends(DEADLINE, new Date('2026-06-01T00:30:00Z')).length === 0, 'none');

  // ── 3. THE SWITCH CANNOT BE TURNED ON WITHOUT A DATE ──────────────────
  ok('no date means the switch cannot be turned on',
     switchAvailability('', NOW).ok === false && switchAvailability('', NOW).reason === 'no-date',
     switchAvailability('', NOW).reason);
  ok('  and the reason is distinct from being too late',
     switchAvailability('2026-05-02', NOW).reason === 'too-late',
     switchAvailability('2026-05-02', NOW).reason);
  ok('  a deadline with a send still ahead can be turned on',
     switchAvailability(DEADLINE, NOW).ok === true, 'ok');
  // "never if the deadline is less than 2 days away when the switch goes on
  // (then only the sends still in the future happen; if none, the switch says
  // so and stays off)".
  ok('  a deadline one day out leaves no send, so it stays off',
     switchAvailability('2026-05-02', NOW).sends.length === 0, 'no sends');
  ok('  a deadline three days out still has the second send',
     switchAvailability('2026-05-04', NOW).sends.map((s) => s.send).join(',') === '2',
     switchAvailability('2026-05-04', NOW).sends.map((s) => s.send).join(','));

  // ── 4. THE FOUR LINES, VERBATIM ───────────────────────────────────────
  ok('the label is the owner’s', LABEL === 'Remind guests who have not replied', LABEL);
  ok('the no-date line is the owner’s', NO_DATE_LINE === 'Set a reply-by date first.', NO_DATE_LINE);
  ok('the off line is the owner’s', OFF_LINE === 'Off. No more reminders will go.', OFF_LINE);
  ok('the both-sent line is the owner’s', BOTH_SENT_LINE === 'Both reminders sent.', BOTH_SENT_LINE);

  ok('with no date, the line says to set one',
     reminderLine({}, NOW) === NO_DATE_LINE, reminderLine({}, NOW));
  ok('with a date and the switch off, the line says it is off',
     reminderLine({ rsvpDeadline: DEADLINE }, NOW) === OFF_LINE,
     reminderLine({ rsvpDeadline: DEADLINE }, NOW));
  ok('switched on, it names both dates, the hour and the timezone',
     reminderLine({ rsvpDeadline: DEADLINE, remindersOn: true, reminderTimezone: 'Australia/Sydney' }, NOW)
       === 'We will email anyone still to reply on May 22, 2026 and May 30, 2026, at 9 am Australia/Sydney.',
     reminderLine({ rsvpDeadline: DEADLINE, remindersOn: true, reminderTimezone: 'Australia/Sydney' }, NOW));
  ok('after the first send, it reports the count and the next date',
     reminderLine({ rsvpDeadline: DEADLINE, remindersOn: true,
       remindersSent: [{ send: 1, date: '2026-05-22', count: 14 }] }, NOW)
       === 'Sent May 22, 2026 to 14 guests. Next on May 30, 2026.',
     reminderLine({ rsvpDeadline: DEADLINE, remindersOn: true,
       remindersSent: [{ send: 1, date: '2026-05-22', count: 14 }] }, NOW));
  ok('after both, it says so and nothing more',
     reminderLine({ rsvpDeadline: DEADLINE, remindersOn: true,
       remindersSent: [{ send: 1 }, { send: 2 }] }, NOW) === BOTH_SENT_LINE,
     'both sent');
  ok('  a missing count reads as zero rather than undefined',
     /to 0 guests/.test(reminderLine({ rsvpDeadline: DEADLINE, remindersOn: true,
       remindersSent: [{ send: 1, date: '2026-05-22' }] }, NOW)),
     reminderLine({ rsvpDeadline: DEADLINE, remindersOn: true, remindersSent: [{ send: 1, date: '2026-05-22' }] }, NOW));

  // ── 5. THE TIMEZONE, CAPTURED AND SHOWN ───────────────────────────────
  ok('the fallback timezone is the one the owner named',
     FALLBACK_TIMEZONE === 'Australia/Sydney', FALLBACK_TIMEZONE);
  ok('  and a wedding with none falls back to it',
     reminderTimezoneOf({}) === FALLBACK_TIMEZONE && reminderTimezoneOf({ reminderTimezone: '  ' }) === FALLBACK_TIMEZONE,
     reminderTimezoneOf({}));
  ok('  while a stored one is used as stored',
     reminderTimezoneOf({ reminderTimezone: 'Europe/Rome' }) === 'Europe/Rome', 'Europe/Rome');

  const on = withRemindersSwitch({ rsvpDeadline: DEADLINE, intro: 'ours' }, true, 'Europe/Rome');
  ok('turning the switch on captures the timezone',
     on.remindersOn === true && on.reminderTimezone === 'Europe/Rome', JSON.stringify(on));
  ok('  keeping the rest of rsvpContent, including the date',
     on.rsvpDeadline === DEADLINE && on.intro === 'ours', 'merged');
  ok('  and starting an empty sent list rather than leaving it absent',
     Array.isArray(on.remindersSent) && on.remindersSent.length === 0, 'empty array');

  const off = withRemindersSwitch({ ...on, remindersSent: [{ send: 1, count: 3 }] }, false);
  ok('turning it off cancels what is to come',
     off.remindersOn === false, 'false');
  ok('  and keeps what already went, because off does not unsend',
     Array.isArray(off.remindersSent) && off.remindersSent.length === 1, 'history kept');
  ok('  without mutating the object it was handed',
     on.remindersOn === true, 'input untouched');

  ok('the sent list is read as send numbers, de-duplicated and ordered',
     sentSends({ remindersSent: [{ send: 2 }, { send: 1 }, { send: 2 }, { send: 9 }] }).join(',') === '1,2',
     sentSends({ remindersSent: [{ send: 2 }, { send: 1 }, { send: 2 }, { send: 9 }] }).join(','));
  ok('  and a missing list is no sends, not a crash',
     sentSends({}).length === 0 && sentSends(null).length === 0, 'empty');

  // ── 6. ONE SWITCH, BOTH SURFACES ──────────────────────────────────────
  ok('the switch lives in the one shared field component',
     /data-rsvp-reminders-switch/.test(live) && /onCheckedChange=\{saveSwitch\}/.test(live), 'one control');
  ok('  rendered in the editable mode',
     /\{reminders\}/.test(live.slice(live.indexOf('data-rsvp-deadline '))), 'in the editor');
  ok('  and in the read-only mode, so Event details carries it too',
     /data-rsvp-deadline-shown[\s\S]{0,900}\{reminders\}/.test(live), 'in the shown mode');
  // ONE DEFINITION, TWO RENDERS. Two copies of the markup would be two
  // switches that could disagree, which is what the item's guard forbids.
  ok('  defined once, so the two cannot drift apart',
     (live.match(/data-rsvp-reminders-switch/g) || []).length === 1, 'single definition');
  // THE CALL SITES, NOT EVERY MENTION. The first version counted
  // /putMyWeddingDetails/ and expected two; the import line makes it three,
  // so the check was wrong about a component that was right.
  ok('the switch writes through the same put as the date',
     (live.match(/await putMyWeddingDetails\(\{ rsvpContent: merged \}\)/g) || []).length === 2,
     'one write path, two callers');
  ok('  through withRemindersSwitch, not a hand-built object',
     /withRemindersSwitch\(rsvpContent, on\)/.test(live), 'shared');
  ok('  and tells its parent, so the surface re-reads the new state',
     (live.match(/onSaved\?\.\(merged\)/g) || []).length === 2, 'both savers report');

  ok('the switch is disabled when it cannot be turned on',
     /const switchDisabled = saving \|\| \(!remindersOn && !availability\.ok\)/.test(live), 'gated');
  ok('  but never when it is already on, so it can always be switched back off',
     /!remindersOn && !availability\.ok/.test(live), 'off is always reachable');
  ok('  and the line under it says why',
     /data-rsvp-reminders-line[\s\S]{0,200}reminderLine\(rsvpContent\)/.test(live), 'the line');

  // ── 7. COPY RULES ─────────────────────────────────────────────────────
  const copy = [LABEL, NO_DATE_LINE, OFF_LINE, BOTH_SENT_LINE,
    reminderLine({ rsvpDeadline: DEADLINE, remindersOn: true, reminderTimezone: 'Europe/Rome' }, NOW),
    reminderLine({ rsvpDeadline: DEADLINE, remindersOn: true, remindersSent: [{ send: 1, date: '2026-05-22', count: 2 }] }, NOW)];
  ok('no em or en dash in any line', copy.every((t) => !/[—–]/.test(t)), 'clean');
  ok('  no percentages, which the goal bars', copy.every((t) => !/%/.test(t)), 'none');
  ok('  nothing shouting', copy.every((t) => t !== t.toUpperCase()), 'sentence case');
  ok('  and the written date is US order, like the rest of the chrome',
     writtenDay('2026-06-01') === 'June 1, 2026', writtenDay('2026-06-01'));
  ok('the module adds no dependency', !/^import /m.test(lib), 'standalone');

  return results;
}
