import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

const PJS = "'Plus Jakarta Sans', sans-serif";

const STARTER_FEATURES = [
  "Up to 20 guests",
  "Guest list and RSVPs",
  "Basic budget tracker",
  "Wedding checklist",
  "1 vendor slot",
  "Ava AI (10 conversations)",
  "Basic wedding website preview",
];

const PRO_FEATURES = [
  "Unlimited guests",
  "Full guest management and RSVPs",
  "Complete budget suite",
  "Ava AI — unlimited and context-aware",
  "Full vendor management",
  "Vendor marketplace access",
  "Seating planner",
  "Wedding website (preview only)",
  "Schedule and day-of timeline",
  "Photography and styling tools",
  "Moodboard and inspiration boards",
  "Music playlist planner",
  "Registry management",
  "Vows and speeches writer",
  "Collaborate with wedding party",
  "24-month access",
  "Priority support",
];

const ULTRA_EXTRAS = [
  "Full invitation design suite",
  "Custom invitation templates",
  "Digital and printable invitations",
  "RSVP tracking via invitations",
  "Save the dates",
  "Thank you cards",
  "Envelope addressing",
  "Guest portal with invitations",
];

const FAQS = [
  {
    q: "Is this really a one-time payment?",
    a: "Yes. Pay once, plan your entire wedding. No monthly fees, no subscriptions, no surprises. Pro is $99 total. Ultra is $199 total.",
  },
  {
    q: "What's included in the 24 months?",
    a: "Full access to everything in your plan from the day you purchase. Most couples plan 12–18 months ahead — 24 months gives you plenty of room.",
  },
  {
    q: "Can I upgrade from Pro to Ultra later?",
    a: "Yes — you can upgrade at any time and pay only the difference ($100).",
  },
  {
    q: "What if I want a refund?",
    a: "We offer a 14-day money-back guarantee from your purchase date, no questions asked.",
  },
  {
    q: "Do I need a credit card for the trial?",
    a: "No. Start free with just your email. No card details required until you upgrade.",
  },
  {
    q: "What happens to my data after 24 months?",
    a: "Your data stays safe in archive mode. Add a $49 archive plan to keep permanent access to your wedding story.",
  },
];

const TABLE_ROWS = [
  { feature: "Guests",           starter: "20",       pro: "∞",        ultra: "∞" },
  { feature: "Ava AI",           starter: "10 msgs",  pro: "∞",        ultra: "∞" },
  { feature: "Budget tracker",   starter: "Basic",    pro: "Full",     ultra: "Full" },
  { feature: "Vendor tools",     starter: "1",        pro: "∞",        ultra: "∞" },
  { feature: "Seating planner",  starter: false,      pro: true,       ultra: true },
  { feature: "Wedding website",  starter: "Preview",  pro: true,       ultra: true },
  { feature: "Invitations",      starter: false,      pro: false,      ultra: true },
  { feature: "Save the dates",   starter: false,      pro: false,      ultra: true },
  { feature: "Thank you cards",  starter: false,      pro: false,      ultra: true },
  { feature: "Guest portal",     starter: false,      pro: true,       ultra: true },
  { feature: "Collaborate",      starter: false,      pro: true,       ultra: true },
  { feature: "Support",          starter: "Email",    pro: "Priority", ultra: "Priority" },
  { feature: "Access duration",  starter: "14 days",  pro: "24 mo",    ultra: "24 mo" },
  { feature: "Price",            starter: "Free",     pro: "$99",      ultra: "$199" },
];

function CheckIcon({ color = "#0A0A0A" }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M2.5 7L5.5 10L11.5 4" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CellValue({ val }) {
  if (val === true)  return <CheckIcon color="#0A0A0A" />;
  if (val === false) return <span style={{ color: "rgba(10,10,10,0.25)", fontSize: 14 }}>—</span>;
  return <span style={{ fontSize: 13, color: "#0A0A0A", fontFamily: PJS }}>{val}</span>;
}

