/**
 * MarketingHero — the one hero every marketing page (except Home, which has
 * its own distinct collage treatment) must render through. Features.jsx is
 * the reference standard this was extracted from: full-viewport photo,
 * bottom-heavy dark gradient, one centred statement, no subtext. Built to
 * stop the hero drift that kept recurring page by page (see
 * scripts/test-marketing-hero-consistency.mjs, the structural guard that
 * fails if a required marketing page renders a hero without importing this).
 */
import React from "react";
import ScrollCue from "@/components/motion/ScrollCue";
import ApplePillButton from "@/components/motion/ApplePillButton";

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function MarketingHero({
  image,
  imagePosition = "center",
  title,
  cta,
  showScrollCue = true,
  maxWidth = 800,
}) {
  return (
    <section style={{ position: "relative", height: "100vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img
        src={image}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: imagePosition, zIndex: 1 }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)", zIndex: 2 }} />
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth, margin: "0 auto", padding: "0 40px" }}>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#FFFFFF", fontFamily: PJS, margin: cta ? "0 0 24px" : 0 }}>
          {title}
        </h1>
        {cta && <ApplePillButton href={cta.href} light={false}>{cta.label}</ApplePillButton>}
      </div>
      {showScrollCue && <ScrollCue />}
    </section>
  );
}
