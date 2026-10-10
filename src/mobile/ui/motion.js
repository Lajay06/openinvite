import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts from 0 to `to` once, the first time the element is on screen. 600ms, eased. */
export function useCountUp(to, { duration = 600, enabled = true } = {}) {
  const [value, setValue] = useState(enabled && !reduced() ? 0 : to);
  const ref = useRef(null);
  const done = useRef(false);
  useEffect(() => {
    if (!enabled || reduced()) { setValue(to); return undefined; }
    const el = ref.current;
    if (!el || done.current) { setValue(to); return undefined; }
    let raf = 0;
    const run = () => {
      done.current = true;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(to * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (typeof IntersectionObserver === 'undefined') { run(); return () => cancelAnimationFrame(raf); }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); run(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, enabled, duration]);
  return [value, ref];
}

/**
 * A translateY for a hero photo from its scroller's scrollTop, capped at
 * `max` px. Reads the nearest .oi-m-screen ancestor. Reduced motion: 0.
 */
export function useParallax(max = 12) {
  const ref = useRef(null);
  const [y, setY] = useState(0);
  useEffect(() => {
    if (reduced()) return undefined;
    const el = ref.current;
    const scroller = el?.closest('.oi-m-screen');
    if (!scroller) return undefined;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(Math.min(max, Math.max(0, scroller.scrollTop * 0.15))));
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => { scroller.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [max]);
  return [ref, y];
}
