import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ListChecks, Plus, ChevronDown, Download, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { GroupedList, SwipeRow, SWIPE_ICONS, ProgressBar, EmptyState, ErrorState, SkeletonRows, Checkbox, FilterPills, RowGroup, BottomSheet, Row } from '../../ui';
import { useConfirm } from '../../ui/ConfirmSheet';
import { dueLabel } from '../../lib/format';
import { hapticLight, exportText } from '../../native';
import TaskFormSheet from './TaskFormSheet';
import { PRIORITY, SETTABLE_PRIORITIES, SORT_KEYS, DEFAULT_SORT, normalizePriority, nextSort, sortTasks } from '@/lib/todoSort';

const FILTERS = [{ key: 'All', label: 'All' }, { key: 'Active', label: 'Active' }, { key: 'Completed', label: 'Completed' }];
const SORT_LABEL = { due_date: 'Due date', title: 'Title', priority: 'Priority' };
const SORT_PREF_KEY = 'oi_todo_sort';
const MOVE_DELAY = 1000;

function loadSort() {
  try { const v = JSON.parse(localStorage.getItem(SORT_PREF_KEY) || 'null'); if (v && SORT_KEYS.includes(v.key) && ['asc', 'desc'].includes(v.dir)) return v; } catch { /* default */ }
  return DEFAULT_SORT;
}

/** The group a task belongs to by its due date; done tasks stay in their group's Completed section. */
function groupKeyOf(t, today) {
  const d = t.due_date ? new Date(`${String(t.due_date).slice(0, 10)}T00:00:00`) : null;
  if (!d) return 'later';
  if (d < today) return 'overdue';
  if ((d - today) / 86400000 <= 30) return 'soon';
  return 'later';
}
const GROUP_TITLES = { overdue: 'Overdue', soon: 'Next 30 days', later: 'Later' };

/**
 * The to-do list, as TodoList.jsx's list view: filter, sort, add, edit,
 * complete, delete and export, over Note records with view_type 'todo'.
 * Owner fix 4: tapping the circle fills it, strikes the title, gives a
 * light haptic, and after a second the task slides into its group's
 * collapsible Completed section; an Undo toast lasts four seconds; a
 * completed task can be unticked from the Completed section.
 */
