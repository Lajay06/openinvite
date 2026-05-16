import React, { useRef, useEffect, useState } from "react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import ApplePillButton from "@/components/motion/ApplePillButton";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import AnimDivider from "@/components/motion/AnimDivider";
import StickyReveal from "@/components/motion/StickyReveal";
import HeroCollage from "@/components/home/HeroCollage";
import ValuePropSection from "@/components/home/ValuePropSection";
import FeatureTimeline from "@/components/home/FeatureTimeline";
import FeaturePlaylists from "@/components/home/FeaturePlaylists";
import FeatureGuests from "@/components/home/FeatureGuests";
import FeatureBudget from "@/components/home/FeatureBudget";
import FeatureInvitations from "@/components/home/FeatureInvitations";
import HorizontalScrollSection from "@/components/home/HorizontalScrollSection";
import ScrollMorphSection from "@/components/home/ScrollMorphSection";

import LightSectionReveal from "@/components/home/LightSectionReveal";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import AvaSpotlightSection from "@/components/home/AvaSpotlightSection";
import FullBleedPhotoCTA from "@/components/home/FullBleedPhotoCTA";

export default function Home() {
  const handleCTA = () => {
    base44.auth.redirectToLogin(window.location.origin + createPageUrl("Dashboard"));
  };

  const SECTION_LABELS = [
  { id: "section-hero", label: "OVERVIEW" },
  { id: "section-features", label: "FEATURES" },
  { id: "section-timeline", label: "TIMELINE" },
  { id: "section-music", label: "MUSIC" },
  { id: "section-guests", label: "GUESTS" },
  { id: "section-budget", label: "BUDGET" },
  { id: "section-invitations", label: "INVITATIONS" },
  { id: "section-pricing", label: "PRICING" }];


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

      {/* 3. SCROLL MORPH — "So, why us?" */}
      <ScrollMorphSection />

      {/* 4. HORIZONTAL SCROLL */}
      <div id="section-features" style={{ background: "#0A0A0A" }}>
        <HorizontalScrollSection />
      </div>

      {/* 5. LIGHT SECTION CURTAIN REVEAL — transitions to white */}
      <LightSectionReveal />

      {/* 5. FEATURE BLOCKS — all on white */}
      <div style={{ background: "#FFFFFF" }}>
        <div id="section-timeline"><FeatureTimeline /></div>
        <div id="section-music"><FeaturePlaylists /></div>
        <div id="section-guests"><FeatureGuests /></div>
        <div id="section-budget"><FeatureBudget /></div>
        <div id="section-invitations"><FeatureInvitations onCTA={handleCTA} /></div>
      </div>

      {/* 6. HOW IT WORKS */}
      <HowItWorksSection />

      {/* 7. TESTIMONIALS */}
      <TestimonialsSection />

      {/* 8. AVA AI SPOTLIGHT */}
      <AvaSpotlightSection />

      {/* 9. FULL BLEED PHOTO CTA */}
      <FullBleedPhotoCTA onCTA={handleCTA} />

      {/* 10. INTEGRATIONS */}
      <IntegrationsGrid />

      {/* 11. PRICING */}
      <div id="section-pricing">
        <PricingSection onCTA={handleCTA} />
      </div>

      {/* 12. FOOTER */}
      <PublicFooter />
    </div>);

}

// ── Integrations ─────────────────────────────────────────────────

