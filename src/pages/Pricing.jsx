import React from "react";
import { useNavigate, Link } from "react-router-dom";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import { useAuth } from "@/lib/AuthContext";
import { track } from "@/lib/analytics";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";
import MarketingHero from "@/components/marketing/MarketingHero";
import MarketingEndCap from "@/components/marketing/MarketingEndCap";
import { PRO_FEATURES, ULTRA_EXTRAS } from "@/lib/planFeatures";

const PJS = "'Plus Jakarta Sans', sans-serif";

// One alignment grid for the page's contained sections. These three used to
// be 720, 860 and 640, which all centred on the viewport axis but produced
// three different left edges (360, 290, 400 at 1440) and read as misaligned.
// 1100 is the width Features' accordion and About's sections already use, so
// Pricing now sits on the same grid rather than a fourth invented one. The
// full-bleed sections (hero, plan pills, gift block, end cap) are unaffected.
const SECTION_MAX = 1100;

const FAQS = [
  {
    q: "Is this really a one-time payment?",
    a: "Yes. Pay once, plan your entire wedding. No monthly fees, no subscriptions, no surprises. Pro is US$49 total. Ultra is US$99 total.",
  },
  {
    q: "What's included in the 14-day free trial?",
    a: "Full access to every feature, including all Ultra features. No credit card required. At the end of 14 days, choose Pro or Ultra to keep your data and access.",
  },
  {
    q: "What's the difference between Pro and Ultra?",
    a: "Pro includes everything you need to plan your wedding: guests, budget, vendors, seating, timeline, and more. Ultra adds the digital suite: wedding website, invitations, online RSVP, and universes.",
  },
  {
    q: "Can I upgrade from Pro to Ultra later?",
    a: "Yes, you can upgrade at any time and pay only the difference ($50).",
  },
  {
    q: "What if I want a refund?",
    a: "Contact us and we'll assess your request case by case. Australian customers are also covered by guarantees under the Australian Consumer Law, which we never exclude.",
  },
  {
    q: "Do I need a credit card for the trial?",
    a: "No. Start free with just your email. No card details required until you upgrade.",
  },
  {
    q: "What happens to my data after 24 months?",
    a: "Your wedding is done, congratulations. After 24 months, your account moves to archive mode. Add an archive plan for $49 to keep permanent access to your wedding story.",
  },
];

const TABLE_ROWS = [
  { feature: "Access duration",        trial: "14 days",  pro: "24 months",  ultra: "24 months" },
  { feature: "Guests",                  trial: "∞",         pro: "∞",          ultra: "∞" },
  { feature: "Ava AI",                  trial: "∞",         pro: "∞",          ultra: "∞" },
  { feature: "Budget tracker",          trial: "Full",      pro: "Full",       ultra: "Full" },
  { feature: "Vendor tools",            trial: "∞",         pro: "∞",          ultra: "∞" },
  { feature: "Seating planner",         trial: true,        pro: true,         ultra: true },
  { feature: "Schedule & timeline",     trial: true,        pro: true,         ultra: true },
  { feature: "Music & registry",        trial: true,        pro: true,         ultra: true },
  { feature: "Wedding website",         trial: true,        pro: false,        ultra: true },
  { feature: "Digital invitations",     trial: true,        pro: false,        ultra: true },
  { feature: "Online RSVP",            trial: true,        pro: false,        ultra: true },
  { feature: "Universes",               trial: true,        pro: false,        ultra: true },
  { feature: "Guest suite",             trial: true,        pro: false,        ultra: true },
  { feature: "Support",                 trial: "Priority",  pro: "Priority",   ultra: "Priority" },
  { feature: "Price",                   trial: "Free",      pro: "US$49",        ultra: "US$99" },
];

