/**
 * HeroCollage — full-bleed single photo hero.
 * Static two-line headline, centred, no rotating words.
 */
import React, { useEffect, useState, useRef } from "react";
import { useScrollEngine } from "@/hooks/useScrollEngine";
import ApplePillButton from "@/components/motion/ApplePillButton";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const HEADLINE_STYLE = {
  fontSize: "clamp(40px, 5vw, 64px)",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
  color: "#FFFFFF",
  margin: 0,
};

export default function HeroCollage({ onCTA }) {
  const [visible, setVisible] = useState(prefersReducedMotion());
  const contentRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  useScrollEngine((scrollY) => {
    if (!contentRef.current) return;
    const vh = window.innerHeight;
    const progress = scrollY / vh;
    const translateY = progress * -100;
    const opacity = 1 - progress * 2;
    contentRef.current.style.transform = `translateX(-50%) translateY(calc(-50% + ${translateY}px))`;
    contentRef.current.style.opacity = String(Math.max(0, opacity));
  });

  return (
    <section
      style={{
        position: "relative",
        width: "100vw",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        backgroundImage: `url(https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundColor: "#1a0008",
      }}
    >
      {/* Aurora layer */}
      <div className="aurora-layer" />

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.35) 100%)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />

      {/* Centred text content */}
      <div
        ref={contentRef}
        style={{
          position: "absolute",
          zIndex: 10,
          textAlign: "center",
          left: "50%",
          top: "50%",
          transform: "translateX(-50%) translateY(-50%)",
          width: "100%",
          maxWidth: 900,
          padding: "0 24px",
          willChange: "transform, opacity",
          opacity: visible ? 1 : 0,
          filter: visible ? "blur(0px)" : "blur(8px)",
          transition: `opacity 0.9s ${EASE}, filter 0.9s ${EASE}`,
        }}
      >
        <h1 style={{ ...HEADLINE_STYLE, marginBottom: 6, fontWeight: 700 }}>Openinvite.</h1>
        <p style={{ ...HEADLINE_STYLE, color: "#FFFFFF", marginBottom: "2rem", fontWeight: 700 }}>
          Because planning your wedding should feel exciting.
        </p>

        <button onClick={onCTA} className="btn-primary" style={{ padding: '14px 40px', fontSize: 13 }}>
          Start planning
        </button>
      </div>

      <ScrollCue />
    </section>
  );
}

function ScrollCue() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        left: "clamp(32px, 6vw, 80px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        zIndex: 20,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease",
        pointerEvents: "none",
      }}
    >
      <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888" }}>Scroll</span>
      <div style={{ width: 1, height: 40, background: "#333", overflow: "hidden" }}>
        <div style={{
          width: "100%",
          height: "50%",
          background: "linear-gradient(to bottom, #E03553, #803D81)",
          animation: "scrollCue 1.6s cubic-bezier(0.16,1,0.3,1) infinite",
        }} />
      </div>
      <style>{`@keyframes scrollCue { 0%{transform:translateY(-100%)} 100%{transform:translateY(220%)} }`}</style>
    </div>
  );
}