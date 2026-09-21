import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Download, Tag, Users, Utensils, Trash2, CalendarCheck, Link2, Send, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { BottomSheet, PillButton, Checkbox, Row, RowGroup, SelectField, TextField } from '../../ui';
import PillChoice from '../../ui/PillChoice';
import { useConfirm } from '../../ui/ConfirmSheet';
import { getGuestEventResponse, toggleEventInvite } from '@/lib/weddingEvents';
import { parseGuestFile, downloadGuestTemplate } from '@/lib/guestImport';
import { COMMON_TAGS, DIETARY_OPTIONS } from '@/components/guests/GuestForm';
import { GUEST_CATEGORIES, COUNTRY_OPTIONS } from './guestFields';
import { TYPE_LABELS } from './SendInvitesScreen';

/**
 * SetEventsModal.jsx as a sheet: a switch per wedding event. Unticking an
 * event a guest is invited to asks for confirmation; their reply survives
 * (toggleEventInvite only flips `invited`). For several guests, an event
 * starts on only when every guest is already invited to it.
 * onSaved(newlyInvitedEventIds) is reported for a single guest.
 */
export function SetEventsSheet({ open, guests = [], weddingEvents = [], onUpdate, onClose, onSaved }) {
  const initial = useMemo(() => new Map(guests.map((g) => [g.id, new Set(weddingEvents.filter((ev) => getGuestEventResponse(g, ev).invited).map((ev) => ev.event_id))])), [guests, weddingEvents]);
  const [on, setOn] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setOn(Object.fromEntries(weddingEvents.map((ev) => [ev.event_id, guests.length > 0 && guests.every((g) => initial.get(g.id)?.has(ev.event_id))]))); }, [open, guests, weddingEvents, initial]);
  const [confirm, confirmEl] = useConfirm();
  const toggle = async (ev) => {
    const turningOff = on[ev.event_id];
    if (turningOff && guests.some((g) => initial.get(g.id)?.has(ev.event_id))) {
      const ok = await confirm({ title: `Uninvite from ${ev.name}?`, body: `${guests.length === 1 ? (guests[0].name || 'This guest') : `${guests.length} guests`} will no longer see this event. Any reply is kept.`, action: 'Uninvite' });
      if (!ok) return;
    }
    setOn((s) => ({ ...s, [ev.event_id]: !s[ev.event_id] }));
  };
  const save = async () => {
    setSaving(true);
    try {
      const newly = guests.length === 1 ? weddingEvents.filter((ev) => on[ev.event_id] && !initial.get(guests[0].id)?.has(ev.event_id)).map((ev) => ev.event_id) : null;
      await Promise.all(guests.map((g) => {
        let responses = g.event_responses || [];
        for (const ev of weddingEvents) responses = toggleEventInvite({ event_responses: responses }, ev, !!on[ev.event_id]);
        return onUpdate(g.id, { event_responses: responses });
      }));
      toast.success(guests.length === 1 ? 'Events updated' : `Events updated for ${guests.length} guests`);
      onSaved?.(newly);
      onClose();
    } catch (e) { toast.error(e?.message || 'Could not update the events.'); } finally { setSaving(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={guests.length === 1 ? `Events for ${guests[0]?.name || 'this guest'}` : `Events for ${guests.length} guests`} footer={(
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
        <PillButton variant="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving' : 'Save'}</PillButton>
      </>
    )}>
      <p className="oi-m-meta" style={{ marginBottom: 12 }}>Guests only see the events they are invited to.</p>
      <RowGroup>
        {weddingEvents.map((ev) => (
          <div key={ev.event_id} className="oi-m-row">
            <Checkbox checked={!!on[ev.event_id]} onChange={() => toggle(ev)} label={ev.name} />
            <div className="oi-m-row__body"><div className="oi-m-row__label oi-m-row__label--wrap">{ev.name}</div>{ev.date && <div className="oi-m-row__sub">{ev.date}</div>}</div>
          </div>
        ))}
      </RowGroup>
      {confirmEl}
    </BottomSheet>
  );
}

/**
 * ImportGuestModal.jsx as a sheet: a CSV or Excel file, parsed with the
 * same parseGuestFile, a preview with the rows that will not import and
 * why, then createGuest per row, skipping emails already on the list.
 */
export function ImportGuestsSheet({ open, onClose, existingGuests = [], country = 'AU', onCreate, onImported }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  // ImportGuestModal.jsx: the country the file's phone numbers are read in, the venue's until changed.
  const [importCountry, setImportCountry] = useState(country);
  const [lastFile, setLastFile] = useState(null);
  const input = useRef(null);
  useEffect(() => { if (open) { setRows(null); setImportCountry(country); setLastFile(null); } }, [open, country]);
  const pick = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) { toast.error('Choose a CSV or Excel file'); return; }
    setLastFile(file);
    try { setRows(await parseGuestFile(file, importCountry)); } catch (e) { toast.error(e.message); }
  };
  const changeCountry = async (iso) => { setImportCountry(iso); if (lastFile) { try { setRows(await parseGuestFile(lastFile, iso)); } catch (e) { toast.error(e.message); } } };
  const run = async () => {
    const valid = (rows || []).filter((r) => !r._error);
    if (!valid.length) { toast.error('No rows to import'); return; }
    setBusy(true);
    const tid = toast.loading(`Importing ${valid.length} guests`);
    const emails = new Set(existingGuests.map((g) => g.email?.trim().toLowerCase()).filter(Boolean));
    const toImport = []; const dupes = [];
    for (const r of valid) { const e = r.email?.trim().toLowerCase(); if (e && emails.has(e)) dupes.push(r._rowIndex); else { toImport.push(r); if (e) emails.add(e); } }
    const failed = [];
    await Promise.all(toImport.map(async (r) => { const { _rowIndex, _error, _phoneWarning, ...data } = r; try { await onCreate({ ...data, event_responses: [] }); } catch { failed.push(_rowIndex); } }));
    setBusy(false);
    const n = toImport.length - failed.length;
    const parts = [n > 0 ? `${n} imported` : '', dupes.length ? `${dupes.length} skipped (already on your list)` : '', failed.length ? `${failed.length} failed` : ''].filter(Boolean);
    (failed.length || dupes.length ? toast.error : toast.success)(parts.join(', ') || 'Nothing imported', { id: tid });
    if (n > 0) onImported?.();
    if (!failed.length) onClose(); else setRows((prev) => prev.map((r) => (failed.includes(r._rowIndex) ? { ...r, _error: 'Failed to save' } : dupes.includes(r._rowIndex) ? { ...r, _error: 'Already on your guest list' } : r)));
  };
  const valid = (rows || []).filter((r) => !r._error).length;
  const bad = (rows || []).filter((r) => r._error);
  return (
    <BottomSheet open={open} onClose={onClose} title="Import guest list" full footer={rows ? (
      <>
        <PillButton variant="secondary" onClick={() => setRows(null)} disabled={busy}>Choose another file</PillButton>
        <PillButton variant="primary" onClick={run} disabled={busy || !valid} style={{ flex: 1 }}>{busy ? 'Importing' : `Import ${valid} guest${valid === 1 ? '' : 's'}`}</PillButton>
      </>
    ) : undefined}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="oi-m-body">A spreadsheet with the columns Name, Email, Phone and Plus one. Extra columns are ignored.</p>
        <SelectField label="Phone numbers are from" value={importCountry} onChange={(e) => changeCountry(e.target.value)} options={COUNTRY_OPTIONS} />
        <input ref={input} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => pick(e.target.files?.[0])} />
        {!rows ? (
          <>
            <PillButton variant="primary" block icon={Upload} onClick={() => input.current?.click()}>Choose a file</PillButton>
            <PillButton variant="secondary" block icon={Download} onClick={() => downloadGuestTemplate()}>Download the template</PillButton>
          </>
        ) : (
          <>
            <div className="oi-m-card"><div className="oi-m-body oi-m-strong">{valid} of {rows.length} rows ready</div>{bad.length > 0 && <div className="oi-m-meta">{bad.length} will be skipped.</div>}</div>
            <RowGroup>
              {rows.slice(0, 40).map((r) => <Row key={r._rowIndex} icon={FileSpreadsheet} tile={r._error ? 'warn' : r._phoneWarning ? 'tint' : 'neutral'} label={r.name || `Row ${r._rowIndex}`} sub={r._error || r._phoneWarning || [r.email, r.phone].filter(Boolean).join(', ')} wrap />)}
            </RowGroup>
            {rows.length > 40 && <p className="oi-m-meta">And {rows.length - 40} more.</p>}
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/**
 * BulkActionBar.jsx as a sheet for the selected guests: set category
 * (the same value for everyone), set dietary, add a tag, remove a tag,
 * set events, copy links, send invites, delete.
 */
export function BulkActionsSheet({ open, onClose, guests = [], onSetCategory, onSetDietary, onAddTag, onRemoveTag, onSetEvents, onCopyLinks, onSend, onDelete }) {
  const [mode, setMode] = useState('menu');
  const [category, setCategory] = useState('');
  const [dietary, setDietary] = useState('');
  const [tag, setTag] = useState('');
  useEffect(() => { if (open) { setMode('menu'); setCategory(''); setDietary(''); setTag(''); } }, [open]);
  const tagsInSelection = [...new Set(guests.flatMap((g) => (Array.isArray(g.tags) ? g.tags : [])))].sort();
  const n = guests.length;
  const title = `${n} guest${n === 1 ? '' : 's'} selected`;
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {mode === 'menu' && (
        <RowGroup>
          <Row icon={CalendarCheck} tile="neutral" label="Set events" sub="Which events they are invited to" onClick={() => { onClose(); onSetEvents(); }} />
          <Row icon={Users} tile="neutral" label="Set category" onClick={() => setMode('category')} />
          <Row icon={Utensils} tile="neutral" label="Set dietary" onClick={() => setMode('dietary')} />
          <Row icon={Tag} tile="neutral" label="Add a tag" onClick={() => setMode('addTag')} />
          {tagsInSelection.length > 0 && <Row icon={Tag} tile="neutral" label="Remove a tag" onClick={() => setMode('removeTag')} />}
          <Row icon={Link2} tile="neutral" label="Copy RSVP links" onClick={() => { onClose(); onCopyLinks(); }} />
          <Row icon={Send} tile="neutral" label="Send invites to selected" onClick={() => { onClose(); onSend(); }} />
          <Row icon={Trash2} tile="warn" label="Remove from the list" onClick={() => { onClose(); onDelete(); }} />
        </RowGroup>
      )}
      {mode === 'category' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SelectField label="Category for everyone selected" value={category} onChange={(e) => setCategory(e.target.value)} options={GUEST_CATEGORIES} placeholder="Choose a category" />
          <PillButton variant="primary" block disabled={!category} onClick={() => { onSetCategory(category); onClose(); }}>Apply to {n}</PillButton>
        </div>
      )}
      {mode === 'dietary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PillChoice label="Dietary for everyone selected" options={DIETARY_OPTIONS} value={dietary} onChange={setDietary} />
          <PillButton variant="primary" block disabled={!dietary} onClick={() => { onSetDietary(dietary === 'None' ? null : dietary); onClose(); }}>Apply to {n}</PillButton>
        </div>
      )}
      {mode === 'addTag' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TextField label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Type a tag" autoCapitalize="words" />
          <PillChoice label="Or pick one" options={COMMON_TAGS} value={tag} onChange={setTag} />
          <PillButton variant="primary" block disabled={!tag.trim()} onClick={() => { onAddTag(tag.trim()); onClose(); }}>Tag {n} guest{n === 1 ? '' : 's'}</PillButton>
        </div>
      )}
      {mode === 'removeTag' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PillChoice label="Remove which tag" options={tagsInSelection} value={tag} onChange={setTag} />
          <PillButton variant="primary" block disabled={!tag} onClick={() => { onRemoveTag(tag); onClose(); }}>Remove from {n}</PillButton>
        </div>
      )}
    </BottomSheet>
  );
}

/** EmailTemplates.jsx as a sheet: one row per email type, each opening Send invites with that type chosen (the preview and test send live there). */
const TYPE_DESCRIPTIONS = {
  save_the_date: 'The first word, before the invitation.',
  invite: 'The first ask, sent when a guest is added to your list.',
  reminder: 'A nudge for guests who were invited but have not replied yet.',
  update: 'Something changed: venue, time, dress code. Keep everyone current.',
  thank_you_attending: 'Sent after a guest confirms they are coming.',
  thank_you_declined: 'Sent after a guest lets you know they cannot make it.',
};
export function EmailTemplatesSheet({ open, onClose, onUse }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Email templates">
      <p className="oi-m-meta" style={{ marginBottom: 12 }}>Every email uses your site's universe styling and your real details. Choose one to see it and send it.</p>
      <RowGroup>
        {Object.entries(TYPE_LABELS).map(([type, label]) => <Row key={type} icon={Send} tile="neutral" label={label} sub={TYPE_DESCRIPTIONS[type] || ''} wrap onClick={() => onUse(type)} />)}
      </RowGroup>
    </BottomSheet>
  );
}
