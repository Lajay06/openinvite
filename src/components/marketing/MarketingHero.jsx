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
import { EXPERIMENT_NO_OVERLAY } from "@/experimentNoOverlay";

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
  overlay = true,
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
      {overlay && !copyBand && !EXPERIMENT_NO_OVERLAY && (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)", zIndex: 2 }} />
      )}
      {/* Band scrim. Measured against the /tour pool photo, whose lightest
          pixel behind the copy is (254,254,255) — the white swan float and
          blown-out water sit directly under the headline, so there is no room
          to lighten the full-height gradient. Contrast for white 64px/36px
          bold copy (large text, AA 3:1), band alpha vs measured ratio:
            0.40  2.87:1  fails
            0.42  3.06:1  passes with no margin
            0.45  3.37:1  passes  <- used
            0.50  4.00:1  passes
          The full-height gradient it replaces measured 3.15:1, so 0.45 is
          BETTER for legibility while leaving the rest of the photo unscrimmed.
          Do not lighten below 0.42 without re-measuring. */}
      {copyBand && !EXPERIMENT_NO_OVERLAY && (
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
