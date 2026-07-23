/**
 * HeroCollage — full-bleed single photo hero, fully static.
 */
import React, { useEffect, useState } from "react";
import ScrollCue from "@/components/motion/ScrollCue";

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
          filter: visible ? "blur(0px)" : "blur(8px)",
          transition: `opacity 0.9s ${EASE}, filter 0.9s ${EASE}`,
        }}
      >
        <h1 style={{ ...HEADLINE_STYLE, marginBottom: "1.25rem", fontWeight: 700 }}>
          Because planning your wedding should feel exciting.
        </h1>

        {/* AEO/SEO batch, item 6 — the first factual sentence a crawler
            with no JS encounters (captured by scripts/prerender.mjs), also
            a genuinely useful one-line summary for a real visitor. */}
        <p style={{
          fontSize: "clamp(15px, 1.6vw, 18px)", lineHeight: 1.6, color: "rgba(255,255,255,0.82)",
          maxWidth: 640, margin: "0 auto 2rem", fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          Openinvite is a wedding planning app with a one-time payment: planning tools, guest management, digital invitations, a wedding website and an AI assistant.
        </p>

        <button onClick={onCTA} className="btn-primary" style={{ padding: '14px 40px', fontSize: 13 }}>
          Start planning
        </button>
      </div>

      <ScrollCue delay={2200} />
    </section>
  );
}