async function startCheckout(plan, setLoadingPlan, setCheckoutError) {
  console.log('[Checkout] Button clicked — plan:', plan);
  setLoadingPlan(plan);
  setCheckoutError(null);

  try {
    let userEmail = '';
    let userId = '';
    try {
      const me = await base44.auth.me();
      userEmail = me?.email || '';
      userId = me?.id || '';
      console.log('[Checkout] User resolved:', userEmail || '(no email)');
    } catch (authErr) {
      console.warn('[Checkout] Could not resolve user — continuing as guest:', authErr);
    }

    console.log('[Checkout] POSTing to /api/create-checkout-session with plan:', plan);

    let res;
    try {
      res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, userEmail, userId }),
      });
    } catch (networkErr) {
      console.error('[Checkout] Network error — is the API reachable?', networkErr);
      setCheckoutError('Network error — could not reach the checkout server. Please try again.');
      return;
    }

    console.log('[Checkout] Response status:', res.status, res.ok);

    // Safely parse the response — it may be HTML (e.g. Vite 404) rather than JSON
    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.error('[Checkout] Non-JSON response received:', text.slice(0, 300));
      if (!res.ok) {
        setCheckoutError(
          res.status === 404
            ? 'Checkout API not found (404). This works when deployed to Vercel — run `vercel dev` locally to test.'
            : `Server error ${res.status}. Please try again.`
        );
      } else {
        setCheckoutError('Unexpected server response. Please try again.');
      }
      return;
    }

    console.log('[Checkout] Response data:', data);

    if (data.url) {
      console.log('[Checkout] Redirecting to Stripe:', data.url);
      window.location.href = data.url;
    } else {
      const msg = data.error || 'Checkout session could not be created.';
      console.error('[Checkout] API returned error:', msg);
      setCheckoutError(msg);
    }
  } catch (err) {
    console.error('[Checkout] Unexpected error:', err);
    setCheckoutError('Something went wrong. Please try again.');
  } finally {
    setLoadingPlan(null);
  }
}

