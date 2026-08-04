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
      {/* Dark overlay — bottom-weighted so the couple's faces (upper-middle
          of this photo) stay clear; only the bottom band where the text
          sits needs to darken for legibility. A uniform/centred gradient
          previously sat behind text positioned dead-center of the frame,
          landing directly on the subject's face. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.6) 100%)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />

      {/* Bottom-anchored text content — clears the subject's face instead
          of covering it. bottom offset clears ScrollCue's own space
          (bottom: 40, ~64px tall) below it. */}
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          textAlign: "center",
          left: "50%",
          bottom: "clamp(130px, 16vh, 180px)",
          transform: "translateX(-50%)",
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