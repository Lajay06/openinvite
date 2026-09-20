import React, { useEffect, useState } from 'react';
import { BottomSheet, PillButton } from '../ui';
import { SchemaField, coerce, validate } from './FieldRenderer';

/**
 * A bottom sheet that edits an object against a field list. onSave(values)
 * returns a promise; the sheet closes on success. onDelete is optional.
 */
export default function FormSheet({ open, title, fields, initial, required = [], onClose, onSave, onDelete, saveLabel }) {
  const [v, setV] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    if (open) {
      const base = {};
      for (const f of fields) base[f.name] = initial?.[f.name] ?? (f.type === 'toggle' ? false : '');
      setV(base); setErrors({}); setSaveError('');
    }
  }, [open, initial, fields]);
  const submit = async () => {
    const e = validate(fields, v, required);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true); setSaveError('');
    try {
      const out = {};
      for (const f of fields) out[f.name] = coerce(f, v[f.name]);
      await onSave(out);
      onClose();
    } catch (err) {
      setSaveError(err?.message || 'Could not save. Try again.');
    } finally { setSaving(false); }
  };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={(
        <>
          {onDelete && <PillButton variant="ghost" onClick={onDelete} disabled={saving} style={{ color: 'var(--m-primary)' }}>Remove</PillButton>}
          <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
          <PillButton variant="primary" onClick={submit} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving' : saveLabel || 'Save'}</PillButton>
        </>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {fields.map((f) => <SchemaField key={f.name} field={f} value={v[f.name]} onChange={(val) => setV((s) => ({ ...s, [f.name]: val }))} error={errors[f.name]} />)}
        {saveError && <p className="oi-m-field__error" role="alert">{saveError}</p>}
      </div>
    </BottomSheet>
  );
}
