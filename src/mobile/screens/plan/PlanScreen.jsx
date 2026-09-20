import React, { useMemo } from 'react';
import { Plus, ListChecks, Wallet, CalendarDays, Store, Armchair, ChevronRight } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Block, Row, FilterPills, ProgressBar, SkeletonRows, ErrorState, EmptyState, StatusPill, Checkbox, PillButton } from '../../ui';
import { BUDGET_CATEGORIES, budgetCategoryLabel } from '@/lib/budgetCategories';
import { money, dueLabel, dateShort, timeLabel, VENDOR_STATUS_LABEL, VENDOR_STATUS_TONE } from '../../lib/format';

export const SEGMENTS = [
  { key: 'checklist', label: 'Checklist' },
  { key: 'budget', label: 'Budget' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'vendors', label: 'Vendors' },
];

/**
 * Plan: segmented pills under the title switch between checklist, budget,
 * timeline and vendors. Each segment gets its own props bag.
 */
export default function PlanScreen({ segment = 'checklist', onSegment, checklist, budget, timeline, vendors, onSeating }) {
  const seg = SEGMENTS.find((s) => s.key === segment) ? segment : 'checklist';
  const actions = seg === 'checklist'
    ? [{ icon: Plus, label: 'Add a task', onClick: checklist?.onAdd }]
    : seg === 'budget'
      ? [{ icon: Plus, label: 'Add an expense', onClick: budget?.onAdd }]
      : [];
  return (
    <Screen title="Plan" actions={actions}>
      <FilterPills className="oi-m-segments" options={SEGMENTS} value={seg} onChange={onSegment} />
      {seg === 'checklist' && <ChecklistSegment {...checklist} />}
      {seg === 'budget' && <BudgetSegment {...budget} />}
      {seg === 'timeline' && <TimelineSegment {...timeline} />}
      {seg === 'vendors' && <VendorsSegment {...vendors} onSeating={onSeating} />}
    </Screen>
  );
}

/* ── Checklist ─────────────────────────────────────────────────────── */

