import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import MarketingHero from "@/components/marketing/MarketingHero";
import ApplePillButton from "@/components/motion/ApplePillButton";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";
import { startGiftCheckout } from "@/lib/checkoutSession";
import { PRO_FEATURES, ULTRA_EXTRAS } from "@/lib/planFeatures";
import { responsivePhoto } from "@/lib/marketingImage";

const PJS = "'Plus Jakarta Sans', sans-serif";

// Same bright, well-lit photo already proven to work with overlay={false}
// (AuthLayout.jsx's carousel) — no dark gradient, per the standing "bright
// imagery, no dark overlays" direction for this page. Also reused as the
// gift-reveal email's own banner (api/emails/gift-reveal.js) for one
// consistent "gifting" visual identity across the page and the email.
// Web export (1280x853): 0.34x at dpr 2 is this asset's ceiling.
// api/emails/gift-reveal.js keeps its own literal copy of this URL rather than
// importing it — deliberately, since email clients ignore srcset and that
// banner wants one fixed file. Changing the ladder here does not touch it.
const HERO = responsivePhoto("DTS_SNOWBOUND_Daniel_Far%C3%B2_Photos_ID12431_yunnan", 1280);

// Support-only fallback, kept alongside the real checkout flow — costs
// nothing to leave in place (PR G4 proposal, open question 5).
const GIFT_MAILTO = "mailto:hello@openinvite.com.au?subject=I'd%20like%20to%20give%20the%20gift%20of%20Openinvite&body=Hi%20Openinvite%20team%2C%0A%0AI'd%20like%20to%20give%20Openinvite%20as%20a%20gift.%20Here's%20who%20it's%20for%3A%0A";

const STEPS = [
  {
    num: "01",
    heading: "Choose a plan and pay",
    body: "Pick Pro or Ultra and check out securely, right here. You'll tell us who it's for on the same page, no separate step.",
  },
  {
    num: "02",
    heading: "We email them a beautiful gift",
    body: "A photo-rich email lands in their inbox the moment your payment goes through, with your note if you left one and a one-time code that's theirs alone.",
  },
  {
    num: "03",
    heading: "They create an account, free",
    body: "They sign up, pick the plan you gave them, and enter the code at checkout. Their 24 months of access starts the moment they redeem it, not today.",
  },
];

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M2.5 7L5.5 10L11.5 4" stroke="#E03553" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlanCard({ label, price, features, accent, loadingPlan, onSelect }) {
  const planKey = label.toLowerCase();
  const isLoading = loadingPlan === planKey;
  return (
    <div style={{
      flex: "0 1 300px", minWidth: 260, border: "1px solid #E5E5E5",
      background: "#FAFAF9", padding: 32, display: "flex", flexDirection: "column",
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(10,10,10,0.6)", margin: "0 0 14px", fontFamily: PJS }}>
        {label}
      </p>
      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 40, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: PJS }}>{price}</span>
      </div>
      <p style={{ fontSize: 12, color: "rgba(10,10,10,0.6)", margin: "0 0 20px", fontFamily: PJS }}>24-month access, one-time payment</p>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#0A0A0A", fontFamily: PJS }}>
            <CheckIcon />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onSelect(planKey)}
        disabled={!!loadingPlan}
        style={{
          width: "100%", padding: "13px 0", borderRadius: 999, fontSize: 13, fontWeight: 700,
          fontFamily: PJS, background: accent, color: "#FFFFFF", border: "none",
          cursor: loadingPlan ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          opacity: loadingPlan && !isLoading ? 0.5 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {isLoading ? <><Loader2 size={14} style={{ animation: "oi-spin 0.8s linear infinite" }} /> Redirecting…</> : `Give ${label} — ${price}`}
      </button>
    </div>
  );
}

export default function Gifting() {
  useMarketingSeo();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);

  const handleSelect = (plan) => {
    startGiftCheckout(plan, setLoadingPlan, setCheckoutError);
  };

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: PJS }}>
      <PublicNav />

      <MarketingHero
        image={HERO.src}
        srcSet={HERO.srcSet}
        title="Give someone a calmer wedding"
        overlay={false}
        cta={{ label: "Get started", href: "/signup" }}
      />

      {/* ── PLAN PICKER ── */}
      <section id="gift" style={{ padding: "96px 24px", scrollMarginTop: 24 }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#0A0A0A", margin: "0 0 16px", textAlign: "center" }}>
            Choose their gift
          </h2>
          <p style={{ fontSize: 15, color: "rgba(10,10,10,0.6)", margin: "0 0 48px", textAlign: "center" }}>
            You'll add their email on the next page. They'll have a gift waiting in their inbox within minutes.
          </p>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            <PlanCard label="Pro" price="US$49" features={PRO_FEATURES.slice(0, 6)} accent="#E03553" loadingPlan={loadingPlan} onSelect={handleSelect} />
            <PlanCard label="Ultra" price="US$99" features={["Everything in Pro", ...ULTRA_EXTRAS.slice(0, 5)]} accent="#0A0A0A" loadingPlan={loadingPlan} onSelect={handleSelect} />
          </div>

          {checkoutError && (
            <p style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "#E03553", fontFamily: PJS }}>
              {checkoutError}
            </p>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "96px 24px", background: "#F5F5F3" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#0A0A0A", margin: "0 0 56px", textAlign: "center" }}>
            How it works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 40 }}>
            {STEPS.map((s) => (
              <div key={s.num}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#E03553", letterSpacing: "0.08em", margin: "0 0 12px" }}>
                  {s.num}
                </p>
                <h3 style={{ fontSize: 19, fontWeight: 700, color: "#0A0A0A", margin: "0 0 10px" }}>
                  {s.heading}
                </h3>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(10,10,10,0.6)", margin: 0 }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REASSURANCE ── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 18, lineHeight: 1.75, color: "#0A0A0A", margin: 0 }}>
            Openinvite is one price, paid once. Pro is US$49, Ultra is US$99.
            No subscriptions, and nothing more for either of you to pay later.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "#0A0A0A", padding: "120px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, color: "#FFFFFF", marginBottom: 16, lineHeight: 1.15 }}>
            Ready to give the gift?
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 40, lineHeight: 1.7 }}>
            Choose a plan and they'll have it in their inbox within minutes.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#gift" style={{ textDecoration: "none" }}>
              <ApplePillButton>Choose a plan</ApplePillButton>
            </a>
            <Link to="/pricing" style={{ textDecoration: "none" }}>
              <ApplePillButton>See what's included</ApplePillButton>
            </Link>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 40 }}>
            Prefer to arrange this with a real person? <a href={GIFT_MAILTO} style={{ color: "rgba(255,255,255,0.6)" }}>Email us</a>.
          </p>
        </div>
      </section>

      <PublicFooter />
      <style>{'@keyframes oi-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
