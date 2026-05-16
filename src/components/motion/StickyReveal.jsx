/**
 * StickyReveal — Apple-style pinned section.
 * Content animates in sequence while the section is "sticky".
 * The wrapper must be tall enough to give scroll room (height: 200vh).
 */
import React, { useRef, useEffect, useState } from "react";
import { useScrollEngine } from "@/hooks/useScrollEngine";

export default function StickyReveal({ children, bg = "#0A0A0A" }) {
  const wrapRef = useRef(null);
  const [progress, setProgress] = useState(0); // 0–1

  useScrollEngine(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const totalScroll = el.offsetHeight - window.innerHeight;
    const scrolled = -rect.top;
    const pct = Math.min(1, Math.max(0, scrolled / totalScroll));
    setProgress(pct);
  });

  // phase thresholds
  const headlineIn = progress > 0.05;
  const subIn = progress > 0.25;
  const ctaIn = progress > 0.45;

  return (
    <div ref={wrapRef} style={{ height: "200vh", position: "relative" }}>
      <div style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        display: "flex",
        alignItems: "center",
        background: bg,
        overflow: "hidden",
      }}>
        {typeof children === "function" ? children({ headlineIn, subIn, ctaIn, progress }) : children}
      </div>
    </div>
  );
}