function groupTasks(tasks) {
  const open = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = (t) => (t.due_date ? new Date(`${String(t.due_date).slice(0, 10)}T00:00:00`) : null);
  const overdue = open.filter((t) => due(t) && due(t) < today);
  const soon = open.filter((t) => due(t) && due(t) >= today && (due(t) - today) / 86400000 <= 30);
  const later = open.filter((t) => !overdue.includes(t) && !soon.includes(t));
  const byDue = (a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999');
  return [
    { key: 'overdue', title: 'Overdue', items: overdue.sort(byDue) },
    { key: 'soon', title: 'Next 30 days', items: soon.sort(byDue) },
    { key: 'later', title: 'Later', items: later.sort(byDue) },
    { key: 'done', title: 'Done', items: done },
  ].filter((g) => g.items.length);
}

export function ChecklistSegment({ tasks = [], onToggle, onAdd, loading, error, onRetry }) {
  const groups = useMemo(() => groupTasks(tasks), [tasks]);
  const open = tasks.filter((t) => !t.completed).length;
  const done = tasks.length - open;
  return (
    <div className="oi-m-stack oi-m-stack--16">
      {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : tasks.length === 0 ? (
        <EmptyState icon={ListChecks} text="No tasks yet. Add the first thing on your mind." actionLabel="Add a task" onAction={onAdd} />
      ) : (
        <>
          <Block>
            <ProgressBar value={done} max={tasks.length} note={open === 0 ? 'Everything is done.' : `${done} of ${tasks.length} done, ${open} to go.`} />
          </Block>
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="oi-m-section" style={{ marginBottom: 8 }}>{g.title}</h2>
              <div className="oi-m-block oi-m-block--flush">
                {g.items.map((t) => (
                  <div key={t.id} className="oi-m-row">
                    <Checkbox checked={!!t.completed} onChange={() => onToggle?.(t)} label={t.title} />
                    <div className="oi-m-row__body">
                      <div className="oi-m-row__label" style={{ whiteSpace: 'normal', textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? 'var(--m-text-2)' : undefined }}>{t.title}</div>
                      {(t.due_date || t.priority) && (
                        <div className="oi-m-row__sub">{[dueLabel(t.due_date), t.priority && t.priority !== 'Medium' ? `${t.priority} priority` : ''].filter(Boolean).join(' · ')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

/* ── Budget ────────────────────────────────────────────────────────── */

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
  return { spent, committed, total, paid, remaining: total - spent, cats };
}

export function BudgetSegment({ items = [], plan = null, symbol = '$', onOpenCategory, onAdd, loading, error, onRetry }) {
  const s = useMemo(() => summariseBudget(items, plan), [items, plan]);
  return (
    <div className="oi-m-stack oi-m-stack--16">
      {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : items.length === 0 && !plan?.total ? (
        <EmptyState icon={Wallet} text="No expenses yet. Add the first one and your totals start here." actionLabel="Add an expense" onAction={onAdd} />
      ) : (
        <>
          <Block>
            <p className="oi-m-meta">Spent so far</p>
            <p className="oi-m-num" style={{ marginBottom: 12 }}>{money(s.spent, symbol)}</p>
            <ProgressBar value={s.spent} max={s.total} note={s.total > 0 ? `${money(s.remaining, symbol)} of ${money(s.total, symbol)} left. ${money(s.paid, symbol)} paid.` : 'Set a total budget on desktop to see what is left.'} />
          </Block>
          <section>
            <h2 className="oi-m-section" style={{ marginBottom: 8 }}>Categories</h2>
            <div className="oi-m-block oi-m-block--flush">
              {s.cats.map((c) => (
                <Row key={c.key} label={c.label} sub={`${money(c.spent, symbol)} of ${money(c.planned, symbol)}`} value={c.count ? `${c.count} item${c.count === 1 ? '' : 's'}` : ''} onClick={() => onOpenCategory?.(c.key)} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** One budget category: planned vs spent, then its expenses. */
export function BudgetCategoryScreen({ category, items = [], plan = null, symbol = '$', onAdd, onEdit, back }) {
  const label = budgetCategoryLabel(category);
  const rows = items.filter((i) => i.category === category);
  const spent = rows.reduce((s, i) => s + (i.actual_amount || 0), 0);
  const planned = plan?.categories?.[category] != null ? Number(plan.categories[category]) || 0 : rows.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
  return (
    <Screen title={label} back={back} actions={[{ icon: Plus, label: 'Add an expense', onClick: onAdd }]}>
      <div className="oi-m-stack oi-m-stack--16">
        <Block>
          <p className="oi-m-num" style={{ marginBottom: 12 }}>{money(spent, symbol)}</p>
          <ProgressBar value={spent} max={planned} note={planned > 0 ? `${money(planned - spent, symbol)} of ${money(planned, symbol)} left in ${label.toLowerCase()}.` : 'Nothing planned for this category yet.'} />
        </Block>
        {rows.length === 0 ? (
          <EmptyState icon={Wallet} text={`No expenses in ${label.toLowerCase()} yet.`} actionLabel="Add an expense" onAction={onAdd} />
        ) : (
          <div className="oi-m-block oi-m-block--flush">
            {rows.map((i) => (
              <Row key={i.id} label={i.item_name} sub={[i.vendor, i.paid ? 'Paid' : 'Not paid yet'].filter(Boolean).join(' · ')} value={money(i.actual_amount || i.budgeted_amount, symbol)} onClick={onEdit ? () => onEdit(i) : undefined} />
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}

/* ── Timeline ──────────────────────────────────────────────────────── */

export function TimelineSegment({ items = [], loading, error, onRetry, onOpenDesktop }) {
  const byDay = useMemo(() => {
    const m = new Map();
    for (const it of [...items].sort((a, b) => `${a.event_date || ''}${a.start_time || ''}`.localeCompare(`${b.event_date || ''}${b.start_time || ''}`))) {
      const k = String(it.event_date || '').slice(0, 10) || 'No date';
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(it);
    }
    return [...m.entries()];
  }, [items]);
  return (
    <div className="oi-m-stack oi-m-stack--16">
      {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : items.length === 0 ? (
        <EmptyState icon={CalendarDays} text="No events on the schedule yet. Build it on desktop and it shows here." actionLabel={onOpenDesktop ? 'Open the schedule' : undefined} onAction={onOpenDesktop} />
      ) : (
        byDay.map(([day, list]) => (
          <section key={day}>
            <h2 className="oi-m-section" style={{ marginBottom: 8 }}>{day === 'No date' ? day : dateShort(day)}</h2>
            <div className="oi-m-block oi-m-block--flush">
              {list.map((it) => (
                <div key={it.id} className="oi-m-row">
                  <span className="oi-m-meta oi-m-strong" style={{ width: 72, flexShrink: 0 }}>{timeLabel(it.start_time)}</span>
                  <div className="oi-m-row__body">
                    <div className="oi-m-row__label">{it.event_name}</div>
                    {it.location && <div className="oi-m-row__sub">{it.location}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
      {items.length > 0 && onOpenDesktop && <PillButton variant="secondary" block onClick={onOpenDesktop}>Edit the schedule on desktop</PillButton>}
    </div>
  );
}

/* ── Vendors ───────────────────────────────────────────────────────── */

export function VendorsSegment({ items = [], symbol = '$', loading, error, onRetry, onOpenDesktop, onSeating }) {
  return (
    <div className="oi-m-stack oi-m-stack--16">
      {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={5} /> : items.length === 0 ? (
        <EmptyState icon={Store} text="No vendors saved yet. Add them on desktop and they show here." actionLabel={onOpenDesktop ? 'Open vendors' : undefined} onAction={onOpenDesktop} />
      ) : (
        <div className="oi-m-block oi-m-block--flush">
          {items.map((v) => (
            <div key={v.id} className="oi-m-row">
              <span className="oi-m-row__tile"><Store size={20} strokeWidth={1.75} /></span>
              <div className="oi-m-row__body">
                <div className="oi-m-row__label">{v.name}</div>
                <div className="oi-m-row__sub">{[budgetCategoryLabel(v.category) || v.category, v.quoted_price ? money(v.quoted_price, symbol) : ''].filter(Boolean).join(' · ')}</div>
              </div>
              <StatusPill tone={VENDOR_STATUS_TONE[v.status] || 'neutral'}>{VENDOR_STATUS_LABEL[v.status] || v.status}</StatusPill>
            </div>
          ))}
        </div>
      )}
      {onSeating && (
        <div className="oi-m-block oi-m-block--flush">
          <Row icon={Armchair} label="Seating plan" sub="Best done on desktop" onClick={onSeating} />
        </div>
      )}
      {items.length > 0 && onOpenDesktop && (
        <button type="button" className="oi-m-block__link" onClick={onOpenDesktop} style={{ margin: '0 auto' }}>Manage vendors on desktop <ChevronRight size={16} /></button>
      )}
    </div>
  );
}
