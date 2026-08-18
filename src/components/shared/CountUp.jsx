/**
 * CountUp — animated 0 -> `to` stat number, used on every dashboard page's
 * stat cards. Previously copy-pasted independently into 17 different page
 * files, each with its own local `function CountUp(...)`. One of those
 * copies (Budget.jsx) was fixed for a real bug — see below — and this module
 * is that fixed version, extracted so the other 16 inherit it. Budget.jsx
 * kept its local copy through the original consolidation and was the last
 * duplicate; it now imports this one, so there is exactly one definition.
 *
 * The bug: on every page these copies live on, the surrounding effects can
 * re-render the component several times in quick succession right after
 * data loads (confirmed live via instrumentation on Guests.jsx: the same
 * final stat value re-fired this effect multiple times within ~1s). The
 * broken versions restart the animation from scratch on every one of those
 * re-fires, so it keeps getting reset before a full `duration` window can
 * ever elapse — the number visibly gets stuck near 0 and never reaches its
 * real value. Skipping the restart when `to` hasn't actually changed from
 * what's already in flight (or already reached) lets one animation run to
 * completion, which is what fixes it.
 *
 * Supports every prop shape the 17 duplicates used between them: `format`
 * (a function applied to the animated number, e.g. currency formatting),
 * or plain `prefix`/`suffix` strings.
 */
import { useState, useRef, useEffect } from "react";

export default function CountUp({ to, duration = 1200, format, prefix = "", suffix = "" }) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  const lastToRef = useRef(null);

  useEffect(() => {
    if (to === 0) { setValue(0); lastToRef.current = 0; return; }
    if (lastToRef.current === to) return;
    lastToRef.current = to;
    startRef.current = null;
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * to));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Extra safety net: requestAnimationFrame is tied to the paint cycle,
    // so a backgrounded/throttled tab can still stall the loop indefinitely
    // partway through even with the guard above. setTimeout keeps firing
    // in that case, so this guarantees the value snaps to the true target
    // once the animation's nominal duration has passed either way.
    const settle = setTimeout(() => setValue(to), duration + 50);
    return () => { cancelAnimationFrame(raf); clearTimeout(settle); };
  }, [to, duration]);

  if (format) return <>{format(value)}</>;
  return <>{prefix}{value}{suffix}</>;
}
