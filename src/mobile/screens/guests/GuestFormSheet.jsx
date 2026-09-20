import React, { useEffect, useState } from 'react';
import { BottomSheet, PillButton, TextField, SelectField, Checkbox } from '../../ui';
import { RSVP_STATUSES } from '@/lib/guestRsvpTally';
import { RSVP_LABEL, GUEST_CATEGORY_LABEL } from '../../lib/format';

const EMPTY = { name: '', email: '', phone: '', category: '', rsvp_status: 'pending', plus_one: false, plus_one_name: '', dietary_requirements: '' };

const CATEGORY_OPTIONS = Object.entries(GUEST_CATEGORY_LABEL).map(([value, label]) => ({ value, label }));
const RSVP_OPTIONS = RSVP_STATUSES.map((value) => ({ value, label: RSVP_LABEL[value] }));

export function validateGuest(f) {
  const errors = {};
  if (!f.name.trim()) errors.name = 'Add the guest\'s name.';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errors.email = 'That email does not look right.';
  if (f.plus_one && f.plus_one_name && f.plus_one_name.trim().length < 2) errors.plus_one_name = 'Add the plus one\'s name, or leave it blank.';
  return errors;
}

/**
 * Add or edit a guest in a bottom sheet. Same fields the desktop GuestForm
 * writes, minus the per-event RSVP grid and the table assignment (both go
 * through their own write paths on desktop and stay there for v0).
 * onSave(fields) returns a promise; the sheet closes on success.
 */
export default function GuestFormSheet({ open, guest, onClose, onSave }) {
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (open) {
      setF(guest ? { ...EMPTY, ...pick(guest) } : EMPTY);
      setErrors({});
      setSaveError('');
    }
  }, [open, guest]);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    const e = validateGuest(f);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setSaveError('');
    try {
      const fields = { ...f, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() };
      if (!fields.plus_one) fields.plus_one_name = '';
      await onSave(fields);
      onClose();
    } catch (err) {
      setSaveError(err?.message || 'Could not save this guest. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={guest ? 'Edit guest' : 'Add a guest'}
      footer={(
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
          <PillButton variant="primary" onClick={submit} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving' : guest ? 'Save changes' : 'Add guest'}</PillButton>
        </>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextField label="Name" value={f.name} onChange={(e) => set('name', e.target.value)} error={errors.name} autoComplete="name" placeholder="Full name" />
        <TextField label="Email" type="email" inputMode="email" autoCapitalize="off" value={f.email} onChange={(e) => set('email', e.target.value)} error={errors.email} placeholder="name@example.com" />
        <TextField label="Phone" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Mobile number" />
        <SelectField label="Group" value={f.category} onChange={(e) => set('category', e.target.value)} options={CATEGORY_OPTIONS} placeholder="Choose a group" />
        <SelectField label="Reply" value={f.rsvp_status} onChange={(e) => set('rsvp_status', e.target.value)} options={RSVP_OPTIONS} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Checkbox checked={!!f.plus_one} onChange={(v) => set('plus_one', v)} label="Plus one" />
          <span className="oi-m-body">Bringing a plus one</span>
        </div>
        {f.plus_one && (
          <TextField label="Plus one's name" value={f.plus_one_name} onChange={(e) => set('plus_one_name', e.target.value)} error={errors.plus_one_name} placeholder="Optional" />
        )}
        <TextField label="Dietary needs" value={f.dietary_requirements} onChange={(e) => set('dietary_requirements', e.target.value)} placeholder="Optional" />
        {saveError && <p className="oi-m-field__error" role="alert">{saveError}</p>}
      </div>
    </BottomSheet>
  );
}

function pick(g) {
  const out = {};
  for (const k of Object.keys(EMPTY)) if (g[k] != null) out[k] = g[k];
  return out;
}
