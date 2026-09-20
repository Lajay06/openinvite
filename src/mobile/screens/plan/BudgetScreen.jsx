import React, { useMemo, useState } from 'react';
import { Wallet, Plus, Receipt, CreditCard } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Row, RowGroup, ProgressBar, StatCard, EmptyState, ErrorState, SkeletonRows, PanelCard, ItemCard, ItemList } from '../../ui';
import { BUDGET_CATEGORIES, budgetCategoryLabel } from '@/lib/budgetCategories';
import { money, dateShort } from '../../lib/format';
import ExpenseFormSheet from './ExpenseFormSheet';

export function summariseBudget(items = [], plan = null) {
  const spent = items.reduce((s, i) => s + (i.actual_amount || 0), 0);
  const committed = items.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
  const total = plan?.total ? Number(plan.total) : committed;
  const paid = items.filter((i) => i.paid).reduce((s, i) => s + (i.actual_amount || 0), 0);
  const cats = BUDGET_CATEGORIES.map((c) => {
    const rows = items.filter((i) => i.category === c.key);
    const planned = plan?.categories?.[c.key] != null ? Number(plan.categories[c.key]) || 0 : rows.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
    return { key: c.key, label: c.label, planned, spent: rows.reduce((s, i) => s + (i.actual_amount || 0), 0), count: rows.length };
  }).filter((c) => c.planned > 0 || c.count > 0);
  const duePayments = items.filter((i) => !i.paid && i.payment_date).sort((a, b) => String(a.payment_date).localeCompare(String(b.payment_date)));
  return { spent, committed, total, paid, remaining: total - spent, cats, duePayments };
}

/** Budget and payments: totals, the next payment due, categories as rows. */
export default function BudgetScreen({ items = [], plan = null, symbol = '$', onOpenCategory, onAdd, onMarkPaid, loading, error, onRetry, back, openAdd = false, onRefresh }) {
  const [sheet, setSheet] = useState({ open: openAdd, item: null });
  const s = useMemo(() => summariseBudget(items, plan), [items, plan]);
  const next = s.duePayments[0];
  return (
    <Screen title="Budget" subtitle={loading ? '' : s.total ? `${money(s.remaining, symbol)} left` : ''} back={back} actions={[{ icon: Plus, label: 'Add an expense', onClick: () => setSheet({ open: true, item: null }) }]} onRefresh={onRefresh}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : items.length === 0 && !plan?.total ? (
          <EmptyState icon={Wallet} text="No expenses yet. Add the first one and your totals start here." actionLabel="Add an expense" onAction={() => setSheet({ open: true, item: null })} />
        ) : (
          <>
            <div className="oi-m-card">
              <p className="oi-m-meta">Spent so far</p>
              <p className="oi-m-hero-num" style={{ margin: '4px 0 16px' }}>{money(s.spent, symbol)}</p>
              <ProgressBar value={s.spent} max={s.total} note={s.total > 0 ? `${money(s.remaining, symbol)} of ${money(s.total, symbol)} left.` : 'Set a total budget on desktop to see what is left.'} />
            </div>
            <div className="oi-m-grid2">
              <StatCard icon={CreditCard} label="Paid" number={money(s.paid, symbol)} />
              <StatCard icon={Receipt} label="Still to pay" number={money(Math.max(0, s.spent - s.paid), symbol)} ink />
            </div>
            {next && (
              <PanelCard tone="wine" label="Next payment" title={`${money(next.actual_amount || next.budgeted_amount, symbol)} to ${next.vendor || next.item_name}`} body={`Due ${dateShort(next.payment_date)}. ${s.duePayments.length > 1 ? `${s.duePayments.length - 1} more after that.` : ''}`} action="See the payment" onClick={() => setSheet({ open: true, item: next })} />
            )}
            <section>
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Categories</h2>
              <RowGroup>
                {s.cats.map((c) => <Row key={c.key} label={c.label} sub={`${money(c.spent, symbol)} of ${money(c.planned, symbol)}`} value={c.count ? `${c.count} item${c.count === 1 ? '' : 's'}` : ''} onClick={() => onOpenCategory?.(c.key)} />)}
              </RowGroup>
            </section>
            {s.duePayments.length > 0 && (
              <section>
                <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Payments due</h2>
                <ItemList>
                  {s.duePayments.map((i) => (
                    <ItemCard key={i.id} icon={Receipt} tile="warn" title={i.item_name} meta={[i.vendor, `Due ${dateShort(i.payment_date)}`].filter(Boolean).join(' · ')} value={money(i.actual_amount || i.budgeted_amount, symbol)} onClick={() => setSheet({ open: true, item: i })} action={onMarkPaid ? { icon: CreditCard, label: `Mark ${i.item_name} paid`, tone: 'primary', onClick: () => onMarkPaid(i) } : undefined} />
                  ))}
                </ItemList>
              </section>
            )}
          </>
        )}
      </div>
      <ExpenseFormSheet open={sheet.open} item={sheet.item} symbol={symbol} onClose={() => setSheet((x) => ({ ...x, open: false }))} onSave={(v) => onAdd(v, sheet.item)} />
    </Screen>
  );
}

/** One budget category: planned vs spent, then its expenses. */
export function BudgetCategoryScreen({ category, items = [], plan = null, symbol = '$', onSave, back }) {
  const [sheet, setSheet] = useState({ open: false, item: null });
  const label = budgetCategoryLabel(category);
  const rows = items.filter((i) => i.category === category);
  const spent = rows.reduce((s, i) => s + (i.actual_amount || 0), 0);
  const planned = plan?.categories?.[category] != null ? Number(plan.categories[category]) || 0 : rows.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
  return (
    <Screen title={label} back={back} actions={[{ icon: Plus, label: 'Add an expense', onClick: () => setSheet({ open: true, item: null }) }]}>
      <div className="oi-m-stack oi-m-stack--24">
        <div className="oi-m-card">
          <p className="oi-m-hero-num" style={{ marginBottom: 16 }}>{money(spent, symbol)}</p>
          <ProgressBar value={spent} max={planned} note={planned > 0 ? `${money(planned - spent, symbol)} of ${money(planned, symbol)} left in ${label.toLowerCase()}.` : 'Nothing planned for this category yet.'} />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Wallet} text={`No expenses in ${label.toLowerCase()} yet.`} actionLabel="Add an expense" onAction={() => setSheet({ open: true, item: null })} />
        ) : (
          <RowGroup>
            {rows.map((i) => <Row key={i.id} label={i.item_name} sub={[i.vendor, i.paid ? 'Paid' : 'Not paid yet'].filter(Boolean).join(' · ')} value={money(i.actual_amount || i.budgeted_amount, symbol)} onClick={() => setSheet({ open: true, item: i })} />)}
          </RowGroup>
        )}
      </div>
      <ExpenseFormSheet open={sheet.open} item={sheet.item} defaultCategory={category} symbol={symbol} onClose={() => setSheet((x) => ({ ...x, open: false }))} onSave={(v) => onSave(v, sheet.item)} />
    </Screen>
  );
}
