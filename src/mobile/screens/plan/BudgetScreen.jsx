import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOpenById } from '../../lib/openById';
import { Wallet, Plus, Receipt, CreditCard, Search, Download, Sparkles, Pencil, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { useConsiderations } from '../../features/ConsiderationsSheet';

import { Row, RowGroup, ProgressBar, StatCard, EmptyState, ErrorState, SkeletonRows, PanelCard, ItemCard, ItemList, BottomSheet, PillButton, TextField, StatusPill, SearchScreen, FilterPills } from '../../ui';
import Segments, { useSegment } from '../../ui/Segments';
import { BUDGET_CATEGORIES, budgetCategoryLabel } from '@/lib/budgetCategories';
import { money, dateShort } from '../../lib/format';
import { exportText } from '../../native';
import ExpenseFormSheet from './ExpenseFormSheet';

const SEGMENTS = [{ key: 'overview', label: 'Overview' }, { key: 'forecast', label: 'Forecasting' }, { key: 'expenses', label: 'Expenses' }];
/* BudgetForecasting.jsx's benchmarks and tips, verbatim. */
const BENCHMARKS = { venue: { pct: 0.31, label: 'Venue' }, catering: { pct: 0.29, label: 'Catering' }, photography: { pct: 0.10, label: 'Photography' }, flowers: { pct: 0.08, label: 'Flowers' }, music: { pct: 0.05, label: 'Music / Entertainment' }, attire: { pct: 0.07, label: 'Attire' }, transportation: { pct: 0.02, label: 'Transportation' }, decorations: { pct: 0.03, label: 'Decorations' }, rings: { pct: 0.02, label: 'Rings' }, beauty: { pct: 0.02, label: 'Beauty' }, stationery: { pct: 0.01, label: 'Stationery' }, honeymoon: { pct: 0.04, label: 'Honeymoon' }, miscellaneous: { pct: 0.02, label: 'Miscellaneous' } };
const TIPS = { catering: 'Opt for buffet or family-style service instead of plated; it saves 15 to 25 percent.', photography: 'Book a newer photographer building their portfolio for half the cost of established names.', flowers: 'Use greenery-heavy arrangements and seasonal blooms; that saves up to 40 percent.', venue: 'Consider off-peak dates (Fridays, Sundays) for 20 to 30 percent venue discounts.', attire: 'Sample sales, consignment boutiques, or trunk shows can cut costs by 30 to 50 percent.', music: 'A curated Spotify playlist with a good sound system can replace a live band.', decorations: 'DIY centerpieces and candles significantly reduce decoration costs.', transportation: 'Shuttle buses shared among guests are far cheaper than individual cars.', honeymoon: 'Traveling in shoulder season (May, September) cuts flights and hotels by about 30 percent.' };

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
  // Budget.jsx's Remaining is committed minus spent; the plan's total is the planner's, shown against it.
  return { spent, committed, total, paid, remaining: committed - spent, planLeft: total - spent, cats, duePayments };
}

/**
 * Budget, as Budget.jsx: Overview (the stats, the planner sheet for the
 * total and per-category allocation, categories, payments due), Forecasting
 * (the desktop's flags, saving suggestions and Ava's insights), Expenses
 * (search, every expense with edit and delete). Both exports.
 */