function CheckIcon({ color = "#0A0A0A", style }) {
  // margin: 0 auto centers the icon inside the comparison table's cells
  // (its default, block-level context). Callers that place this inside a
  // flex row instead (the pricing card feature lists) must override it —
  // otherwise the auto margins soak up that row's own leftover space and
  // shove the icon (and its text) sideways by a different amount on every
  // row, depending on how long that row's text is.
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ display: "block", margin: "0 auto", flexShrink: 0, ...style }}>
      <path d="M2.5 7L5.5 10L11.5 4" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CellValue({ val }) {
  if (val === true)  return <CheckIcon color="#0A0A0A" />;
  if (val === false) return <span style={{ color: "rgba(10,10,10,0.25)", fontSize: 14 }}>—</span>;
  return <span style={{ fontSize: 13, color: "#0A0A0A", fontFamily: PJS }}>{val}</span>;
}

export default function Pricing() {
  useMarketingSeo();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // The user's actual plan drives each button's own label/state — never
  // both buttons reading "Your plan" at once (PR G1 fix). isPro/isUltra are
  // each true only for that exact plan; isPaidUser gates the free-trial CTA
  // off for anyone who's already paid.
  const userPlan = user?.plan || 'free';
  const isPro = isAuthenticated && userPlan === 'pro';
  const isUltra = isAuthenticated && userPlan === 'ultra';
  const isPaidUser = isPro || isUltra;
  // Pro button is only a live purchase action for a free/logged-out visitor
  // — an Ultra user already has everything Pro offers, so it's disabled
  // (not a downgrade CTA) rather than "Your plan".
  const proDisabled = isPro || isUltra;
  const proLabel = isPro ? "Your plan" : isUltra ? "Included in Ultra" : "Get Pro: US$49";
  // Ultra button is a real upgrade CTA for a Pro user — the one case where
  // the "higher plan" language in the brief actually applies.
  const ultraDisabled = isUltra;
  const ultraLabel = isUltra ? "Your plan" : isPro ? "Upgrade to Ultra" : "Get Ultra: US$99";

  // A logged-out visitor never reaches checkout or /onboarding directly —
  // both require an account. They go through /register?plan=... instead,
  // which lands on the same account-state-gated /choose-plan every signup
  // goes through (see ChoosePlan.jsx), carrying the chosen plan forward.
  // A logged-in visitor's plan buttons never open Stripe directly from this
  // page — they route to Account.jsx's Billing tab, the existing verified
  // in-app upgrade surface (same create-checkout-session endpoint), so the
  // "already have this plan" and "upgrade from Pro to Ultra" cases are
  // handled in exactly one place instead of duplicated here.
  const goFree  = () => {
    if (!isAuthenticated) { navigate('/register?plan=free'); return; }
    navigate("/onboarding");
  };
  const goPro   = () => {
    if (proDisabled) return;
    if (!isAuthenticated) { navigate('/register?plan=pro'); return; }
    track('upgrade_clicked', { plan: 'pro', from: 'pricing_page' });
    navigate('/account?tab=billing');
  };
  const goUltra = () => {
    if (ultraDisabled) return;
    if (!isAuthenticated) { navigate('/register?plan=ultra'); return; }
    track('upgrade_clicked', { plan: 'ultra', from: 'pricing_page' });
    navigate('/account?tab=billing');
  };

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: PJS }}>
      <PublicNav />

      {/* ── HERO ── */}
      <MarketingHero
        image="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1779185627/DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8854_xted4d.jpg"
        imagePosition="center 30%"
        title={<>Pay once.<br />Plan your entire wedding.</>}
        showScrollCue={false}
        maxWidth={900}
      />

      {/* ── PRICING CARDS ── */}
      <section style={{ background: "#FFFFFF", padding: "80px 24px" }}>

        {/* Free trial banner — never shown to an already-paying account (PR G1). */}
        {!isPaidUser && (
          <div style={{ maxWidth: 700, margin: "0 auto 56px", textAlign: "center", padding: "36px 40px", background: "#F7F7F5", border: "1px solid rgba(10,10,10,0.08)" }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.01em", lineHeight: 1.2, margin: "0 0 8px", fontFamily: PJS }}>
              Try everything free for 14 days
            </h3>
            <p style={{ fontSize: 14, color: "rgba(10,10,10,0.5)", margin: "0 0 24px", fontFamily: PJS }}>
              Full Ultra access. No credit card required.
            </p>
            <button
              onClick={goFree}
              style={{
                padding: "12px 36px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                fontFamily: PJS, cursor: "pointer", border: "none",
                background: "#0A0A0A", color: "#FFFFFF", transition: "opacity 0.15s",
                display: "inline-flex", alignItems: "center",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.82"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Start free, no card needed
            </button>
          </div>
        )}

        <div style={{
          maxWidth: 860, margin: "0 auto",
          display: "flex", gap: 20, alignItems: "stretch",
          flexWrap: "wrap", justifyContent: "center",
        }}>

          {/* PRO */}
          <div style={{
            flex: "0 1 400px", minWidth: 300,
            border: "1px solid #E5E5E5",
            background: "#FAFAF9", padding: 32,
            display: "flex", flexDirection: "column",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(10,10,10,0.6)", marginBottom: 14, fontFamily: PJS }}>
              Pro
            </p>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: PJS }}>US$49</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(10,10,10,0.6)", marginBottom: 16, fontFamily: PJS }}>
              24-month access · one-time payment
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(10,10,10,0.6)", marginBottom: 20, fontFamily: PJS }}>
              Your complete wedding planning command center. Everything from first plan to final dance.
            </p>
            <div style={{ height: 1, background: "rgba(10,10,10,0.06)", marginBottom: 20 }} />
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {PRO_FEATURES.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#0A0A0A", fontFamily: PJS }}>
                  <CheckIcon color="#E03553" style={{ margin: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={goPro}
              disabled={proDisabled}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 999, fontSize: 13, fontWeight: 700,
                fontFamily: PJS, cursor: proDisabled ? "default" : "pointer", border: "none",
                background: proDisabled ? "rgba(10,10,10,0.08)" : "#E03553",
                color: proDisabled ? "rgba(10,10,10,0.3)" : "#FFFFFF",
                transition: "opacity 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={e => { if (!proDisabled) e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={e => { if (!proDisabled) e.currentTarget.style.opacity = "1"; }}
            >
              {proLabel}
            </button>
          </div>

          {/* ULTRA */}
          <div style={{
            flex: "0 1 400px", minWidth: 300,
            border: "1px solid #E5E5E5",
            background: "#FAFAF9", padding: 32,
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <path d="M7 1L9 5.5L14 6.5L10.5 9.5L11.5 14L7 11.5L2.5 14L3.5 9.5L0 6.5L5 5.5Z" fill="#F59E0B" />
              </svg>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(10,10,10,0.6)", margin: 0, fontFamily: PJS }}>Ultra</p>
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: PJS }}>US$99</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(10,10,10,0.6)", marginBottom: 16, fontFamily: PJS }}>
              24-month access · one-time payment
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(10,10,10,0.6)", marginBottom: 20, fontFamily: PJS }}>
              Everything in Pro, plus the full digital wedding suite: website, invitations, and RSVP.
            </p>
            <div style={{ height: 1, background: "rgba(10,10,10,0.06)", marginBottom: 14 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(10,10,10,0.6)", marginBottom: 12, letterSpacing: "0.04em", fontFamily: PJS }}>
              Everything in Pro, plus:
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {ULTRA_EXTRAS.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#0A0A0A", fontFamily: PJS }}>
                  <CheckIcon color="#E03553" style={{ margin: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={goUltra}
              disabled={ultraDisabled}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 999, fontSize: 13, fontWeight: 700,
                fontFamily: PJS, cursor: ultraDisabled ? "default" : "pointer",
                background: ultraDisabled ? "rgba(10,10,10,0.08)" : "#F59E0B",
                color: ultraDisabled ? "rgba(10,10,10,0.3)" : "#FFFFFF",
                border: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => { if (!ultraDisabled) e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={e => { if (!ultraDisabled) e.currentTarget.style.opacity = "1"; }}
            >
              {ultraLabel}
            </button>
          </div>

        </div>

        {/* No upsells + currency note */}
        <p style={{ textAlign: "center", fontSize: 13, color: "rgba(10,10,10,0.6)", marginTop: 28, fontFamily: PJS }}>
          No upsells, ever. Pay once, plan your entire wedding.
        </p>
        <p style={{ textAlign: "center", fontSize: 12, color: "rgba(10,10,10,0.6)", marginTop: 6, fontFamily: PJS }}>
          Prices in USD
        </p>

      </section>

      {/* ── GIFT MOMENT ── */}
      <section style={{ position: "relative", padding: "160px 24px", textAlign: "center", overflow: "hidden", background: "#0A0A0A" }}>
        <img
          src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_SNOWBOUND_Daniel_Far%C3%B2_Photos_ID12431_yunnan.jpg"
          alt="A couple unwrapping a gift together"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(10,10,10,0.5) 0%, rgba(10,10,10,0.78) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 20, fontFamily: PJS }}>
            The gift of a calmer countdown.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", marginBottom: 40, fontFamily: PJS }}>
            A thoughtful way to help them plan beautifully, stay organized, and enjoy every moment leading up to the big day.
          </p>
          <Link
            to="/gifting"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              padding: "12px 24px", borderRadius: 999,
              background: "#E03553", color: "#FFFFFF",
              fontSize: "clamp(13px, 1.2vw, 15px)", fontWeight: 600, fontFamily: PJS, textDecoration: "none",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Gift Openinvite
          </Link>
        </div>
      </section>

      {/* ── AFTER 24 MONTHS ── */}
      <section style={{ background: "#F7F7F7", padding: "40px 24px" }}>
        <div style={{
          maxWidth: SECTION_MAX, margin: "0 auto",
          borderLeft: "3px solid #E03553", paddingLeft: 24,
        }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#0A0A0A", marginBottom: 10, fontFamily: PJS }}>
            What happens after 24 months?
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(10,10,10,0.6)", marginBottom: 10, fontFamily: PJS }}>
            Your wedding is done, congratulations. After 24 months, your account moves to archive mode.
            Your data and memories stay safe. To keep full access to your wedding story,
            add an archive plan for a single $49 payment. No recurring fees, ever.
          </p>
          <p style={{ fontSize: 12, color: "rgba(10,10,10,0.6)", margin: 0, fontFamily: PJS }}>
            Archive access covers your guest list, messages, and wedding website permanently.
          </p>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section style={{ background: "#FFFFFF", padding: "80px 24px" }}>
        <div style={{ maxWidth: SECTION_MAX, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", marginBottom: 40, fontFamily: PJS }}>
            Compare plans
          </h2>

          {/* margin: 0, not "0 auto" — the table is narrower than this
              1100px container, so centering it left it floating well right
              of the "Compare plans" heading above. Left-aligned, it lines
              up with the heading instead. */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "auto", margin: 0, borderCollapse: "collapse", tableLayout: "fixed", fontFamily: PJS }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", fontSize: 12, fontWeight: 600, color: "rgba(10,10,10,0.6)", padding: "0 24px 20px 0" }} />
                  {["Free trial", "Pro", "Ultra"].map(label => (
                    <th key={label} style={{
                      textAlign: "center", fontSize: 13, fontWeight: 700,
                      color: "#0A0A0A", padding: "0 16px 20px", width: 120,
                    }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(10,10,10,0.05)" }}>
                    <td style={{ padding: "14px 24px 14px 0", fontSize: 13, color: "rgba(10,10,10,0.7)", fontFamily: PJS, textAlign: "left", whiteSpace: "nowrap" }}>
                      {row.feature}
                    </td>
                    {[row.trial, row.pro, row.ultra].map((val, j) => (
                      <td key={j} style={{ padding: "14px 16px", width: 120, textAlign: "center" }}>
                        <CellValue val={val} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ background: "#FFFFFF", padding: "0 24px 80px" }}>
        <div style={{ maxWidth: SECTION_MAX, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", marginBottom: 40, fontFamily: PJS }}>
            Questions
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {FAQS.map((faq, i) => (
              <div key={i}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", marginBottom: 8, fontFamily: PJS }}>
                  {faq.q}
                </p>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(10,10,10,0.6)", margin: 0, fontFamily: PJS }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ──
          Same shared end-cap as Home, Features and Ava. This page had grown
          its own text-on-black copy of the identical headline; it now renders
          the one component, with the photo behind it. The plan buttons below
          are unchanged and passed through as children — they carry the real
          signup and billing navigation plus the upgrade_clicked analytics,
          so they are deliberately not reduced to a plain link. */}
      {/* c_crop,h_700 re-centres the subject inside the delivered image rather
          than nudging the CSS crop. MarketingEndCap hardcodes
          objectPosition: "center" and is shared by seven pages, so the only
          per-page lever is the transformation on this URL.

          The source is 1600x1067 and both heads sit high in it: the band runs
          y 62-620, centred on y 341, while the image centre is y 533. Because
          object-fit: cover always crops around the image centre, that 192px
          offset clipped the top of his head by 122px at 1440 and 78px at 1280
          (390 was already fine). Cropping to y 0-700 puts the band centre at
          350 against an image centre of 350, so cover now trims evenly.

          Measured clearance from the head band to the crop edge, +15px pad:
            1440x900  -136px (clipped)  ->  +47px
            1280x900   -93px (clipped)  ->  +47px
             390x844   +47px            ->  +16px
          h_700 beat h_680 (+9 at 390) and h_760 (+17 at 1440) on worst case.

          Known limit: on very wide, short windows the section's fixed
          70vh/minHeight 480 makes the visible strip shorter than the head band
          itself, so no crop can keep both heads (1920x720 is still -93px here).
          This crop improves every such case by a uniform +184px, but the full
          fix would be a change to the shared component's height rule. */}
      <MarketingEndCap
        image="https://res.cloudinary.com/dsr84xknv/image/upload/c_crop,x_0,y_0,w_1600,h_700/f_auto,q_auto/DTS_day_tripping_Agust%C3%ADn_Far%C3%ADas_Photos_ID6199_g2inky.jpg"
        alt="A couple on a day trip together"
      >
          {!isPaidUser && (
            <button
              onClick={goFree}
              style={{
                padding: "14px 32px", borderRadius: 999, fontSize: 14, fontWeight: 700,
                fontFamily: PJS, cursor: "pointer", border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.1)", color: "#FFFFFF", transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Start free trial
            </button>
          )}
          <button
            onClick={goPro}
            disabled={proDisabled}
            style={{
              padding: "14px 32px", borderRadius: 999, fontSize: 14, fontWeight: 700,
              fontFamily: PJS, cursor: proDisabled ? "default" : "pointer", border: "none",
              background: proDisabled ? "rgba(255,255,255,0.1)" : "#E03553",
              color: proDisabled ? "rgba(255,255,255,0.4)" : "#FFFFFF",
              transition: "opacity 0.15s",
              display: "flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={e => { if (!proDisabled) e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { if (!proDisabled) e.currentTarget.style.opacity = "1"; }}
          >
            {proLabel}
          </button>
          <button
            onClick={goUltra}
            disabled={ultraDisabled}
            style={{
              padding: "14px 32px", borderRadius: 999, fontSize: 14, fontWeight: 700,
              fontFamily: PJS, cursor: ultraDisabled ? "default" : "pointer", border: "none",
              background: ultraDisabled ? "rgba(255,255,255,0.1)" : "#F59E0B",
              color: ultraDisabled ? "rgba(255,255,255,0.4)" : "#FFFFFF",
              transition: "opacity 0.15s",
              display: "flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={e => { if (!ultraDisabled) e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { if (!ultraDisabled) e.currentTarget.style.opacity = "1"; }}
          >
            {ultraLabel}
          </button>
      </MarketingEndCap>

      <PublicFooter />
    </div>
  );
}
