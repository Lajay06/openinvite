import React from 'react';

/** A slim bar with one plain sentence under it. value/max, clamped. */
export default function ProgressBar({ value = 0, max = 1, note, label }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div>
      {label && <div className="oi-m-meta" style={{ marginBottom: 8 }}>{label}</div>}
      <div className="oi-m-progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="oi-m-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      {note && <p className="oi-m-meta" style={{ marginTop: 8 }}>{note}</p>}
    </div>
  );
}