export default function BudgetScreen({ items = [], plan = null, symbol = '$', onOpenCategory, onAdd, onDelete, onMarkPaid, onSavePlan, onAsk, loading, error, onRetry, back, openAdd = false, openExpense = null, onRefresh }) {
  const [segment, setSegment] = useSegment(SEGMENTS);
  const [sheet, setSheet] = useState({ open: openAdd, item: null });
  // Reached from global search with an expense id: its sheet opens once the list is in.
  useOpenById(items, openExpense, useCallback((i) => setSheet({ open: true, item: i }), []));
  const [planner, setPlanner] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const considerations = useConsiderations('budget'); // Budget.jsx's Expenses tab category pills
  const s = useMemo(() => summariseBudget(items, plan), [items, plan]);
  const next = s.duePayments[0];
  const stats = useMemo(() => ({ totalBudgeted: s.committed, totalSpent: s.spent, remaining: s.committed - s.spent, percentageUsed: s.committed > 0 ? (s.spent / s.committed) * 100 : 0 }), [s]);
  const results = useMemo(() => { const t = q.trim().toLowerCase(); return t ? items.filter((i) => [i.item_name, i.vendor, i.notes, budgetCategoryLabel(i.category)].some((x) => (x || '').toLowerCase().includes(t))) : []; }, [items, q]);
  const exportExpenses = async () => {
    const csv = [['Category', 'Item Name', 'Vendor', 'Budgeted Amount', 'Actual Amount', 'Paid', 'Payment Date', 'Notes'].join(','), ...items.map((i) => [i.category, i.item_name || '', i.vendor || '', i.budgeted_amount || 0, i.actual_amount || 0, i.paid ? 'Yes' : 'No', i.payment_date || '', i.notes || ''].map((f) => `"${String(f).replace(/"/g, '""')}"`).join(','))].join('\n');
    const r = await exportText('wedding-expenses.csv', 'text/csv', csv); if (r !== 'failed') toast.success('Budget exported');
  };
  const exportPlan = async () => {
    if (!plan) { toast.error('No saved plan to export yet'); return; }
    const total = parseFloat(plan.total) || 0;
    const value = (k) => { const v = plan.categories?.[k]; return v === undefined || v === null || v === '' ? 0 : parseFloat(v) || 0; };
    const allocated = BUDGET_CATEGORIES.reduce((sum, c) => sum + value(c.key), 0);
    const csv = [['Plan item', 'Planned amount'].join(','), ['Total wedding budget', total].map((f) => `"${f}"`).join(','), ...BUDGET_CATEGORIES.map((c) => [c.label, value(c.key)].map((f) => `"${f}"`).join(',')), ['Allocated to categories', allocated].map((f) => `"${f}"`).join(','), ['Unallocated', total - allocated].map((f) => `"${f}"`).join(',')].join('\n');
    const r = await exportText('wedding-budget-plan.csv', 'text/csv', csv); if (r !== 'failed') toast.success('Plan exported');
  };
  const expenseRow = (i) => <Row key={i.id} label={i.item_name} sub={[budgetCategoryLabel(i.category), i.vendor].filter(Boolean).join(', ')} value={money(i.actual_amount || i.budgeted_amount, symbol)} trailing={<StatusPill tone={i.paid ? 'ok' : 'warn'}>{i.paid ? 'Paid' : 'Unpaid'}</StatusPill>} onClick={() => setSheet({ open: true, item: i })} />;
  const actions = segment === 'expenses' ? [{ icon: Search, label: 'Search expenses', onClick: () => setSearchOpen(true) }, { icon: Plus, label: 'Add an expense', onClick: () => setSheet({ open: true, item: null }) }] : [{ icon: Plus, label: 'Add an expense', onClick: () => setSheet({ open: true, item: null }) }];

  return (
    <>
      <Screen title="Budget" subtitle={loading ? '' : items.length ? (s.remaining < 0 ? `${money(Math.abs(s.remaining), symbol)} over budget` : `${money(s.remaining, symbol)} left to spend`) : ''} back={back} actions={actions} onRefresh={onRefresh}>
        <Segments options={SEGMENTS} value={segment} onChange={setSegment} />
        <div className="oi-m-stack oi-m-stack--24">
          {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : segment === 'overview' ? (
            items.length === 0 && !plan?.total ? (
              <>
                <EmptyState icon={Wallet} text="No expenses yet. Add the first one and your totals start here." actionLabel="Add an expense" onAction={() => setSheet({ open: true, item: null })} />
                <PillButton variant="secondary" block icon={Pencil} onClick={() => setPlanner(true)}>Set a total budget</PillButton>
              </>
            ) : (
              <>
                <div className="oi-m-card">
                  <p className="oi-m-meta">Spent so far</p>
                  <p className={`oi-m-hero-num${money(s.spent, symbol).length > 8 ? ' oi-m-hero-num--long' : ''}`} style={{ margin: '4px 0 16px' }}>{money(s.spent, symbol)}</p>
                  <ProgressBar value={s.spent} max={s.total} note={s.total > 0 ? `${money(s.committed, symbol)} committed, ${s.remaining < 0 ? `${money(Math.abs(s.remaining), symbol)} over` : `${money(s.remaining, symbol)} left to spend`}.${plan?.total ? ` ${money(s.planLeft, symbol)} of the ${money(s.total, symbol)} plan unspent.` : ''}` : 'No total yet.'} />
                  <PillButton variant="secondary" size="sm" icon={Pencil} onClick={() => setPlanner(true)} style={{ marginTop: 12 }}>{plan?.total ? 'Edit the plan' : 'Set a total budget'}</PillButton>
                </div>
                <div className="oi-m-grid2">
                  <StatCard icon={CreditCard} label="Paid" number={money(s.paid, symbol)} />
                  <StatCard icon={Receipt} label="Still to pay" number={money(Math.max(0, s.spent - s.paid), symbol)} ink />
                </div>
                {next && <PanelCard tone="ink" label="Next payment" title={`${money(next.actual_amount || next.budgeted_amount, symbol)} to ${next.vendor || next.item_name}`} body={`Due ${dateShort(next.payment_date)}. ${s.duePayments.length > 1 ? `${s.duePayments.length - 1} more after that.` : ''}`} action="See the payment" onClick={() => setSheet({ open: true, item: next })} />}
                <section>
                  <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Categories</h2>
                  <RowGroup>{s.cats.map((c) => <Row key={c.key} label={c.label} sub={`${money(c.spent, symbol)} of ${money(c.planned, symbol)}`} value={c.count ? `${c.count} item${c.count === 1 ? '' : 's'}` : ''} onClick={() => onOpenCategory?.(c.key)} />)}</RowGroup>
                </section>
                {s.duePayments.length > 0 && (
                  <section>
                    <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Payments due</h2>
                    <ItemList>{s.duePayments.map((i) => <ItemCard key={i.id} icon={Receipt} tile="warn" title={i.item_name} meta={[i.vendor, `Due ${dateShort(i.payment_date)}`].filter(Boolean).join(', ')} value={money(i.actual_amount || i.budgeted_amount, symbol)} onClick={() => setSheet({ open: true, item: i })} action={onMarkPaid ? { icon: CreditCard, label: `Mark ${i.item_name} paid`, tone: 'primary', onClick: () => onMarkPaid(i) } : undefined} />)}</ItemList>
                  </section>
                )}
                <RowGroup><Row icon={Download} tile="neutral" label="Export the plan" sub="Your total and each category's allocation" onClick={exportPlan} chevron={false} /></RowGroup>
              </>
            )
          ) : segment === 'forecast' ? (
            <Forecast items={items} stats={stats} symbol={symbol} onAsk={onAsk} />
          ) : (
            <>
              {items.length > 0 && <FilterPills options={[{ key: 'all', label: 'All' }, ...BUDGET_CATEGORIES.filter((c) => items.some((i) => i.category === c.key)).map((c) => ({ key: c.key, label: c.label, count: items.filter((i) => i.category === c.key).length }))]} value={catFilter} onChange={setCatFilter} />}
              {items.length === 0 ? <EmptyState icon={Wallet} text="No expenses yet." actionLabel="Add an expense" onAction={() => setSheet({ open: true, item: null })} /> : <RowGroup>{items.filter((i) => catFilter === 'all' || i.category === catFilter).map(expenseRow)}</RowGroup>}
              <RowGroup><Row icon={Download} tile="neutral" label="Export as CSV" sub="Every expense" onClick={exportExpenses} chevron={false} /></RowGroup>
            </>
          )}
          {!loading && !error && considerations.row}
        </div>
        {considerations.sheet}
        <ExpenseFormSheet open={sheet.open} item={sheet.item} symbol={symbol} onClose={() => setSheet((x) => ({ ...x, open: false }))} onSave={(v) => onAdd(v, sheet.item)} onDelete={sheet.item && onDelete ? async () => { await onDelete(sheet.item); setSheet({ open: false, item: null }); } : undefined} />
        <PlannerSheet open={planner} onClose={() => setPlanner(false)} plan={plan} items={items} symbol={symbol} committed={s.committed} onSave={onSavePlan} />
      </Screen>
      <SearchScreen open={searchOpen} onClose={() => { setSearchOpen(false); setQ(''); }} value={q} onChange={setQ} placeholder="Search by item, vendor or category">
        {q.trim() === '' ? <p className="oi-m-meta" style={{ padding: 16 }}>Start typing to search your expenses.</p> : results.length === 0 ? <p className="oi-m-meta" style={{ padding: 16 }}>Nothing matches that.</p> : <div className="oi-m-stack"><RowGroup>{results.map((i) => <Row key={i.id} label={i.item_name} sub={[budgetCategoryLabel(i.category), i.vendor].filter(Boolean).join(', ')} value={money(i.actual_amount || i.budgeted_amount, symbol)} onClick={() => { setSearchOpen(false); setQ(''); setSheet({ open: true, item: i }); }} />)}</RowGroup></div>}
      </SearchScreen>
    </>
  );
}

