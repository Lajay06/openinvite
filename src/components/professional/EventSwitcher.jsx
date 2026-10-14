/**
 * src/components/professional/EventSwitcher.jsx
 *
 * THE EVENT SWITCHER, ALWAYS TOP LEFT. Lists every active event by couple and
 * date; picking one opens that event wherever the planner is.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useMatch } from 'react-router-dom';
import { ChevronDown, Check } from 'lucide-react';
import { useProStore } from '@/lib/professionalStore';
import { ROUTES } from '@/lib/professionalBrand';
import { activeEvents, eventLabel, shortDate } from '@/lib/professionalEvents';
import { PRO, PJS } from './proTheme';
import { TYPE } from '@/styles/typeScale';

export default function EventSwitcher({ compact = false }) {
  const events = useProStore((st) => activeEvents(st.ProEvent));
  const match = useMatch(`${ROUTES.app}/events/:eventId/*`);
  const params = useParams();
  const current = events.find((e) => e.id === (match?.params.eventId || params.eventId)) || null;
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const go = (id) => {
    setOpen(false);
    const rest = match?.params['*'] ? `/${match.params['*']}` : '';
    nav(id ? `${ROUTES.app}/events/${id}${rest}` : ROUTES.app);
  };

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 0, flex: compact ? '1 1 auto' : '0 1 auto', display: 'flex' }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, maxWidth: compact ? '100%' : 320, minWidth: 0,
          background: 'rgba(255,255,255,0.1)', color: PRO.onDark, border: 'none', borderRadius: 999,
          padding: '6px 12px', fontSize: TYPE.button, fontWeight: 600, fontFamily: PJS, cursor: 'pointer',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current ? eventLabel(current) : 'All events'}
        </span>
        <ChevronDown size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Switch event"
          style={{
            // On a phone the list is pinned to the 16px gutters, so it never runs off the screen.
            ...(compact ? { position: 'fixed', top: 54, left: 16, right: 16 } : { position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 340 }),
            maxHeight: 380, overflowY: 'auto',
            background: '#FFFFFF', border: `1px solid ${PRO.borderStrong}`, margin: 0, padding: '6px 0', listStyle: 'none', zIndex: 60,
          }}
        >
          {[null, ...events].map((e) => {
            const selected = (e?.id || null) === (current?.id || null);
            return (
              <li key={e?.id || 'all'} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => go(e?.id || null)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: selected ? 'rgba(10,10,10,0.04)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: PJS }}
                >
                  <span style={{ width: 14, flexShrink: 0, color: PRO.text }}>{selected ? <Check size={14} aria-hidden="true" /> : null}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: TYPE.body, fontWeight: 600, color: PRO.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e ? e.couple_names : 'All events'}
                    </span>
                    {e && <span style={{ display: 'block', fontSize: TYPE.secondary, color: PRO.muted }}>{shortDate(e.event_date)}{e.venue ? `, ${e.venue}` : ''}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
