import React from "react";
import { Link } from "react-router-dom";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import MarketingHero from "@/components/marketing/MarketingHero";
import ApplePillButton from "@/components/motion/ApplePillButton";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";
import { PRO_FEATURES, ULTRA_EXTRAS } from "@/lib/planFeatures";
import { GIFT_HD_PHOTO } from "@/lib/marketingImage";
import { PLAN_BADGE_BACKGROUND } from "@/lib/planBadge";

const PJS = "'Plus Jakarta Sans', sans-serif";

// THE OWNER'S HD PHOTOGRAPH (given 2026-10-13, swapped in 2026-10-17): the
// same SNOWBOUND scene as the soft 1280 web export it replaces, at 4096x2732,
// so the ladder runs to 3840. No dark gradient, per the standing "bright
// imagery, no dark overlays" direction for this page. The Pricing gift banner
// uses the same id. api/emails/gift-reveal.js keeps its own literal copy of
// the old URL, deliberately: email clients ignore srcset and that banner
// wants one fixed file, so this swap does not touch it.
const HERO = GIFT_HD_PHOTO;

// Support-only fallback, kept alongside the real checkout flow — costs
// nothing to leave in place (PR G4 proposal, open question 5).
const GIFT_MAILTO = "mailto:hello@openinvite.com.au?subject=I'd%20like%20to%20give%20the%20gift%20of%20Openinvite&body=Hi%20Openinvite%20team%2C%0A%0AI'd%20like%20to%20give%20Openinvite%20as%20a%20gift.%20Here's%20who%20it's%20for%3A%0A";

// THE STEPS ARE GIFTING V2'S, checked against the flow end to end (owner
// review of #1092, 2026-10-17). /gift asks for the plan, then their names,
// their email and the giver's name, then the note, the first line, the photo
// and when it lands (now, or 9 am their time on a date), then Stripe. The
// webhook sends a "Now" gift and api/cron/send-gift-reveals.js a dated one;
// the giver gets a copy with the link. The couple taps Open your gift, signs
// in, and src/pages/GiftClaim.jsx claims it.
const STEPS = [
  {
    num: "01",
    heading: "Choose a plan and make it theirs",
    body: "Pick Pro or Ultra, add their names and email, choose a photo, write a note, then pay once on Stripe.",
  },
  {
    num: "02",
    heading: "We email them your gift",
    body: "It arrives within a minute of your payment, or at 9 am their time on the date you pick, with your photo, your note and a link that is theirs alone. You get a copy too.",
  },
  {
    num: "03",
    heading: "One tap and they're planning",
    body: "They tap Open your gift, sign in, and their plan is switched on for 24 months. Nothing for them to set up or pay.",
  },
];

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M2.5 7L5.5 10L11.5 4" stroke="#E03553" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlanCard({ label, price, features, accent, textColor = "#FFFFFF" }) {
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
      {/* Gifting v2 is live: a plan button opens the gift flow at /gift with
          that plan already chosen, so the next page asks for their names and
          email, never the plan again (owner ruling on #1092). */}
      <Link
        to={`/gift?plan=${label.toLowerCase()}`}
        style={{
          width: "100%", padding: "13px 0", borderRadius: 999, fontSize: 13, fontWeight: 700,
          fontFamily: PJS, background: accent, color: textColor, textDecoration: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {`Give ${label}, ${price}`}
      </Link>
    </div>
  );
}

export default function Gifting() {
  useMarketingSeo();

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
            <PlanCard label="Pro" price="US$49" features={PRO_FEATURES.slice(0, 6)} accent="#E03553" />
            {/* Give Ultra wears the Ultra badge's gradient with #0A0A0A text, 9.2:1
                on #F59E0B and 11.9:1 on #FBBF24 (owner rulings on #1092). */}
            <PlanCard label="Ultra" price="US$99" features={["Everything in Pro", ...ULTRA_EXTRAS.slice(0, 5)]} accent={PLAN_BADGE_BACKGROUND.ultra} textColor="#0A0A0A" />
          </div>

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
