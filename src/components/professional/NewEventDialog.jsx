/**
 * src/components/professional/NewEventDialog.jsx
 *
 * NEW EVENT, IN UNDER A MINUTE: couple names, date, venue, guest estimate,
 * template, assigned planner. Instead of the couple onboarding quiz.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useProStore, create, bulk, CURRENT } from '@/lib/professionalStore';
import { BUILT_IN, applyTemplate } from '@/lib/professionalTemplates';
import { hasFreeSlot, limitsFor } from '@/lib/professionalPlans';
import { Field } from './ProPage';
import { s, PRO } from './proTheme';
import { TYPE } from '@/styles/typeScale';

export default function NewEventDialog({ onClose, onCreated }) {
  const store = useProStore();
  const ws = store.ProWorkspace.find((w) => w.id === CURRENT.workspaceId);
  const templates = [...BUILT_IN, ...store.ProTemplate.filter((t) => t.workspace_id === CURRENT.workspaceId)];
  const planners = store.ProMember.filter((m) => m.role === 'owner' || m.role === 'planner');
  const [form, setForm] = useState({ couple_names: '', event_date: '', venue: '', guest_estimate: '', template: 'builtin_day', also: true, planner: CURRENT.memberId });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const full = !hasFreeSlot(store.ProEvent, ws?.plan);

  const submit = (e) => {
    e.preventDefault();
    if (!form.couple_names.trim()) { setError('Add the couple’s names.'); return; }
    if (full) { setError(`Your plan runs ${limitsFor(ws?.plan).events} active events at once. Archive one, or change plan in Settings.`); return; }
    const event = create('ProEvent', {
      workspace_id: CURRENT.workspaceId, couple_names: form.couple_names.trim(), event_date: form.event_date || null,
      venue: form.venue.trim(), guest_estimate: Number(form.guest_estimate) || null, status: 'active', kind: 'standalone',
      assigned_member_ids: form.planner ? [form.planner] : [], template_id: form.template || null, is_test: true,
    });
    const chosen = templates.filter((t) => t.id === form.template || (form.also && t.id === 'builtin_checklist' && form.template !== 'builtin_checklist'));
    bulk(({ create: c }) => {
      for (const t of chosen) {
        const rows = applyTemplate(t, event);
        for (const [kind, list] of Object.entries(rows)) list.forEach((r) => c(kind, { ...r, is_test: true }));
      }
    });
    onCreated(event);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent style={{ maxWidth: 480 }}>
        <DialogTitle style={{ fontSize: 18, fontWeight: 600 }}>New event</DialogTitle>
        <DialogDescription style={{ fontSize: TYPE.secondary, color: PRO.muted }}>The basics now; everything else can wait.</DialogDescription>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <Field label="Couple"><input autoFocus style={s.input} value={form.couple_names} onChange={set('couple_names')} placeholder="Maya and Theo" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
            <Field label="Date"><input type="date" style={s.input} value={form.event_date} onChange={set('event_date')} /></Field>
            <Field label="Guest estimate"><input inputMode="numeric" style={s.input} value={form.guest_estimate} onChange={set('guest_estimate')} placeholder="120" /></Field>
          </div>
          <Field label="Venue"><input style={s.input} value={form.venue} onChange={set('venue')} placeholder="The venue's name and town" /></Field>
          <Field label="Start from">
            <select style={s.input} value={form.template} onChange={set('template')}>
              <option value="">A blank event</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: TYPE.body }}>
            <input type="checkbox" checked={form.also} onChange={set('also')} />
            Add the planning checklist by months to go
          </label>
          <Field label="Assigned planner">
            <select style={s.input} value={form.planner} onChange={set('planner')}>
              <option value="">Unassigned</option>
              {planners.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          {error && <p role="alert" style={{ margin: 0, fontSize: TYPE.secondary, color: '#991b1b' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" style={s.btnSecondary} onClick={onClose}>Cancel</button>
            <button type="submit" style={s.btnPrimary}>Add event</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
