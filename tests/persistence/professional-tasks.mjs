/**
 * tests/persistence/professional-tasks.mjs
 *
 * Openinvite Professional: tasks with owners and "My tasks this week".
 * goals/2026-10-14-professional.md, What a professional gets, 8.
 *
 * PLANT (R19): a "this week" that forgets overdue tasks must fail the same
 * check, because an overdue task is the one a planner most needs to see.
 */
import { pass, fail } from './_shared.mjs';
import { filterTasks, dueThisWeek, byStage, isTaskOverdue } from '../../src/lib/professionalTasks.js';

export function runProfessionalTasks(week = dueThisWeek) {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, tasks:\n');
  const now = new Date('2026-10-14T12:00:00Z');
  const t = [
    { id: 'late', owner_id: 'me', due_date: '2026-10-10', done: false, months_out: '1' },
    { id: 'soon', owner_id: 'me', due_date: '2026-10-18', done: false, months_out: 'week' },
    { id: 'later', owner_id: 'me', due_date: '2026-12-01', done: false },
    { id: 'theirs', owner_id: 'sam', due_date: '2026-10-15', done: false },
    { id: 'done', owner_id: 'me', due_date: '2026-10-15', done: true },
  ];
  check('professional tasks: this week holds overdue and the next seven days, open only', week(t, now).map((x) => x.id).sort().join() === 'late,soon,theirs', week(t, now).map((x) => x.id).join());
  check('professional tasks: "My tasks this week" is the member’s own', filterTasks(t, 'week', { ownerId: 'me', now }).map((x) => x.id).join() === 'late,soon', 'late,soon');
  check('professional tasks: overdue means past due and open', isTaskOverdue(t[0], now) && !isTaskOverdue(t[4], now), 'late only');
  check('professional tasks: stages run 12 months out to the day of, then the rest', byStage(t).map((g) => g.key).join() === '1,week,other', byStage(t).map((g) => g.key).join());
  if (week === dueThisWeek) {
    const planted = (list) => list.filter((x) => !x.done && x.due_date >= '2026-10-14' && x.due_date <= '2026-10-21');
    check('PLANT: a week that drops overdue tasks is told apart', planted(t, now).map((x) => x.id).sort().join() !== 'late,soon,theirs', 'planted drops late');
  }
  return r;
}
