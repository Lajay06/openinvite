import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

const PJS = "'Plus Jakarta Sans', sans-serif";

const FREE_FEATURES = [
  "Up to 20 guests",
  "Guest list and RSVPs",
  "Basic budget tracker",
  "Wedding checklist",
  "1 vendor",
  "Ava AI (10 messages)",
  "Basic wedding website",
];

const PRO_FEATURES = [
  "Unlimited guests",
  "Full guest management and RSVPs",
  "Complete budget suite",
  "Ava AI — unlimited, context-aware",
  "Vendor management and marketplace",
  "Seating planner",
  "Wedding website builder",
  "Invitations and design studio",
  "Photography and styling tools",
  "Schedule and day-of timeline",
  "Moodboard and inspiration",
  "Music planner",
  "Registry management",
  "Vows and speeches writer",
  "Collaborate with wedding party",
  "Priority support",
];

const FAQS = [
  {
    q: "Can I try before I pay?",
    a: "Yes. Your 14-day free trial includes everything in Pro with no credit card required. If you love it, upgrade to keep planning.",
  },
  {
    q: "What happens after the trial?",
    a: "You'll be asked to choose a plan. If you don't upgrade, your account moves to read-only — your data is safe, you just can't add anything new.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Always. No contracts, no cancellation fees. Cancel from your account settings in 30 seconds.",
  },
  {
    q: "Do you offer refunds?",
    a: "Annual plans include a 14-day money-back guarantee. See our Refund Policy for full details.",
  },
];

