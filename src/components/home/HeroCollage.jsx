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
        width: "100%",
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
      {/* Dark overlay — uniform, because the text below sits dead-center of
          the frame. 1c14c93 had made this bottom-weighted (transparent at
          top, 0.6 at the bottom) to pair with bottom-anchored text; at
          mid-height that gradient is only ~0.1, far too light to carry a
          white headline. Restored alongside the centering. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: EXPERIMENT_NO_OVERLAY ? "none" : "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.35) 100%)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />

      {/* Centered text content — horizontally and vertically dead-center of
          the frame. 1c14c93 had bottom-anchored this to keep the couple's
          faces clear; the resulting low placement read as off-center, and
          the overlap is an accepted tradeoff, so the centering is restored. */}
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          textAlign: "center",
          left: "50%",
          top: "50%",
          transform: "translateX(-50%) translateY(-50%)",
          width: "100%",
          maxWidth: 1050,
          padding: "0 24px",
          opacity: visible ? 1 : 0,
          filter: visible ? "blur(0px)" : "blur(8px)",
          transition: `opacity 0.9s ${EASE}, filter 0.9s ${EASE}`,
        }}
      >
        <h1 style={{ ...HEADLINE_STYLE, marginBottom: "2rem", fontWeight: 700 }}>
          Because planning your wedding should feel exciting.
        </h1>

        {/* The AEO answer capsule this paragraph used to render here now
            lives verbatim in the meta description (src/lib/marketingSeo.js)
            and public/llms.txt — crawlers still get it, visitors just see
            the headline + CTA. */}

        <button onClick={onCTA} className="btn-primary" style={{ padding: '14px 40px', fontSize: 13 }}>
          Start planning
        </button>
      </div>

      <ScrollCue delay={2200} />
    </section>
  );
}