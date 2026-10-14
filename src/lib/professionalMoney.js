/**
 * src/lib/professionalMoney.js
 *
 * Money on Professional screens, in USD like the couple site. Tracking only:
 * nothing here moves money.
 */
export function money(amount) {
  const n = Number(amount) || 0;
  const whole = Math.round(n * 100) % 100 === 0;
  return 'US$' + n.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}

/** Sum a list by a field. */
export const total = (rows, key = 'amount') => (rows || []).reduce((t, r) => t + (Number(r?.[key]) || 0), 0);

const DAY = 86400000;
const utcDay = (d) => { const x = new Date(d); return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()); };

/** Payments due from today to the end of the seventh day, and anything overdue. */
export function dueThisWeek(payments, now = new Date()) {
  const today = utcDay(now);
  return (payments || []).filter((p) => p.status === 'due' && p.due_date && utcDay(`${p.due_date}T00:00:00Z`) <= today + 7 * DAY);
}
export function isOverdue(p, now = new Date()) {
  return p.status === 'due' && !!p.due_date && utcDay(`${p.due_date}T00:00:00Z`) < utcDay(now);
}