function CheckIcon({ color = "#0A0A0A" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M2.5 7L5.5 10L11.5 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Pricing() {
  const [annual, setAnnual] = useState(true);

  const handleCTA = () => {
    base44.auth.redirectToLogin(window.location.origin + createPageUrl("Dashboard"));
  };

  const monthlyPrice = "$19.90";
  const annualPrice  = "$199";
  const annualOld    = "$238.80";
  const annualSaving = "Save $39.80";

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: PJS }}>
      <PublicNav />

      {/* ── HERO ── */}
      <section style={{ background: "#0A0A0A", padding: "140px 24px 100px", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#E03553", marginBottom: 20, fontFamily: PJS }}>
          Simple, transparent pricing
        </p>
        <h1 style={{
          fontSize: "clamp(40px, 5vw, 56px)", fontWeight: 800, letterSpacing: "-0.03em",
          color: "#FFFFFF", lineHeight: 1.1, maxWidth: 600, margin: "0 auto 24px",
          fontFamily: PJS,
        }}>
          Plan the wedding<br />you actually want.
        </h1>
        <p style={{
          fontSize: 18, lineHeight: 1.6, color: "rgba(255,255,255,0.6)",
          maxWidth: 500, margin: "0 auto", fontFamily: PJS,
        }}>
          One plan. Everything included.<br />No surprises on your big day.
        </p>
      </section>

      {/* ── BILLING TOGGLE ── */}
      <section style={{ background: "#FFFFFF", padding: "64px 24px 0", textAlign: "center" }}>
        <div style={{ display: "inline-flex", background: "rgba(10,10,10,0.06)", padding: 4, borderRadius: 999, gap: 2 }}>
          <button
            onClick={() => setAnnual(false)}
            style={{
              padding: "9px 20px", borderRadius: 999, fontSize: 13, fontWeight: 700,
              fontFamily: PJS, cursor: "pointer", border: "none", transition: "all 0.2s",
              background: !annual ? "#0A0A0A" : "transparent",
              color: !annual ? "#FFFFFF" : "rgba(10,10,10,0.5)",
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            style={{
              padding: "9px 20px", borderRadius: 999, fontSize: 13, fontWeight: 700,
              fontFamily: PJS, cursor: "pointer", border: "none", transition: "all 0.2s",
              background: annual ? "#0A0A0A" : "transparent",
              color: annual ? "#FFFFFF" : "rgba(10,10,10,0.5)",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            Annual
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              background: annual ? "#E03553" : "rgba(10,10,10,0.12)",
              color: annual ? "#FFFFFF" : "rgba(10,10,10,0.4)",
              transition: "all 0.2s",
            }}>
              save 2 months
            </span>
          </button>
        </div>
      </section>

      {/* ── PRICING CARDS ── */}
      <section style={{ background: "#FFFFFF", padding: "48px 24px 80px" }}>
        <div style={{
          maxWidth: 880, margin: "0 auto",
          display: "flex", gap: 24, alignItems: "flex-start",
          flexWrap: "wrap", justifyContent: "center",
        }}>

          {/* FREE CARD */}
          <div style={{
            flex: "0 1 380px", minWidth: 280,
            border: "1px solid rgba(10,10,10,0.1)",
            background: "#FFFFFF", padding: "40px 36px",
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(10,10,10,0.4)", marginBottom: 20, fontFamily: PJS }}>
              Free trial
            </p>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 52, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: PJS }}>$0</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(10,10,10,0.45)", marginBottom: 28, fontFamily: PJS }}>14 days, no credit card required</p>
            <div style={{ height: 1, background: "rgba(10,10,10,0.08)", marginBottom: 28 }} />
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(10,10,10,0.6)", marginBottom: 28, fontFamily: PJS }}>
              Experience the full power of OpenInvite. Everything included, no limits, for 14 days.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 36px", display: "flex", flexDirection: "column", gap: 12 }}>
              {FREE_FEATURES.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#0A0A0A", fontFamily: PJS }}>
                  <CheckIcon color="#0A0A0A" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={handleCTA}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 999, fontSize: 14, fontWeight: 700,
                fontFamily: PJS, cursor: "pointer", border: "none",
                background: "#0A0A0A", color: "#FFFFFF", transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Start free — no card needed
            </button>
          </div>

          {/* PRO CARD */}
          <div style={{ flex: "0 1 420px", minWidth: 280, paddingTop: 20, position: "relative" }}>
            {/* "Most popular" badge floating above card */}
            <div style={{
              position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
              background: "linear-gradient(135deg, #ec4899, #9333ea)",
              padding: "5px 18px", borderRadius: 999, fontSize: 11, fontWeight: 700,
              color: "#FFFFFF", letterSpacing: "0.06em", whiteSpace: "nowrap", fontFamily: PJS,
              zIndex: 1,
            }}>
              Most popular
            </div>

            <div style={{
              border: "2px solid #0A0A0A", background: "#0A0A0A", padding: "44px 36px",
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.45)", marginBottom: 20, fontFamily: PJS }}>
                Pro
              </p>

              {/* Price */}
              <div style={{ marginBottom: 4, display: "flex", alignItems: "flex-end", gap: 8 }}>
                <span style={{ fontSize: 52, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: PJS }}>
                  {annual ? annualPrice : monthlyPrice}
                </span>
                <span style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", fontFamily: PJS, paddingBottom: 8 }}>
                  {annual ? "/yr" : "/mo"}
                </span>
              </div>

              {annual ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "line-through", fontFamily: PJS }}>{annualOld}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                    background: "rgba(224,53,83,0.25)", color: "#E03553", fontFamily: PJS,
                  }}>{annualSaving}</span>
                </div>
              ) : (
                <div style={{ height: 24, marginBottom: 8 }} />
              )}

              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 20, fontFamily: PJS }}>
                {annual ? "Billed annually · cancel anytime" : "Billed monthly · cancel anytime"}
              </p>

              <div style={{ height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 20 }} />

              <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.7)", marginBottom: 28, fontFamily: PJS }}>
                Everything you need for the wedding of your dreams.
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 36px", display: "flex", flexDirection: "column", gap: 11 }}>
                {PRO_FEATURES.map((f, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.85)", fontFamily: PJS }}>
                    <CheckIcon color="#E03553" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleCTA}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 999, fontSize: 14, fontWeight: 700,
                  fontFamily: PJS, cursor: "pointer", border: "none",
                  background: "#FFFFFF", color: "#0A0A0A", transition: "opacity 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                Start your free trial
              </button>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 12, fontFamily: PJS }}>
                {annual ? `Then ${annualPrice}/yr · cancel anytime` : `Then ${monthlyPrice}/mo · cancel anytime`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section style={{ background: "#F7F7F7", padding: "48px 24px" }}>
        <div style={{
          maxWidth: 680, margin: "0 auto",
          display: "flex", justifyContent: "center", gap: "clamp(32px, 6vw, 80px)",
          flexWrap: "wrap", textAlign: "center",
        }}>
          {[
            { num: "10,000+", label: "couples" },
            { num: "4.9★",    label: "average rating" },
            { num: "142",     label: "countries" },
          ].map(({ num, label }) => (
            <div key={label}>
              <div style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.02em", fontFamily: PJS }}>{num}</div>
              <div style={{ fontSize: 13, color: "rgba(10,10,10,0.45)", fontFamily: PJS, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ background: "#FFFFFF", padding: "96px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#E03553", marginBottom: 12, fontFamily: PJS }}>
            Common questions
          </p>
          <h2 style={{ fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", color: "#0A0A0A", marginBottom: 56, fontFamily: PJS }}>
            Everything you need to know.
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderBottom: "1px solid rgba(10,10,10,0.08)", padding: "28px 0" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#0A0A0A", marginBottom: 10, fontFamily: PJS }}>{faq.q}</p>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(10,10,10,0.6)", margin: 0, fontFamily: PJS }}>
                  {faq.a}{" "}
                  {faq.q.includes("refund") && (
                    <Link to="/refund-policy" style={{ color: "#E03553", textDecoration: "none", fontWeight: 600 }}>Refund policy →</Link>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ background: "#0A0A0A", padding: "100px 24px", textAlign: "center" }}>
        <h2 style={{
          fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.02em",
          color: "#FFFFFF", marginBottom: 16, lineHeight: 1.15, fontFamily: PJS,
        }}>
          Your wedding deserves the best.
        </h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", marginBottom: 40, fontFamily: PJS }}>
          Join thousands of couples planning with confidence.
        </p>
        <button
          onClick={handleCTA}
          style={{
            padding: "16px 40px", borderRadius: 999, fontSize: 15, fontWeight: 700,
            fontFamily: PJS, cursor: "pointer", border: "none",
            background: "linear-gradient(135deg, #ec4899, #9333ea)",
            color: "#FFFFFF", transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          Start free today
        </button>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 16, fontFamily: PJS }}>
          14-day free trial · no credit card required
        </p>
      </section>

      <PublicFooter />
    </div>
  );
}
