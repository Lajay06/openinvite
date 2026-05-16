/**
 * GradientHeadline — characters animate up on entry, then text fills
 * with brand gradient as it scrolls into the center of the viewport.
 * 
 * Props:
 *   text      string
 *   as        tag name (default "h2")
 *   className string
 *   style     object
 *   dark      bool — if true headline starts white, else #0A0A0A
 */
import React, { useRef, useEffect, useState } from "react";
import { useScrollEngine } from "@/hooks/useScrollEngine";

const BRAND = "linear-gradient(135deg, #E03553 0%, #803D81 100%)";

export default function GradientHeadline({ text, as: TagName = "h2", className = "", style = {}, dark = false }) {
  const Tag = TagName;
  const containerRef = useRef(null);
  const [entered, setEntered] = useState(false);
  const [fillPct, setFillPct] = useState(0);
  const prefersReduced = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  // Entry observer — trigger char animation
  useEffect(() => {
    if (prefersReduced) { setEntered(true); setFillPct(100); return; }
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setEntered(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Scroll-scrub gradient fill — triggers early, completes fast
  useScrollEngine((scrollY) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    // Start filling when element enters at 90% from top, complete by 60%
    const start = vh * 0.9;
    const end = vh * 0.6;
    const pos = rect.top;
    const pct = Math.min(1, Math.max(0, (start - pos) / (start - end)));
    setFillPct(pct * 100);
  });

  const chars = text.split("");
  const baseColor = dark ? "#ffffff" : "#0A0A0A";

  return (
    <Tag ref={containerRef} className={className} style={{ ...style, position: "relative", wordBreak: "normal", overflowWrap: "break-word", hyphens: "none", WebkitHyphens: "none" }}>
      {/* Invisible full text for layout */}
      <span aria-hidden style={{ visibility: "hidden", position: "absolute", pointerEvents: "none" }}>
        {text}
      </span>
      {/* Visible layered chars */}
      <span aria-label={text} style={{ display: "inline", position: "relative" }}>
        {chars.map((ch, i) => {
          const charStart = (i / chars.length) * 100;
          const charFilled = fillPct >= charStart;
          const delay = entered ? `${i * 0.025}s` : "0s";
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                whiteSpace: ch === " " ? "pre" : "normal",
                transition: `transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}, opacity 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}`,
                transform: entered ? "translateY(0)" : "translateY(60px)",
                opacity: entered ? 1 : 0,
                color: charFilled ? "transparent" : baseColor,
                background: charFilled ? BRAND : "none",
                WebkitBackgroundClip: charFilled ? "text" : "initial",
                backgroundClip: charFilled ? "text" : "initial",
                WebkitTextFillColor: charFilled ? "transparent" : baseColor,
              }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}