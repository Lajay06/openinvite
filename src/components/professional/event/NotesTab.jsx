/**
 * src/components/professional/event/NotesTab.jsx
 *
 * NOTES AND THE MEETING LOG, private to the team. Never on the couple's side,
 * never on a vendor's page, never sent to Ava.
 */
import React, { useState } from 'react';
import { useProStore, create, remove, CURRENT } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { NOTE_KINDS } from '@/lib/professionalNotes';
import { shortDate } from '@/lib/professionalEvents';
import { FilterPill } from '@/components/shared/TableToolbar';
import { ProEmpty } from '../ProPage';
import { downloadCsv, fileSlug } from '../proExport';
import { s, PRO } from '../proTheme';

export default function NotesTab({ event, me, readOnly }) {
  const store = useProStore();
  const editable = !readOnly && can(me, 'notes.edit', event);
  const [kind, setKind] = useState('note');
  const [body, setBody] = useState('');
  const [show, setShow] = useState('all');
  const notes = store.ProNote.filter((n) => n.event_id === event.id).filter((n) => show === 'all' || n.kind === show).slice().sort((a, b) => String(b.created_date).localeCompare(String(a.created_date)));
  const author = (id) => store.ProMember.find((m) => m.id === id)?.name || 'Someone on the team';
  const add = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    create('ProNote', { event_id: event.id, author_member_id: CURRENT.memberId, body: body.trim(), kind, is_test: true });
    setBody('');
  };
  const label = (k) => NOTE_KINDS.find((x) => x.key === k)?.label || 'Note';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {editable && (
        <form onSubmit={add} style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>{NOTE_KINDS.map((k) => <FilterPill key={k.key} label={k.label} active={kind === k.key} onClick={() => setKind(k.key)} />)}</div>
          <textarea aria-label={kind === 'meeting' ? 'Meeting notes' : 'Note'} rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={kind === 'meeting' ? 'Who was there, what was decided, what happens next' : 'Something the team should know'} style={{ ...s.input, resize: 'vertical' }} />
          <button type="submit" style={{ ...s.btnPrimary, alignSelf: 'flex-start' }}>Save</button>
        </form>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <FilterPill label="Everything" active={show === 'all'} onClick={() => setShow('all')} />
        {NOTE_KINDS.map((k) => <FilterPill key={k.key} label={k.label} active={show === k.key} onClick={() => setShow(k.key)} />)}
        <span style={{ flex: 1 }} />
        <button type="button" style={s.btnSecondary} onClick={() => downloadCsv(`${fileSlug(`${event.couple_names} notes`)}.csv`, ['Date', 'Kind', 'By', 'Note'], notes.map((n) => [String(n.created_date).slice(0, 10), label(n.kind), author(n.author_member_id), n.body]))}>CSV</button>
      </div>
      <p style={{ ...s.secondary, margin: 0 }}>Private to your team. The couple and vendors never see these.</p>
      {notes.length === 0 ? <ProEmpty title="No notes yet" /> : notes.map((n) => (
        <article key={n.id} style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={s.secondary}>{label(n.kind)}, {author(n.author_member_id)}, {shortDate(String(n.created_date).slice(0, 10), { weekday: false })}</span>
          <p style={{ ...s.body, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{n.body}</p>
          {editable && n.author_member_id === CURRENT.memberId && <button type="button" style={{ ...s.btnQuiet, alignSelf: 'flex-start', padding: 0, color: PRO.muted }} onClick={() => remove('ProNote', n.id)}>Delete</button>}
        </article>
      ))}
    </div>
  );
}
