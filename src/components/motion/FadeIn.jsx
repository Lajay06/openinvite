/**
 * FadeIn — fade + blur clear for subheadings/body.
 */
import React, { useRef, useEffect, useState } from "react";

export default function FadeIn({ children, delay = "0s", direction = "up", className = "", style = {} }) {
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
    }, { threshold: 0.1, rootMargin: "0px 0px -20px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const fromX = direction === "left" ? -40 : direction === "right" ? 40 : 0;
  const fromY = direction === "up" ? 30 : 0;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        filter: visible ? "blur(0px)" : "blur(4px)",
        transform: visible ? "translate(0,0)" : `translate(${fromX}px, ${fromY}px)`,
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}, filter 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}