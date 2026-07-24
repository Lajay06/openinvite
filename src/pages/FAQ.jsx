import React from "react";
import { Link } from "react-router-dom";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ApplePillButton from "@/components/motion/ApplePillButton";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";
import { useFaqStructuredData } from "@/hooks/useFaqStructuredData";

const PJS = "'Plus Jakarta Sans', sans-serif";

// Plain, factual, quotable prose (AEO/SEO batch, item 4) — 2 to 4
// sentences per answer, the format AI assistants lift directly. Kept in
// sync with useFaqStructuredData's FAQPage markup below (same array, one
// source of truth) and with the live pricing shown on /pricing (AUD 79 /
// 149, approx. US$50 / US$95).
const FAQS = [
  {
    q: "What is Openinvite?",
    a: "Openinvite is a wedding planning app and wedding website builder for couples. It combines guest management, budget tracking, a wedding website, digital wedding invitations and an AI wedding assistant called Ava in one platform, for a single one-time payment instead of a subscription.",
  },
  {
    q: "How much does it cost? Is it really one payment?",
    a: "Yes. Openinvite is a one-time payment, not a subscription. Pro is $79 AUD (approximately US$50) and Ultra is $149 AUD (approximately US$95), each covering 24 months of access with no monthly fees.",
  },
  {
    q: "What's included in Pro versus Ultra?",
    a: "Pro covers the full wedding planning toolkit: guest and RSVP management, budget tracking, vendor management, a seating planner, a schedule and Ava, the AI assistant. Ultra includes everything in Pro plus the digital suite: a wedding website with premium design themes, digital invitations, and online RSVP pages for guests.",
  },
  {
    q: "What are design universes?",
    a: "Design universes are Openinvite's fully designed wedding website themes. There are 20 universes to choose from, each setting the fonts, colours and style for your wedding website, invitations and printed pieces, inspired by destinations like Tulum, Kyoto and Paris.",
  },
  {
    q: "Who is Ava?",
    a: "Ava is the AI wedding planning assistant built into Openinvite. She helps with your wedding checklist, budget suggestions, vow writing and general planning advice, personalised to your wedding details.",
  },
  {
    q: "Do guests need an account to RSVP?",
    a: "No. Guests RSVP through a unique link sent to them, with no Openinvite account or login required. The couple manages every response from their own guest list.",
  },
  {
    q: "Can someone help me plan? Can I add a collaborator?",
    a: "Yes. A partner, wedding planner or family member can be invited as a collaborator to help plan. Collaborators can be given access to specific parts of the planning process, like the guest list.",
  },
  {
    q: "Can guests see who else is coming?",
    a: "Only if the couple turns this on. The \"who's coming\" guest list display is an optional, off-by-default setting the couple controls, so guests only see who else is attending when the couple chooses to share it.",
  },
  {
    q: "Does Openinvite work in the US? What currencies do you support?",
    a: "Yes, Openinvite works for couples anywhere, including the US. Pricing is charged in Australian dollars with an approximate US dollar price shown for reference, and payment is processed securely through Stripe.",
  },
];

export default function FAQ() {
  useMarketingSeo();
  useFaqStructuredData(FAQS);

  const handleCTA = () => {
    base44.auth.redirectToLogin(window.location.origin + createPageUrl("Dashboard"));
  };

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: PJS }}>
      <PublicNav />

      {/* ── HERO ── */}
      <section style={{ background: "#F5F5F3", padding: "120px 24px 80px", borderBottom: "1px solid #E0E0DC" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#0A0A0A", margin: "0 0 16px", fontFamily: PJS }}>
            Frequently asked questions
          </h1>
          <p style={{ fontSize: 16, color: "rgba(10,10,10,0.6)", lineHeight: 1.7, margin: 0, fontFamily: PJS }}>
            Everything you need to know about planning your wedding with Openinvite.
          </p>
        </div>
      </section>

      {/* ── FAQ LIST ── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>
          {FAQS.map((faq, i) => (
            <div key={i}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0A0A0A", marginBottom: 10, fontFamily: PJS }}>
                {faq.q}
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: "rgba(10,10,10,0.6)", margin: 0, fontFamily: PJS }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "#0A0A0A", padding: "120px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, color: "#FFFFFF", marginBottom: 16, lineHeight: 1.15, fontFamily: PJS }}>
            Still have questions?
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 40, lineHeight: 1.7, fontFamily: PJS }}>
            Get in touch with the Openinvite team, or start planning for free and see it for yourself.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <ApplePillButton onClick={handleCTA}>Start for free +</ApplePillButton>
            <Link to="/Contact" style={{ textDecoration: "none" }}>
              <ApplePillButton>Contact us +</ApplePillButton>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