export default function ChecklistScreen({ tasks = [], onToggle, onAdd, onUpdate, onRemove, loading, error, onRetry, back, openAdd = false, onRefresh }) {
  const [sheet, setSheet] = useState(openAdd ? { task: null } : null);
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState(loadSort);
  const [sortOpen, setSortOpen] = useState(false);
  const [openDone, setOpenDone] = useState({});
  const [settling, setSettling] = useState({}); // id -> true while a just-completed task holds its place
  const timers = useRef({});
  const [confirm, confirmEl] = useConfirm();
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);
  useEffect(() => { try { localStorage.setItem(SORT_PREF_KEY, JSON.stringify(sort)); } catch { /* fine */ } }, [sort]);

  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const filtered = useMemo(() => tasks.filter((t) => (filter === 'Active' ? !t.completed : filter === 'Completed' ? t.completed : true)), [tasks, filter]);
  // A task completed a moment ago is sorted as if still open, so it holds its place while its tick animates.
  const sorted = useMemo(() => sortTasks(filtered.map((t) => (settling[t.id] ? { ...t, completed: false, _done: true } : t)), sort).map((t) => (t._done ? { ...t, completed: true } : t)), [filtered, sort, settling]);
  const groups = useMemo(() => {
    const byKey = { overdue: { open: [], done: [] }, soon: { open: [], done: [] }, later: { open: [], done: [] } };
    for (const t of sorted) {
      const k = groupKeyOf(t, today);
      // A task completed a moment ago holds its place while its tick animates.
      if (t.completed && !settling[t.id]) byKey[k].done.push(t); else byKey[k].open.push(t);
    }
    return ['overdue', 'soon', 'later'].map((k) => ({ key: k, title: GROUP_TITLES[k], ...byKey[k] })).filter((g) => g.open.length || g.done.length);
  }, [sorted, today, settling]);

  const complete = async (t) => {
    if (t.completed) { await onToggle?.(t); return; }
    hapticLight();
    setSettling((s) => ({ ...s, [t.id]: true }));
    try { await onToggle?.(t); } catch { setSettling((s) => { const n = { ...s }; delete n[t.id]; return n; }); return; }
    clearTimeout(timers.current[t.id]);
    timers.current[t.id] = setTimeout(() => setSettling((s) => { const n = { ...s }; delete n[t.id]; return n; }), MOVE_DELAY);
    toast((tt) => (
      <span>Done<button type="button" className="oi-m-toast-action" onClick={async () => { toast.dismiss(tt.id); clearTimeout(timers.current[t.id]); setSettling((s) => { const n = { ...s }; delete n[t.id]; return n; }); try { await onToggle?.({ ...t, completed: true }); } catch { /* reported by the container */ } }}>Undo</button></span>
    ), { duration: 4000, id: `done-${t.id}` });
  };

  const removeTask = async (t) => {
    if (!(await confirm({ title: 'Remove this task', body: t.title, action: 'Remove' }))) return;
    await onRemove?.(t);
    setSheet(null);
  };
  const exportCsv = async () => {
    if (!tasks.length) { toast.error('Nothing to export yet'); return; }
    const csv = [['Task', 'Status', 'Done', 'Priority', 'Due date', 'Category', 'Timeline', 'Description'].join(','), ...tasks.map((t) => [t.title || '', t.status || 'Ideas', t.completed ? 'Yes' : 'No', t.priority || '', t.due_date || '', t.category || '', t.wedding_timeline || '', t.description || ''].map((f) => `"${String(f).replace(/"/g, '""')}"`).join(','))].join('\n');
    const r = await exportText('wedding-notes.csv', 'text/csv', csv);
    if (r !== 'failed') toast.success('Notes exported'); else toast.error('Could not export.');
  };

  const open = tasks.filter((t) => !t.completed).length;
  const done = tasks.length - open;
  const row = (t) => {
    const settled = t.completed && !settling[t.id];
    const pr = normalizePriority(t.priority);
    return (
      <SwipeRow key={t.id} actions={[
        { key: 'complete', icon: SWIPE_ICONS.complete, label: t.completed ? 'Mark not done' : 'Mark done', tone: 'ok', onAction: () => complete(t) },
        { key: 'remove', icon: SWIPE_ICONS.remove, label: 'Remove task', tone: 'no', onAction: () => removeTask(t) },
      ]}>
        <div className="oi-m-row">
          <Checkbox checked={!!t.completed} onChange={() => complete(t)} label={t.title} />
          <button type="button" className="oi-m-row__body" style={{ textAlign: 'left' }} onClick={() => setSheet({ task: t })}>
            <div className={`oi-m-row__label oi-m-row__label--wrap oi-m-task__title${t.completed ? ' oi-m-task__title--done' : ''}`}>{t.title}</div>
            {(t.due_date || pr !== 'medium' || t.description) && !settled && <div className="oi-m-row__sub">{[dueLabel(t.due_date), pr !== 'medium' ? `${PRIORITY[pr].label} priority` : '', t.description ? 'Has notes' : ''].filter(Boolean).join(', ')}</div>}
          </button>
        </div>
      </SwipeRow>
    );
  };

  return (
    <Screen title="To do" subtitle={loading ? '' : open ? `${open} open` : tasks.length ? 'All done' : ''} back={back} actions={[{ icon: ArrowUpDown, label: 'Sort', onClick: () => setSortOpen(true) }, { icon: Plus, label: 'Add a task', onClick: () => setSheet({ task: null }) }]} onRefresh={onRefresh}>
      <FilterPills options={FILTERS} value={filter} onChange={setFilter} />
      <div className="oi-m-stack oi-m-stack--24" style={{ paddingTop: 16 }}>
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : tasks.length === 0 ? (
          <EmptyState icon={ListChecks} text="No tasks yet. Add the first thing on your mind." actionLabel="Add a task" onAction={() => setSheet({ task: null })} />
        ) : (
          <>
            <div className="oi-m-card">
              <ProgressBar value={done} max={tasks.length} note={open === 0 ? 'Everything is done.' : `${done} of ${tasks.length} done, ${open} to go.`} />
            </div>
            {groups.length === 0 ? <EmptyState icon={ListChecks} text="Nothing here for this filter." /> : (
              <GroupedList groups={groups.map((g) => ({
                key: g.key,
                title: g.title,
                rows: [
                  ...g.open.map(row),
                  ...(g.done.length ? [(
                    <div key={`${g.key}-done`} className="oi-m-swipe" style={{ background: 'var(--m-card)' }}>
                      <button type="button" className="oi-m-row oi-m-row--pressable" onClick={() => setOpenDone((s) => ({ ...s, [g.key]: !s[g.key] }))} aria-expanded={!!openDone[g.key]}>
                        <div className="oi-m-row__body"><div className="oi-m-row__label" style={{ color: 'var(--m-text-2)' }}>Completed</div></div>
                        <span className="oi-m-row__value">{g.done.length}</span>
                        <ChevronDown size={20} strokeWidth={1.75} className={`oi-m-acc__chevron${openDone[g.key] ? ' oi-m-acc__chevron--open' : ''}`} />
                      </button>
                      {openDone[g.key] && g.done.map(row)}
                    </div>
                  )] : []),
                ],
              }))} />
            )}
            <RowGroup><Row icon={Download} tile="neutral" label="Export as CSV" sub="Every task, with its status and notes" onClick={exportCsv} chevron={false} /></RowGroup>
          </>
        )}
      </div>
      <TaskFormSheet open={!!sheet} task={sheet?.task || null} onClose={() => setSheet(null)} onSave={async (v) => (sheet?.task ? onUpdate?.(sheet.task.id, v) : onAdd?.(v))} onDelete={sheet?.task ? () => removeTask(sheet.task) : undefined} onToggle={sheet?.task ? async () => { await complete(sheet.task); setSheet(null); } : undefined} />
      <BottomSheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
        <RowGroup>
          {SORT_KEYS.map((k) => <Row key={k} label={SORT_LABEL[k]} sub={sort.key === k ? (sort.dir === 'asc' ? 'Ascending' : 'Descending') : ''} value={sort.key === k ? 'Chosen' : ''} onClick={() => { setSort(nextSort(sort, k)); }} chevron={false} />)}
        </RowGroup>
        <p className="oi-m-meta" style={{ marginTop: 12 }}>Tap again to flip the direction. Priority can be high, medium or low.</p>
      </BottomSheet>
      {confirmEl}
    </Screen>
  );
}

export { SETTABLE_PRIORITIES };
