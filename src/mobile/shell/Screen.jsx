import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenHeader, { CompactBar } from './ScreenHeader';

/**
 * A screen: the scroll container, the large title, and the compact bar.
 * Lists scroll inside this element, not the document, so the tab bar and
 * the Ava button never move.
 *
 * props
 *   title      the screen title (large, then compact)
 *   subtitle   one meta line under the title
 *   actions    [{ icon, label, onClick }] rendered top right, 44px each
 *   back       true (history back) | string (route) | function
 */
export default function Screen({ title, subtitle, actions, back, children }) {
  const ref = useRef(null);
  const raf = useRef(0);
  const [compact, setCompact] = useState(false);
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

  const onBack = back
    ? () => {
        if (typeof back === 'function') back();
        else if (typeof back === 'string') navigate(back);
        else navigate(-1);
      }
    : undefined;

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <CompactBar title={title} compact={compact} actions={actions} onBack={onBack} />
      <div className="oi-m-screen oi-m-enter" ref={ref} onScroll={onScroll}>
        <ScreenHeader title={title} subtitle={subtitle} />
        {children}
      </div>
    </div>
  );
}
