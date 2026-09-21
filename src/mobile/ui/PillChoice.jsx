import React from 'react';
import { Check } from 'lucide-react';

/**
 * A row of choice pills. `multi` toggles values in an array; otherwise the
 * value is a single string and tapping the chosen pill again clears it, as
 * the desktop's OptionPill lists do (ThemeSection, GuestForm's dietary
 * pills, the accommodation tags). `options` are strings or { value, label }.
 */
export default function PillChoice({ label, options = [], value, onChange, multi = false, hint }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const selected = (v) => (multi ? (value || []).includes(v) : value === v);
  const tap = (v) => {
    if (multi) { const cur = value || []; onChange(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]); }
    else onChange(value === v ? '' : v);
  };
  return (
    <div className="oi-m-field">
      {label && <span className="oi-m-field__label">{label}</span>}
      <div className="oi-m-choices" role={multi ? 'group' : 'radiogroup'} aria-label={label}>
        {opts.map((o) => (
          <button key={o.value} type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={selected(o.value)} className={`oi-m-filter${selected(o.value) ? ' oi-m-filter--on' : ''}`} onClick={() => tap(o.value)}>
            {selected(o.value) && <Check size={14} strokeWidth={2.5} style={{ marginRight: 4 }} />}{o.label}
          </button>
        ))}
      </div>
      {hint && <div className="oi-m-meta" style={{ marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
