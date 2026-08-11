import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import toast from 'react-hot-toast';
import { Plus, Trash2, CheckSquare, Square, List, Columns, Edit3, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import DashboardPageHeader from '../components/layout/DashboardPageHeader';
import { PRIORITY, SETTABLE_PRIORITIES, SORT_KEYS, DEFAULT_SORT, normalisePriority, nextSort, sortTasks } from '@/lib/todoSort';

const Note = base44.entities.Note;

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS,
};

const KANBAN_COLS = ['Ideas', 'In progress', 'Done'];

// Sort choice is a per-viewer display preference, so localStorage rather
// than the couple's record — same reasoning as the seating label toggle.
// It does not follow the user between devices; cheap to promote later.
const SORT_PREF_KEY = 'oi_todo_sort';
function loadSortPref() {
  try {
    const raw = JSON.parse(localStorage.getItem(SORT_PREF_KEY) || 'null');
    if (raw && SORT_KEYS.includes(raw.key) && ['asc', 'desc'].includes(raw.dir)) return raw;
  } catch { /* fall through to the default */ }
  return DEFAULT_SORT;
}

function formatDueDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(task) {
  if (!task.due_date || task.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.due_date + 'T00:00:00') < today;
}

// Due within the next 7 days (inclusive), not already overdue, not completed.
function isUpcoming(task) {
  if (!task.due_date || task.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + 'T00:00:00');
  if (due < today) return false;
  const weekOut = new Date(today);
  weekOut.setDate(weekOut.getDate() + 7);
  return due <= weekOut;
}

// Subtle text-color-only emphasis for the due-date chip — no badge, no
// background/border swap. Muted red for overdue, muted amber for upcoming
// (both reuse tones already established elsewhere in this app, e.g.
// GuestList.jsx's declined/pending status colors), plain muted grey by
// default.
function dueDateTone(task) {
  if (isOverdue(task)) return '#991b1b';
  if (isUpcoming(task)) return '#854d0e';
  return 'rgba(10,10,10,0.6)';
}

const headerCellStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
  color: 'rgba(10,10,10,0.6)', fontFamily: PJS,
  padding: '10px 12px 10px 0', textAlign: 'left', whiteSpace: 'nowrap',
};

/**
 * Column header that sorts. The direction indicator is a caret that is only
 * rendered for the active column — an always-visible neutral glyph on every
 * header reads as "all four are sorted", which is the opposite of the signal.
 * aria-sort carries the same state to assistive tech, since the caret is
 * decorative.
 */
function SortableHeader({ label, sortKey, sort, onSort, width }) {
  const active = sort.key === sortKey;
  const asc = sort.dir === 'asc';
  return (
    <th
      style={{ ...headerCellStyle, width }}
      aria-sort={active ? (asc ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Sort by ${label.toLowerCase()}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          font: 'inherit', letterSpacing: 'inherit',
          color: active ? '#0A0A0A' : 'rgba(10,10,10,0.6)',
        }}
      >
        {label}
        {active && (asc ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />)}
      </button>
    </th>
  );
}

