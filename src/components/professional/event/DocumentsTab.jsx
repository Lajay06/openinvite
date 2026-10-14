/**
 * src/components/professional/event/DocumentsTab.jsx
 *
 * DOCUMENTS PER EVENT: contracts, floor plans, licenses, insurance. Each is a
 * name, a kind and a link to the file. Team only; never on a vendor's page.
 */
import React, { useState } from 'react';
import { useProStore, create, remove } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { DOC_KINDS, isSafeFileUrl } from '@/lib/professionalNotes';
import { ProTable, Field, ProEmpty } from '../ProPage';
import { downloadCsv, fileSlug } from '../proExport';
import { s } from '../proTheme';
import { TYPE } from '@/styles/typeScale';

export default function DocumentsTab({ event, me, readOnly }) {
  const store = useProStore();
  const docs = store.ProDocument.filter((d) => d.event_id === event.id);
  const editable = !readOnly && can(me, 'documents.edit', event);
  const [form, setForm] = useState({ name: '', kind: 'contract', file_url: '' });
  const [error, setError] = useState('');
  const add = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name the document.'); return; }
    if (!isSafeFileUrl(form.file_url)) { setError('Use a link that starts with https://'); return; }
    create('ProDocument', { event_id: event.id, name: form.name.trim(), kind: form.kind, file_url: form.file_url.trim(), is_test: true });
    setForm({ ...form, name: '', file_url: '' });
    setError('');
  };
  const kindLabel = (k) => DOC_KINDS.find((x) => x.key === k)?.label || 'Other';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {editable && (
        <form onSubmit={add} style={{ ...s.card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
          <Field label="Document"><input style={s.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Caterer contract" /></Field>
          <Field label="Kind"><select style={s.input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{DOC_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select></Field>
          <Field label="Link to the file" hint="Your Drive, Dropbox or anywhere you keep it"><input style={s.input} value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://" /></Field>
          <button type="submit" style={s.btnPrimary}>Add document</button>
          {error && <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, fontSize: TYPE.secondary, color: '#991b1b' }}>{error}</p>}
        </form>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" style={s.btnSecondary} onClick={() => downloadCsv(`${fileSlug(`${event.couple_names} documents`)}.csv`, ['Document', 'Kind', 'Link'], docs.map((d) => [d.name, kindLabel(d.kind), d.file_url]))}>CSV</button>
      </div>
      {docs.length === 0 ? <ProEmpty title="No documents yet" line="Keep the contracts, floor plans, licenses and insurance certificates for this event in one place." /> : (
        <ProTable
          label="Documents"
          rows={docs}
          columns={[
            { key: 'name', label: 'Document', render: (d) => <a href={isSafeFileUrl(d.file_url) ? d.file_url : undefined} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontWeight: 600 }}>{d.name}</a> },
            { key: 'kind', label: 'Kind', render: (d) => kindLabel(d.kind) },
            ...(editable ? [{ key: 'x', label: '', render: (d) => <button type="button" style={s.btnQuiet} onClick={() => remove('ProDocument', d.id)}>Remove</button> }] : []),
          ]}
        />
      )}
    </div>
  );
}
