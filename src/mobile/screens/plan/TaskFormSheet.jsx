import React, { useEffect, useState } from 'react';
import { BottomSheet, PillButton, TextField, SelectField } from '../../ui';

const PRIORITIES = [{ value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }];

export default function TaskFormSheet({ open, onClose, onSave }) {
  const [f, setF] = useState({ title: '', priority: 'Medium', due_date: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setF({ title: '', priority: 'Medium', due_date: '' }); setError(''); } }, [open]);
  const submit = async () => {
    if (!f.title.trim()) { setError('Give the task a name.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...f, title: f.title.trim() });
      onClose();
    } catch (e) {
      setError(e?.message || 'Could not add this task. Try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add a task"
      footer={(
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
          <PillButton variant="primary" onClick={submit} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving' : 'Add task'}</PillButton>
        </>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextField label="Task" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={error} placeholder="What needs doing" autoFocus />
        <SelectField label="Priority" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} options={PRIORITIES} />
        <TextField label="Due" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
      </div>
    </BottomSheet>
  );
}
