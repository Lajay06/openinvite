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

export const COST_KINDS = [
  { key: 'fee', label: 'Your fee' },
  { key: 'commission', label: 'Commission' },
  { key: 'cost', label: 'Cost' },
];

/** The professional's own budget: fee and commissions in, costs out. */
export function budgetTotals(lines) {
  const by = (k) => total((lines || []).filter((l) => l.kind === k));
  const income = by('fee') + by('commission');
  return { fee: by('fee'), commission: by('commission'), cost: by('cost'), income, left: income - by('cost') };
}

export const PAYMENT_FILTERS = [
  { key: 'week', label: 'Due this week' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'due', label: 'All due' },
  { key: 'paid', label: 'Paid' },
  { key: 'all', label: 'Everything' },
];

export function filterPayments(rows, key, now = new Date()) {
  if (key === 'week') return dueThisWeek(rows, now);
  if (key === 'overdue') return (rows || []).filter((p) => isOverdue(p, now));
  if (key === 'due') return (rows || []).filter((p) => p.status === 'due');
  if (key === 'paid') return (rows || []).filter((p) => p.status === 'paid');
  return rows || [];
}
