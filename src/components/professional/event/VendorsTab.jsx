/**
 * src/components/professional/event/VendorsTab.jsx
 *
 * THE EVENT'S VENDORS: each booking with its role, fee, deposit, arrival and
 * finish, contract, and the vendor's private link. Arrival and finish flow
 * into the run sheet; the link opens a run sheet filtered to their items.
 */
import React, { useState } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useProStore, create, update, remove } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { fmtTime, parseTime } from '@/lib/professionalRunSheet';
import { linkExpiresAt, isVendorLinkLive, newLinkToken } from '@/lib/professionalVendors';
import { shortDate } from '@/lib/professionalEvents';
import { money } from '@/lib/professionalMoney';
import { copyText } from '@/lib/copyToClipboard';
import { ProTable, Pill, Field, ProEmpty } from '../ProPage';
import VendorDialog from '../VendorDialog';
import { ProAvaButton } from '../ProAva';
import { downloadCsv, fileSlug } from '../proExport';
import { s, PRO } from '../proTheme';
import { TYPE } from '@/styles/typeScale';

function BookDialog({ event, onClose }) {
  const store = useProStore();
  const book = store.VendorContact.slice().sort((a, b) => a.company.localeCompare(b.company));
  const [form, setForm] = useState({ vendor_id: book[0]?.id || '', fee: '', deposit: '', arrive: '', finish: '', contract_file: '', toSheet: true });
  const [adding, setAdding] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    const vendor = store.VendorContact.find((v) => v.id === form.vendor_id);
    if (!vendor) return;
    const arrive = parseTime(form.arrive);
    const finish = parseTime(form.finish);
    create('ProVendorBooking', { event_id: event.id, vendor_id: vendor.id, role: vendor.role, fee: Number(form.fee) || 0, deposit: Number(form.deposit) || 0, arrive, finish, contract_file: form.contract_file, link_token: null, link_expires_at: null, is_test: true });
    if (form.toSheet && arrive !== null) {
      create('RunSheetRow', { event_id: event.id, sheet: 'Setup', start_minute: arrive, duration_minutes: 15, item: `${vendor.company} arrives`, location: '', owner_ref: vendor.id, cue: '', notes: '', status: 'todo', sort: 0, is_test: true });
    }
    if (form.toSheet && finish !== null) {
      create('RunSheetRow', { event_id: event.id, sheet: 'Pack-down', start_minute: finish, duration_minutes: 15, item: `${vendor.company} finishes`, location: '', owner_ref: vendor.id, cue: '', notes: '', status: 'todo', sort: 0, is_test: true });
    }
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent style={{ maxWidth: 520 }}>
        <DialogTitle style={{ fontSize: 18, fontWeight: 600 }}>Book a vendor</DialogTitle>
        <DialogDescription style={{ fontSize: TYPE.secondary, color: PRO.muted }}>From your vendor book, for {event.couple_names}.</DialogDescription>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 8 }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Field label="Vendor">
                <select style={s.input} value={form.vendor_id} onChange={set('vendor_id')}>
                  {book.map((v) => <option key={v.id} value={v.id}>{v.company}, {v.role}</option>)}
                </select>
              </Field>
            </div>
            <button type="button" style={s.btnSecondary} onClick={() => setAdding(true)}>New</button>
          </div>
          <Field label="Fee (US$)"><input inputMode="decimal" style={s.input} value={form.fee} onChange={set('fee')} /></Field>
          <Field label="Deposit (US$)"><input inputMode="decimal" style={s.input} value={form.deposit} onChange={set('deposit')} /></Field>
          <Field label="Arrives" hint="For example 2:00 pm"><input style={s.input} value={form.arrive} onChange={set('arrive')} /></Field>
          <Field label="Finishes"><input style={s.input} value={form.finish} onChange={set('finish')} /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Field label="Contract" hint="A file name or a link; files live in Documents"><input style={s.input} value={form.contract_file} onChange={set('contract_file')} /></Field></div>
          <label style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', fontSize: TYPE.body }}>
            <input type="checkbox" checked={form.toSheet} onChange={set('toSheet')} /> Put the arrival and finish on the run sheet
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" style={s.btnSecondary} onClick={onClose}>Cancel</button>
            <button type="submit" style={s.btnPrimary} disabled={!form.vendor_id}>Book</button>
          </div>
        </form>
        {adding && <VendorDialog onClose={() => setAdding(false)} onSaved={(v) => setForm((f) => ({ ...f, vendor_id: v.id }))} />}
      </DialogContent>
    </Dialog>
  );
}

