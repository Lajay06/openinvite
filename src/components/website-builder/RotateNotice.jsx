import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/**
 * A quiet line at the top of the builder, in portrait, on a phone.
 *
 * ── WHAT IT IS NOT ─────────────────────────────────────────────────────────
 *
 * Not a block, not a modal, not a lock. It names the two ways out — turn the
 * phone, or come back at a desk — and takes neither. Editing stays fully
 * enabled in both
 * orientations: a couple who wants to change one word on a train should be
 * able to, and a product that refuses until the phone is turned is a product
 * telling someone they are holding it wrong. This says the room is better
 * through the other door; it does not close this one.
 *
 * ── WHY MATCHMEDIA AND NOT A RESIZE LISTENER ───────────────────────────────
 *
 * Orientation is a media query, so the browser already knows the answer and
 * will tell us when it changes. Deriving it from window.innerWidth >
 * innerHeight on every resize is the same answer computed worse: it fires on
 * every keyboard open, and on iOS the keyboard changes innerHeight, so a
 * couple typing in portrait would have watched this appear and disappear
 * under their thumbs.
 *
 * The listener is removed on unmount. That is not decoration here — this is
 * the Design studio, the surface with a memory complaint against it.
 */
const QUERY = '(max-width: 767px) and (orientation: portrait)';

export default function RotateNotice() {
  const [narrowPortrait, setNarrowPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(QUERY);
    const apply = () => setNarrowPortrait(mq.matches);
    apply();
    // addEventListener, with the addListener fallback for older WebKit — the
    // engine this notice exists for.
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply);
      else mq.removeListener(apply);
    };
  }, []);

  if (!narrowPortrait || dismissed) return null;

  return (
    <div
      data-rotate-notice
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
        Turn your phone sideways, or use a desktop for the best experience.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex',
          color: 'rgba(255,255,255,0.45)', flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
