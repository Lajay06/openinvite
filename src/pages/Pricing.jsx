import React, { useEffect, useState, useRef } from "react";
import { PHOTOS } from "@/lib/photos";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import MagneticButton from "@/components/motion/MagneticButton";
import { useSpotlight } from "@/hooks/useSpotlight";
import ApplePillButton from "@/components/motion/ApplePillButton";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useScrollReveal(threshold = 0.2) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());
  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

const FREE_FEATURES = [
  "Access to all planning tools",
  "Up to 10 guests",
  "1 invitation design",
  "Basic budget tracking",
  "14-day full access",
];

const PAID_FEATURE_GROUPS = [
  {
    label: "Planning",
    items: ["Unlimited guests", "Unlimited invitation designs", "Advanced budget & vendor tracking", "Smart seating planner"],
  },
  {
    label: "Experience",
    items: ["Collaborative playlists + Spotify", "Photo & memory management", "Registry integration", "AI assistant (Ava)"],
  },
  {
    label: "Access",
    items: ["Collaboration access (partner, planner)", "Guest RSVP website", "All future features included", "Priority support", "No subscriptions. Ever."],
  },
];

const TABLE_ROWS = [
  ["Guest Management", "Up to 10", "Unlimited"],
  ["RSVP Tracking", "✓", "✓"],
  ["Invitation Designs", "1", "Unlimited"],
  ["Budget Tracking", "Basic", "Advanced"],
  ["Vendor Management", "—", "✓"],
  ["Seating Planner", "—", "✓"],
  ["Spotify Playlists", "—", "✓"],
  ["AI Assistant (Ava)", "—", "✓"],
  ["Photo Management", "—", "✓"],
  ["Registry Integration", "—", "✓"],
  ["Collaboration Access", "—", "✓"],
  ["Guest Website", "—", "✓"],
  ["Future Updates", "—", "✓"],
  ["Priority Support", "—", "✓"],
  ["Price", "$0", "$199 once"],
];

const FAQS = [
  {
    q: "Is it really a one-time payment?",
    a: "Yes. Pay once, use Openinvite forever. No subscriptions, no renewals, no surprise charges.",
  },
  {
    q: "What happens after my free trial?",
    a: "After 14 days, you'll be prompted to upgrade to With Compliments to keep full access. Your data is always safe.",
  },
  {
    q: "Can I share access with my partner or planner?",
    a: "Yes — With Compliments includes collaboration access so you can invite your partner, wedding planner, or anyone else to help.",
  },
  {
    q: "Is there a refund policy?",
    a: "We offer a 30-day money-back guarantee. If you're not happy, we'll refund you in full — no questions asked.",
  },
  {
    q: "Will I get future features?",
    a: "Absolutely. With Compliments includes all future features we build, forever.",
  },
  {
    q: "Do I need a credit card for the free trial?",
    a: "No. Start your free trial with just your email — no payment details required.",
  },
];

function Check({ color = "#DDF762" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 8L6.5 11.5L13 4.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #222222" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", textAlign: "left", padding: "24px 0", background: "none", border: "none", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
        }}
      >
        <span style={{ color: "#FFFFFF", fontSize: 16, fontWeight: 500, letterSpacing: "-0.01em" }}>{q}</span>
        <span style={{ color: "#555", fontSize: 20, flexShrink: 0, transform: open ? "rotate(45deg)" : "rotate(0)", transition: "transform 0.2s ease" }}>+</span>
      </button>
      <div style={{
        overflow: "hidden",
        maxHeight: open ? 200 : 0,
        transition: "max-height 0.35s ease",
      }}>
        <p style={{ color: "#888888", fontSize: 14, lineHeight: 1.7, paddingBottom: 24 }}>{a}</p>
      </div>
    </div>
  );
}

