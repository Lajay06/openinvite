import React from 'react';
import { TextField, TextAreaField, SelectField, Switch } from '../ui';

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
