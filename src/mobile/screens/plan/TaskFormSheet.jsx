import React, { useEffect, useState } from 'react';
import { BottomSheet, PillButton, TextField, TextAreaField, SelectField } from '../../ui';
import { useOnline } from '../../shell/OfflineBanner';
import { PRIORITY, SETTABLE_PRIORITIES, normalizePriority } from '@/lib/todoSort';

const PRIORITIES = SETTABLE_PRIORITIES.map((p) => ({ value: p, label: PRIORITY[p].label }));
/** The kanban's columns; the list view flips `completed`, the column owns `status`. */
const STATUSES = ['Ideas', 'In progress', 'Done'].map((s) => ({ value: s, label: s }));

/**
 * Add or edit a task with every field TodoList.jsx edits: title,
 * description, priority (lowercase, as the desktop stores it), due date,
 * and the kanban status. Editing offers Mark done and Remove.
 */
export default function TaskFormSheet({ open, task, preset = null, onClose, onSave, onDelete, onToggle }) {
  const blank = { title: '', description: '', priority: 'medium', due_date: '', status: 'Ideas', ...(preset || {}) };
  const [f, setF] = useState(blank);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const online = useOnline();
  useEffect(() => {
    if (open) { setF(task ? { title: task.title || '', description: task.description || '', priority: normalizePriority(task.priority), due_date: task.due_date || '', status: task.status || (task.completed ? 'Done' : 'Ideas') } : blank); setError(''); }
  }, [open, task, preset]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    if (!f.title.trim()) { setError('Give the task a name.'); return; }
    setSaving(true); setError('');
    try {
      // TodoList.jsx clears with null; undefined would be dropped from the JSON and the old value kept.
      const out = { ...f, title: f.title.trim(), description: f.description.trim() || (task ? null : undefined), due_date: f.due_date || (task ? null : undefined) };
      if (task && f.status !== (task.status || 'Ideas')) out.completed = f.status === 'Done';
      await onSave(out);
      onClose();
    } catch (e) { setError(e?.message || 'Could not save this task. Try again.'); } finally { setSaving(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={task ? 'Task' : 'Add a task'} footer={(
      <>
        {onDelete && <PillButton variant="ghost" onClick={onDelete} disabled={saving} style={{ color: 'var(--m-primary)' }}>Remove</PillButton>}
        <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
        <PillButton variant="primary" onClick={submit} disabled={saving || !online} style={{ flex: 1 }}>{saving ? 'Saving' : !online ? 'Offline' : task ? 'Save' : 'Add task'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextField label="Task" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={error} placeholder="What needs doing" autoFocus={!task} />
        <TextAreaField label="Notes" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Anything worth remembering" rows={3} />
        <SelectField label="Priority" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} options={PRIORITIES} />
        <TextField label="Due" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
        <SelectField label="Column" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={STATUSES} />
        {task && onToggle && <PillButton variant="secondary" block onClick={onToggle}>{task.completed ? 'Mark as not done' : 'Mark as done'}</PillButton>}
      </div>
    </BottomSheet>
  );
}