export default function Pricing() {
  const [heroPhase, setHeroPhase] = useState(prefersReduced() ? 3 : 0);
  const [freeHovered, setFreeHovered] = useState(false);
  const [paidHovered, setPaidHovered] = useState(false);
  const heroRef = useRef(null);
  useSpotlight(heroRef);

  const handleCTA = () => {
    base44.auth.redirectToLogin(window.location.origin + createPageUrl("Dashboard"));
  };

  useEffect(() => {
    if (prefersReduced()) return;
    const t = [
      setTimeout(() => setHeroPhase(1), 100),
      setTimeout(() => setHeroPhase(2), 400),
      setTimeout(() => setHeroPhase(3), 900),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const [compRef, compVisible] = useScrollReveal(0.15);
  const [tableRef, tableVisible] = useScrollReveal(0.15);
  const [faqRef, faqVisible] = useScrollReveal(0.15);
  const [ctaRef, ctaVisible] = useScrollReveal(0.15);

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <PublicNav />
      <ScrollProgress />

      {/* ── HERO ─────────────────────────────────── */}
      <section ref={heroRef} style={{
        position: "relative",
        minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center",
        backgroundImage: `url(${PHOTOS.photoPricingCTA})`,
        backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed",
        paddingTop: 80, paddingBottom: 80, overflow: "hidden",
      }}>
        {/* Shooting stars */}
        <span className="shooting-star" style={{ top: "10%", right: "20%" }} />
        <span className="shooting-star" style={{ top: "30%", right: "40%" }} />
        <span className="shooting-star" style={{ top: "5%", right: "60%" }} />

        <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,10,0.82)", zIndex: 1 }} />
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px", maxWidth: 700 }}>
          <p style={{
            fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "#DDF762",
            marginBottom: "1.5rem",
            opacity: heroPhase >= 1 ? 1 : 0,
            transition: `opacity 0.6s ${EASE}`,
          }}>
            Pricing
          </p>
          <h1 style={{
            fontSize: "clamp(44px, 6vw, 80px)", fontWeight: 700, letterSpacing: "-0.03em",
            lineHeight: 1.05, color: "#FFFFFF", marginBottom: 24,
            wordBreak: "normal", hyphens: "none",
          }}>
            {"Simple pricing. No surprises.".split(" ").map((word, i) => (
              <span key={i} style={{
                display: "inline-block", marginRight: "0.3em",
                opacity: heroPhase >= 2 ? 1 : 0,
                transform: heroPhase >= 2 ? "translateY(0)" : "translateY(-40px)",
                transition: `opacity 0.6s ${EASE} ${i * 0.07}s, transform 0.7s ${EASE} ${i * 0.07}s`,
              }}>
                {word}
              </span>
            ))}
          </h1>
          <p style={{
            fontSize: 18, color: "#888888", lineHeight: 1.65, maxWidth: 560, margin: "0 auto",
            opacity: heroPhase >= 3 ? 1 : 0,
            transition: `opacity 0.7s ${EASE} 0.2s`,
          }}>
            Everything you need to plan the perfect wedding. One price, forever.
          </p>
        </div>
      </section>

      {/* ── PRICING CARDS ─────────────────────────── */}
      <section style={{ background: "#0A0A0A", padding: "120px 24px" }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 24, alignItems: "center",
        }}>
          {/* FREE CARD */}
          <div
            onMouseEnter={() => setFreeHovered(true)}
            onMouseLeave={() => setFreeHovered(false)}
            style={{
              background: "#111111", border: "1px solid #222222",
              borderRadius: 0, padding: "48px 40px",
              transform: freeHovered ? "translateY(-4px)" : "translateY(0)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              boxShadow: freeHovered ? "0 16px 48px rgba(0,0,0,0.5)" : "none",
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888", marginBottom: 24 }}>
              Free Trial
            </p>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 56, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.03em" }}>$0</span>
            </div>
            <p style={{ fontSize: 13, color: "#888888", marginBottom: 32 }}>No credit card required</p>
            <div style={{ height: 1, background: "#222222", marginBottom: 32 }} />
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 40px", display: "flex", flexDirection: "column", gap: 14 }}>
              {FREE_FEATURES.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "#CCCCCC" }}>
                  <Check />
                  {f}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ApplePillButton onClick={handleCTA}>Start for free +</ApplePillButton>
            </div>
            <p style={{ fontSize: 12, color: "#555555", textAlign: "center", marginTop: 16 }}>
              No commitment. Cancel anytime.
            </p>
          </div>

          {/* PAID CARD */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
          className="with-compliments-card"
          onMouseEnter={() => setPaidHovered(true)}
          onMouseLeave={() => setPaidHovered(false)}
          style={{
            background: "linear-gradient(160deg, #1a0a0e 0%, #2d1033 40%, #803D81 100%)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 0, padding: "56px 40px", width: "100%",
            transform: paidHovered ? "scale(1.03)" : "scale(1.02)",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            boxShadow: paidHovered
              ? "0 32px 100px rgba(128,61,129,0.55), 0 0 0 1px rgba(224,53,83,0.3)"
              : "0 32px 80px rgba(128,61,129,0.4), 0 0 0 1px rgba(224,53,83,0.2)",
            position: "relative",
          }}
          >
              {/* Noise texture overlay */}
              <div style={{
                position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                backgroundSize: "128px",
              }} />

              {/* MOST POPULAR badge */}
              <div style={{
                position: "absolute", top: 20, right: 20,
                border: "1px solid rgba(255,255,255,0.35)", borderRadius: 100,
                padding: "4px 12px", fontSize: 10, color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.1em", textTransform: "uppercase",
              }}>
                Most Popular
              </div>

              {/* Heading */}
              <p style={{ fontSize: 24, fontWeight: 600, fontStyle: "italic", color: "#FFFFFF", marginBottom: 16, letterSpacing: "0.01em" }}>
                With Compliments
              </p>
              <div style={{ height: 1, background: "rgba(255,255,255,0.4)", marginBottom: 24 }} />

              {/* Price */}
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 80, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.04em", lineHeight: 1 }}>$199</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 400, fontStyle: "italic", color: "rgba(255,255,255,0.7)", marginBottom: 32 }}>
                One-time. Yours forever.
              </p>

              {/* Feature groups */}
              <div style={{ marginBottom: 40, display: "flex", flexDirection: "column", gap: 0 }}>
                {PAID_FEATURE_GROUPS.map((group, gi) => (
                  <div key={gi}>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, paddingTop: gi === 0 ? 0 : 16, paddingBottom: 16 }}>
                      {group.items.map((f, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "rgba(255,255,255,0.85)" }}>
                          <Check color="#FFFFFF" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {gi < PAID_FEATURE_GROUPS.length - 1 && (
                      <div style={{ height: 1, background: "rgba(255,255,255,0.12)", marginBottom: 0 }} />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <ApplePillButton onClick={handleCTA}>Get With Compliments +</ApplePillButton>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 16 }}>
                One payment. Use it forever.
              </p>
            </div>
            {/* Quote below card */}
            <p style={{
              fontSize: 13, fontWeight: 400, fontStyle: "italic",
              color: "rgba(255,255,255,0.5)", textAlign: "center",
              maxWidth: 360, marginTop: 20, lineHeight: 1.6,
            }}>
              "A gift from us to you — everything we've built, everything we'll build, for the price of a wedding favour."
            </p>
          </div>
        </div>
      </section>

      {/* ── COMPARISON NOTE ───────────────────────── */}
      <section ref={compRef} style={{ background: "#0A0A0A", padding: "80px 24px 120px" }}>
        <div style={{ height: 1, background: "#222222", maxWidth: 900, margin: "0 auto 80px" }} />
        <div style={{
          textAlign: "center", maxWidth: 700, margin: "0 auto",
          opacity: compVisible ? 1 : 0,
          transform: compVisible ? "translateY(0)" : "translateY(32px)",
          transition: `opacity 0.8s ${EASE}, transform 0.8s ${EASE}`,
        }}>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 40px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF", marginBottom: 20, lineHeight: 1.2 }}>
            No tiers. No upsells. No monthly fees.
          </h2>
          <p style={{ fontSize: 16, color: "#AAAAAA", lineHeight: 1.7, maxWidth: 600, margin: "0 auto" }}>
            We built one plan that has everything because we believe you shouldn't have to pay more to access features you need on one of the most important days of your life.
          </p>
        </div>
      </section>

      {/* ── FEATURE TABLE ─────────────────────────── */}
      <section ref={tableRef} style={{
        background: "#111111", padding: "120px 24px",
        opacity: tableVisible ? 1 : 0,
        transition: `opacity 0.8s ${EASE}`,
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#6B2CAE", marginBottom: 12 }}>
            What's Included
          </p>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 48px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF", marginBottom: 56 }}>
            Everything. Full stop.
          </h2>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", borderBottom: "1px solid #333333", paddingBottom: 12, marginBottom: 0 }}>
            {["Feature", "Free Trial", "With Compliments"].map((h, i) => (
              <p key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#555555", textAlign: i === 0 ? "left" : "center" }}>
                {h}
              </p>
            ))}
          </div>
          {TABLE_ROWS.map(([feature, free, paid], i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr",
              padding: "18px 0", borderBottom: "1px solid #222222",
              background: i % 2 === 0 ? "#111111" : "#0A0A0A",
            }}>
              <p style={{ fontSize: 14, color: "#CCCCCC" }}>{feature}</p>
              <p style={{
                fontSize: 14, textAlign: "center",
                color: free === "—" ? "#444444" : "#888888",
              }}>{free}</p>
              <p style={{
                fontSize: 14, textAlign: "center",
                color: paid === "—" ? "#444444" : paid === "✓" ? "#DDF762" : "#FFFFFF",
                fontWeight: paid === "✓" ? 600 : 400,
              }}>{paid}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────── */}
      <section ref={faqRef} style={{
        background: "#0A0A0A", padding: "120px 24px",
        opacity: faqVisible ? 1 : 0,
        transition: `opacity 0.8s ${EASE}`,
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#E03553", marginBottom: 12 }}>
            FAQ
          </p>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 48px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF", marginBottom: 56 }}>
            Questions answered.
          </h2>
          <div style={{ borderTop: "1px solid #222222" }}>
            {FAQS.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────── */}
      <section ref={ctaRef} style={{
        position: "relative", minHeight: 480,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundImage: `url(${PHOTOS.photoPricingCTA})`,
        backgroundSize: "cover", backgroundPosition: "center",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)" }} />
        <div style={{
          position: "relative", zIndex: 2, textAlign: "center", padding: "80px 24px",
          opacity: ctaVisible ? 1 : 0,
          transform: ctaVisible ? "translateY(0)" : "translateY(32px)",
          transition: `opacity 0.9s ${EASE}, transform 0.9s ${EASE}`,
        }}>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 60px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF", marginBottom: 36, lineHeight: 1.1 }}>
            One payment. A lifetime of memories.
          </h2>
          <ApplePillButton onClick={handleCTA}>Get With Compliments — $199 +</ApplePillButton>
          <p style={{ fontSize: 13, color: "#888888", marginTop: 20 }}>30-day money-back guarantee.</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}