import React from 'react';

/** A 32px switch drawn inside a 60x44 hit area. */
export default function Switch({ on, onChange, label }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`oi-m-switch${on ? ' oi-m-switch--on' : ''}`} onClick={() => onChange(!on)} />;
}
