import React, { useEffect, useState } from 'react';
import { BottomSheet, PillButton } from '../ui';
import { SchemaField, coerce, validate, fieldVisible } from './FieldRenderer';
import { useOnline } from '../shell/OfflineBanner';

/**
 * A bottom sheet that edits an object against a field list. onSave(values)
 * returns a promise; the sheet closes on success. onDelete is optional.
 */
export default function FormSheet({ open, title, fields, initial, required = [], onClose, onSave, onDelete, saveLabel, full = false, deleteLabel = 'Remove', children, onValuesChange }) {
  const [v, setV] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const online = useOnline();
  const initKey = JSON.stringify(initial ?? null);
  const fieldsKey = fields.map((f) => f.name).join(',');
  useEffect(() => {
    if (open) {
      const base = {};
      for (const f of fields) {
        if (!f.name) continue;
        const dflt = f.type === 'toggle' ? false : (f.type === 'pills' && f.multi) || f.type === 'tags' ? [] : f.type === 'place' || f.type === 'guest' ? null : (f.default ?? '');
        base[f.name] = initial?.[f.name] ?? dflt;
      }
      setV(base); setErrors({}); setSaveError('');
    }
    // Keyed on content, not identity: callers build `fields` and `initial`
    // inline, and a reset on every render would wipe what was typed.
  }, [open, initKey, fieldsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // A caller can react to a value (the event kind picking the type list).
  useEffect(() => { if (open && onValuesChange) onValuesChange(v, setV); }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    const e = validate(fields, v, required);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true); setSaveError('');
    try {
      const out = {};
      for (const f of fields) { if (!f.name) continue; const c = coerce(f, v[f.name]); if (c !== undefined) out[f.name] = c; }
      await onSave(out, v);
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
      full={full}
      footer={(
        <>
          {onDelete && <PillButton variant="ghost" onClick={onDelete} disabled={saving} style={{ color: 'var(--m-primary)' }}>{deleteLabel}</PillButton>}
          <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
          <PillButton variant="primary" onClick={submit} disabled={saving || !online} style={{ flex: 1 }}>{saving ? 'Saving' : !online ? 'Offline' : saveLabel || 'Save'}</PillButton>
        </>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {fields.filter((f) => fieldVisible(f, v)).map((f, i) => <SchemaField key={f.name || `h${i}`} field={f} values={v} value={v[f.name]} onChange={(val) => setV((s) => ({ ...s, [f.name]: val }))} error={errors[f.name]} />)}
        {typeof children === 'function' ? children(v, setV) : children}
        {saveError && <p className="oi-m-field__error" role="alert">{saveError}</p>}
        {!online && <p className="oi-m-meta">You are offline, so this cannot be saved yet. It will not be lost while the sheet is open.</p>}
      </div>
    </BottomSheet>
  );
}
