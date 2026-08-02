import React from "react";
import { Link } from "react-router-dom";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import MarketingHero from "@/components/marketing/MarketingHero";
import ApplePillButton from "@/components/motion/ApplePillButton";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";

const PJS = "'Plus Jakarta Sans', sans-serif";

// Same bright, well-lit photo already proven to work with overlay={false}
// (AuthLayout.jsx's carousel) — no dark gradient, per the standing "bright
// imagery, no dark overlays" direction for this page.
const HERO_IMAGE = "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_SNOWBOUND_Daniel_Far%C3%B2_Photos_ID12431_yunnan.jpg";

const GIFT_MAILTO = "mailto:hello@openinvite.com.au?subject=I'd%20like%20to%20give%20the%20gift%20of%20Openinvite&body=Hi%20Openinvite%20team%2C%0A%0AI'd%20like%20to%20give%20Openinvite%20as%20a%20gift.%20Here's%20who%20it's%20for%3A%0A";

const STEPS = [
  {
    num: "01",
    heading: "Tell us who it's for",
    body: "Send us a quick note with the couple's name and which plan you'd like to give, Pro or Ultra.",
  },
  {
    num: "02",
    heading: "We send you a gift code",
    body: "A one-time code, ready whenever you want to share it. Card, message or in person, however you like to give a gift.",
  },
  {
    num: "03",
    heading: "They redeem it at checkout",
    body: "The couple creates their account and enters the code at checkout. It's applied instantly, no extra steps for them.",
  },
];

export default function Gifting() {
  useMarketingSeo();

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: PJS }}>
      <PublicNav />

      <MarketingHero
        image={HERO_IMAGE}
        title="Give someone a calmer wedding"
        overlay={false}
        cta={{ href: GIFT_MAILTO, label: "Give the gift" }}
      />

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
            Send us a note and we'll get a gift code your way.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <ApplePillButton href={GIFT_MAILTO}>Give the gift</ApplePillButton>
            <Link to="/pricing" style={{ textDecoration: "none" }}>
              <ApplePillButton>See what's included</ApplePillButton>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