export default function VendorsTab({ event, me, readOnly }) {
  const store = useProStore();
  const [booking, setBooking] = useState(false);
  const [copied, setCopied] = useState('');
  const editable = !readOnly && can(me, 'vendors.edit', event);
  const showMoney = can(me, 'money.view', event);
  const rows = store.ProVendorBooking.filter((b) => b.event_id === event.id).map((b) => ({ ...b, vendor: store.VendorContact.find((v) => v.id === b.vendor_id) }));

  const linkFor = (b) => `${window.location.origin}/professional/vendor/${b.link_token}`;
  const makeLink = (b) => update('ProVendorBooking', b.id, { link_token: newLinkToken(), link_expires_at: linkExpiresAt(event.event_date), link_revoked: false });
  const revoke = (b) => update('ProVendorBooking', b.id, { link_revoked: true });
  const copy = async (b) => { const res = await copyText(linkFor(b)); setCopied(res.ok ? b.id : `manual:${b.id}`); if (res.ok) setTimeout(() => setCopied(''), 2000); };

  const csv = () => downloadCsv(`${fileSlug(`${event.couple_names} vendors`)}.csv`, ['Vendor', 'Role', 'Contact', 'Phone', 'Email', ...(showMoney ? ['Fee', 'Deposit'] : []), 'Arrives', 'Finishes', 'Contract'],
    rows.map((b) => [b.vendor?.company, b.role, b.vendor?.contact, b.vendor?.phone, b.vendor?.email, ...(showMoney ? [b.fee, b.deposit] : []), fmtTime(b.arrive), fmtTime(b.finish), b.contract_file]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {rows.length > 0 && <ProAvaButton label="Ask Ava to draft the vendor emails" prompt="vendor" eventId={event.id} />}
        <button type="button" style={s.btnSecondary} onClick={csv}>CSV</button>
        {editable && <button type="button" style={s.btnPrimary} onClick={() => setBooking(true)}>Book a vendor</button>}
      </div>
      {rows.length === 0 ? (
        <ProEmpty title="No vendors on this event yet" line="Book from your vendor book. Their arrival and finish go straight onto the run sheet." />
      ) : (
        <ProTable
          label="Vendors on this event"
          rows={rows}
          columns={[
            { key: 'vendor', label: 'Vendor', render: (b) => <span style={{ fontWeight: 600 }}>{b.vendor?.company || 'Removed from the book'}</span> },
            { key: 'role', label: 'Role' },
            { key: 'phone', label: 'Phone', render: (b) => (b.vendor?.phone ? <a href={`tel:${b.vendor.phone}`} style={{ color: PRO.link }}>{b.vendor.phone}</a> : '') },
            ...(showMoney ? [{ key: 'fee', label: 'Fee', align: 'right', render: (b) => money(b.fee) }, { key: 'deposit', label: 'Deposit', align: 'right', render: (b) => money(b.deposit) }] : []),
            { key: 'arrive', label: 'Arrives', render: (b) => fmtTime(b.arrive) },
            { key: 'finish', label: 'Finishes', render: (b) => fmtTime(b.finish) },
            { key: 'contract', label: 'Contract', render: (b) => b.contract_file || <span style={{ color: PRO.muted }}>None yet</span> },
            {
              key: 'link', label: 'Vendor link', render: (b) => {
                const live = isVendorLinkLive(b);
                if (!editable) return live ? <Pill tone="good">Shared</Pill> : '';
                return live ? (
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <button type="button" style={s.btnSecondary} onClick={() => copy(b)}><LinkIcon size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{copied === b.id ? 'Copied' : 'Copy link'}</button>
                    <button type="button" style={s.btnQuiet} onClick={() => revoke(b)}>Turn off</button>
                    <span style={s.secondary}>Until {shortDate(b.link_expires_at?.slice(0, 10), { weekday: false })}</span>
                    {copied === `manual:${b.id}` && <input readOnly aria-label="Vendor link" value={linkFor(b)} onFocus={(e) => e.target.select()} style={{ ...s.input, width: 220, fontSize: TYPE.secondary }} />}
                  </span>
                ) : (
                  <button type="button" style={s.btnSecondary} onClick={() => makeLink(b)} disabled={!event.event_date} title={event.event_date ? '' : 'Set the event date first'}>Make a link</button>
                );
              },
            },
            ...(editable ? [{ key: 'x', label: '', render: (b) => <button type="button" style={s.btnQuiet} onClick={() => remove('ProVendorBooking', b.id)}>Remove</button> }] : []),
          ]}
        />
      )}
      <p style={{ ...s.secondary, margin: 0 }}>A vendor link shows that vendor their own run sheet items, times and your number for the day. No guest details and no money. It stops working 7 days after the event, or when you turn it off.</p>
      {booking && <BookDialog event={event} onClose={() => setBooking(false)} />}
    </div>
  );
}
