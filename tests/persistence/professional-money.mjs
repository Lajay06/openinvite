/**
 * tests/persistence/professional-money.mjs
 *
 * Openinvite Professional: the payment schedule and the professional budget.
 * goals/2026-10-14-professional.md, What a professional gets, 6 and 7, and
 * Team and access ("Assistant: no money").
 *
 * The figures are checked as arithmetic; the "no money for assistants" rule
 * is checked in source, on every screen that reads PaymentDue or ProCost:
 * each must ask can(..., 'money.view' or 'money.edit', ...) first.
 *
 * PLANT (R19): a planted screen that reads PaymentDue with no money check is
 * flagged by the same matcher.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';
import { budgetTotals, filterPayments, dueThisWeek, isOverdue, money } from '../../src/lib/professionalMoney.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const walk = (d, out = []) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p, out); else if (/\.jsx$/.test(e)) out.push(p); } return out; };
const readsMoney = (src) => /\.(PaymentDue|ProCost)\b/.test(src);
const checksMoney = (src) => /can\([^)]*'money\.(view|edit)'/.test(src);

export function runProfessionalMoney() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, payments and budget:\n');

  const now = new Date('2026-10-14T12:00:00Z');
  const p = [
    { id: 1, status: 'due', due_date: '2026-10-12', amount: 100 },
    { id: 2, status: 'due', due_date: '2026-10-20', amount: 200 },
    { id: 3, status: 'due', due_date: '2026-11-20', amount: 300 },
    { id: 4, status: 'paid', due_date: '2026-10-15', amount: 400 },
  ];
  check('professional payments: due this week is the overdue and the next seven days, unpaid', dueThisWeek(p, now).map((x) => x.id).join() === '1,2', 'ids 1,2');
  check('professional payments: overdue is past due and unpaid', filterPayments(p, 'overdue', now).map((x) => x.id).join() === '1' && !isOverdue(p[3], now), 'id 1');
  check('professional payments: paid and all-due split cleanly', filterPayments(p, 'paid', now).length === 1 && filterPayments(p, 'due', now).length === 3 && filterPayments(p, 'all', now).length === 4, 'split');

  const b = budgetTotals([{ kind: 'fee', amount: 9500 }, { kind: 'commission', amount: 420 }, { kind: 'cost', amount: 450 }, { kind: 'cost', amount: 50 }]);
  check('professional budget: fee and commissions in, costs out', b.income === 9920 && b.cost === 500 && b.left === 9420, money(b.left));

  const files = walk(join(ROOT, 'src/pages/professional')).concat(walk(join(ROOT, 'src/components/professional')));
  const unguarded = files.filter((f) => { const src = stripComments(readFileSync(f, 'utf8'), { trailing: true }); return readsMoney(src) && !checksMoney(src); }).map((f) => relative(ROOT, f));
  const reading = files.filter((f) => readsMoney(stripComments(readFileSync(f, 'utf8'), { trailing: true }))).length;
  // Tabs are gated by area in tabs.jsx (money.view), and their own edit check uses money.edit.
  check('professional money: every screen that reads payments or costs checks money access first', unguarded.length === 0, unguarded.join(', ') || `${reading} screens, all checked`);
  const tabs = readFileSync(join(ROOT, 'src/components/professional/event/tabs.jsx'), 'utf8');
  check('professional money: the Payments and Budget tabs need money.view to appear', /key: 'payments'[^\n]*area: 'money\.view'/.test(tabs) && /key: 'budget'[^\n]*area: 'money\.view'/.test(tabs), 'gated');

  const planted = "const rows = store.PaymentDue.filter((x) => x.event_id === id);";
  check('PLANT: a screen reading payments with no money check is flagged', readsMoney(planted) && !checksMoney(planted), 'flagged');
  return r;
}
