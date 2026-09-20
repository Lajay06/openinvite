import React, { useEffect, useState } from 'react';

/** A slim bar with one plain sentence under it. Animates to its value on mount. `onDark` for panels. */
export default function ProgressBar({ value = 0, max = 1, note, label, onDark = false }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = setTimeout(() => setShown(pct), 30); return () => clearTimeout(t); }, [pct]);
  return (
    <div>
      {label && <div className="oi-m-meta" style={{ marginBottom: 8 }}>{label}</div>}
      <div className={`oi-m-progress${onDark ? ' oi-m-progress--on-dark' : ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="oi-m-progress__fill" style={{ width: `${shown}%` }} />
      </div>
      {note && <p className="oi-m-meta" style={{ marginTop: 8, color: onDark ? 'var(--m-on-dark-2)' : undefined }}>{note}</p>}
    </div>
  );
}
