import React, { useRef, useEffect, useState } from "react";
import ApplePillButton from "@/components/motion/ApplePillButton";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import HeroCollage from "@/components/home/HeroCollage";
import ValuePropSection from "@/components/home/ValuePropSection";
import FeatureInvitations from "@/components/home/FeatureInvitations";
import HorizontalScrollSection from "@/components/home/HorizontalScrollSection";
import PriceHonestySection from "@/components/home/PriceHonestySection";

import LightSectionReveal from "@/components/home/LightSectionReveal";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import AvaSpotlightSection from "@/components/home/AvaSpotlightSection";
import FullBleedPhotoCTA from "@/components/home/FullBleedPhotoCTA";

export default function Home() {
  const handleCTA = () => {
    window.location.href = '/signup';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans" style={{ scrollBehavior: "smooth" }}>
      <PublicNav />
      <ScrollProgress />

      {/* 1. HERO */}
      <div id="section-hero">
        <HeroCollage onCTA={handleCTA} />
      </div>

      {/* 2. RED SILHOUETTE — full-width natural-height image */}
      <ValuePropSection />

      {/* 3. "So, why us?" — the honest price comparison */}
      <PriceHonestySection />

      {/* 4. HORIZONTAL SCROLL */}
      <div id="section-features" style={{ background: "#0A0A0A" }}>
        <HorizontalScrollSection />
      </div>

      {/* 5. LIGHT SECTION CURTAIN REVEAL — wipes from black to white, then
          reveals the feature blocks. Previously rendered with no children
          (a separate plain white div held FeatureInvitations right after it),
          so the curtain wipe had nothing to reveal and collapsed to a bare
          sliver between the black scroll section and the white blocks below
          — the "dead gap". Fixed by making it the actual wrapper. */}
      <LightSectionReveal>
        <div style={{ background: "#FFFFFF" }}>
          <div id="section-invitations"><FeatureInvitations onCTA={handleCTA} /></div>
        </div>
      </LightSectionReveal>

      {/* 6. HOW IT WORKS */}
      <HowItWorksSection />

      {/* 7. AVA GRADIENT BANNER + SPOTLIGHT */}
      <div className="min-h-[140px] md:min-h-[180px]" style={{
        background: "linear-gradient(to right, #DDF762, #F0A050, #D4896A, #C99BBF, #9B59CC)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
      }}>
        <span style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em", fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: "center" }}>
          AI meets I Do. Say hello to Ava.
        </span>
      </div>
      <AvaSpotlightSection />

      {/* 8. PRICING */}
      <div id="section-pricing">
        <PricingSection onCTA={handleCTA} />
      </div>

      {/* 9. FULL BLEED PHOTO CTA */}
      <FullBleedPhotoCTA onCTA={handleCTA} />

      {/* 10. FOOTER */}
      <PublicFooter />
    </div>);

}

// ── See Pricing ghost button ─────────────────────────────────────
function SeePricingButton() {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => { window.location.href = '/Pricing'; }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        padding: "12px 24px", borderRadius: 999,
        border: "1px solid #FFFFFF",
        background: hovered ? "#FFFFFF" : "transparent",
        color: hovered ? "#0A0A0A" : "#FFFFFF",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: "clamp(13px, 1.2vw, 15px)", fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.2s ease, color 0.2s ease",
      }}
    >
      See pricing
    </button>
  );
}

// ── Pricing ───────────────────────────────────────────────────────

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function PricingSection({ onCTA }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [spring, setSpring] = useState(false);
  const reduced = prefersReduced();

  useEffect(() => {
    if (reduced) { setVisible(true); setSpring(true); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (visible && !spring) setTimeout(() => setSpring(true), 80);
  }, [visible]);

  return (
    <section ref={ref} style={{ background: "#0A0A0A", padding: "clamp(80px, 10vw, 160px)" }}>
      <div style={{ opacity: visible ? 1 : 0, transition: reduced ? "none" : `opacity 0.6s ${EASE}`, display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0 12px" }}>
        <span style={{ fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05, color: "#FFFFFF", whiteSpace: "nowrap" }}>
          Go all in:{" "}
        </span>
        <span style={{
          fontSize: "clamp(40px, 5vw, 64px)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          color: "#DDF762",
          display: "inline-block",
          transform: reduced ? "scale(1)" : spring ? "scale(1)" : visible ? "scale(1.2)" : "scale(0)",
          transition: reduced ? "none" : spring ? `transform 0.5s ${EASE}` : `transform 0.4s ease`,
        }}>
          $79
        </span>
      </div>
      <p style={{
        maxWidth: 480,
        marginTop: "1.5rem",
        marginBottom: "2.5rem",
        color: "#FFFFFF",
        fontSize: 18,
        lineHeight: 1.6,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: reduced ? "none" : `opacity 0.7s ${EASE} 0.1s, transform 0.7s ${EASE} 0.1s`,
      }}>
        Unlock the full experience. One-time payment, lifetime access. Everything you need. Nothing you don't.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)", transition: reduced ? "none" : `opacity 0.6s ${EASE} 0.1s, transform 0.6s ${EASE} 0.1s` }}>
        <ApplePillButton onClick={onCTA}>Get started</ApplePillButton>
        <SeePricingButton />
      </div>
    </section>
  );
}