/** Budget.jsx's BudgetPlanner: the total and one amount per category, saved through the encrypted PUT. */
function PlannerSheet({ open, onClose, plan, items, symbol, committed, onSave }) {
  const [total, setTotal] = useState('');
  const [cats, setCats] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    const defaults = Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c.key, items.filter((i) => i.category === c.key).reduce((s, i) => s + (i.budgeted_amount || 0), 0) || '']));
    setTotal(plan?.total ?? (committed || ''));
    setCats(plan?.categories ? Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c.key, plan.categories[c.key] ?? ''])) : defaults);
  }, [open, plan, items, committed]);
  const t = parseFloat(total) || 0;
  const allocated = Object.values(cats).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const save = async () => {
    setSaving(true);
    try { await onSave({ total: total === '' ? null : parseFloat(total) || 0, categories: Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c.key, cats[c.key] === '' || cats[c.key] == null ? null : parseFloat(cats[c.key]) || 0])) }); onClose(); } catch (e) { toast.error(e?.message || 'Could not save the plan'); } finally { setSaving(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Budget plan" full footer={(
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
        <PillButton variant="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving' : 'Save plan'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextField label={`Total wedding budget (${symbol})`} type="number" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="50000" />
        {t > 0 && <p className="oi-m-meta">{money(allocated, symbol)} allocated, {money(t - allocated, symbol)} {t - allocated >= 0 ? 'unallocated' : 'over'}.{committed > 0 && Math.round(committed) !== Math.round(t) ? ` Committed in expenses: ${money(committed, symbol)}.` : ''}</p>}
        <h3 className="oi-m-section">By category</h3>
        {BUDGET_CATEGORIES.map((c) => <TextField key={c.key} label={c.label} type="number" inputMode="decimal" value={cats[c.key] ?? ''} onChange={(e) => setCats((s) => ({ ...s, [c.key]: e.target.value }))} placeholder="0" />)}
      </div>
    </BottomSheet>
  );
}

