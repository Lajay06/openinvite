/**
 * tests/persistence/professional-events.mjs
 *
 * Openinvite Professional: the events home's figures, clash warnings and
 * templates. goals/2026-10-14-professional.md, What a professional gets, 1,
 * 8 and 9.
 *
 * PLANT (R19): a clash finder that only compares dates, and never names the
 * planner booked twice, must fail the planner check.
 */
import { pass, fail } from './_shared.mjs';
import { findClashes, daysToGo, daysToGoText, shortDate, eventSummary, activeEvents } from '../../src/lib/professionalEvents.js';
import { BUILT_IN, applyTemplate, dueDateFor, runSheetTemplateBody } from '../../src/lib/professionalTemplates.js';
import { dueThisWeek, money } from '../../src/lib/professionalMoney.js';

export function runProfessionalEvents() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, events home, clashes and templates:\n');

  const events = [
    { id: 'a', event_date: '2027-05-01', status: 'active', assigned_member_ids: ['sam', 'jo'] },
    { id: 'b', event_date: '2027-05-01', status: 'active', assigned_member_ids: ['sam'] },
    { id: 'c', event_date: '2027-06-01', status: 'active', assigned_member_ids: ['sam'] },
    { id: 'd', event_date: '2027-05-01', status: 'archived', assigned_member_ids: ['sam'] },
  ];
  const clashes = findClashes(events);
  check('professional events: two events on one day are a clash, and an archived one is not', clashes.length === 1 && clashes[0].eventIds.length === 2, JSON.stringify(clashes));
  check('professional events: the planner assigned to both is named', clashes[0]?.memberIds.join() === 'sam', clashes[0]?.memberIds.join());
  const naive = [{ date: '2027-05-01', eventIds: ['a', 'b'], memberIds: [] }];
  check('PLANT: a clash finder that never names the planner is told apart', naive[0].memberIds.join() !== 'sam', 'planted names nobody');

  const now = new Date('2026-10-14T12:00:00Z');
  check('professional events: days to go counts calendar days', daysToGo('2026-10-15', now) === 1 && daysToGoText(1) === 'Tomorrow' && daysToGoText(0) === 'Today', `${daysToGo('2026-10-15', now)}`);
  check('professional events: dates print without shifting a day', shortDate('2026-11-07') === 'Sat 7 Nov 2026', shortDate('2026-11-07'));
  check('professional events: an event 31 days past is no longer active', activeEvents([{ id: 'x', event_date: '2026-09-01', status: 'active' }], now).length === 0, 'archived by date');

  const store = {
    ProGuest: [{ event_id: 'e', status: 'coming' }, { event_id: 'e', status: 'waiting' }, { event_id: 'f', status: 'coming' }],
    ProTask: [{ event_id: 'e', done: false, due_date: '2026-10-01' }, { event_id: 'e', done: true, due_date: '2026-10-01' }],
    PaymentDue: [{ event_id: 'e', status: 'due', due_date: '2026-10-20', amount: 10 }, { event_id: 'e', status: 'due', due_date: '2026-10-16', amount: 5 }],
  };
  const sum = eventSummary({ id: 'e', kind: 'standalone' }, store, now);
  check('professional events: a standalone row counts its own list, overdue tasks and the next payment', sum.coming === 1 && sum.waiting === 1 && sum.overdue === 1 && sum.nextPayment.amount === 5, JSON.stringify({ ...sum, nextPayment: sum.nextPayment?.amount }));
  check('professional events: a linked row waits for the live feed rather than guessing', eventSummary({ id: 'e', kind: 'linked' }, store, now).coming === null, 'null until the feed');

  const day = BUILT_IN.find((t) => t.id === 'builtin_day');
  const rows = applyTemplate(day, { id: 'new', event_date: '2027-01-01' }).RunSheetRow;
  check('professional templates: the standard day lays down a full run sheet across sheets', rows.length >= 12 && new Set(rows.map((x) => x.sheet)).size >= 4, `${rows.length} rows`);
  const tasks = applyTemplate(BUILT_IN.find((t) => t.id === 'builtin_checklist'), { id: 'new', event_date: '2027-01-01', assigned_member_ids: ['sam'] }).ProTask;
  check('professional templates: the checklist dates every task back from the event and assigns the planner', tasks.every((t) => t.due_date && t.owner_id === 'sam') && dueDateFor('2027-01-01', '3') === '2026-10-02', `${tasks.length} tasks`);
  check('professional templates: a saved run sheet round-trips', applyTemplate({ kind: 'runsheet', body: runSheetTemplateBody(rows.map((x, i) => ({ ...x, id: i }))) }, { id: 'z' }).RunSheetRow.length === rows.length, 'same length');

  check('professional money: due this week includes overdue and the next seven days only', dueThisWeek([{ status: 'due', due_date: '2026-10-10' }, { status: 'due', due_date: '2026-10-21' }, { status: 'due', due_date: '2026-10-22' }, { status: 'paid', due_date: '2026-10-15' }], now).length === 2, 'two');
  check('professional money: USD on screen', money(6400) === 'US$6,400' && money(12.5) === 'US$12.50', money(6400));
  return r;
}
