import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { platform } from '../native';

/**
 * iOS edge swipe goes back: a touch that starts within 24px of the left
 * edge and travels 80px right, mostly horizontally, pops one history
 * entry. Tab roots do not go back. Web browsers and Android have their own
 * gestures, so this runs on iOS only.
 */
export default function useEdgeSwipeBack(base, rootEl) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (platform() !== 'ios') return undefined;
    const el = rootEl?.current;
    if (!el) return undefined;
    const isRoot = () => new RegExp(`^${base}/?(guests|plan|site|account)?/?$`).test(pathname);
    let start = null;
    const onStart = (e) => { const t = e.touches[0]; start = t.clientX <= 24 ? { x: t.clientX, y: t.clientY } : null; };
    const onEnd = (e) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x; const dy = Math.abs(t.clientY - start.y);
      start = null;
      if (dx > 80 && dy < 60 && !isRoot()) navigate(-1);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); };
  }, [base, pathname, navigate, rootEl]);
}