/** BudgetForecasting.jsx without the chart: the flags, the saving suggestions, the remaining-by-category list, Ava's insights. */
function Forecast({ items, stats, symbol, onAsk }) {
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const fmt = (n) => money(n, symbol);
  const categoryData = useMemo(() => { const m = {}; items.forEach((i) => { const c = i.category || 'miscellaneous'; if (!m[c]) m[c] = { budgeted: 0, spent: 0, count: 0 }; m[c].budgeted += i.budgeted_amount || 0; m[c].spent += i.actual_amount || 0; m[c].count++; }); return m; }, [items]);
  const flags = useMemo(() => Object.entries(categoryData).flatMap(([cat, d]) => {
    const b = BENCHMARKS[cat]; if (!b || stats.totalBudgeted === 0) return [];
    const amt = b.pct * stats.totalBudgeted;
    const overBudget = d.spent > d.budgeted && d.budgeted > 0;
    const overBench = d.budgeted > amt * 1.3;
    const severity = overBudget ? 'high' : overBench ? 'medium' : null;
    return severity ? [{ cat, label: b.label, severity, tip: overBudget ? `Actual spend exceeds budget by ${fmt(d.spent - d.budgeted)}. Consider renegotiating with your vendor.` : `Your planned spend is ${fmt(d.budgeted - amt)} above the typical allocation (${fmt(amt)}).` }] : [];
  }).sort((a, b) => (b.severity === 'high' ? 1 : 0) - (a.severity === 'high' ? 1 : 0)), [categoryData, stats]); // eslint-disable-line react-hooks/exhaustive-deps
  const suggestions = useMemo(() => Object.entries(categoryData).flatMap(([cat, d]) => { const b = BENCHMARKS[cat]; if (!b || stats.totalBudgeted === 0) return []; const amt = b.pct * stats.totalBudgeted; if (d.budgeted <= amt * 1.2) return []; const savings = d.budgeted - amt; return [{ cat, label: b.label, savings, tip: TIPS[cat] || `Reducing ${b.label} to industry norms could save you ${fmt(savings)}.` }]; }).sort((a, b) => b.savings - a.savings).slice(0, 5), [categoryData, stats]); // eslint-disable-line react-hooks/exhaustive-deps
  const ask = async () => {
    setBusy(true);
    try {
      const summary = Object.entries(categoryData).map(([category, d]) => ({ category, budgeted: d.budgeted, spent: d.spent, variance: d.spent - d.budgeted }));
      const r = await onAsk(`You are an expert wedding budget consultant. Analyze this couple's wedding budget data and provide actionable insights.\n\nBudget summary: Total budgeted $${stats.totalBudgeted}, Total spent $${stats.totalSpent}, Remaining $${stats.remaining}.\n\nCategory breakdown: ${JSON.stringify(summary)}\n\nIndustry benchmarks: Venue ~31%, Catering ~29%, Photography ~10%, Flowers ~8%, Music ~5%, Attire ~7%.\n\nProvide:\n1. Top 3 most urgent financial risks with specific dollar amounts\n2. Top 3 highest-ROI cost saving actions with estimated savings\n3. A brief overall financial health score (1-10) with one sentence rationale\n\nBe concise, specific, and use dollar figures.`, { response_json_schema: { type: 'object', properties: { health_score: { type: 'number' }, health_rationale: { type: 'string' }, risks: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, detail: { type: 'string' }, urgency: { type: 'string' } } } }, savings_actions: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, estimated_saving: { type: 'string' } } } } } } });
      setAi(r && typeof r === 'object' ? r : null);
      if (!r || typeof r !== 'object') toast.error('Ava did not return insights.');
    } catch { toast.error('Ava could not look at the budget just now.'); } finally { setBusy(false); }
  };
  if (items.length === 0) return <EmptyState icon={Wallet} text="Add a few expenses and the forecast shows what is over, what could save you money, and what Ava thinks." />;
  const shown = showAll ? flags : flags.slice(0, 3);
  return (
    <>
      <div className="oi-m-grid2">
        <StatCard icon={Wallet} label="Budget used" number={`${Math.round(stats.percentageUsed)}%`} />
        <StatCard icon={AlertTriangle} label="Flags" numeric={flags.length} ink />
      </div>
      <section>
        <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Watch</h2>
        {flags.length === 0 ? <div className="oi-m-card"><p className="oi-m-body">Nothing is over budget or well above the usual split. Keep going.</p></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shown.map((f) => <div key={f.cat} className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="oi-m-body oi-m-strong">{f.label}</span><StatusPill tone={f.severity === 'high' ? 'no' : 'warn'}>{f.severity === 'high' ? 'Over budget' : 'Above the norm'}</StatusPill></div><p className="oi-m-meta" style={{ color: 'var(--m-text)' }}>{f.tip}</p></div>)}
            {flags.length > 3 && <PillButton variant="secondary" size="sm" onClick={() => setShowAll((v) => !v)} style={{ alignSelf: 'flex-start' }}>{showAll ? 'Show fewer' : `Show all ${flags.length}`}</PillButton>}
          </div>
        )}
      </section>
      {suggestions.length > 0 && (
        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Where you could save</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {suggestions.map((x) => <div key={x.cat} className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="oi-m-body oi-m-strong">{x.label}</span><span className="oi-m-body oi-m-strong">{fmt(x.savings)}</span></div><p className="oi-m-meta" style={{ color: 'var(--m-text)' }}>{x.tip}</p></div>)}
          </div>
        </section>
      )}
      <section>
        <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Against the usual split</h2>
        <RowGroup>
          {Object.entries(BENCHMARKS).filter(([k]) => categoryData[k]).map(([k, b]) => { const d = categoryData[k]; const amt = b.pct * stats.totalBudgeted; return <Row key={k} label={b.label} sub={`Usually about ${Math.round(b.pct * 100)}%, ${fmt(amt)}`} value={fmt(d.budgeted)} trailing={d.budgeted > amt * 1.3 ? <StatusPill tone="warn">High</StatusPill> : undefined} />; })}
        </RowGroup>
      </section>
      <section>
        <h2 className="oi-m-section" style={{ marginBottom: 12 }}>From Ava</h2>
        {!ai ? <PanelCard tone="ink" mark="✦" label="From Ava" body="Ask Ava to read the numbers: the three biggest risks, the three best savings, and a health score." action={busy ? 'Reading the numbers' : 'Ask Ava'} onClick={busy ? undefined : ask} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ai.health_score != null && <div className="oi-m-card"><div className="oi-m-meta">Health score</div><div className="oi-m-num" style={{ fontSize: 28, lineHeight: '34px' }}>{ai.health_score} of 10</div>{ai.health_rationale && <p className="oi-m-meta" style={{ color: 'var(--m-text)', marginTop: 4 }}>{ai.health_rationale}</p>}</div>}
            {(ai.risks || []).map((r, i) => <div key={i} className="oi-m-card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="oi-m-body oi-m-strong">{r.title}</span>{r.urgency && <StatusPill tone="warn">{r.urgency}</StatusPill>}</div><p className="oi-m-meta" style={{ color: 'var(--m-text)' }}>{r.detail}</p></div>)}
            {(ai.savings_actions || []).map((a, i) => <div key={i} className="oi-m-card"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="oi-m-body">{a.action}</span>{a.estimated_saving && <span className="oi-m-body oi-m-strong" style={{ flexShrink: 0 }}>{a.estimated_saving}</span>}</div></div>)}
            <PillButton variant="secondary" size="sm" icon={Sparkles} onClick={ask} disabled={busy} style={{ alignSelf: 'flex-start' }}>Ask again</PillButton>
          </div>
        )}
      </section>
    </>
  );
}

