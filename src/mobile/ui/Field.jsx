import React from 'react';
import { ChevronDown, Check } from 'lucide-react';

/** Text input with a label and an optional plain-language error. 16px so iOS does not zoom. */
export function TextField({ label, error, id, ...rest }) {
  const fid = id || `f-${(label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="oi-m-field">
      {label && <label htmlFor={fid} className="oi-m-field__label">{label}</label>}
      <input id={fid} className={`oi-m-input${error ? ' oi-m-input--error' : ''}`} aria-invalid={!!error} {...rest} />
      {error && <div className="oi-m-field__error" role="alert">{error}</div>}
    </div>
  );
}

export function TextAreaField({ label, error, id, ...rest }) {
  const fid = id || `f-${(label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="oi-m-field">
      {label && <label htmlFor={fid} className="oi-m-field__label">{label}</label>}
      <textarea id={fid} className={`oi-m-input${error ? ' oi-m-input--error' : ''}`} aria-invalid={!!error} {...rest} />
      {error && <div className="oi-m-field__error" role="alert">{error}</div>}
    </div>
  );
}

/** A native select: the OS picker is the right control on a phone. options: [{ value, label }] */
export function SelectField({ label, error, id, options, placeholder, ...rest }) {
  const fid = id || `f-${(label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="oi-m-field">
      {label && <label htmlFor={fid} className="oi-m-field__label">{label}</label>}
      <div className="oi-m-select-wrap">
        <select id={fid} className={`oi-m-input${error ? ' oi-m-input--error' : ''}`} aria-invalid={!!error} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={18} strokeWidth={1.75} />
      </div>
      {error && <div className="oi-m-field__error" role="alert">{error}</div>}
    </div>
  );
}

/** A 44px checkbox with a 24px box. */
export function Checkbox({ checked, onChange, label }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className="oi-m-check" onClick={() => onChange(!checked)}>
      <span className={`oi-m-check__box${checked ? ' oi-m-check__box--on' : ''}`}>
        {checked && <Check size={16} strokeWidth={3} />}
      </span>
    </button>
  );
}
