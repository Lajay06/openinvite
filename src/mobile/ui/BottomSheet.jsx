import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * A bottom sheet with square corners. Slides up over a scrim, 220ms,
 * transform and opacity only. `full` makes it take the whole height under
 * the status bar (used for Ava). Escape and the scrim close it.
 *
 * Mounted only while open or animating out, so a closed sheet costs nothing.
 */
export default function BottomSheet({ open, onClose, title, children, footer, full = false, flush = false }) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (open) {
      setMounted(true);
      // Two frames so the initial transform is painted before it animates.
      timer.current = setTimeout(() => setShown(true), 20);
    } else {
      setShown(false);
      timer.current = setTimeout(() => setMounted(false), 240);
    }
    return () => clearTimeout(timer.current);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  return (
    <div className={`oi-m-sheet-root${shown ? ' oi-m-sheet-root--open' : ''}`} role="presentation">
      <div className="oi-m-sheet-scrim" onClick={onClose} />
      <div className={`oi-m-sheet${full ? ' oi-m-sheet--full' : ''}`} role="dialog" aria-modal="true" aria-label={title || 'Sheet'}>
        {(title || onClose) && (
          <div className="oi-m-sheet__head">
            <h2 className="oi-m-section" style={{ fontSize: 17, lineHeight: '24px' }}>{title}</h2>
            {onClose && (
              <button type="button" className="oi-m-iconbtn" onClick={onClose} aria-label="Close">
                <X size={22} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}
        <div className={`oi-m-sheet__body${flush ? ' oi-m-sheet__body--flush' : ''}`}>{children}</div>
        {footer && <div className="oi-m-sheet__foot">{footer}</div>}
      </div>
    </div>
  );
}