/** One budget category: planned vs spent, then its expenses. */
export function BudgetCategoryScreen({ category, items = [], plan = null, symbol = '$', onSave, onDelete, back }) {
  const [sheet, setSheet] = useState({ open: false, item: null });
  const label = budgetCategoryLabel(category);
  const rows = items.filter((i) => i.category === category);
  const spent = rows.reduce((s, i) => s + (i.actual_amount || 0), 0);
  const planned = plan?.categories?.[category] != null ? Number(plan.categories[category]) || 0 : rows.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
  return (
    <Screen title={label} back={back} actions={[{ icon: Plus, label: 'Add an expense', onClick: () => setSheet({ open: true, item: null }) }]}>
      <div className="oi-m-stack oi-m-stack--24">
        <div className="oi-m-card">
          <p className={`oi-m-hero-num${money(spent, symbol).length > 8 ? ' oi-m-hero-num--long' : ''}`} style={{ marginBottom: 16 }}>{money(spent, symbol)}</p>
          <ProgressBar value={spent} max={planned} note={planned > 0 ? `${money(planned - spent, symbol)} of ${money(planned, symbol)} left in ${label.toLowerCase()}.` : 'Nothing planned for this category yet.'} />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Wallet} text={`No expenses in ${label.toLowerCase()} yet.`} actionLabel="Add an expense" onAction={() => setSheet({ open: true, item: null })} />
        ) : (
          <RowGroup>
            {rows.map((i) => <Row key={i.id} label={i.item_name} sub={[i.vendor, i.paid ? 'Paid' : 'Not paid yet'].filter(Boolean).join(', ')} value={money(i.actual_amount || i.budgeted_amount, symbol)} onClick={() => setSheet({ open: true, item: i })} />)}
          </RowGroup>
        )}
      </div>
      <ExpenseFormSheet open={sheet.open} item={sheet.item} defaultCategory={category} symbol={symbol} onClose={() => setSheet((x) => ({ ...x, open: false }))} onSave={(v) => onSave(v, sheet.item)} onDelete={sheet.item && onDelete ? async () => { await onDelete(sheet.item); setSheet({ open: false, item: null }); } : undefined} />
    </Screen>
  );
}
