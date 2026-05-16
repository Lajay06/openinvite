/**
 * FadeUp — simple IntersectionObserver fade-up for non-heading elements.
 * delay: CSS delay string e.g. "0.1s"
 */
import React, { useRef, useEffect, useState } from "react";

export default function FadeUp({ children, delay = "0s", className = "", style = {} }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const prefersReduced = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  useEffect(() => {
    if (prefersReduced) { setVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}