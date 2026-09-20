import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { TextField, TextAreaField, SelectField, Switch, PillButton, SmartImage } from '../ui';
import PhotoPicker from '../ui/PhotoPicker';

/** Renders one schema field bound to `value`/`onChange`. */
export function SchemaField({ field, value, onChange, error }) {
  const common = { label: field.label, error, id: `f-${field.name}` };
  switch (field.type) {
    case 'textarea':
      return <TextAreaField {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={field.rows || 4} placeholder={field.placeholder} />;
    case 'select':
      return <SelectField {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} options={field.options} placeholder={field.placeholder || 'Choose one'} />;
    case 'toggle':
      return (
        <div className="oi-m-row" style={{ padding: '8px 4px', minHeight: 48, background: 'transparent' }}>
          <div className="oi-m-row__body"><div className="oi-m-row__label">{field.label}</div></div>
          <Switch on={!!value} onChange={onChange} label={field.label} />
        </div>
      );
    case 'number':
      return <TextField {...common} type="number" inputMode="decimal" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value)} placeholder={field.placeholder || '0'} />;
    case 'date':
    case 'time':
      return <TextField {...common} type={field.type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'image':
      return <ImageField field={field} value={value} onChange={onChange} error={error} />;
    case 'email':
    case 'tel':
    case 'url':
      return <TextField {...common} type={field.type} inputMode={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'url'} autoCapitalize="off" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
    default:
      return <TextField {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
  }
}

/** Coerce a form value for saving: numbers become numbers, '' stays ''. */
export function coerce(field, v) {
  if (field.type === 'number') return v === '' || v == null ? '' : Number(v);
  if (field.type === 'toggle') return !!v;
  return v ?? '';
}

export function validate(fields, values, required = []) {
  const errors = {};
  for (const f of fields) {
    const v = values[f.name];
    if (required.includes(f.name) && (v == null || String(v).trim() === '')) errors[f.name] = `Add ${f.label.toLowerCase()}.`;
    if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim())) errors[f.name] = 'That email does not look right.';
    if (f.type === 'url' && v && !/^https?:\/\//i.test(String(v).trim())) errors[f.name] = 'Links start with http:// or https://';
    if (f.type === 'number' && v !== '' && v != null && Number.isNaN(Number(v))) errors[f.name] = 'Numbers only.';
  }
  return errors;
}

/** A photo slot: the current image, a picker (camera or library), or a pasted link. */
function ImageField({ field, value, onChange, error }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="oi-m-field">
      <span className="oi-m-field__label">{field.label}</span>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <SmartImage src={value} alt="" width={72} height={72} style={{ width: 72, height: 72, flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
          <PillButton variant="secondary" size="sm" icon={Camera} onClick={() => setOpen(true)} style={{ alignSelf: 'flex-start' }}>{value ? 'Change photo' : 'Add a photo'}</PillButton>
          {value && <button type="button" className="oi-m-block__link" onClick={() => onChange('')} style={{ margin: 0, minHeight: 32 }}>Remove</button>}
        </div>
      </div>
      <TextField id={`f-${field.name}`} type="url" inputMode="url" autoCapitalize="off" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Or paste an image link" error={error} />
      <PhotoPicker open={open} onClose={() => setOpen(false)} onUploaded={(url) => onChange(url)} />
    </div>
  );
}
