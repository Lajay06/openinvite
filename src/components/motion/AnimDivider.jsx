/**
 * AnimDivider — thin gradient line that expands from 0% → 100% width on entry.
 */
import React, { useRef, useEffect, useState } from "react";

export default function AnimDivider({ className = "" }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  const prefersReduced = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  useEffect(() => {
    if (prefersReduced) { setW(48); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setW(48); obs.disconnect(); }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`h-px mb-8 ${className}`}
      style={{
        width: w,
        background: "linear-gradient(135deg, #E03553, #803D81)",
        transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
      }}
    />
  );
}