import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { typeIcon } from './icons';

/**
 * The in-app notification: drops from the top, stays four seconds, swipes
 * away sideways, opens the item on tap. One at a time.
 */
export default function Banner({ item, onDone }) {
  const [phase, setPhase] = useState('in');
  const navigate = useNavigate();
  const timer = useRef(null);
  const touch = useRef({ x: 0, dx: 0 });
  const ref = useRef(null);

  useEffect(() => {
    if (!item) return undefined;
    setPhase('in');
    timer.current = setTimeout(() => setPhase('out'), 4000);
    return () => clearTimeout(timer.current);
  }, [item]);

  useEffect(() => {
    if (phase !== 'out') return undefined;
    const t = setTimeout(() => onDone?.(item), 260);
    return () => clearTimeout(t);
  }, [phase, item, onDone]);

  if (!item) return null;
  const { icon: Icon, tile } = typeIcon(item.type);
  const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, dx: 0 }; clearTimeout(timer.current); };
  const onTouchMove = (e) => { touch.current.dx = e.touches[0].clientX - touch.current.x; if (ref.current) ref.current.style.transform = `translateX(${touch.current.dx}px)`; };
  const onTouchEnd = () => {
    if (Math.abs(touch.current.dx) > 60) { setPhase('out'); return; }
    if (ref.current) ref.current.style.transform = '';
    timer.current = setTimeout(() => setPhase('out'), 2500);
  };
  return (
    <button
      type="button"
      ref={ref}
      className={`oi-m-banner oi-m-banner--${phase}`}
      onClick={() => { setPhase('out'); navigate(item.link); }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-live="polite"
    >
      <span className={`oi-m-row__tile oi-m-row__tile--${tile}`}><Icon size={18} strokeWidth={1.75} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="oi-m-banner__title">{item.title}</div>
        <div className="oi-m-banner__body">{item.body}</div>
      </div>
      <span className="oi-m-meta" style={{ flexShrink: 0 }}>now</span>
    </button>
  );
}
