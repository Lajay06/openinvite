import React from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * The large title at the top of a screen, plus the slim compact bar that
 * fades a 17px copy of it in once the large one has scrolled past 48px.
 *
 * `Screen` owns the scroll position and passes `compact` in; this component
 * only paints. Right-side actions live in the compact bar so they stay
 * reachable at any scroll position.
 */
export function CompactBar({ title, compact, actions = [], onBack }) {
  return (
    <div className={`oi-m-compact${compact ? ' oi-m-compact--on' : ''}`}>
      {onBack ? (
        <button type="button" className="oi-m-iconbtn oi-m-compact__back" onClick={onBack} aria-label="Back" style={{ marginLeft: -12 }}>
          <ArrowLeft size={22} strokeWidth={1.75} />
        </button>
      ) : <span style={{ width: 0 }} />}
      <div className="oi-m-compact__title" aria-hidden={!compact}>{title}</div>
      <div className="oi-m-compact__actions" style={{ marginRight: -12 }}>
        {actions.map((a) => (
          <button key={a.label} type="button" className="oi-m-iconbtn" onClick={a.onClick} aria-label={a.label}>
            <a.icon size={22} strokeWidth={1.75} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ScreenHeader({ title, subtitle }) {
  return (
    <header className="oi-m-header">
      <div className="oi-m-header__title">
        <h1 className="oi-m-title">{title}</h1>
        {subtitle && <p className="oi-m-meta" style={{ marginTop: 4 }}>{subtitle}</p>}
      </div>
    </header>
  );
}
