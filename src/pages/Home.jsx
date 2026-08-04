import React, { useRef, useEffect, useState } from "react";
import ApplePillButton from "@/components/motion/ApplePillButton";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import HeroCollage from "@/components/home/HeroCollage";
import ValuePropSection from "@/components/home/ValuePropSection";
import HorizontalScrollSection from "@/components/home/HorizontalScrollSection";
import UniverseMiniHero from "@/components/home/UniverseMiniHero";
import UniverseTeaserSection from "@/components/home/UniverseTeaserSection";
import AvaSpotlightSection from "@/components/home/AvaSpotlightSection";
import FullBleedPhotoCTA from "@/components/home/FullBleedPhotoCTA";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";
import { useOrganizationStructuredData } from "@/hooks/useOrganizationStructuredData";

export default function Home() {
  useMarketingSeo();
  useOrganizationStructuredData();

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

      {/* 4. HORIZONTAL SCROLL */}
      <div id="section-features" style={{ background: "#0A0A0A" }}>
        <HorizontalScrollSection />
      </div>

      {/* 4b. UNIVERSES MINI-HERO — a full-bleed photo moment (round-4-
          followups: rebuilt from a plain typographic beat) that signals
          universes are a big deal before expanding into the actual teaser
          content right below it. */}
      <UniverseMiniHero />

      {/* 4c. UNIVERSES TEASER — universes had no presence on the homepage
          at all after the carousel's Universes card and the old
          Invitations/guest-suite section were both removed. High level
          only (5 real photos, not the full 20-universe grid — that's the
          Universes page's job), dark and minimal to match the rest of the
          homepage, with a clear CTA through to /universes. */}
      <UniverseTeaserSection />

      {/* 5. AVA GRADIENT BANNER + SPOTLIGHT — the black carousel now runs
          straight into the gradient banner. The "Invitations & guest suite"
          moment and the "Three steps" how-it-works block that used to sit
          here are both gone: invitations/guest-suite now lives exclusively
          on the Universes page (which gets the full treatment), and
          "Three steps" was generic filler with nothing distinctive to say.
          Removing them also killed the actual root cause of the "random
          black dead space" complaint — this page was stacking five
          consecutive scroll-jacked/sticky sections back to back (this
          video moment, the price-honesty reveal, the carousel, then two
          more inside the now-deleted Invitations section), and each one's
          release/re-engage handoff briefly showed a static, empty black
          frame. Fewer sticky sections, no dead handoffs. */}
      {/* Reverted to the original pre-AUDIT_2026-07.md-S16 gradient and
          plain white text (no outline, no deepened stops) — the lower
          contrast on this one decorative banner is an accepted tradeoff,
          confirmed against git history (f2a0914^) rather than approximated. */}
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
        <PricingSection />
      </div>

      {/* 9. FULL BLEED PHOTO CTA */}
      <FullBleedPhotoCTA onCTA={handleCTA} />

      {/* 10. FOOTER */}
      <PublicFooter />
    </div>);

}

// ── Pricing ───────────────────────────────────────────────────────

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// A plain tier label, not a full pricing table or a clickable card — full
// comparison and the actual CTAs live on /Pricing. Honest about there being
// two tiers instead of implying $49 unlocks everything (Ultra's website
// builder, invitations and guest suite are $99, per Pricing.jsx's own
// PRO_FEATURES/ULTRA_EXTRAS split).
function TierChip({ name, price, blurb, accent }) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        gap: 4, padding: "24px 40px", borderRadius: 999,
        border: "1px solid rgba(10,10,10,0.12)",
        minWidth: 200,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: accent, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {name}
      </span>
      <span style={{ fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {price}
      </span>
      <span style={{ fontSize: 13, color: "rgba(10,10,10,0.6)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {blurb}
      </span>
    </div>
  );
}

function PricingSection() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const reduced = prefersReduced();

  useEffect(() => {
    if (reduced) { setVisible(true); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} style={{ background: "#FFFFFF", padding: "clamp(100px, 12vw, 180px) clamp(24px, 6vw, 80px)", textAlign: "center" }}>
      <h2 style={{
        fontSize: "clamp(40px, 6vw, 76px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05,
        color: "#0A0A0A", margin: "0 0 20px", fontFamily: "'Plus Jakarta Sans', sans-serif",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: reduced ? "none" : `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
      }}>
        From <span style={{ color: "#E03553" }}>US$49</span>.
      </h2>
      <p style={{
        maxWidth: 480, margin: "0 auto 48px", color: "rgba(10,10,10,0.6)", fontSize: 18, lineHeight: 1.6,
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: reduced ? "none" : `opacity 0.7s ${EASE} 0.1s, transform 0.7s ${EASE} 0.1s`,
      }}>
        Two plans, no subscriptions, ever. Pick the one that fits.
      </p>
      <div style={{
        display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", marginBottom: 48,
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: reduced ? "none" : `opacity 0.7s ${EASE} 0.15s, transform 0.7s ${EASE} 0.15s`,
      }}>
        <TierChip name="Pro" price="US$49" blurb="Planning, guests, budget, Ava" accent="#E03553" />
        <TierChip name="Ultra" price="US$99" blurb="Everything, plus universes & digital invitations" accent="#F59E0B" />
      </div>
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "center",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: reduced ? "none" : `opacity 0.6s ${EASE} 0.2s, transform 0.6s ${EASE} 0.2s`,
      }}>
        <ApplePillButton href="/pricing">Compare plans</ApplePillButton>
      </div>
    </section>
  );
}