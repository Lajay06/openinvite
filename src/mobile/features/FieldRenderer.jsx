import React, { useState } from 'react';
import { Camera, Search, X } from 'lucide-react';
import { TextField, TextAreaField, SelectField, Switch, PillButton, SmartImage } from '../ui';
import PhotoPicker from '../ui/PhotoPicker';
import PlaceField from '../ui/PlaceField';
import PillChoice from '../ui/PillChoice';
import VendorPickerField from './VendorPickerField';
import GuestPickerField from './GuestPickerField';
import { openExternal } from '../native';

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
    case 'place':
      return <PlaceField label={field.label} value={value || null} onChange={onChange} locationBias={field.locationBias || ''} placeholder={field.placeholder} />;
    case 'pills':
      return <PillChoice label={field.label} options={field.options} value={value ?? (field.multi ? [] : '')} onChange={onChange} multi={!!field.multi} hint={field.hint} />;
    case 'vendor':
      return <VendorPickerField label={field.label} category={field.category} value={value || ''} onChange={onChange} />;
    case 'guest':
      return <GuestPickerField label={field.label} value={value || null} onChange={onChange} />;
    case 'tags':
      return <TagsField field={field} value={Array.isArray(value) ? value : []} onChange={onChange} />;
    case 'search':
      return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 0 }}><TextField {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} /></div>
          {value && <button type="button" className="oi-m-iconbtn" aria-label={`Search Google for ${value}`} onClick={() => openExternal(`https://www.google.com/search?q=${encodeURIComponent(value)}`)} style={{ marginBottom: error ? 22 : 0 }}><Search size={20} strokeWidth={1.75} /></button>}
        </div>
      );
    case 'heading':
      return <h3 className="oi-m-section" style={{ marginTop: 4 }}>{field.label}</h3>;
    case 'note':
      return <p className="oi-m-meta">{field.label}</p>;
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
  if (field.type === 'select' && field.numeric) return v === '' || v == null ? '' : Number(v);
  if (field.type === 'toggle') return !!v;
  if (field.type === 'pills' && field.multi) return Array.isArray(v) ? v : [];
  if (field.type === 'tags') return Array.isArray(v) ? v : [];
  if (field.type === 'place' || field.type === 'guest') return v ?? null;
  if (field.type === 'heading' || field.type === 'note') return undefined;
  return v ?? '';
}

/** Whether a field renders for these values (plus-one fields behind the plus-one switch, and so on). */
export function fieldVisible(field, values) {
  return typeof field.showIf === 'function' ? !!field.showIf(values) : true;
}

/** Free tags with quick-add suggestions, as GuestForm's tag section works. */
function TagsField({ field, value, onChange }) {
  const [draft, setDraft] = useState('');
  const add = (t) => { const v = t.trim(); if (v && !value.includes(v)) onChange([...value, v]); setDraft(''); };
  return (
    <div className="oi-m-field">
      <span className="oi-m-field__label">{field.label}</span>
      {value.length > 0 && (
        <div className="oi-m-choices" style={{ marginBottom: 8 }}>
          {value.map((t) => (
            <span key={t} className="oi-m-filter oi-m-filter--on" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} style={{ display: 'inline-flex', color: 'inherit' }}><X size={14} /></button></span>
          ))}
        </div>
      )}
      <input className="oi-m-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(draft); } }} onBlur={() => draft.trim() && add(draft)} placeholder={field.placeholder || 'Type a tag and press return'} autoCapitalize="words" />
      {field.suggestions && (
        <div className="oi-m-choices" style={{ marginTop: 8 }}>
          {field.suggestions.filter((t) => !value.includes(t)).map((t) => <button key={t} type="button" className="oi-m-filter" onClick={() => add(t)}>{t}</button>)}
        </div>
      )}
    </div>
  );
}

export function validate(fields, values, required = []) {
  const errors = {};
  for (const f of fields) {
    if (!fieldVisible(f, values) || f.type === 'heading' || f.type === 'note') continue;
    const v = values[f.name];
    if (required.includes(f.name) && (v == null || String(v).trim() === '')) errors[f.name] = `Add ${f.label.toLowerCase()}.`;
    if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim())) errors[f.name] = 'That email does not look right.';
    if (f.type === 'url' && v && !/^https?:\/\//i.test(String(v).trim())) errors[f.name] = 'Links start with http:// or https://';
    if (f.type === 'number' && v !== '' && v != null && Number.isNaN(Number(v))) errors[f.name] = 'Numbers only.';
    if (f.type === 'place' && required.includes(f.name) && !v?.name) errors[f.name] = `Choose ${f.label.toLowerCase()}.`;
    if (typeof f.validate === 'function') { const msg = f.validate(v, values); if (msg) errors[f.name] = msg; }
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
