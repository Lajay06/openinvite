import React, { useContext, useRef } from 'react';
import { ArrowLeft, Bell, MessageCircle, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShellContext } from './MobileShell';
import mark from '../assets/mark.png';

/**
 * The compact bar. On a tab root (goal 8): the brand mark, 28px and no
 * wordmark, top left (tapping it on any tab but Home goes to Home), and
 * three circular 44px buttons top right in a fixed order: search, messages
 * (with its own unread count), notifications (with the dot). The large
 * title sits below this row, and the row stays as the bar collapses on
 * scroll. Elsewhere: back or nothing on the left, the 17px title in the
 * middle (fades in past 48px), up to two circular icon buttons on the right.
 */
export function CompactBar({ title, compact, actions = [], onBack, root = false }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { base, unread, notifications } = useContext(ShellContext);
  const unreadMessages = notifications?.unreadMessages || 0;
  const all = root
    ? [
      { icon: Search, label: 'Search', onClick: () => navigate(`${base}/search`) },
      { icon: MessageCircle, label: unreadMessages ? `Messages, ${unreadMessages} unread` : 'Messages', count: unreadMessages, onClick: () => navigate(`${base}/plan/messages`) },
      { icon: Bell, label: unread ? `Notifications, ${unread} unread` : 'Notifications', dot: unread > 0, onClick: () => navigate(`${base}/notifications`) },
    ]
    : actions.slice(0, 2);
  const onHome = pathname.replace(/\/$/, '') === base;
  return (
    <div className={`oi-m-compact${compact ? ' oi-m-compact--on' : ''}`}>
      {onBack ? (
        <div className="oi-m-compact__back">
          <button type="button" className="oi-m-iconbtn" onClick={onBack} aria-label="Back">
            <ArrowLeft size={22} strokeWidth={1.75} />
          </button>
        </div>
      ) : root ? (
        <div className="oi-m-compact__back">
          {onHome
            ? <span className="oi-m-mark" role="img" aria-label="Openinvite"><img src={mark} alt="" width={28} height={28} /></span>
            : <button type="button" className="oi-m-mark oi-m-mark--btn" onClick={() => navigate(base)} aria-label="Home"><img src={mark} alt="" width={28} height={28} /></button>}
        </div>
      ) : <span style={{ width: 0 }} />}
      <div className="oi-m-compact__title" aria-hidden={!compact}>{title}</div>
      <div className="oi-m-compact__actions">
        {all.map((a) => (
          <button key={a.label} type="button" className="oi-m-iconbtn" onClick={a.onClick} aria-label={a.label}>
            <a.icon size={21} strokeWidth={1.75} />
            {a.dot && <span className="oi-m-dot" />}
            {a.count > 0 && <span className="oi-m-badge">{a.count > 99 ? '99+' : a.count}</span>}
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
