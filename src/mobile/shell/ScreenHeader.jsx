import React, { useContext, useRef } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ShellContext } from './MobileShell';

/**
 * The compact bar: back or nothing on the left, the 17px title in the
 * middle (fades in past 48px), up to two circular white icon buttons on the
 * right. On a tab root the rightmost is always the bell with the unread dot.
 */
export function CompactBar({ title, compact, actions = [], onBack, bell = false }) {
  const navigate = useNavigate();
  const { base, unread } = useContext(ShellContext);
  const all = bell ? [...actions.slice(0, 1), { icon: Bell, label: 'Notifications', dot: unread > 0, onClick: () => navigate(`${base}/notifications`) }] : actions.slice(0, 2);
  return (
    <div className={`oi-m-compact${compact ? ' oi-m-compact--on' : ''}`}>
      {onBack ? (
        <div className="oi-m-compact__back">
          <button type="button" className="oi-m-iconbtn" onClick={onBack} aria-label="Back">
            <ArrowLeft size={22} strokeWidth={1.75} />
          </button>
        </div>
      ) : <span style={{ width: 0 }} />}
      <div className="oi-m-compact__title" aria-hidden={!compact}>{title}</div>
      <div className="oi-m-compact__actions">
        {all.map((a) => (
          <button key={a.label} type="button" className="oi-m-iconbtn" onClick={a.onClick} aria-label={a.label}>
            <a.icon size={21} strokeWidth={1.75} />
            {a.dot && <span className="oi-m-dot" />}
          </button>
        ))}
      </div>
    </div>
  );
}

/** `onLongPress` (600ms on the title) is a hidden hook for review builds; nothing in the layout changes with it. */
export default function ScreenHeader({ title, subtitle, onLongPress }) {
  const timer = useRef(null);
  const start = onLongPress ? () => { clearTimeout(timer.current); timer.current = setTimeout(onLongPress, 600); } : undefined;
  const stop = onLongPress ? () => clearTimeout(timer.current) : undefined;
  return (
    <header className="oi-m-header">
      <div className="oi-m-header__title">
        <h1 className="oi-m-title" onTouchStart={start} onTouchEnd={stop} onTouchMove={stop} onMouseDown={start} onMouseUp={stop} onMouseLeave={stop}>{title}</h1>
        {subtitle && <p className="oi-m-meta" style={{ marginTop: 4 }}>{subtitle}</p>}
      </div>
    </header>
  );
}