export default function Pricing() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);

  const goFree  = () => navigate("/onboarding");
  const goPro   = () => startCheckout('pro', setLoadingPlan, setCheckoutError);
  const goUltra = () => startCheckout('ultra', setLoadingPlan, setCheckoutError);

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: PJS }}>
      <PublicNav />

      {/* ── HERO ── */}
      <section style={{ position: "relative", height: "100vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src="https://res.cloudinary.com/dsr84xknv/image/upload/v1779185627/DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8854_xted4d.jpg"
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", zIndex: 1 }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)", zIndex: 2 }} />
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: 1024, margin: "0 auto", padding: "0 40px" }}>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#FFFFFF", fontFamily: PJS, margin: "0 0 24px" }}>
            Pay once.<br />Plan your entire wedding.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: "rgba(255,255,255,0.75)", maxWidth: 480, margin: "0 auto", fontFamily: PJS }}>
            No monthly fees. No subscriptions.<br />
            One payment covers your full wedding journey.
          </p>
        </div>
      </section>

      {/* ── PRICING CARDS ── */}
      <section style={{ background: "#FFFFFF", padding: "80px 24px" }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", gap: 20, alignItems: "stretch",
          flexWrap: "wrap", justifyContent: "center",
        }}>

          {/* STARTER */}
          <div style={{
            flex: "0 1 320px", minWidth: 260,
            border: "1px solid #E5E5E5",
            background: "#FAFAF9", padding: 32,
            display: "flex", flexDirection: "column",
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(10,10,10,0.4)", marginBottom: 16, fontFamily: PJS }}>
              Starter
            </p>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: PJS }}>$0</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(10,10,10,0.4)", marginBottom: 16, fontFamily: PJS }}>
              Free for 14 days
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(10,10,10,0.6)", marginBottom: 24, fontFamily: PJS }}>
              Try everything free for 14 days. No credit card required.
            </p>
            <div style={{ height: 1, background: "rgba(10,10,10,0.06)", marginBottom: 24 }} />
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {STARTER_FEATURES.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#0A0A0A", fontFamily: PJS }}>
                  <CheckIcon color="#E03553" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={goFree}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 999, fontSize: 13, fontWeight: 600,
                fontFamily: PJS, cursor: "pointer", border: "none",
                background: "#0A0A0A", color: "#FFFFFF", transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.82"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Start free — no card needed
            </button>
            <p style={{ fontSize: 12, color: "rgba(10,10,10,0.4)", textAlign: "center", marginTop: 10, fontFamily: PJS }}>
              14 days · then choose a plan
            </p>
          </div>

          {/* PRO */}
          <div style={{
            flex: "0 1 360px", minWidth: 280,
            border: "1px solid #E5E5E5",
            background: "#FAFAF9", padding: 32,
            display: "flex", flexDirection: "column",
          }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(10,10,10,0.4)", marginBottom: 16, fontFamily: PJS }}>
                Pro
              </p>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 48, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: PJS }}>$99</span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(10,10,10,0.4)", marginBottom: 16, fontFamily: PJS }}>
                One-time payment
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(10,10,10,0.6)", marginBottom: 24, fontFamily: PJS }}>
                Your complete wedding command centre. Everything you need from first plan to final dance.
              </p>
              <div style={{ height: 1, background: "rgba(10,10,10,0.06)", marginBottom: 24 }} />
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {PRO_FEATURES.map((f, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#0A0A0A", fontFamily: PJS }}>
                    <CheckIcon color="#E03553" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={goPro}
                disabled={loadingPlan === 'pro'}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  fontFamily: PJS, cursor: loadingPlan === 'pro' ? "default" : "pointer", border: "none",
                  background: "#E03553", color: "#FFFFFF", transition: "opacity 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: loadingPlan === 'pro' ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (loadingPlan !== 'pro') e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={e => { if (loadingPlan !== 'pro') e.currentTarget.style.opacity = "1"; }}
              >
                {loadingPlan === 'pro' ? <><Loader2 size={14} style={{ animation: "oi-spin 0.8s linear infinite" }} /> Redirecting…</> : "Get Pro — $99"}
              </button>
              <p style={{ fontSize: 12, color: "rgba(10,10,10,0.4)", textAlign: "center", marginTop: 10, fontFamily: PJS }}>
                24-month access · one-time payment
              </p>
          </div>

          {/* ULTRA */}
          <div style={{
            flex: "0 1 320px", minWidth: 260,
            border: "1px solid #E5E5E5",
            background: "#FAFAF9", padding: 32,
            display: "flex", flexDirection: "column",
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(10,10,10,0.4)", marginBottom: 16, fontFamily: PJS }}>
              Ultra
            </p>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: PJS }}>$199</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(10,10,10,0.4)", marginBottom: 16, fontFamily: PJS }}>
              One-time payment
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(10,10,10,0.6)", marginBottom: 24, fontFamily: PJS }}>
              Everything in Pro, plus a stunning invitation suite to match your wedding vision.
            </p>
            <div style={{ height: 1, background: "rgba(10,10,10,0.06)", marginBottom: 24 }} />
            <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(10,10,10,0.4)", marginBottom: 12, letterSpacing: "0.04em", fontFamily: PJS }}>
              Everything in Pro, plus:
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {ULTRA_EXTRAS.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#0A0A0A", fontFamily: PJS }}>
                  <CheckIcon color="#E03553" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={goUltra}
              disabled={loadingPlan === 'ultra'}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 999, fontSize: 13, fontWeight: 600,
                fontFamily: PJS, cursor: loadingPlan === 'ultra' ? "default" : "pointer",
                background: "#FFFFFF", border: "1.5px solid #0A0A0A", color: "#0A0A0A",
                transition: "background 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: loadingPlan === 'ultra' ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (loadingPlan !== 'ultra') e.currentTarget.style.background = "#F3F3F3"; }}
              onMouseLeave={e => { if (loadingPlan !== 'ultra') e.currentTarget.style.background = "#FFFFFF"; }}
            >
              {loadingPlan === 'ultra' ? <><Loader2 size={14} style={{ animation: "oi-spin 0.8s linear infinite" }} /> Redirecting…</> : "Get Ultra — $199"}
            </button>
            <p style={{ fontSize: 12, color: "rgba(10,10,10,0.4)", textAlign: "center", marginTop: 10, fontFamily: PJS }}>
              24-month access · one-time payment
            </p>
          </div>

        </div>

        {/* ── Checkout error banner ── */}
        {checkoutError && (
          <div style={{
            maxWidth: 720, margin: "0 auto", marginTop: 24,
            background: "#FEF2F2", border: "1px solid #FECACA",
            padding: "14px 20px",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
          }}>
            <p style={{ fontSize: 13, color: "#991B1B", margin: 0, lineHeight: 1.5, fontFamily: PJS, flex: 1 }}>
              {checkoutError}
            </p>
            <button
              onClick={() => setCheckoutError(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#991B1B", fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
      </section>

      {/* ── AFTER 24 MONTHS ── */}
      <section style={{ background: "#F7F7F7", padding: "40px 24px" }}>
        <div style={{
          maxWidth: 720, margin: "0 auto",
          borderLeft: "3px solid #E03553", paddingLeft: 24,
        }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#0A0A0A", marginBottom: 10, fontFamily: PJS }}>
            What happens after 24 months?
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(10,10,10,0.6)", marginBottom: 10, fontFamily: PJS }}>
            Your wedding is done — congratulations. After 24 months, your account moves to archive mode.
            Your data, photos, and memories stay safe. To keep full access to your wedding story,
            add an archive plan for a single $49 payment. No recurring fees, ever.
          </p>
          <p style={{ fontSize: 12, color: "rgba(10,10,10,0.4)", margin: 0, fontFamily: PJS }}>
            Archive access covers your guest list, photos, messages, and wedding website permanently.
          </p>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section style={{ background: "#FFFFFF", padding: "80px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", marginBottom: 40, fontFamily: PJS }}>
            Compare plans
          </h2>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: PJS }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", fontSize: 12, fontWeight: 600, color: "rgba(10,10,10,0.4)", padding: "0 0 20px", width: "40%" }} />
                  {["Starter", "Pro", "Ultra"].map(label => (
                    <th key={label} style={{
                      textAlign: "center", fontSize: 13, fontWeight: 700,
                      color: "#0A0A0A", padding: "0 16px 20px",
                    }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(10,10,10,0.05)" }}>
                    <td style={{ padding: "14px 0", fontSize: 13, color: "rgba(10,10,10,0.7)", fontFamily: PJS }}>
                      {row.feature}
                    </td>
                    {[row.starter, row.pro, row.ultra].map((val, j) => (
                      <td key={j} style={{ padding: "14px 16px", textAlign: "center" }}>
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
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
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

      {/* ── BOTTOM CTA ── */}
      <section style={{ background: "#0A0A0A", padding: "100px 24px", textAlign: "center" }}>
        <h2 style={{
          fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.02em",
          color: "#FFFFFF", marginBottom: 16, lineHeight: 1.15, fontFamily: PJS,
        }}>
          Your wedding deserves this.
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,0.6)", marginBottom: 40, fontFamily: PJS }}>
          Join thousands of couples planning with confidence,<br />
          clarity, and a little Ava magic.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={goFree}
            style={{
              padding: "14px 32px", borderRadius: 999, fontSize: 14, fontWeight: 600,
              fontFamily: PJS, cursor: "pointer", border: "none",
              background: "linear-gradient(135deg, #ec4899, #9333ea)",
              color: "#FFFFFF", transition: "opacity 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Start free trial
          </button>
          <button
            onClick={goPro}
            disabled={loadingPlan === 'pro'}
            style={{
              padding: "14px 32px", borderRadius: 999, fontSize: 14, fontWeight: 600,
              fontFamily: PJS, cursor: loadingPlan === 'pro' ? "default" : "pointer", border: "none",
              background: "#FFFFFF", color: "#0A0A0A", transition: "opacity 0.15s",
              display: "flex", alignItems: "center", gap: 8,
              opacity: loadingPlan === 'pro' ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (loadingPlan !== 'pro') e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { if (loadingPlan !== 'pro') e.currentTarget.style.opacity = "1"; }}
          >
            {loadingPlan === 'pro' ? <><Loader2 size={14} style={{ animation: "oi-spin 0.8s linear infinite" }} /> Redirecting…</> : "Get Pro — $99"}
          </button>
        </div>
      </section>

      <PublicFooter />
      <style>{`@keyframes oi-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
