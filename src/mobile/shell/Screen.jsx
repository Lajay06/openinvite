import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenHeader, { CompactBar } from './ScreenHeader';

/**
 * A screen: the scroll container, the large title, and the compact bar.
 * Lists scroll inside this element, so the tab bar and the Ava button never
 * move. `bell` marks a tab root: the bell becomes the rightmost action.
 *
 * props
 *   title, subtitle
 *   actions   [{ icon, label, onClick }] up to two circular buttons top right
 *   bell      true on tab roots
 *   back      true (history back) | string (route) | function
 *   onRefresh async fn; enables pull to refresh (touch only)
 */
export default function Screen({ title, subtitle, actions, bell = false, back, onRefresh, footer, onTitleLongPress, children }) {
  const ref = useRef(null);
  const raf = useRef(0);
  const [compact, setCompact] = useState(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touch = useRef({ y: 0, active: false });
  const navigate = useNavigate();

  const onScroll = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const next = el.scrollTop > 48;
      setCompact((prev) => (prev === next ? prev : next));
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onTouchStart = (e) => { if (!onRefresh) return; touch.current = { y: e.touches[0].clientY, active: ref.current?.scrollTop === 0 }; };
  const onTouchMove = (e) => {
    if (!onRefresh || !touch.current.active || refreshing) return;
    const dy = e.touches[0].clientY - touch.current.y;
    if (dy > 0 && ref.current?.scrollTop === 0) setPull(Math.min(80, dy * 0.5));
  };
  const onTouchEnd = async () => {
    if (!onRefresh) return;
    if (pull > 56 && !refreshing) {
      setRefreshing(true);
      try { await onRefresh(); } finally { setRefreshing(false); }
    }
    setPull(0);
    touch.current.active = false;
  };

  const onBack = back
    ? () => { if (typeof back === 'function') back(); else if (typeof back === 'string') navigate(back); else navigate(-1); }
    : undefined;

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <CompactBar title={title} compact={compact} actions={actions} onBack={onBack} bell={bell} />
      <div className="oi-m-screen" ref={ref} onScroll={onScroll} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {(pull > 0 || refreshing) && (
          <div className="oi-m-meta" style={{ textAlign: 'center', height: refreshing ? 32 : pull, overflow: 'hidden', transition: refreshing ? 'height 200ms' : undefined, lineHeight: '32px' }}>
            {refreshing ? 'Updating' : pull > 56 ? 'Release to update' : ''}
          </div>
        )}
        <ScreenHeader title={title} subtitle={subtitle} onLongPress={onTitleLongPress} />
        <div className="oi-m-stagger" style={{ display: 'contents' }}>{children}</div>
        {footer && <div style={{ height: 88 }} />}
      </div>
      {footer && <div className="oi-m-footer">{footer}</div>}
    </div>
  );
}