function IntegrationsGrid() {
  const logos = [
  { name: "Google", src: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png", height: 20 },
  { name: "Spotify", src: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/168px-Spotify_logo_without_text.svg.png", height: 28 },
  { name: "Pinterest", src: "https://upload.wikimedia.org/wikipedia/commons/0/08/Pinterest-logo.png", height: 28 },
  { name: "Booking.com", src: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Booking.com_logo.svg/320px-Booking.com_logo.svg.png", height: 22 },
  { name: "Stripe", src: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/320px-Stripe_Logo%2C_revised_2016.svg.png", height: 20 },
  { name: "Airbnb", src: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Airbnb_Logo_B%C3%A9lo.svg/320px-Airbnb_Logo_B%C3%A9lo.svg.png", height: 22 }];


  return (
    <section style={{ borderTop: "1px solid #F0F0F0", borderBottom: "1px solid #F0F0F0", background: "#FFFFFF", padding: "120px clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: "100%", margin: "0 auto" }}>
        <div style={{ marginBottom: 64 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(10,10,10,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Integrations</p>
          <h2 style={{ fontSize: 32, fontWeight: 700, color: "#0A0A0A", margin: "0 0 8px 0" }} className="text-center">
            Works with the tools you already love.
          </h2>
          <p style={{ fontSize: 16, color: "#444444", margin: 0, fontWeight: 400, lineHeight: 1.7 }} className="text-center">
            Openinvite connects seamlessly with the platforms you use every day.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 0 }}>
          {logos.map((logo) =>
          <div
            key={logo.name}
            style={{
              background: "#FFFFFF",
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              border: "1px solid #F0F0F0",
              cursor: "default",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease"
            }}
            onMouseEnter={(e) => {e.currentTarget.style.borderColor = "#E0E0DC";e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";}}
            onMouseLeave={(e) => {e.currentTarget.style.borderColor = "#F0F0F0";e.currentTarget.style.boxShadow = "none";}}>
            
              <img
              src={logo.src}
              alt={logo.name}
              style={{ height: `${logo.height}px`, width: "auto", filter: "grayscale(100%) opacity(0.5)", transition: "filter 0.2s ease" }}
              onMouseEnter={(e) => e.currentTarget.style.filter = "grayscale(0%) opacity(1)"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "grayscale(100%) opacity(0.5)"} />
            
              <p
               style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#444444", margin: 0, textAlign: "center", transition: "color 0.2s ease", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
               onMouseEnter={(e) => e.currentTarget.style.color = "#0A0A0A"}
               onMouseLeave={(e) => e.currentTarget.style.color = "#444444"}>
              
                {logo.name}
              </p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(6"] {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      `}</style>
    </section>);

}

// ── Pricing ───────────────────────────────────────────────────────

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function PricingSection({ onCTA }) {
  return (
    <StickyReveal bg="#0A1930">
      {({ headlineIn, subIn, ctaIn }) =>
      <PricingInner headlineIn={headlineIn} subIn={subIn} ctaIn={ctaIn} onCTA={onCTA} />
      }
    </StickyReveal>);

}

function PricingInner({ headlineIn, subIn, ctaIn, onCTA }) {
  const [spring, setSpring] = useState(false);
  useEffect(() => {
    if (headlineIn && !spring) setTimeout(() => setSpring(true), 80);
  }, [headlineIn]);

  const reduced = prefersReduced();

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-12 w-full" style={{ background: "#0A0A0A" }}>
      <AnimDivider />
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 16, marginTop: 32, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>One-time Payment</p>
      <div style={{ opacity: headlineIn ? 1 : 0, transition: reduced ? "none" : `opacity 0.6s ${EASE}`, display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0 12px" }}>
        <span style={{ fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05, color: "#FFFFFF", overflow: "visible", whiteSpace: "nowrap" }}>
          Go All In –{" "}
        </span>
        <span
          style={{
            fontSize: "clamp(40px, 5vw, 64px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: "#DDF762",
            display: "inline-block",
            transform: reduced ? "scale(1)" : spring ? "scale(1)" : headlineIn ? "scale(1.2)" : "scale(0)",
            transition: reduced ? "none" : spring ? `transform 0.5s ${EASE}` : `transform 0.4s ease`,
            overflow: "visible"
          }}>
          
          $99
        </span>
      </div>
      <p
        className="text-lg leading-relaxed"
        style={{
          maxWidth: 480,
          marginTop: "1.5rem",
          marginBottom: "2.5rem",
          color: "#FFFFFF",
          opacity: subIn ? 1 : 0,
          transform: subIn ? "translateY(0)" : "translateY(20px)",
          transition: reduced ? "none" : `opacity 0.7s ${EASE} 0.1s, transform 0.7s ${EASE} 0.1s`
        }}>

        Unlock the full experience. One-time payment, lifetime access. Everything you need. Nothing you don't.
      </p>
      <div style={{ opacity: ctaIn ? 1 : 0, transform: ctaIn ? "translateY(0)" : "translateY(16px)", transition: reduced ? "none" : `opacity 0.6s ${EASE} 0.1s, transform 0.6s ${EASE} 0.1s` }}>
        <ApplePillButton onClick={onCTA}>Get started</ApplePillButton>
      </div>
    </div>);

}