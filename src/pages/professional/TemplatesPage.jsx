/**
 * src/pages/professional/TemplatesPage.jsx
 *
 * THE TEMPLATES LIBRARY: save any event's run sheet, checklist, budget,
 * questionnaire or vendor package, and start new events from it (New event
 * lists every template here).
 */
import React, { useState } from 'react';
import { useProStore, create, remove, CURRENT } from '@/lib/professionalStore';
import { can, visibleEvents } from '@/lib/professionalAccess';
import { BUILT_IN, TEMPLATE_KINDS, runSheetTemplateBody } from '@/lib/professionalTemplates';
import { FilterPill } from '@/components/shared/TableToolbar';
import { ProPage, ProTable, Pill, Field } from '@/components/professional/ProPage';
import { s } from '@/components/professional/proTheme';

/** What a template holds, in a few words. */
export function templateSize(t) {
  const b = t.body || {};
  if (t.kind === 'runsheet') return `${(b.rows || []).length} rows`;
  if (t.kind === 'checklist') return `${(b.tasks || []).length} tasks`;
  if (t.kind === 'budget') return `${(b.lines || []).length} lines`;
  if (t.kind === 'questionnaire') return `${(b.questions || []).length} questions`;
  if (t.kind === 'vendors') return `${(b.vendor_ids || []).length} vendors`;
  return '';
}

function bodyFrom(kind, event, store) {
  if (kind === 'runsheet') return runSheetTemplateBody(store.RunSheetRow.filter((r) => r.event_id === event.id));
  if (kind === 'checklist') return { tasks: store.ProTask.filter((t) => t.event_id === event.id).map((t) => [t.months_out || 'week', t.title]) };
  if (kind === 'budget') return { lines: store.ProCost.filter((c) => c.event_id === event.id).map((c) => ({ kind: c.kind, label: c.label, amount: c.amount })) };
  if (kind === 'questionnaire') { const f = store.ProQuestionnaire.find((q) => q.event_id === event.id); return { questions: (f?.questions || []).map((q) => ({ id: q.id, label: q.label, kind: q.kind })) }; }
  if (kind === 'vendors') return { vendor_ids: store.ProVendorBooking.filter((b) => b.event_id === event.id).map((b) => b.vendor_id) };
  return {};
}

export default function TemplatesPage() {
  const store = useProStore();
  const me = store.ProMember.find((m) => m.id === CURRENT.memberId);
  const editable = can(me, 'workspace.templates');
  const events = visibleEvents(me, store.ProEvent);
  const [kind, setKind] = useState('all');
  const [form, setForm] = useState({ kind: 'runsheet', event_id: events[0]?.id || '', name: '' });
  const [saved, setSaved] = useState('');
  const custom = store.ProTemplate.filter((t) => t.workspace_id === CURRENT.workspaceId);
  const all = [...BUILT_IN.map((t) => ({ ...t, builtin: true })), ...custom].filter((t) => kind === 'all' || t.kind === kind);

  const save = (e) => {
    e.preventDefault();
    const event = events.find((x) => x.id === form.event_id);
    if (!event) return;
    // A budget template copies the event's money; it needs money access on that event.
    if (form.kind === 'budget' && !can(me, 'money.view', event)) { setSaved(''); return; }
    const label = TEMPLATE_KINDS.find((k) => k.key === form.kind)?.label;
    const name = form.name.trim() || `${event.couple_names}, ${label.toLowerCase()}`;
    create('ProTemplate', { workspace_id: CURRENT.workspaceId, kind: form.kind, name, body: bodyFrom(form.kind, event, store), is_test: true });
    setSaved(name);
    setForm({ ...form, name: '' });
  };

  return (
    <ProPage title="Templates" subtitle={`${all.length} shown`}>
      {editable && (
        <form onSubmit={save} style={{ ...s.card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, alignItems: 'end', marginBottom: 16 }}>
          <Field label="Save the"><select style={s.input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{TEMPLATE_KINDS.filter((k) => k.key !== 'budget' || can(me, 'money.view', events.find((x) => x.id === form.event_id))).map((k) => <option key={k.key} value={k.key}>{k.label.toLowerCase()}</option>)}</select></Field>
          <Field label="From"><select style={s.input} value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })}>{events.map((ev) => <option key={ev.id} value={ev.id}>{ev.couple_names}</option>)}</select></Field>
          <Field label="Name it"><input style={s.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Barn wedding, full day" /></Field>
          <button type="submit" style={s.btnPrimary}>Save as a template</button>
          {saved && <p role="status" style={{ ...s.secondary, gridColumn: '1 / -1', margin: 0 }}>Saved &quot;{saved}&quot;. It&apos;s ready in New event.</p>}
        </form>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <FilterPill label="All" active={kind === 'all'} onClick={() => setKind('all')} />
        {TEMPLATE_KINDS.map((k) => <FilterPill key={k.key} label={k.label} active={kind === k.key} onClick={() => setKind(k.key)} />)}
      </div>
      <ProTable
        label="Templates"
        rows={all}
        empty="No templates of this kind yet."
        columns={[
          { key: 'name', label: 'Name', render: (t) => <span style={{ fontWeight: 600 }}>{t.name}</span> },
          { key: 'kind', label: 'Kind', render: (t) => TEMPLATE_KINDS.find((k) => k.key === t.kind)?.label },
          { key: 'size', label: 'Holds', render: templateSize },
          { key: 'src', label: '', render: (t) => (t.builtin ? <Pill>Built in</Pill> : editable ? <button type="button" style={s.btnQuiet} onClick={() => remove('ProTemplate', t.id)}>Delete</button> : '') },
        ]}
      />
    </ProPage>
  );
}
