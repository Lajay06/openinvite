/**
 * src/components/professional/PaymentRows.jsx
 *
 * THE PAYMENT SCHEDULE, shared by the workspace page and the event tab: due
 * dates, status and who pays. Tracking only; no money moves here.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useProStore, create, update, remove } from '@/lib/professionalStore';
import { money, isOverdue, total, filterPayments, PAYMENT_FILTERS as FILTERS } from '@/lib/professionalMoney';
import { shortDate } from '@/lib/professionalEvents';
import { FilterPill } from '@/components/shared/TableToolbar';
import { ProTable, Pill, Field } from './ProPage';
import { downloadCsv } from './proExport';
import { s, PRO } from './proTheme';
import { TYPE } from '@/styles/typeScale';

export const PAYERS = [
  { key: 'couple', label: 'The couple' },
  { key: 'planner', label: 'You' },
  { key: 'other', label: 'Someone else' },
];
const payerLabel = (k) => PAYERS.find((p) => p.key === k)?.label || '';

export function PaymentDialog({ events, onClose, defaultEventId }) {
  const store = useProStore();
  const [form, setForm] = useState({ event_id: defaultEventId || events[0]?.id || '', label: '', amount: '', due_date: '', payer: 'couple', booking_id: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const bookings = store.ProVendorBooking.filter((b) => b.event_id === form.event_id);
  const submit = (e) => {
    e.preventDefault();
    if (!form.label.trim() || !(Number(form.amount) > 0) || !form.due_date) { setError('Add what it is for, the amount and the due date.'); return; }
    create('PaymentDue', { event_id: form.event_id, booking_id: form.booking_id || null, label: form.label.trim(), amount: Number(form.amount), due_date: form.due_date, payer: form.payer, status: 'due', is_test: true });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent style={{ maxWidth: 480 }}>
        <DialogTitle style={{ fontSize: 18, fontWeight: 600 }}>Add a payment</DialogTitle>
        <DialogDescription style={{ fontSize: TYPE.secondary, color: PRO.muted }}>For tracking. Nothing is charged.</DialogDescription>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 8 }}>
          {!defaultEventId && (
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Event"><select style={s.input} value={form.event_id} onChange={set('event_id')}>{events.map((ev) => <option key={ev.id} value={ev.id}>{ev.couple_names}</option>)}</select></Field>
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}><Field label="For"><input autoFocus style={s.input} value={form.label} onChange={set('label')} placeholder="Caterer, final balance" /></Field></div>
          <Field label="Amount (US$)"><input inputMode="decimal" style={s.input} value={form.amount} onChange={set('amount')} /></Field>
          <Field label="Due"><input type="date" style={s.input} value={form.due_date} onChange={set('due_date')} /></Field>
          <Field label="Who pays"><select style={s.input} value={form.payer} onChange={set('payer')}>{PAYERS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select></Field>
          <Field label="Vendor">
            <select style={s.input} value={form.booking_id} onChange={set('booking_id')}>
              <option value="">None</option>
              {bookings.map((b) => <option key={b.id} value={b.id}>{store.VendorContact.find((v) => v.id === b.vendor_id)?.company}</option>)}
            </select>
          </Field>
          {error && <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, fontSize: TYPE.secondary, color: '#991b1b' }}>{error}</p>}
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" style={s.btnSecondary} onClick={onClose}>Cancel</button>
            <button type="submit" style={s.btnPrimary}>Add payment</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentRows({ payments, events, editable, showEvent = true, defaultFilter = 'week', defaultEventId = null, csvName = 'payments.csv' }) {
  const store = useProStore();
  const [filter, setFilter] = useState(defaultFilter);
  const [adding, setAdding] = useState(false);
  const rows = filterPayments(payments, filter).slice().sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  const eventOf = (id) => events.find((e) => e.id === id);
  const vendorOf = (p) => { const b = store.ProVendorBooking.find((x) => x.id === p.booking_id); return b ? store.VendorContact.find((v) => v.id === b.vendor_id)?.company : ''; };
  const csv = () => downloadCsv(csvName, ['Due', 'Event', 'For', 'Vendor', 'Amount', 'Who pays', 'Status'],
    rows.map((p) => [p.due_date, eventOf(p.event_id)?.couple_names, p.label, vendorOf(p), p.amount, payerLabel(p.payer), p.status === 'paid' ? 'Paid' : isOverdue(p) ? 'Overdue' : 'Due']));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {FILTERS.map((f) => <FilterPill key={f.key} label={f.label} active={filter === f.key} onClick={() => setFilter(f.key)} />)}
        <span style={{ flex: 1 }} />
        <span style={s.secondary}>{rows.length} payment{rows.length === 1 ? '' : 's'}, {money(total(rows))}</span>
        <button type="button" style={s.btnSecondary} onClick={csv}>CSV</button>
        {editable && <button type="button" style={s.btnPrimary} onClick={() => setAdding(true)}>Add a payment</button>}
      </div>
      <ProTable
        label="Payment schedule"
        rows={rows}
        empty={filter === 'week' ? 'Nothing due this week.' : 'No payments here.'}
        columns={[
          { key: 'due', label: 'Due', render: (p) => shortDate(p.due_date) },
          ...(showEvent ? [{ key: 'event', label: 'Event', render: (p) => eventOf(p.event_id)?.couple_names || '' }] : []),
          { key: 'label', label: 'For', render: (p) => <span style={{ fontWeight: 600 }}>{p.label}</span> },
          { key: 'vendor', label: 'Vendor', render: vendorOf },
          { key: 'amount', label: 'Amount', align: 'right', render: (p) => money(p.amount) },
          { key: 'payer', label: 'Who pays', render: (p) => payerLabel(p.payer) },
          { key: 'status', label: 'Status', render: (p) => (p.status === 'paid' ? <Pill tone="good">Paid</Pill> : isOverdue(p) ? <Pill tone="bad">Overdue</Pill> : <Pill tone="wait">Due</Pill>) },
          ...(editable ? [{
            key: 'act', label: '', render: (p) => (
              <span style={{ display: 'inline-flex', gap: 4 }}>
                <button type="button" style={s.btnSecondary} onClick={() => update('PaymentDue', p.id, { status: p.status === 'paid' ? 'due' : 'paid' })}>{p.status === 'paid' ? 'Mark due' : 'Mark paid'}</button>
                <button type="button" style={s.btnQuiet} onClick={() => remove('PaymentDue', p.id)}>Remove</button>
              </span>
            ),
          }] : []),
        ]}
      />
      {adding && <PaymentDialog events={events} defaultEventId={defaultEventId} onClose={() => setAdding(false)} />}
    </div>
  );
}
