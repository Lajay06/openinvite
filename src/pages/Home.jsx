/**
 * Home — the shopfront.
 *
 * Nine sections, built from claude/homepage-copy.md, which is the copy source
 * of record. The copy in that document's blockquotes is the spec: it is built
 * verbatim, and the annotations around it are part of the spec too.
 *
 * ORDER IS THE ARGUMENT: promise, proof, system, credibility, trust, price,
 * bonus, objections, ask. Moving the invitation up breaks the positioning.
 * Moving pricing down means the completeness claim arrives after the reader has
 * already decided we are expensive. Do not reorder these without going back to
 * the copy document.
 *
 * Standing prohibitions from the page-level notes: no logo wall, no testimonial
 * section until there are real beta couples (it goes between 4 and 5 when there
 * are), no countdown, no urgency mechanic, no percentage indicator anywhere,
 * and nothing competing with the single CTA in section 9.
 */
import React from "react";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";
import { useOrganizationStructuredData } from "@/hooks/useOrganizationStructuredData";

import HeroSection from "@/components/homepage/HeroSection";
import DailyPageSection from "@/components/homepage/DailyPageSection";
import WhatsInItSection from "@/components/homepage/WhatsInItSection";
import AntiGenericSection from "@/components/homepage/AntiGenericSection";
import CalmSection from "@/components/homepage/CalmSection";
import PricingSection from "@/components/homepage/PricingSection";
import InvitationSection from "@/components/homepage/InvitationSection";
import QuestionsSection from "@/components/homepage/QuestionsSection";
import FooterCtaSection from "@/components/homepage/FooterCtaSection";

const DAILY_PAGE_ID = "the-daily-page";

export default function Home() {
  useMarketingSeo();
  useOrganizationStructuredData();

  const start = () => { window.location.href = "/signup"; };

  // The hero's secondary CTA scrolls to section 2 rather than opening
  // anything, per its build note.
  const seeHow = () => {
    const el = document.getElementById(DAILY_PAGE_ID);
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: "#FFFFFF" }}>
      <PublicNav />

      <HeroSection onStart={start} onSeeHow={seeHow} />
      <DailyPageSection id={DAILY_PAGE_ID} />
      <WhatsInItSection />
      <AntiGenericSection />
      <CalmSection />
      <PricingSection />
      <InvitationSection />
      <QuestionsSection />
      <FooterCtaSection onStart={start} />

      <PublicFooter />
    </div>
  );
}
