/**
 * MarketingHero — the one hero every marketing page (except Home, which has
 * its own distinct collage treatment) must render through. Features.jsx is
 * the reference standard this was extracted from: full-viewport photo,
 * bottom-heavy dark gradient, one centered statement, no subtext. Built to
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
  // Optional responsive delivery. Pass both, or neither.
  srcSet,
  sizes = "(max-aspect-ratio: 4/3) 134vh, 100vw",
  imagePosition = "center",
  title,
  cta,
  showScrollCue = true,
  maxWidth = 800,
  // STANDING RULE (owner, 2026-08-09): marketing hero photos carry NO overlay
  // by default. This supersedes the previous measured-scrim default for heroes
  // and end caps. Pass a number (0-1) to opt a single page back in; the
  // measured-scrim METHOD still applies wherever a scrim IS specified, and to
  // every other text-over-photo block.
  overlay = 0,
  // Opt-in alternative to `overlay`. Scrims a soft horizontal band behind the
  // copy instead of dimming the whole photo, for a bright picture where the
  // full-height gradient wastes the image. Default off: every existing
  // consumer keeps the gradient and renders byte-identically.
  copyBand = false,
  // "left" pins the headline to the left edge instead of centring it —
  // for a hero photo whose subject sits on the right, so a wide centered
  // headline never crosses their face (PR G1).
  align = "center",
}) {
  const isLeft = align === "left";
  return (
    <section style={{ position: "relative", height: "100vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: isLeft ? "flex-start" : "center" }}>
      {/* srcSet/sizes are optional. Consumers that omit them render exactly as
          before — the attributes are simply absent. Note the correct `sizes`
          for this hero is NOT 100vw: the box is 100vw x 100vh with object-fit
          cover, so on a portrait viewport the crop is height-driven and the
          browser needs roughly 133vh of image width, not 100vw. A 390x844
          phone needs ~1125px, not 390px. */}
      <img
        src={image}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: imagePosition, zIndex: 1 }}
      />
      {overlay > 0 && !copyBand && (
        <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${overlay})`, zIndex: 2 }} />
      )}
      {copyBand && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0) 18%, rgba(0,0,0,0.45) 36%, rgba(0,0,0,0.45) 64%, rgba(0,0,0,0) 82%)",
          }}
        />
      )}
      <div style={{
        position: "relative", zIndex: 10, textAlign: isLeft ? "left" : "center", maxWidth,
        margin: isLeft ? "0" : "0 auto", padding: isLeft ? "0 clamp(24px, 6vw, 80px)" : "0 40px",
      }}>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#FFFFFF", fontFamily: PJS, margin: cta ? "0 0 24px" : 0 }}>
          {title}
        </h1>
        {cta && <ApplePillButton href={cta.href} light={false}>{cta.label}</ApplePillButton>}
      </div>
      {showScrollCue && <ScrollCue />}
    </section>
  );
}
