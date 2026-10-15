/**
 * src/components/marketing/FeatureRow.jsx
 *
 * THE QUICK START WIZARD'S ROW, AS ONE COMPONENT (owner ruling 2026-10-16).
 * The Replies and Seating sections on /features are built exactly like the
 * wizard: a full-bleed photograph on one half, a solid black or white panel on
 * the other, the shared FeatureSectionHeading (its red rule above the
 * headline, its sizes) and the wizard's body type. Nothing floats over the
 * photograph: no cards, tables, chips or overlays. The wizard itself renders
 * through this too, so the three can never drift apart.
 *
 * On a phone the photograph comes first at 3:2, as the wizard's always has.
 * The row reveals on scroll the way the wizard did, and not at all under
 * reduced motion.
 */
import React, { useEffect, useRef, useState } from "react";
import FeatureSectionHeading, { featureBodyTextStyle } from "@/components/home/FeatureSectionHeading";
import PlanBadge from "@/components/shared/PlanBadge";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const GROUNDS = {
  black: { background: "#0A0A0A", heading: "#FFFFFF", body: "rgba(255,255,255,0.4)" },
  white: { background: "#FFFFFF", heading: "#0A0A0A", body: "#444444" },
};

/**
 * @param {{ name: string, ground: 'black'|'white', photo: 'left'|'right',
 *   src: string, srcSet?: string, alt: string, heading: string, body: string,
 *   ultra?: boolean, tint?: string }} props
 *   `ultra` sets the product's Ultra badge beside the headline, for a feature
 *   the plan gating in code holds to Ultra. `tint` is the wizard's own wash
 *   over its photograph, and only the wizard passes it.
 */
export default function FeatureRow({ name, ground, photo, src, srcSet, alt, heading, body, ultra = false, tint }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());
  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(([e]) => { setVisible(e.isIntersecting); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const g = GROUNDS[ground];
  const photoFirst = photo === "left";

  return (
    /* Direction is owned by the flex-col / lg:flex-row classes below. An
       inline flexDirection: "row" used to override them, so these columns
       stayed side by side under lg and the text ran off screen. */
    <section ref={ref} data-feature-row={name} style={{ background: g.background, minHeight: "100vh", display: "flex", overflow: "hidden" }} className="flex-col lg:flex-row">
      <div className={`w-full lg:w-1/2 order-1 ${photoFirst ? "" : "lg:order-2"}`} style={{ position: "relative", minHeight: 320, overflow: "hidden", flexShrink: 0 }}>
        <img src={src} srcSet={srcSet} sizes="(min-width: 1024px) 50vw, 100vw" alt={alt} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : `translateX(${photoFirst ? -100 : 100}px)`, transition: `opacity 0.9s ${EASE}, transform 1s ${EASE}` }} />
        {tint ? <div style={{ position: "absolute", inset: 0, background: tint, mixBlendMode: "multiply", pointerEvents: "none" }} /> : null}
        <div className="lg:hidden" style={{ paddingBottom: "66.66%", position: "relative" }} />
      </div>
      <div className={`w-full lg:w-1/2 order-2 ${photoFirst ? "" : "lg:order-1"} flex items-center`} style={{ padding: "80px clamp(32px, 5vw, 64px)", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(40px)", transition: `opacity 0.9s ${EASE} 0.2s, transform 0.9s ${EASE} 0.2s` }}>
        <div style={{ maxWidth: 552 }}>
          <FeatureSectionHeading color={g.heading}>
            {heading}
            {ultra ? <span data-ultra-badge style={{ display: "inline-flex", verticalAlign: "middle", marginLeft: 14, position: "relative", top: -4 }}><PlanBadge plan="ultra" padding="4px 9px" fontSize={13} /></span> : null}
          </FeatureSectionHeading>
          <p style={{ ...featureBodyTextStyle, color: g.body }}>{body}</p>
        </div>
      </div>
    </section>
  );
}
