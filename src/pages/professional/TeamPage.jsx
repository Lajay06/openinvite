/**
 * src/pages/professional/TeamPage.jsx
 *
 * SEATS AND ROLES. The role lines come from the same table the server checks
 * (src/lib/professionalAccess.js), so what this page promises is what every
 * endpoint enforces. Invites go by email, in the collaborator invite's look.
 * Seats are capped by the plan.
 */
import React, { useState } from 'react';
import { useProStore, create, update, CURRENT, STORE_LIVE, setCurrentMember } from '@/lib/professionalStore';
import { can, ROLES, ROLE_ORDER } from '@/lib/professionalAccess';
import { limitsFor } from '@/lib/professionalPlans';
import { isValidEmailShape } from '@/lib/professionalCodes';
import { FilterPill } from '@/components/shared/TableToolbar';
import { ProPage, ProTable, Pill, Field, ProEmpty } from '@/components/professional/ProPage';
import { s } from '@/components/professional/proTheme';
import { downloadCsv } from '@/components/professional/proExport';
import { TYPE } from '@/styles/typeScale';

export default function TeamPage() {
  const store = useProStore();
  const me = store.ProMember.find((m) => m.id === CURRENT.memberId);
  const ws = store.ProWorkspace.find((w) => w.id === CURRENT.workspaceId);
  const members = store.ProMember.filter((m) => m.workspace_id === CURRENT.workspaceId && m.event_type !== 'remove');
  const events = store.ProEvent.filter((e) => e.status !== 'archived');
  const manage = can(me, 'workspace.team');
  const seats = limitsFor(ws?.plan).seats;
  const full = members.length >= seats;
  const [form, setForm] = useState({ email: '', name: '', role: 'planner', events: [] });
  const [note, setNote] = useState('');

  const invite = (e) => {
    e.preventDefault();
    if (!isValidEmailShape(form.email)) { setNote('Check the email address.'); return; }
    if (full) { setNote(`Your plan has ${seats} seat${seats === 1 ? '' : 's'}. Change plan in Settings to add more.`); return; }
    create('ProMember', { workspace_id: CURRENT.workspaceId, name: form.name.trim() || form.email.split('@')[0], email_display: form.email.trim(), role: form.role, assigned_event_ids: form.events, event_type: 'invite', is_test: true });
    setNote(STORE_LIVE ? `Invite sent to ${form.email.trim()}.` : `Added ${form.email.trim()} to the test team. In the live product this sends the invite email.`);
    setForm({ email: '', name: '', role: form.role, events: [] });
  };

  return (
    <ProPage title="Team" subtitle={`${members.length} of ${seats === Infinity ? 'unlimited' : seats} seat${seats === 1 ? '' : 's'}`} actions={<button type="button" style={s.btnSecondary} onClick={() => downloadCsv('team.csv', ['Name', 'Email', 'Role', 'Events'], members.map((m) => [m.name, m.email_display || '', ROLES[m.role]?.label, m.role === 'owner' ? 'All' : (m.assigned_event_ids || []).map((id) => store.ProEvent.find((e) => e.id === id)?.couple_names).filter(Boolean).join('; ')]))}>CSV</button>}>
      {!STORE_LIVE && (
        <div style={{ ...s.card, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <span style={s.label}>Preview as</span>
          {members.map((m) => <FilterPill key={m.id} label={`${m.name.split(' ')[0]}, ${ROLES[m.role]?.label.toLowerCase()}`} active={CURRENT.memberId === m.id} onClick={() => setCurrentMember(m.id)} />)}
          <span style={s.secondary}>Test data only: see each role&apos;s view of the workspace.</span>
        </div>
      )}

      <ProTable
        label="Team"
        rows={members}
        columns={[
          { key: 'name', label: 'Name', render: (m) => <span style={{ fontWeight: 600 }}>{m.name}{m.id === CURRENT.memberId ? ' (you)' : ''}</span> },
          { key: 'email', label: 'Email', render: (m) => m.email_display || '' },
          {
            key: 'role', label: 'Role', render: (m) => (manage && m.role !== 'owner' ? (
              <select aria-label={`Role for ${m.name}`} value={m.role} onChange={(e) => update('ProMember', m.id, { role: e.target.value })} style={{ ...s.input, width: 'auto', fontSize: TYPE.body }}>
                {ROLE_ORDER.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
              </select>
            ) : ROLES[m.role]?.label),
          },
          { key: 'events', label: 'Events', render: (m) => (m.role === 'owner' ? 'All' : (m.assigned_event_ids || []).map((id) => store.ProEvent.find((e) => e.id === id)?.couple_names).filter(Boolean).join(', ') || 'None yet') },
          { key: 'state', label: '', render: (m) => (m.event_type === 'invite' ? <Pill tone="wait">Invited</Pill> : null) },
          ...(manage ? [{ key: 'x', label: '', render: (m) => (m.role === 'owner' ? '' : <button type="button" style={s.btnQuiet} onClick={() => update('ProMember', m.id, { event_type: 'remove' })}>Remove</button>) }] : []),
        ]}
      />

      {manage && (
        <form onSubmit={invite} style={{ ...s.card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end', marginTop: 16 }}>
          <h2 style={{ ...s.cardTitle, gridColumn: '1 / -1' }}>Invite someone</h2>
          <Field label="Email"><input type="email" style={s.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Name"><input style={s.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Role"><select style={s.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLE_ORDER.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}</select></Field>
          <fieldset style={{ gridColumn: '1 / -1', border: 'none', margin: 0, padding: 0 }}>
            <legend style={s.label}>Events</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
              {events.map((ev) => (
                <label key={ev.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: TYPE.body }}>
                  <input type="checkbox" checked={form.events.includes(ev.id)} onChange={(e) => setForm({ ...form, events: e.target.checked ? [...form.events, ev.id] : form.events.filter((x) => x !== ev.id) })} />
                  {ev.couple_names}
                </label>
              ))}
            </div>
          </fieldset>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" style={s.btnPrimary} disabled={full}>Send invite</button>
            {full && <span style={s.secondary}>Every seat on your plan is taken.</span>}
            {note && <span role="status" style={s.secondary}>{note}</span>}
          </div>
        </form>
      )}

      <section aria-labelledby="roles-h" style={{ marginTop: 24 }}>
        <h2 id="roles-h" style={{ ...s.cardTitle, marginBottom: 8 }}>What each role can do</h2>
        {members.length === 0 ? <ProEmpty title="Just you so far" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            {ROLE_ORDER.map((r) => (
              <div key={r} style={s.card}>
                <div style={{ fontSize: TYPE.body, fontWeight: 600 }}>{ROLES[r].label}</div>
                <div style={{ ...s.secondary, marginTop: 4 }}>{ROLES[r].line}</div>
              </div>
            ))}
          </div>
        )}
        <p style={{ ...s.secondary, marginTop: 8 }}>Guest details a linked couple shares follow the event: anyone on that event sees what the couple shared, and nothing more.</p>
      </section>
    </ProPage>
  );
}