export default function TodoList({ embedded = false }) {
  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState('list');       // 'list' | 'kanban'
  const [filter, setFilter]         = useState('All');        // 'All' | 'Active' | 'Completed'
  const [sort, setSort]             = useState(loadSortPref); // { key, dir }
  const [newTitle, setNewTitle]     = useState('');
  // Lowercase, because that is Note.jsonc's enum. This used to hold
  // 'Medium' and write it verbatim, so every task the couple created was
  // saved with a value outside the schema's own enum.
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [kanbanAdd, setKanbanAdd]   = useState({ col: null, title: '', desc: '', dueDate: '' });
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const rowRefs = useRef(new Map());
  const scrolledForId = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { loadTasks(); }, []);

  // Arriving from the top-bar search — scroll to and briefly highlight the
  // row instead of landing at the top of the page. Same pattern as
  // Guests.jsx/Vendors.jsx. Only applies to the list view (the default);
  // a to-do found via search that's currently in kanban view just won't
  // auto-scroll — an acceptable gap given kanban isn't the default.
  useEffect(() => {
    const id = location.state?.highlightId;
    if (!id) return;
    setHighlightedTaskId(id);
    navigate(location.pathname, { replace: true, state: {} });
    const t = setTimeout(() => setHighlightedTaskId(null), 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.highlightId]);

  useEffect(() => {
    if (!highlightedTaskId || scrolledForId.current === highlightedTaskId) return;
    const el = rowRefs.current.get(highlightedTaskId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      scrolledForId.current = highlightedTaskId;
    }
  }, [highlightedTaskId, tasks]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const all = await getMyRecords('Note', '-created_date');
      setTasks(all.filter(n => n.view_type === 'todo'));
    } catch { toast.error('Failed to load tasks'); }
    setLoading(false);
  };

  /* ── List view CRUD ── */
  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      const t = await Note.create({
        title: newTitle.trim(), completed: false,
        priority: newPriority, status: 'Ideas', view_type: 'todo',
        due_date: newDueDate || undefined,
      });
      setTasks(prev => [t, ...prev]);
      setNewTitle('');
      setNewDueDate('');
    } catch { toast.error('Failed to add task'); }
  };

  const handleToggle = async (task) => {
    try {
      await Note.update(task.id, { completed: !task.completed });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    } catch { toast.error('Failed to update task'); }
  };

  const handleEditSave = async (id, updates) => {
    try {
      await Note.update(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch { toast.error('Failed to update task'); }
  };

  const handleDelete = async (id) => {
    try {
      await Note.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  /* ── Kanban CRUD ── */
  const handleKanbanAdd = async (col) => {
    if (!kanbanAdd.title.trim()) return;
    try {
      const t = await Note.create({
        title: kanbanAdd.title.trim(),
        description: kanbanAdd.desc.trim() || undefined,
        due_date: kanbanAdd.dueDate || undefined,
        completed: col === 'Done', status: col,
        priority: 'medium', view_type: 'todo',
      });
      setTasks(prev => [t, ...prev]);
      setKanbanAdd({ col: null, title: '', desc: '', dueDate: '' });
    } catch { toast.error('Failed to add card'); }
  };

  const handleMove = async (task, newStatus) => {
    try {
      await Note.update(task.id, { status: newStatus, completed: newStatus === 'Done' });
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: newStatus, completed: newStatus === 'Done' } : t
      ));
    } catch { toast.error('Failed to move card'); }
  };

  /* ── Derived ── */
  const filtered = tasks.filter(t => {
    if (filter === 'Active')    return !t.completed;
    if (filter === 'Completed') return t.completed;
    return true;
  });

  const sorted = useMemo(() => sortTasks(filtered, sort), [filtered, sort]);

  const toggleSort = (key) => {
    setSort(prev => {
      const next = nextSort(prev, key);
      try { localStorage.setItem(SORT_PREF_KEY, JSON.stringify(next)); } catch { /* private mode — session only */ }
      return next;
    });
  };

  /* ── Render ── */
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      {!embedded && <DashboardPageHeader title="To do list" subtitle="Track tasks, ideas, and to-dos for your wedding" />}

      <div style={{ padding: '32px 32px 48px' }}>

        {/* View toggle + progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['list', 'List', List], ['kanban', 'Kanban', Columns]].map(([v, lbl, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 999,
                  background: view === v ? '#0A0A0A' : 'rgba(10,10,10,0.06)',
                  color: view === v ? '#FFFFFF' : '#444444',
                  border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: PJS,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} />
                {lbl}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
            {done}/{total} complete
          </span>
        </div>

        {/* ─────────── LIST VIEW ─────────── */}
        {view === 'list' && (
          <>
            {/* Add task row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
              paddingBottom: 24, borderBottom: '1px solid rgba(10,10,10,0.08)',
            }}>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Add a new task…"
                style={{
                  flex: 1, border: 'none',
                  borderBottom: '1px solid rgba(10,10,10,0.18)',
                  background: 'none', fontSize: 14, color: '#0A0A0A',
                  fontFamily: PJS, outline: 'none', padding: '6px 0',
                }}
                onFocus={e => { e.target.style.borderBottomColor = '#E03553'; e.target.style.borderBottomWidth = '2px'; }}
                onBlur={e => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'; e.target.style.borderBottomWidth = '1px'; }}
              />
              {/* Deadline */}
              <input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                title="Deadline"
                style={{
                  border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
                  background: 'none', fontSize: 12, color: newDueDate ? '#0A0A0A' : 'rgba(10,10,10,0.58)',
                  fontFamily: PJS, outline: 'none', padding: '6px 0', width: 118,
                }}
              />
              {/* Priority chips */}
              <div style={{ display: 'flex', gap: 4 }}>
                {SETTABLE_PRIORITIES.map(p => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    style={{
                      padding: '4px 10px', borderRadius: 999,
                      border: `1px solid ${newPriority === p ? PRIORITY[p].border : 'rgba(10,10,10,0.1)'}`,
                      background: newPriority === p ? PRIORITY[p].bg : 'transparent',
                      color: newPriority === p ? PRIORITY[p].color : '#444444',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: PJS,
                      transition: 'all 0.12s',
                    }}
                  >{PRIORITY[p].label}</button>
                ))}
              </div>
              <button
                onClick={handleAdd}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 18px', whiteSpace: 'nowrap' }}
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', marginBottom: 0, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
              {['All', 'Active', 'Completed'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '8px 18px', background: 'transparent', border: 'none',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: PJS,
                    color: filter === f ? '#E03553' : '#444444',
                    borderBottom: filter === f ? '2px solid #E03553' : '2px solid transparent',
                    marginBottom: -1, transition: 'color 0.13s',
                  }}
                >{f}</button>
              ))}
            </div>

            {/* Task table */}
            <div style={{ marginTop: 0, overflowX: 'auto' }}>
              {loading ? (
                <div style={{ padding: '48px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>Loading…</p>
                </div>
              ) : sorted.length === 0 ? (
                <div style={{ padding: '64px 0', textAlign: 'center' }}>
                  <CheckSquare size={32} style={{ color: 'rgba(10,10,10,0.1)', margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>
                    No tasks yet. Add one above.
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
                      <th style={{ width: 34 }} />
                      <SortableHeader label="Task"      sortKey="title"    sort={sort} onSort={toggleSort} />
                      <SortableHeader label="Due date"  sortKey="due_date" sort={sort} onSort={toggleSort} width={130} />
                      <SortableHeader label="Priority"  sortKey="priority" sort={sort} onSort={toggleSort} width={110} />
                      <th style={{ width: 72, ...headerCellStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onSave={handleEditSave}
                        highlighted={task.id === highlightedTaskId}
                        innerRef={el => { if (el) rowRefs.current.set(task.id, el); else rowRefs.current.delete(task.id); }}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ─────────── KANBAN VIEW ─────────── */}
        {view === 'kanban' && (
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {KANBAN_COLS.map(col => {
              const cards = colTasks(col);
              return (
                <div key={col} style={{ flex: 1, background: '#F5F5F5', padding: '16px 12px', minHeight: 420 }}>
                  {/* Column header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={labelStyle}>{col}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.35)',
                      background: 'rgba(10,10,10,0.07)', borderRadius: 999, padding: '1px 8px',
                      fontFamily: PJS,
                    }}>
                      {cards.length}
                    </span>
                  </div>

                  {/* Cards */}
                  {cards.map(task => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      currentCol={col}
                      allCols={KANBAN_COLS}
                      onMove={handleMove}
                      onDelete={handleDelete}
                      onSave={handleEditSave}
                    />
                  ))}

                  {/* Add card */}
                  {kanbanAdd.col === col ? (
                    <div style={{ background: '#FFFFFF', padding: '12px', border: '1px solid rgba(10,10,10,0.1)', marginTop: 8 }}>
                      <input
                        autoFocus
                        placeholder="Task title…"
                        value={kanbanAdd.title}
                        onChange={e => setKanbanAdd(p => ({ ...p, title: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleKanbanAdd(col)}
                        style={{
                          width: '100%', border: 'none',
                          borderBottom: '1px solid rgba(10,10,10,0.15)',
                          background: 'none', fontSize: 13, fontFamily: PJS,
                          outline: 'none', padding: '4px 0', marginBottom: 8,
                          boxSizing: 'border-box',
                        }}
                      />
                      <input
                        placeholder="Description (optional)"
                        value={kanbanAdd.desc}
                        onChange={e => setKanbanAdd(p => ({ ...p, desc: e.target.value }))}
                        style={{
                          width: '100%', border: 'none',
                          borderBottom: '1px solid rgba(10,10,10,0.08)',
                          background: 'none', fontSize: 11, fontFamily: PJS,
                          outline: 'none', padding: '4px 0', marginBottom: 8,
                          boxSizing: 'border-box',
                        }}
                      />
                      <input
                        type="date"
                        value={kanbanAdd.dueDate}
                        onChange={e => setKanbanAdd(p => ({ ...p, dueDate: e.target.value }))}
                        title="Deadline"
                        style={{
                          width: '100%', border: 'none',
                          borderBottom: '1px solid rgba(10,10,10,0.08)',
                          background: 'none', fontSize: 11,
                          color: kanbanAdd.dueDate ? '#0A0A0A' : 'rgba(10,10,10,0.58)',
                          fontFamily: PJS, outline: 'none', padding: '4px 0', marginBottom: 12,
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleKanbanAdd(col)}
                          className="btn-primary"
                          style={{ fontSize: 12, padding: '6px 14px' }}
                        >Add</button>
                        <button
                          onClick={() => setKanbanAdd({ col: null, title: '', desc: '', dueDate: '' })}
                          className="btn-editorial-secondary"
                          style={{ fontSize: 12, padding: '6px 14px' }}
                        >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setKanbanAdd({ col, title: '', desc: '', dueDate: '' })}
                      style={{
                        width: '100%', marginTop: 8,
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '9px 10px', background: 'transparent',
                        border: '1px dashed rgba(10,10,10,0.18)',
                        cursor: 'pointer', borderRadius: 0,
                        fontSize: 12, fontWeight: 600,
                        color: 'rgba(10,10,10,0.6)', fontFamily: PJS,
                      }}
                    >
                      <Plus size={12} /> Add card
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function TaskRow({ task, onToggle, onDelete, onSave, highlighted, innerRef }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(normalisePriority(task.priority));
  const [dueDate, setDueDate] = useState(task.due_date || '');

  useEffect(() => {
    if (editing) return;
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(normalisePriority(task.priority));
    setDueDate(task.due_date || '');
  }, [task, editing]);

  const startEdit = () => setEditing(true);

  const save = () => {
    if (!title.trim()) return;
    onSave(task.id, { title: title.trim(), description: description.trim() || null, priority, due_date: dueDate || null });
    setEditing(false);
  };

  const cancel = () => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(normalisePriority(task.priority));
    setDueDate(task.due_date || '');
    setEditing(false);
  };

  const p = PRIORITY[normalisePriority(task.priority)];

  if (editing) {
    // The editor spans the full table width rather than trying to squeeze
    // into the four cells — the inline form has its own layout and forcing
    // it into the column grid would make both worse.
    return (
      <tr ref={innerRef} style={{ borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
        <td colSpan={5} style={{ padding: '12px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 18, flexShrink: 0 }} />
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            style={{
              flex: 1, minWidth: 120, border: 'none',
              borderBottom: '2px solid #E03553',
              background: 'none', fontSize: 14, color: '#0A0A0A',
              fontFamily: PJS, outline: 'none', padding: '4px 0',
            }}
          />
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            title="Deadline"
            style={{
              border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
              background: 'none', fontSize: 12, color: dueDate ? '#0A0A0A' : 'rgba(10,10,10,0.58)',
              fontFamily: PJS, outline: 'none', padding: '4px 0', width: 118, flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {SETTABLE_PRIORITIES.map(pr => (
              <button
                key={pr}
                onClick={() => setPriority(pr)}
                style={{
                  padding: '4px 10px', borderRadius: 999,
                  border: `1px solid ${priority === pr ? PRIORITY[pr].border : 'rgba(10,10,10,0.1)'}`,
                  background: priority === pr ? PRIORITY[pr].bg : 'transparent',
                  color: priority === pr ? PRIORITY[pr].color : '#444444',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: PJS,
                }}
              >{PRIORITY[pr].label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={save} className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>Save</button>
            <button onClick={cancel} className="btn-editorial-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>Cancel</button>
          </div>
        </div>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') cancel(); }}
          placeholder="Description (optional)"
          style={{
            marginLeft: 30, border: 'none', borderBottom: '1px solid rgba(10,10,10,0.12)',
            background: 'none', fontSize: 12, color: '#0A0A0A',
            fontFamily: PJS, outline: 'none', padding: '4px 0', maxWidth: 480,
          }}
        />
      </div>
        </td>
      </tr>
    );
  }

  const cell = { padding: '11px 12px 11px 0', verticalAlign: 'middle', borderBottom: '1px solid rgba(10,10,10,0.06)' };

  return (
    <tr ref={innerRef} style={{
      background: highlighted ? 'rgba(224,53,83,0.12)' : undefined,
      transition: 'background 1.2s ease',
    }}>
      <td style={{ ...cell, width: 34 }}>
        <button
          onClick={() => onToggle(task)}
          aria-label={task.completed ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
        >
          {task.completed
            ? <CheckSquare size={18} style={{ color: '#E03553' }} />
            : <Square size={18} style={{ color: 'rgba(10,10,10,0.2)' }} />
          }
        </button>
      </td>

      <td style={cell}>
        <span
          onClick={startEdit}
          title="Click to edit"
          style={{
            fontSize: 14, fontWeight: 500, fontFamily: PJS, cursor: 'pointer',
            color: task.completed ? 'rgba(10,10,10,0.6)' : '#0A0A0A',
            textDecoration: task.completed ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>
      </td>

      {/* Due date is a cell now, not a pill. The overdue/upcoming treatment
          is unchanged: dueDateTone() still drives it, still text-colour only
          — #991b1b overdue (8.31:1 on white), #854d0e within 7 days
          (6.85:1), muted grey otherwise (5.25:1). All three already passed
          AA, so the rebuild kept them rather than restyling them. */}
      <td style={{ ...cell, width: 130, whiteSpace: 'nowrap' }}>
        {task.due_date ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: dueDateTone(task), fontSize: 12, fontWeight: 600, fontFamily: PJS }}>
            <Calendar size={11} />
            {formatDueDate(task.due_date)}
          </span>
        ) : (
          <span style={{ color: 'rgba(10,10,10,0.3)', fontSize: 12, fontFamily: PJS }}>—</span>
        )}
      </td>

      <td style={{ ...cell, width: 110 }}>
        <span style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 999,
          background: p.bg, color: p.color, border: `1px solid ${p.border}`,
          fontSize: 10, fontWeight: 700, fontFamily: PJS,
        }}>
          {p.label}
        </span>
      </td>

      <td style={{ ...cell, width: 72, textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button
          onClick={startEdit}
          aria-label={`Edit ${task.title}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(10,10,10,0.45)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#0A0A0A'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.45)'; }}
        >
          <Edit3 size={14} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          aria-label={`Delete ${task.title}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(10,10,10,0.45)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E03553'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.45)'; }}
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

function KanbanCard({ task, currentCol, allCols, onMove, onDelete, onSave }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');

  useEffect(() => {
    if (editing) return;
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.due_date || '');
  }, [task, editing]);

  const save = () => {
    if (!title.trim()) return;
    onSave(task.id, { title: title.trim(), description: description.trim() || null, due_date: dueDate || null });
    setEditing(false);
  };

  const cancel = () => {
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.due_date || '');
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{
        background: '#FFFFFF', padding: '12px 14px', marginBottom: 8,
        border: '1px solid #E03553',
      }}>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          style={{
            width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.15)',
            background: 'none', fontSize: 13, fontFamily: PJS,
            outline: 'none', padding: '4px 0', marginBottom: 8, boxSizing: 'border-box',
          }}
        />
        <input
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{
            width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.08)',
            background: 'none', fontSize: 11, fontFamily: PJS,
            outline: 'none', padding: '4px 0', marginBottom: 8, boxSizing: 'border-box',
          }}
        />
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          title="Deadline"
          style={{
            width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.08)',
            background: 'none', fontSize: 11, color: dueDate ? '#0A0A0A' : 'rgba(10,10,10,0.58)',
            fontFamily: PJS, outline: 'none', padding: '4px 0', marginBottom: 12, boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>Save</button>
          <button onClick={cancel} className="btn-editorial-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#FFFFFF', padding: '12px 14px', marginBottom: 8,
      border: '1px solid rgba(10,10,10,0.08)',
    }}>
      <p
        onClick={() => setEditing(true)}
        title="Click to edit"
        style={{
          fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, cursor: 'pointer',
          margin: '0 0 4px', overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}
      >
        {task.title}
      </p>
      {task.description && (
        <p style={{
          fontSize: 11, color: '#444444', fontFamily: PJS, margin: '0 0 8px',
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {task.description}
        </p>
      )}
      {task.due_date && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 999, marginBottom: 4,
          background: 'rgba(10,10,10,0.05)', border: '1px solid rgba(10,10,10,0.12)',
          color: dueDateTone(task),
          fontSize: 9, fontWeight: 700, fontFamily: PJS,
        }}>
          <Calendar size={9} />
          {formatDueDate(task.due_date)}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
        {allCols.filter(c => c !== currentCol).map(c => (
          <button
            key={c}
            onClick={() => onMove(task, c)}
            style={{
              fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              border: '1px solid rgba(10,10,10,0.12)', background: 'transparent',
              color: '#444444', cursor: 'pointer', fontFamily: PJS,
            }}
          >→ {c}</button>
        ))}
        <button
          onClick={() => setEditing(true)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(10,10,10,0.18)', display: 'flex' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#0A0A0A'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.18)'; }}
        >
          <Edit3 size={11} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(10,10,10,0.18)', display: 'flex' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E03553'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.18)'; }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
