import React, { useRef, useEffect, useState } from "react";
import ApplePillButton from "@/components/motion/ApplePillButton";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import HeroCollage from "@/components/home/HeroCollage";
import ValuePropSection from "@/components/home/ValuePropSection";
import HorizontalScrollSection from "@/components/home/HorizontalScrollSection";
import WhyUsSection from "@/components/home/WhyUsSection";
import UniverseTeaserSection from "@/components/home/UniverseTeaserSection";
import AvaSpotlightSection from "@/components/home/AvaSpotlightSection";
import FullBleedPhotoCTA from "@/components/home/FullBleedPhotoCTA";
import ScrollExpandMedia from "@/components/shared/ScrollExpandMedia";

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

      {/* 2b. SCROLL-EXPAND PRODUCT MOMENT — the one real screen recording
          that earns the scroll-expansion treatment: choosing a universe,
          expanding from a small floating frame to full-bleed as the page
          scrolls. Placed after the red hero, not competing with it. */}
      <ScrollExpandMedia
        mediaType="video"
        mediaSrc="https://res.cloudinary.com/dsr84xknv/video/upload/product-shots/flow-01-choosing-a-universe.mp4"
        webmSrc="https://res.cloudinary.com/dsr84xknv/video/upload/product-shots/flow-01-choosing-a-universe.webm"
        posterSrc="https://res.cloudinary.com/dsr84xknv/image/upload/product-shots/flow-01-choosing-a-universe-poster.jpg"
        bgImageSrc="/universes/kyoto.jpg"
        title="Choose your universe"
        scrollToExpand="Scroll to explore"
      />

      {/* 3. "So, why us?" — three emotional moments, not a feature list */}
      <WhyUsSection />

      {/* 4. HORIZONTAL SCROLL */}
      <div id="section-features" style={{ background: "#0A0A0A" }}>
        <HorizontalScrollSection />
      </div>

      {/* 4b. UNIVERSES TEASER — universes had no presence on the homepage
          at all after the carousel's Universes card and the old
          Invitations/guest-suite section were both removed. High level
          only (4 real photos, not the full 20-universe grid — that's the
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

// ── Pricing ───────────────────────────────────────────────────────

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// A tier chip, not a full pricing table — full comparison lives on /Pricing.
// Honest about there being two tiers instead of implying $79 unlocks
// everything (Ultra's website builder, invitations and guest suite are
// $149, per Pricing.jsx's own PRO_FEATURES/ULTRA_EXTRAS split).
function TierChip({ name, price, blurb, accent }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="/Pricing"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        gap: 4, padding: "24px 40px", borderRadius: 999,
        border: `1px solid ${hovered ? accent : "rgba(255,255,255,0.15)"}`,
        textDecoration: "none",
        transition: "border-color 0.2s ease, transform 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "none",
        minWidth: 200,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: accent, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {name}
      </span>
      <span style={{ fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.02em", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {price}
      </span>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {blurb}
      </span>
    </a>
  );
}

function PricingSection({ onCTA }) {
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
    <section ref={ref} style={{ background: "#0A0A0A", padding: "clamp(100px, 12vw, 180px) clamp(24px, 6vw, 80px)", textAlign: "center" }}>
      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#DDF762",
        fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24,
        opacity: visible ? 1 : 0, transition: reduced ? "none" : `opacity 0.6s ${EASE}`,
      }}>
        One-time. Lifetime access.
      </p>
      <h2 style={{
        fontSize: "clamp(40px, 6vw, 76px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05,
        color: "#FFFFFF", margin: "0 0 20px", fontFamily: "'Plus Jakarta Sans', sans-serif",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: reduced ? "none" : `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
      }}>
        From <span style={{ color: "#DDF762" }}>$79</span>.
      </h2>
      <p style={{
        maxWidth: 480, margin: "0 auto 48px", color: "rgba(255,255,255,0.6)", fontSize: 18, lineHeight: 1.6,
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
        <TierChip name="Pro" price="$79" blurb="Planning, guests, budget, Ava" accent="#E03553" />
        <TierChip name="Ultra" price="$149" blurb="Everything, plus universes & digital invitations" accent="#DDF762" />
      </div>
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "center",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: reduced ? "none" : `opacity 0.6s ${EASE} 0.2s, transform 0.6s ${EASE} 0.2s`,
      }}>
        <ApplePillButton onClick={onCTA}>Get started</ApplePillButton>
      </div>
    </section>
  );
}