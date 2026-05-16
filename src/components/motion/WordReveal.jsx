/**
 * WordReveal — "reading beam" effect. Words fade from 0.15 → 1 opacity
 * as the user scrolls through the paragraph.
 */
import React, { useRef, useEffect, useState } from "react";
import { useScrollEngine } from "@/hooks/useScrollEngine";

export default function WordReveal({ text, className = "", style = {} }) {
  const containerRef = useRef(null);
  const [progress, setProgress] = useState(0); // 0–1 through the element
  const prefersReduced = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  useScrollEngine(() => {
    if (prefersReduced) { setProgress(1); return; }
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh * 0.8;
    const end = vh * 0.1;
    const pct = Math.min(1, Math.max(0, (start - rect.top) / (start - end + rect.height)));
    setProgress(pct);
  });

  useEffect(() => {
    if (prefersReduced) setProgress(1);
  }, []);

  const words = text.split(" ");

  return (
    <p ref={containerRef} className={className} style={style}>
      {words.map((word, i) => {
        const wordStart = i / words.length;
        const wordEnd = (i + 1) / words.length;
        const opacity = Math.min(1, Math.max(0.12,
          (progress - wordStart) / (wordEnd - wordStart + 0.1)
        ));
        return (
          <span key={i} style={{ opacity, transition: "opacity 0.1s linear", display: "inline" }}>
            {word}{i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </p>
  );
}