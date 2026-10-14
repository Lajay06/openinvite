/**
 * src/components/professional/TaskList.jsx
 *
 * A list of tasks with owners: a tick, the task, its event, its owner and its
 * due date. Shared by "My tasks this week" and each event's tasks.
 */
import React, { useState } from 'react';
import { useProStore, create, update, remove } from '@/lib/professionalStore';
import { isTaskOverdue } from '@/lib/professionalTasks';
import { shortDate } from '@/lib/professionalEvents';
import { Field, Pill } from './ProPage';
import { s, PRO } from './proTheme';
import { TYPE } from '@/styles/typeScale';

export function TaskRow({ task, showEvent, editable, canTick }) {
  const store = useProStore();
  const event = store.ProEvent.find((e) => e.id === task.event_id);
  const owner = store.ProMember.find((m) => m.id === task.owner_id);
  const overdue = isTaskOverdue(task);
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 40, padding: '6px 12px', borderBottom: `1px solid ${PRO.border}`, background: '#FFFFFF' }}>
      <input
        type="checkbox"
        aria-label={task.done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
        checked={!!task.done}
        disabled={!canTick}
        onChange={() => update('ProTask', task.id, { done: !task.done })}
        style={{ width: 16, height: 16, flexShrink: 0 }}
      />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: TYPE.body, color: task.done ? PRO.muted : PRO.text, textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</span>
        <span style={s.secondary}>{[showEvent && event?.couple_names, owner?.name || 'Unassigned'].filter(Boolean).join(', ')}</span>
      </span>
      <span style={{ ...s.secondary, whiteSpace: 'nowrap' }}>{task.due_date ? shortDate(task.due_date, { weekday: false }) : 'No date'}</span>
      {overdue && <Pill tone="bad">Overdue</Pill>}
      {editable && <button type="button" style={s.btnQuiet} onClick={() => remove('ProTask', task.id)} aria-label={`Remove "${task.title}"`}>Remove</button>}
    </li>
  );
}

export function AddTask({ events, defaultEventId = null, members, onDone }) {
  const [form, setForm] = useState({ title: '', event_id: defaultEventId || '', owner_id: members[0]?.id || '', due_date: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    create('ProTask', { title: form.title.trim(), event_id: form.event_id || null, owner_id: form.owner_id || null, due_date: form.due_date || null, done: false, months_out: null, is_test: true });
    setForm((f) => ({ ...f, title: '' }));
    onDone?.();
  };
  return (
    <form onSubmit={submit} style={{ ...s.card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, alignItems: 'end' }}>
      <div style={{ gridColumn: 'span 2' }}><Field label="Task"><input style={s.input} value={form.title} onChange={set('title')} placeholder="Confirm shuttle times" /></Field></div>
      {!defaultEventId && (
        <Field label="Event"><select style={s.input} value={form.event_id} onChange={set('event_id')}><option value="">No event</option>{events.map((ev) => <option key={ev.id} value={ev.id}>{ev.couple_names}</option>)}</select></Field>
      )}
      <Field label="Owner"><select style={s.input} value={form.owner_id} onChange={set('owner_id')}><option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
      <Field label="Due"><input type="date" style={s.input} value={form.due_date} onChange={set('due_date')} /></Field>
      <button type="submit" style={s.btnPrimary}>Add task</button>
    </form>
  );
}
