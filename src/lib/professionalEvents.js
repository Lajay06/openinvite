/**
 * src/lib/professionalEvents.js
 *
 * Pure helpers for the events home, the calendar and the switcher.
 * goals/2026-10-14-professional.md, What a professional gets, 1 and 2.
 */
import { isPastArchiveDate } from './professionalPlans.js';
import { compareDayThenTime } from './scheduleOrder.js';

const DAY = 86400000;
const utcDay = (d) => { const x = new Date(d); return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()); };

/** Events by date, undated last: the one ordering rule, scheduleOrder.js. */
export const byEventDate = (a, b) => compareDayThenTime(a.event_date, null, b.event_date, null);

export function activeEvents(events, now = new Date()) {
  return (events || [])
    .filter((e) => e.status !== 'archived' && !isPastArchiveDate(e.event_date, now))
    .slice()
    .sort(byEventDate);
}

export function daysToGo(date, now = new Date()) {
  if (!date) return null;
  return Math.round((utcDay(`${date}T00:00:00Z`) - utcDay(now)) / DAY);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Sat 7 Nov 2026". Dates are plain calendar days, read in UTC so they never shift. */
export function shortDate(date, { weekday = true, year = true } = {}) {
  if (!date) return 'No date yet';
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return 'No date yet';
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
  return `${weekday ? `${wd} ` : ''}${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ''}`;
}
export const monthKey = (date) => String(date || '').slice(0, 7);
export function monthLabel(key) {
  const [y, m] = String(key).split('-').map(Number);
  if (!y || !m) return 'No date yet';
  return `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${y}`;
}

export function eventLabel(e) { return e ? `${e.couple_names}, ${shortDate(e.event_date, { weekday: false, year: false })}` : ''; }

export function daysToGoText(n) {
  if (n === null || n === undefined) return 'No date yet';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 0) return `${-n} days ago`;
  return `${n} days to go`;
}

/**
 * CLASH WARNINGS. Two events on the same day are a clash for the workspace;
 * the same planner assigned to both is a clash for that planner, which is the
 * one that matters. Returns [{ date, eventIds, memberIds }].
 */
export function findClashes(events) {
  const byDate = new Map();
  for (const e of activeEvents(events, new Date(0))) {
    if (!e.event_date) continue;
    const list = byDate.get(e.event_date) || [];
    list.push(e);
    byDate.set(e.event_date, list);
  }
  const out = [];
  for (const [date, list] of byDate) {
    if (list.length < 2) continue;
    const seen = new Map();
    for (const e of list) for (const m of e.assigned_member_ids || []) seen.set(m, (seen.get(m) || 0) + 1);
    out.push({ date, eventIds: list.map((e) => e.id), memberIds: [...seen].filter(([, n]) => n > 1).map(([m]) => m) });
  }
  return out;
}

/** The figures a row on the events home shows, from the adapter's collections. */
export function eventSummary(event, store, now = new Date(), feed = null) {
  const today = utcDay(now);
  const guests = (store.ProGuest || []).filter((g) => g.event_id === event.id);
  const tasks = (store.ProTask || []).filter((t) => t.event_id === event.id && !t.done);
  const overdue = tasks.filter((t) => t.due_date && utcDay(`${t.due_date}T00:00:00Z`) < today).length;
  const nextPayment = (store.PaymentDue || [])
    .filter((p) => p.event_id === event.id && p.status === 'due')
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0] || null;
  const linked = event.kind === 'linked';
  // A couple who unlinked leaves the last totals behind, frozen, and no names.
  const t = feed?.totals || event.frozen_totals || null;
  const coming = linked ? t?.coming ?? null : guests.filter((g) => g.status === 'coming').length;
  const waiting = linked ? t?.waiting ?? null : guests.filter((g) => g.status === 'waiting').length;
  return { coming, waiting, overdue, nextPayment, linked };
}
