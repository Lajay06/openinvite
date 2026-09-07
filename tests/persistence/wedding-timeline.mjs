/**
 * tests/persistence/wedding-timeline.mjs
 *
 * THE SCHEDULE SHOWS EVERY DATED THING THE COUPLE SET.
 *
 * Owner: "nothing in the to do list is here… ensure the schedule does a sweep
 * of the total site to ensure all date things are here."
 *
 * The sweep found 54 date-bearing fields across 26 entity mirrors. Most are
 * audit timestamps the couple never sets. The ruling named the ones that
 * belong, and this pins both halves: what must appear, and what must not.
 *
 * NOTE ONLY, NOT TASK. `Task` is a dead entity — getMyRecords('Task') appears
 * nowhere in src/, and to-dos are Notes with view_type 'todo'
 * (TodoList.jsx:159). That is why "nothing in the to do list is here" even
 * once the aggregator existed: the wrong store would have been read. Retiring
 * the Task loads elsewhere is a separate open ticket, because #694 owns
 * Dashboard.jsx.
 */
import { pass, fail } from './_shared.mjs';
import { buildScheduleEvents, WHEN_LABEL, WHEN_RANK, ROW_HOME, matchKindOf } from '../../src/lib/scheduleEvents.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

const DAY = '2027-07-03';
const FIXTURE = {
  weddingDate: DAY,
  scheduleItems: [
    { id: 's1', event_name: 'Ceremony', event_date: DAY, start_time: '15:00', location: 'Observatory' },
    { id: 's2', event_name: 'Rehearsal', event_date: '2027-07-02', start_time: '17:00' },
  ],
  vendors: [{ id: 'v1', name: 'Fleur', category: 'flowers', booking_date: DAY, contract_date: '2027-01-10', meeting_date: '2027-02-14T14:30:00' }],
  invitation: { wedding_date: DAY, couple_names: 'A & B', rsvp_deadline: '2027-05-01' },
  todos: [
    { id: 'n1', title: 'Order invitations', view_type: 'todo', due_date: '2027-04-01' },
    { id: 'n2', title: 'No date on this one', view_type: 'todo' },
    { id: 'n3', title: 'Already done', view_type: 'todo', due_date: '2027-03-01', completed: true },
    { id: 'n4', title: 'A moodboard note', view_type: 'moodboard', due_date: '2027-03-05' },
    { id: 'n5', title: 'Reminder only', view_type: 'todo', reminder_date: '2027-03-20' },
  ],
  wd: {
    rehearsal: { date: '2027-07-02', time: '17:00' },
    dayAfterBrunch: { date: '2027-07-04' },
    accommodation: { checkInDate: '2027-07-02', checkOutDate: '2027-07-05' },
    music: { requestsClosedDate: '2027-06-01' },
  },
  customPages: [{ id: 'c1', title: 'Mehndi', date: '2027-07-01T18:00:00' }],
  liveStreams: [{ id: 'l1', title: 'Ceremony stream', scheduled_start: `${DAY}T15:00:00` }],
};

const build = (over = {}) => buildScheduleEvents({ ...FIXTURE, ...over });
const titles = (rows) => rows.map((r) => r.title);

