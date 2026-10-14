/**
 * src/components/professional/event/EventOverview.jsx
 *
 * The event at a glance, and its basics, editable in place: couple, date,
 * venue, guest estimate, assigned team. Archive and unarchive live here;
 * unarchiving takes a slot.
 */
import React, { useState } from 'react';
import { useProStore, update, CURRENT } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { eventSummary } from '@/lib/professionalEvents';
import { linkedFeedFor } from '@/lib/professionalFeedClient';
import { hasFreeSlot } from '@/lib/professionalPlans';
import { money, dueThisWeek } from '@/lib/professionalMoney';
import { Stat, Field } from '../ProPage';
import { s, PRO } from '../proTheme';
import { TYPE } from '@/styles/typeScale';

export default function EventOverview({ event, me, readOnly }) {
  const store = useProStore();
  const ws = store.ProWorkspace.find((w) => w.id === CURRENT.workspaceId);
  const sum = eventSummary(event, store, new Date(), linkedFeedFor(event, store));
  const due = dueThisWeek(store.PaymentDue.filter((p) => p.event_id === event.id));
  const editable = !readOnly && can(me, 'event.edit', event);
  const [draft, setDraft] = useState(null);
  const [note, setNote] = useState('');
  const team = store.ProMember.filter((m) => m.role !== 'dayof' || (m.assigned_event_ids || []).includes(event.id));

  const save = (e) => {
    e.preventDefault();
    update('ProEvent', event.id, { couple_names: draft.couple_names.trim() || event.couple_names, event_date: draft.event_date || null, venue: draft.venue, guest_estimate: Number(draft.guest_estimate) || null, assigned_member_ids: draft.assigned_member_ids });
    setDraft(null);
  };
  const archive = () => update('ProEvent', event.id, { status: 'archived' });
  const unarchive = () => {
    if (!hasFreeSlot(store.ProEvent, ws?.plan)) { setNote('Every slot on your plan is in use. Archive another event first.'); return; }
    update('ProEvent', event.id, { status: 'active' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Stat label="Coming" value={sum.coming ?? 'Not yet'} sub={sum.linked ? 'Live from the couple' : 'From your guest list'} />
        <Stat label="Waiting" value={sum.waiting ?? 'Not yet'} />
        <Stat label="Tasks overdue" value={sum.overdue} />
        {can(me, 'money.view', event) && <Stat label="Due this week" value={money(due.reduce((t, p) => t + p.amount, 0))} sub={`${due.length} payment${due.length === 1 ? '' : 's'}`} />}
      </div>

      <section style={s.card} aria-labelledby="ov-basics">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h2 id="ov-basics" style={s.cardTitle}>The basics</h2>
          {editable && !draft && <button type="button" style={s.btnSecondary} onClick={() => setDraft({ ...event, assigned_member_ids: event.assigned_member_ids || [] })}>Edit</button>}
        </div>
        {draft ? (
          <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <Field label="Couple"><input style={s.input} value={draft.couple_names} onChange={(e) => setDraft({ ...draft, couple_names: e.target.value })} /></Field>
            <Field label="Date"><input type="date" style={s.input} value={draft.event_date || ''} onChange={(e) => setDraft({ ...draft, event_date: e.target.value })} /></Field>
            <Field label="Venue"><input style={s.input} value={draft.venue || ''} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} /></Field>
            <Field label="Guest estimate"><input inputMode="numeric" style={s.input} value={draft.guest_estimate || ''} onChange={(e) => setDraft({ ...draft, guest_estimate: e.target.value })} /></Field>
            <fieldset style={{ border: 'none', padding: 0, margin: 0, gridColumn: '1 / -1' }}>
              <legend style={s.label}>Assigned team</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
                {team.map((m) => (
                  <label key={m.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: TYPE.body }}>
                    <input
                      type="checkbox"
                      checked={draft.assigned_member_ids.includes(m.id)}
                      onChange={(e) => setDraft({ ...draft, assigned_member_ids: e.target.checked ? [...draft.assigned_member_ids, m.id] : draft.assigned_member_ids.filter((x) => x !== m.id) })}
                    />
                    {m.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <div style={{ display: 'flex', gap: 8, gridColumn: '1 / -1' }}>
              <button type="submit" style={s.btnPrimary}>Save</button>
              <button type="button" style={s.btnSecondary} onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </form>
        ) : (
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, margin: 0 }}>
            {[
              ['Guest estimate', event.guest_estimate || 'Not set'],
              ['Guests from', event.kind === 'linked' ? 'The couple’s Openinvite, live' : 'Your own list'],
              ['Assigned team', (event.assigned_member_ids || []).map((id) => store.ProMember.find((m) => m.id === id)?.name).filter(Boolean).join(', ') || 'Unassigned'],
              ['Status', event.status === 'archived' ? 'Archived, read-only' : readOnly ? 'Read-only on your current plan' : 'Active'],
            ].map(([k, v]) => (
              <div key={k}><dt style={s.label}>{k}</dt><dd style={{ ...s.body, margin: '4px 0 0' }}>{v}</dd></div>
            ))}
          </dl>
        )}
      </section>

      {can(me, 'event.edit', event) && (
        <section style={{ ...s.card, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ ...s.secondary, maxWidth: 560 }}>
            {event.status === 'archived'
              ? 'Archived events are read-only and kept for 24 months. Unarchiving takes one of your plan’s slots.'
              : 'Events archive themselves 30 days after the date. Archiving frees a slot; nothing is deleted.'}
          </span>
          {event.status === 'archived'
            ? <button type="button" style={s.btnSecondary} onClick={unarchive}>Unarchive</button>
            : <button type="button" style={s.btnSecondary} onClick={archive}>Archive</button>}
          {note && <p role="alert" style={{ width: '100%', margin: 0, fontSize: TYPE.secondary, color: PRO.text }}>{note}</p>}
        </section>
      )}
    </div>
  );
}
