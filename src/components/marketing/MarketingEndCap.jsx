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
 * fixed cta prop — those buttons carry real signup/billing behavior and
 * analytics that must not be reduced to a link.
 */
import React, { useRef, useState, useEffect } from "react";
import ApplePillButton from "@/components/motion/ApplePillButton";
import { ENDCAP_SIZES } from "@/lib/marketingImage";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function MarketingEndCap({
  image,
  // Responsive delivery. Optional so nothing breaks if a caller omits it, but
  // every caller in the repo passes it — end caps had NO srcSet at all until
  // this was added, which is why all six shipped one fixed file and measured
  // 0.34-0.42x of the device pixels their box needs at dpr 2. Build both with
  // responsivePhoto() in src/lib/marketingImage.js rather than by hand.
  srcSet,
  sizes = ENDCAP_SIZES,
  alt = "",
  title = "Your wedding deserves this.",
  // STANDING RULE (owner, 2026-08-09): end-cap photos carry NO scrim by
  // default. The measured values below are kept as records of the method, not
  // as the default.
  scrim = 0,
  // Optional {label, href}. Rendered into the same actions row as `children`,
  // using the same ApplePillButton the marketing heroes use, so the end-cap
  // CTA and the hero CTA are the one button. Pricing passes `children` and no
  // `cta`; Home/Features/Ava pass `cta` and no children. Nothing passes both,
  // but the row handles it if something ever does.
  cta,
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
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
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
          // 900 -> 1320 so every end-cap heading sits on ONE line at desktop.
          // At 900 the content box was only 740px wide (900 minus 2x80 of
          // padding), which wrapped Features and Ava to two lines. Measured
          // single-line widths at the shared 56px:
          //   Your wedding deserves this.                  720
          //   Generic was never your style.                748
          //   Consider wedding planning, upgraded.        1006
          //   Turns out, you can have it all figured out. 1007
          //   Your wedding deserves better. So, shall we? 1126  <- widest
          // 1126 + 160 padding = 1286 minimum; 1320 leaves 34px of slack.
          // Widening the container is the lever rather than shrinking the
          // type, so the shared clamp(32px, 4vw, 56px) is untouched. Below
          // 1400 the 4vw term shrinks the type faster than the container
          // narrows, so single-line holds down the desktop range; below the
          // md breakpoint headings wrap, which is intended.
          maxWidth: 1320,
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

        {(cta || children) && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 32 }}>
            {cta && <ApplePillButton href={cta.href} light={false}>{cta.label}</ApplePillButton>}
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