export async function runWeddingTimeline() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The schedule shows every dated thing the couple set:\n');

  const rows = build();

  // ── THE OWNER'S REPORT ──────────────────────────────────────────────────
  {
    const todo = rows.find((r) => r.title === 'Order invitations');
    check('PLANT: a to-do with a due date is on the timeline',
      !!todo && todo.when === 'todo', todo ? `${WHEN_LABEL[todo.when]} on ${todo.date}` : 'ABSENT');
    check('PLANT: a to-do with NO due date is not',
      !titles(rows).includes('No date on this one'),
      'a task without a date is not a dated thing');
    check('PLANT: a COMPLETED to-do is not',
      !titles(rows).includes('Already done'), 'history, not a timeline');
    check('  a note that is not a to-do is not either',
      !titles(rows).includes('A moodboard note'), 'view_type todo only');
    check('  and reminder_date is not a row of its own',
      !titles(rows).includes('Reminder only'), 'a nudge is not an event');
  }

  // ── EVERY INCLUDED SOURCE ───────────────────────────────────────────────
  for (const [what, title, when] of [
    ['a schedule event',        'Ceremony',                 'wedding-day'],
    ['the wedding day itself',  'Wedding day: A & B',       'wedding-day'],
    ['a vendor booking',        'Fleur — booking',          'vendor'],
    ['a vendor contract',       'Fleur — contract signed',  'vendor'],
    ['a vendor meeting',        'Fleur — meeting',          'vendor'],
    ['the RSVP deadline',       'RSVP deadline',            'deadline'],
    ['the song-request close',  'Song requests close',      'deadline'],
    ['a custom event page',     'Mehndi',                   'planning'],
    ['a live stream',           'Ceremony stream',          'wedding-day'],
    ['the room block opening',  'Room block opens',         'planning'],
    ['the room block closing',  'Room block closes',        'after'],
    ['the day-after brunch',    'Day-after brunch',         'after'],
  ]) {
    const row = rows.find((r) => r.title === title);
    check(`${what} is a row, typed ${WHEN_LABEL[when]}`,
      !!row && row.when === when, row ? WHEN_LABEL[row.when] : 'ABSENT');
  }
  check('a vendor row names WHICH date it is',
    ['booking', 'contract signed', 'meeting'].every((s) => titles(rows).some((t) => t.endsWith(`— ${s}`))),
    '"Florist — meeting", not three rows all reading "Florist"');

  // ── AND EVERY EXCLUDED ONE ──────────────────────────────────────────────
  {
    const withNoise = build({
      // None of these has an input on the aggregator at all — passing them is
      // the point: an excluded source cannot arrive by accident.
      budget: [{ id: 'b1', item_name: 'Deposit', payment_date: '2027-02-01' }],
      photos: [{ id: 'p1', date_taken: '2027-02-02' }],
      milestones: [{ id: 'm1', title: 'We met', date: '2019-05-05' }],
    });
    check('PLANT: an excluded source cannot arrive by accident',
      withNoise.length === rows.length
        && !titles(withNoise).some((t) => /Deposit|We met/.test(t)),
      'Budget payment dates, photos and story milestones are not inputs');
  }

  // ── ONE THING, ONE ROW ──────────────────────────────────────────────────
  {
    const rehearsals = rows.filter((r) => /rehearsal/i.test(r.title));
    check('PLANT: a rehearsal in BOTH stores appears once',
      rehearsals.length === 1, `${rehearsals.length} row(s)`);
    check('  and the Schedule row is the one that survives',
      rehearsals[0]?.type === 'schedule' && rehearsals[0]?.time === '17:00',
      'because that is the one the couple can edit here');
    // What collapsed, counted the way the ruling asked.
    const withoutDedupe = build({ scheduleItems: [] }).filter((r) => /rehearsal/i.test(r.title)).length;
    check('  one row collapsed on this fixture',
      withoutDedupe === 1 && rehearsals.length === 1, 'rehearsal: 2 sources, 1 row');
    check('  a wedding-record row with no Schedule twin still appears',
      titles(rows).includes('Day-after brunch'), 'the dedupe removes duplicates, not sources');
    check('  and matchKindOf never decides a Type, only a match',
      matchKindOf('Rehearsal dinner') === 'rehearsal' && matchKindOf('Ceremony') === '',
      'an unrecognised name simply never collapses anything');
  }

  // ── TYPE IS DECIDED BY THE DATE, NEVER BY THE NAME ──────────────────────
  {
    const early = build({ wd: { ...FIXTURE.wd, dayAfterBrunch: { date: '2027-06-01' } } });
    const brunch = early.find((r) => r.title === 'Day-after brunch');
    check('PLANT: a brunch dated BEFORE the wedding is Planning, not After',
      brunch?.when === 'planning', WHEN_LABEL[brunch?.when] || 'ABSENT');
    check('  and a to-do keeps its own Type wherever it falls',
      build({ todos: [{ id: 'x', title: 'On the day', view_type: 'todo', due_date: DAY }] })
        .find((r) => r.title === 'On the day')?.when === 'todo',
      'a to-do due on the wedding day is still a to-do');
  }

  // ── SIX PILLS, AND WHERE A ROW IS EDITED ────────────────────────────────
  {
    check('six Types, in the order the wedding runs',
      Object.keys(WHEN_RANK).join(',') === 'planning,wedding-day,after,todo,vendor,deadline',
      Object.values(WHEN_LABEL).join(' · '));
    check('  and no Payment pill, because no due-date field exists',
      !('payment' in WHEN_RANK), 'Vendor.payment_schedule is free text; Budget.payment_date is the past');
    check('every non-schedule row is read-only and names its home',
      rows.filter((r) => r.type !== 'schedule' && r.type !== 'wedding' && r.id !== 'wedding-day')
        .every((r) => r.readOnly && (ROW_HOME[r.kind] || r.kind === undefined)),
      'edited at home, never here');
    const table = code('src/components/schedule/ScheduleTable.jsx');
    check('  the table gives them no checkbox',
      /isSelectable=\{\(e\) => e\.type === 'schedule'\}/.test(table),
      'selecting a to-do here would offer a bulk action on the to-do list');
    check('  and only an "Open in …" action',
      /ROW_HOME\[e\.kind\]/.test(table) && /home && onOpen/.test(table), 'the way home and nothing else');
  }

  // ── THE FEED AND THE COPY ───────────────────────────────────────────────
  {
    check('the ICS feed is still Schedule rows only',
      !/todos|buildScheduleEvents/.test(code('api/schedule.ics.js')), 'unchanged');
    check('  and the Calendar tab says so',
      /to-dos and\s*deadlines stay here/.test(code('src/components/schedule/SubscribeCalendar.jsx')),
      'the copy the ruling asked for');
  }

  return results;
}
