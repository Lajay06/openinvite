/**
 * Section 1 — Hero.
 *
 * Build notes: photography forward, flush left. No duration claim and no price
 * here; the window belongs to section 6. The secondary CTA scrolls to section 2
 * rather than opening anything.
 */
import React from "react";
import { responsivePhoto } from "@/lib/marketingImage";
import { PJS, MUTED_ON_DARK, MEASURE_WIDE } from "./_shared";

// Chosen by looking, not by resolution, and constrained by what the library
// actually has. The two true print masters (the only assets that reach 1.0x at
// dpr 2) are a poolside inflatable-swan shot -- wrong tone under a promise
// about calm daily clarity -- and the Pricing hero, which section 6 links
// straight to; the same photograph one click apart is worse than a soft one.
// Every FREE couple frame in the library is portrait (SILVER_HOUR 1280x1919,
// BY_WATER 1600x2400, Tradition 1600x2375) and crops to a head-cutting band in
// a full-bleed landscape hero. This is the strongest landscape frame available
// and it is on-message for a planning product: a couple planning together.
// KNOWN CO-USE: also on Ava.jsx. FOLLOW-UP: a dedicated hero master, exported
// for print, is the real fix -- see IMAGE_MANIFEST.md, where the Pricing hero
// is the worked example of lifting a 1280 export to 1.0x.
const HERO = responsivePhoto("DTS_Grand_Design_Daniel_Far%C3%B2_Photos_ID4152_auimyj", 1280);

export default function HeroSection({ onStart, onSeeHow }) {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100svh",
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
        background: "#140A0C",
      }}
    >
      <img
        src={HERO.src}
        srcSet={HERO.srcSet}
        sizes="100vw"
        alt="A couple planning together at a wall of color swatches"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* Bottom-weighted so the headline sits on ink while the top of the frame
          stays photographic. Text is flush left and bottom-anchored, so a
          uniform scrim would dim the picture for no reading benefit. */}
      <div
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to top, rgba(10,10,10,0.86) 0%, rgba(10,10,10,0.62) 34%, rgba(10,10,10,0.12) 66%, rgba(10,10,10,0) 100%)",
        }}
      />
      <div
        style={{
          position: "relative", zIndex: 2, width: "100%",
          maxWidth: MEASURE_WIDE,
          padding: "0 clamp(24px, 6vw, 96px) clamp(72px, 9vw, 128px)",
        }}
      >
        <h1
          style={{
            fontFamily: PJS,
            fontSize: "clamp(38px, 5.4vw, 76px)",
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.04,
            color: "#FFFFFF",
            margin: "0 0 clamp(20px, 2.2vw, 30px)",
          }}
        >
          Every morning, one page tells you where you stand.
        </h1>
        <p
          style={{
            fontFamily: PJS,
            fontSize: "clamp(17px, 1.5vw, 21px)",
            lineHeight: 1.55,
            color: MUTED_ON_DARK,
            maxWidth: 680,
            margin: "0 0 clamp(28px, 3vw, 40px)",
          }}
        >
          Openinvite holds the guest list, the budget, the seating, the vendors and
          the schedule, then answers the only question that matters: what needs you today.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button onClick={onStart} className="btn-primary" style={{ padding: "14px 34px", fontSize: 14 }}>
            Start planning
          </button>
          <button
            onClick={onSeeHow}
            style={{
              padding: "14px 34px", fontSize: 14, fontWeight: 600, fontFamily: PJS,
              color: "#FFFFFF", background: "transparent",
              border: "1px solid rgba(255,255,255,0.4)", borderRadius: 999,
              cursor: "pointer", transition: "border-color 0.2s ease, background 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            See how it works
          </button>
        </div>
      </div>
    </section>
  );
}
