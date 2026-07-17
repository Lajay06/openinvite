import React, { useRef, useEffect, useState } from "react";
import ApplePillButton from "@/components/motion/ApplePillButton";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import HeroCollage from "@/components/home/HeroCollage";
import ValuePropSection from "@/components/home/ValuePropSection";
import HorizontalScrollSection from "@/components/home/HorizontalScrollSection";
import WhyUsSection from "@/components/home/WhyUsSection";
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