/**
 * src/components/professional/VendorDialog.jsx
 *
 * Add or edit a contact in the vendor book: role, company, contact, phone,
 * email, insurance expiry, notes. Reusable across every event.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { create, update, CURRENT } from '@/lib/professionalStore';
import { VENDOR_ROLES } from '@/lib/professionalVendors';
import { Field } from './ProPage';
import { s, PRO } from './proTheme';
import { TYPE } from '@/styles/typeScale';

export default function VendorDialog({ vendor = null, onClose, onSaved }) {
  const [form, setForm] = useState({ role: 'Caterer', company: '', contact: '', phone: '', email: '', insurance_expires: '', notes: '', ...(vendor || {}) });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.company.trim()) { setError('Add the company name.'); return; }
    const data = { role: form.role, company: form.company.trim(), contact: form.contact.trim(), phone: form.phone.trim(), email: form.email.trim(), insurance_expires: form.insurance_expires || null, notes: form.notes };
    const row = vendor ? update('VendorContact', vendor.id, data) : create('VendorContact', { ...data, workspace_id: CURRENT.workspaceId, is_test: true });
    onSaved?.(row);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent style={{ maxWidth: 520 }}>
        <DialogTitle style={{ fontSize: 18, fontWeight: 600 }}>{vendor ? 'Edit vendor' : 'Add a vendor'}</DialogTitle>
        <DialogDescription style={{ fontSize: TYPE.secondary, color: PRO.muted }}>Saved to your vendor book, ready for every event.</DialogDescription>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 8 }}>
          <Field label="Company"><input autoFocus style={s.input} value={form.company} onChange={set('company')} /></Field>
          <Field label="Role">
            <select style={s.input} value={form.role} onChange={set('role')}>{VENDOR_ROLES.map((r) => <option key={r}>{r}</option>)}</select>
          </Field>
          <Field label="Contact"><input style={s.input} value={form.contact} onChange={set('contact')} /></Field>
          <Field label="Phone"><input type="tel" style={s.input} value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Email"><input type="email" style={s.input} value={form.email} onChange={set('email')} /></Field>
          <Field label="Insurance expires"><input type="date" style={s.input} value={form.insurance_expires || ''} onChange={set('insurance_expires')} /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Field label="Notes"><textarea rows={2} style={{ ...s.input, resize: 'vertical' }} value={form.notes} onChange={set('notes')} /></Field></div>
          {error && <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, fontSize: TYPE.secondary, color: '#991b1b' }}>{error}</p>}
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" style={s.btnSecondary} onClick={onClose}>Cancel</button>
            <button type="submit" style={s.btnPrimary}>{vendor ? 'Save' : 'Add vendor'}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
