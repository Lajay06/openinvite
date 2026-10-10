import React, { useRef, useState } from 'react';
import { Trash2, Check, MailOpen } from 'lucide-react';
import { RowGroup } from './Row';

/**
 * Many rows inside one rounded card with hairline dividers, for lists that
 * are scanned or searched. `groups`: [{ key, title, rows: [...] }] renders a
 * sticky section header per group; a single group with no title renders as
 * one card. Rows are whatever the caller passes (usually <Row>).
 */
export default function GroupedList({ groups = [], children }) {
  if (children) return <RowGroup>{children}</RowGroup>;
  return (
    <div className="oi-m-grouped">
      {groups.map((g) => (
        <section key={g.key} className="oi-m-grouped__section">
          {g.title && <h2 className="oi-m-grouped__title">{g.title}</h2>}
          <RowGroup>{g.rows}</RowGroup>
        </section>
      ))}
    </div>
  );
}

/**
 * A row that swipes left to reveal one or two actions. Wraps any row
 * element. `actions`: [{ key, icon, label, onAction, tone: 'ok'|'primary'|'no' }].
 * Only for actions the existing data layer supports; the caller decides.
 * Reduced motion and pointer devices still get the actions through the
 * row's own controls, so nothing is lost without a swipe.
 */
export function SwipeRow({ actions = [], children }) {
  const [x, setX] = useState(0);
  const start = useRef(null);
  const width = actions.length * 72;
  const onTouchStart = (e) => { start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, open: x < 0, moved: false }; };
  const onTouchMove = (e) => {
    if (!start.current) return;
    const dx = e.touches[0].clientX - start.current.x;
    const dy = e.touches[0].clientY - start.current.y;
    if (!start.current.moved && Math.abs(dy) > Math.abs(dx)) { start.current = null; return; }
    start.current.moved = true;
    const base = start.current.open ? -width : 0;
    setX(Math.max(-width, Math.min(0, base + dx)));
  };
  const onTouchEnd = () => {
    if (!start.current) return;
    setX(x < -width / 2 ? -width : 0);
    start.current = null;
  };
  const run = (a) => { setX(0); a.onAction?.(); };
  return (
    <div className="oi-m-swipe" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="oi-m-swipe__actions" style={{ width }} aria-hidden={x === 0}>
        {actions.map((a) => (
          <button key={a.key} type="button" className={`oi-m-swipe__action oi-m-swipe__action--${a.tone || 'ok'}`} onClick={() => run(a)} aria-label={a.label} tabIndex={x === 0 ? -1 : 0}>
            <a.icon size={20} strokeWidth={1.75} />
          </button>
        ))}
      </div>
      <div className="oi-m-swipe__content" style={{ transform: `translateX(${x}px)`, transition: start.current ? 'none' : 'transform 220ms var(--m-ease)' }}>
        {children}
      </div>
    </div>
  );
}

export const SWIPE_ICONS = { complete: Check, read: MailOpen, remove: Trash2 };
