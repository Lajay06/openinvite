/**
 * src/lib/professionalTasks.js
 *
 * TASKS WITH OWNERS, per event and across events. goals/2026-10-14-professional.md,
 * What a professional gets, 8.
 */
import { MONTHS_OUT } from './professionalTemplates.js';

const DAY = 86400000;
const utcDay = (d) => { const x = new Date(d); return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()); };
const dayOf = (date) => utcDay(`${String(date).slice(0, 10)}T00:00:00Z`);

export const TASK_FILTERS = [
  { key: 'week', label: 'This week' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'open', label: 'All open' },
  { key: 'done', label: 'Done' },
];

export const isTaskOverdue = (t, now = new Date()) => !t.done && !!t.due_date && dayOf(t.due_date) < utcDay(now);

/** Open tasks due by the end of the seventh day from today, overdue included. */
export function dueThisWeek(tasks, now = new Date()) {
  const end = utcDay(now) + 7 * DAY;
  return (tasks || []).filter((t) => !t.done && t.due_date && dayOf(t.due_date) <= end);
}

export function filterTasks(tasks, key, { ownerId = null, now = new Date() } = {}) {
  let list = (tasks || []).filter((t) => !ownerId || t.owner_id === ownerId);
  if (key === 'week') list = dueThisWeek(list, now);
  else if (key === 'overdue') list = list.filter((t) => isTaskOverdue(t, now));
  else if (key === 'open') list = list.filter((t) => !t.done);
  else if (key === 'done') list = list.filter((t) => t.done);
  return list.slice().sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
}

/** An event's tasks in months-out stages, then anything without a stage. */
export function byStage(tasks) {
  const groups = MONTHS_OUT.map((m) => ({ key: m.key, label: m.label, tasks: [] }));
  const other = { key: 'other', label: 'Other tasks', tasks: [] };
  for (const t of tasks || []) (groups.find((g) => g.key === t.months_out) || other).tasks.push(t);
  return [...groups, other].filter((g) => g.tasks.length);
}
