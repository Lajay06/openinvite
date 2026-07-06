/**
 * HeroCollage — full-bleed single photo hero, fully static.
 */
import React, { useEffect, useState } from "react";
import ScrollCue from "@/components/motion/ScrollCue";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const HEADLINE_STYLE = {
  fontSize: "clamp(36px, 5vw, 64px)",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
  color: "#FFFFFF",
  margin: 0,
};

export default function HeroCollage({ onCTA }) {
  const [visible, setVisible] = useState(prefersReducedMotion());

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

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
        backgroundAttachment: "scroll",
        backgroundColor: "#1a0008",
      }}
    >
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
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
        }}
      >
        <h1 style={{ ...HEADLINE_STYLE, marginBottom: "2rem" }}>
          Because planning your wedding should feel exciting.
        </h1>

        <button onClick={onCTA} className="btn-primary" style={{ padding: '14px 40px', fontSize: 13 }}>
          Start planning
        </button>
      </div>

      <ScrollCue delay={2200} />
    </section>
  );
}