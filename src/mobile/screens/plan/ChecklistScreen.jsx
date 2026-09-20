import React, { useMemo, useState } from 'react';
import { ListChecks, Plus } from 'lucide-react';
import Screen from '../../shell/Screen';
import { RowGroup, ProgressBar, EmptyState, ErrorState, SkeletonRows, Checkbox } from '../../ui';
import { dueLabel } from '../../lib/format';
import TaskFormSheet from './TaskFormSheet';

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

/** The to-do list: grouped, tap to complete, add sheet. */
export default function ChecklistScreen({ tasks = [], onToggle, onAdd, loading, error, onRetry, back, openAdd = false }) {
  const [sheet, setSheet] = useState(openAdd);
  const groups = useMemo(() => groupTasks(tasks), [tasks]);
  const open = tasks.filter((t) => !t.completed).length;
  const done = tasks.length - open;
  return (
    <Screen title="To do" subtitle={loading ? '' : open ? `${open} open` : tasks.length ? 'All done' : ''} back={back} actions={[{ icon: Plus, label: 'Add a task', onClick: () => setSheet(true) }]}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : tasks.length === 0 ? (
          <EmptyState icon={ListChecks} text="No tasks yet. Add the first thing on your mind." actionLabel="Add a task" onAction={() => setSheet(true)} />
        ) : (
          <>
            <div className="oi-m-card">
              <ProgressBar value={done} max={tasks.length} note={open === 0 ? 'Everything is done.' : `${done} of ${tasks.length} done, ${open} to go.`} />
            </div>
            {groups.map((g) => (
              <section key={g.key}>
                <h2 className="oi-m-section" style={{ marginBottom: 12 }}>{g.title}</h2>
                <RowGroup>
                  {g.items.map((t) => (
                    <div key={t.id} className="oi-m-row">
                      <Checkbox checked={!!t.completed} onChange={() => onToggle?.(t)} label={t.title} />
                      <div className="oi-m-row__body">
                        <div className="oi-m-row__label oi-m-row__label--wrap" style={{ textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? 'var(--m-text-2)' : undefined }}>{t.title}</div>
                        {(t.due_date || (t.priority && t.priority !== 'Medium')) && <div className="oi-m-row__sub">{[dueLabel(t.due_date), t.priority && t.priority !== 'Medium' ? `${t.priority} priority` : ''].filter(Boolean).join(' · ')}</div>}
                      </div>
                    </div>
                  ))}
                </RowGroup>
              </section>
            ))}
          </>
        )}
      </div>
      <TaskFormSheet open={sheet} onClose={() => setSheet(false)} onSave={onAdd} />
    </Screen>
  );
}
