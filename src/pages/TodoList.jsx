import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import toast from 'react-hot-toast';
import { Plus, Trash2, CheckSquare, Square, List, Columns } from 'lucide-react';
import DashboardPageHeader from '../components/layout/DashboardPageHeader';

const Note = base44.entities.Note;

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS,
};

const PRIORITY = {
  High:   { bg: 'rgba(224,53,83,0.08)',   color: '#E03553', border: 'rgba(224,53,83,0.25)' },
  Medium: { bg: 'rgba(128,61,129,0.08)',  color: '#803D81', border: 'rgba(128,61,129,0.25)' },
  Low:    { bg: 'rgba(10,10,10,0.05)',    color: '#444444', border: 'rgba(10,10,10,0.12)' },
};

const KANBAN_COLS = ['Ideas', 'In progress', 'Done'];

export default function TodoList({ embedded = false }) {
  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState('list');       // 'list' | 'kanban'
  const [filter, setFilter]         = useState('All');        // 'All' | 'Active' | 'Completed'
  const [newTitle, setNewTitle]     = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [kanbanAdd, setKanbanAdd]   = useState({ col: null, title: '', desc: '' });

  useEffect(() => { loadTasks(); }, []);

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
      });
      setTasks(prev => [t, ...prev]);
      setNewTitle('');
    } catch { toast.error('Failed to add task'); }
  };

  const handleToggle = async (task) => {
    try {
      await Note.update(task.id, { completed: !task.completed });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
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
        completed: col === 'Done', status: col,
        priority: 'Medium', view_type: 'todo',
      });
      setTasks(prev => [t, ...prev]);
      setKanbanAdd({ col: null, title: '', desc: '' });
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

  const colTasks = (col) => tasks.filter(t =>
    t.status === col || (col === 'Ideas' && !t.status)
  );

  const done  = tasks.filter(t => t.completed).length;
  const total = tasks.length;

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
              {/* Priority chips */}
              <div style={{ display: 'flex', gap: 4 }}>
                {Object.keys(PRIORITY).map(p => (
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
                  >{p}</button>
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

            {/* Task rows */}
            <div style={{ marginTop: 0 }}>
              {loading ? (
                <div style={{ padding: '48px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>Loading…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '64px 0', textAlign: 'center' }}>
                  <CheckSquare size={32} style={{ color: 'rgba(10,10,10,0.1)', margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>
                    No tasks yet — add one above
                  </p>
                </div>
              ) : (
                filtered.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))
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
                          outline: 'none', padding: '4px 0', marginBottom: 12,
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
                          onClick={() => setKanbanAdd({ col: null, title: '', desc: '' })}
                          className="btn-editorial-secondary"
                          style={{ fontSize: 12, padding: '6px 14px' }}
                        >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setKanbanAdd({ col, title: '', desc: '' })}
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

function TaskRow({ task, onToggle, onDelete }) {
  const p = PRIORITY[task.priority] || PRIORITY.Medium;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: '1px solid rgba(10,10,10,0.06)',
    }}>
      <button
        onClick={() => onToggle(task)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}
      >
        {task.completed
          ? <CheckSquare size={18} style={{ color: '#E03553' }} />
          : <Square size={18} style={{ color: 'rgba(10,10,10,0.2)' }} />
        }
      </button>

      <span style={{
        flex: 1, fontSize: 14, fontWeight: 500, fontFamily: PJS,
        color: task.completed ? 'rgba(10,10,10,0.6)' : '#0A0A0A',
        textDecoration: task.completed ? 'line-through' : 'none',
      }}>
        {task.title}
      </span>

      <span style={{
        padding: '2px 10px', borderRadius: 999,
        background: p.bg, color: p.color, border: `1px solid ${p.border}`,
        fontSize: 10, fontWeight: 700, fontFamily: PJS, flexShrink: 0,
      }}>
        {task.priority || 'Medium'}
      </span>

      <button
        onClick={() => onDelete(task.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(10,10,10,0.2)', display: 'flex', flexShrink: 0 }}
        onMouseEnter={e => { e.currentTarget.style.color = '#E03553'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.2)'; }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function KanbanCard({ task, currentCol, allCols, onMove, onDelete }) {
  return (
    <div style={{
      background: '#FFFFFF', padding: '12px 14px', marginBottom: 8,
      border: '1px solid rgba(10,10,10,0.08)',
    }}>
      <p style={{
        fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS,
        margin: '0 0 4px', overflow: 'hidden',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
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
          onClick={() => onDelete(task.id)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(10,10,10,0.18)', display: 'flex' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E03553'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.18)'; }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
