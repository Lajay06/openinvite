/**
 * MarketingEndCap — the one full-bleed photo CTA that closes a marketing
 * page, sitting directly above PublicFooter.
 *
 * Extracted from src/components/home/FullBleedPhotoCTA.jsx, which was the
 * only page with this treatment. Home, Features, Ava and Pricing now render
 * this same component so the end-cap can't fork per page again — Pricing had
 * already grown its own text-on-black copy of the same headline.
 *
 * The photo is the only thing that varies between pages, so it is the one
 * required prop. `children` is an optional actions slot: Pricing renders its
 * existing plan buttons in it, which is why this takes children rather than a
 * fixed cta prop — those buttons carry real signup/billing behaviour and
 * analytics that must not be reduced to a link.
 */
import React, { useRef, useState, useEffect } from "react";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function MarketingEndCap({
  image,
  alt = "",
  title = "Your wedding deserves this.",
  scrim = 0.45,
  children,
}) {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        width: "100%",
        height: "70vh",
        minHeight: 480,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={image}
        alt={alt}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />

      {/* Uniform scrim so the centered text stays legible regardless of what
          is behind it — the photo differs per page, so a directional
          gradient tuned to one image would not carry to the others.

          `scrim` defaults to 0.45, which is what every page rendered before
          this prop existed, so callers that omit it are unchanged. It exists
          because the right value depends on how light the photo is behind the
          controls, and that is per-page. The binding constraint is not the
          headline (>=32px bold, so AA large text at 3:1, which clears even at
          0.25) but the translucent secondary button — 14px/700 is normal text
          at 4.5:1, over a rgba(255,255,255,0.1) fill that lifts the backdrop.
          Measure worst-case (lightest) backdrop pixels before lowering it. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(0,0,0,${scrim})`,
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          padding: "0 clamp(24px, 6vw, 80px)",
          maxWidth: 900,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: prefersReduced() ? "none" : `opacity 0.8s ${EASE}, transform 0.8s ${EASE}`,
        }}
      >
        <h2
          style={{
            fontSize: "clamp(32px, 4vw, 56px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "#FFFFFF",
            hyphens: "none",
            marginBottom: 0,
            lineHeight: 1.05,
          }}
        >
          {title}
        </h2>

        {children && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 32 }}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
