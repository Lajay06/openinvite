import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * A bottom sheet: 28px top corners, a grab handle, springs open, eases
 * closed. Scrim and Escape close it; so does dragging the handle down.
 * `full` takes the whole height under the status bar (Ava).
 */
export default function BottomSheet({ open, onClose, title, children, footer, full = false, flush = false }) {
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState('closed');
  const timer = useRef(null);
  const drag = useRef({ y: 0, dy: 0 });
  const sheetRef = useRef(null);

  const mountedRef = useRef(open);
  useEffect(() => {
    clearTimeout(timer.current);
    if (open) {
      mountedRef.current = true;
      setMounted(true);
      timer.current = setTimeout(() => setPhase('open'), 20);
    } else if (mountedRef.current) {
      setPhase('closing');
      timer.current = setTimeout(() => { mountedRef.current = false; setMounted(false); setPhase('closed'); }, 240);
    }
    return () => clearTimeout(timer.current);
  }, [open]);

  // Focus: trapped inside the sheet while open, restored to the opener on close.
  const opener = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    opener.current = document.activeElement;
    const focusables = () => [...(sheetRef.current?.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])];
    const t = setTimeout(() => { const f = focusables(); (f.find((el) => !el.closest('.oi-m-sheet__head')) || f[0])?.focus?.(); }, 60);
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose?.(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      const o = opener.current;
      if (o && typeof o.focus === 'function' && document.contains(o)) o.focus();
    };
  }, [open, onClose]);

  const onTouchStart = (e) => { drag.current = { y: e.touches[0].clientY, dy: 0 }; };
  const onTouchMove = (e) => {
    const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = dy;
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onTouchEnd = () => {
    if (sheetRef.current) sheetRef.current.style.transform = '';
    if (drag.current.dy > 80) onClose?.();
  };

  if (!mounted) return null;
  return (
    <div className={`oi-m-sheet-root${phase === 'open' ? ' oi-m-sheet-root--open' : ''}${phase === 'closing' ? ' oi-m-sheet-root--closing' : ''}`} role="presentation">
      <div className="oi-m-sheet-scrim" onClick={onClose} />
      <div className={`oi-m-sheet${full ? ' oi-m-sheet--full' : ''}`} role="dialog" aria-modal="true" aria-label={title || 'Sheet'} ref={sheetRef}>
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="oi-m-sheet__handle" />
          {(title || onClose) && (
            <div className="oi-m-sheet__head">
              <h2 className="oi-m-section" style={{ fontSize: 17, lineHeight: '22px' }}>{title}</h2>
              {onClose && (
                <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" onClick={onClose} aria-label="Close">
                  <X size={22} strokeWidth={1.75} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className={`oi-m-sheet__body${flush ? ' oi-m-sheet__body--flush' : ''}`}>{children}</div>
        {footer && <div className="oi-m-sheet__foot">{footer}</div>}
      </div>
    </div>
  );
}
