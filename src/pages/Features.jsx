import React, { useState, useRef, useEffect } from "react";
import { PHOTOS } from "@/lib/photos";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import AnimDivider from "@/components/motion/AnimDivider";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";
import FeatureTimeline from "@/components/home/FeatureTimeline";
import FeatureBudget from "@/components/home/FeatureBudget";
import FeatureSectionHeading, { featureBodyTextStyle } from "@/components/home/FeatureSectionHeading";
import MarketingHero from "@/components/marketing/MarketingHero";
import MarketingEndCap from "@/components/marketing/MarketingEndCap";
import { responsivePhoto } from "@/lib/marketingImage";
import FeaturesAppSection from "@/components/marketing/FeaturesAppSection";
import FeatureRow from "@/components/marketing/FeatureRow";

// Both are web exports (1280x853 and 1600x1078), so 0.34x and 0.42x of the
// device pixels their boxes need at dpr 2 is the ceiling until larger masters
// are uploaded — the ladder below stops at the real source width rather than
// advertising candidates Cloudinary would silently downgrade.
const HERO = responsivePhoto("v1779185631/DTS_THE_INTERN_Shauna_Summers_Photos_ID11406_giy6nx", 1280);
const END_CAP = responsivePhoto("DTS_CURATIVE_Chris_Abatzis_Photos_ID7678_dlsgrm", 1600);

// REPLIES AND SEATING (owner ruling 2026-10-16). Two rows built exactly like
// the quick start wizard (src/components/marketing/FeatureRow.jsx), which
// between them take over Advanced guest management's two jobs: the replies,
// and the seating. Owned Higgsfield photographs: the woman reading her phone
// (038), and the long dinner table under paper lanterns (pin_kyoto_party).
// THE BULLETS ARE FACTS (owner review of #1092, 2026-10-17), each confirmed
// in the code before it was written:
//   replies: the personal link, api/my-guest-links.js and api/send-invites.js;
//     one answer per event, RSVPPage.jsx's EventCard and api/rsvp-submit.js;
//     meal, dietary, plus-one and song on the form, RSVPPage.jsx; the
//     deadline, SendInvitesModal.jsx's RsvpDeadlineField and rsvp-submit.js;
//     the counts and the CSV with meals and tables, Guests.jsx
//   seating: round and rectangle tables, AddTableModal.jsx, on the floor
//     plan Seating.jsx imports; click a table then a name, and the unseated
//     filter, Seating.jsx; Ava's plan with plus-ones beside their guest,
//     AISeatingGenerator.jsx; one plan per event, Seating.jsx activeEventId;
//     the one PDF of layout and names, Seating.jsx handleExportSeating
const REPLIES_BULLETS = [
  "A personal RSVP link for every guest, sent by email",
  "One answer per event, from the ceremony to the reception",
  "Meal choice, dietary needs, plus-ones and song requests on the form",
  "A reply deadline you set, and the form closes after it",
  "Attending, declined and awaiting at a glance, and a CSV with every meal and table",
];
const SEATING_BULLETS = [
  "Round and rectangle tables, laid out on your venue's floor plan",
  "Click a table, choose a name, and see who is still unseated",
  "Ava drafts a plan and keeps plus-ones at their guest's table",
  "A seating plan for each event",
  "Export the layout and every table's names as one PDF",
];

// QUICK START FOLLOWS THE REFERENCE BLOCKS (owner rulings on #1092), five
// facts confirmed in src/pages/Onboarding.jsx and its steps: names, date and
// place, OnboardingStep1Names, Step2Date and Step3Location; the date and venue
// skips, Step2Date's "We haven't set a date yet" and Step3Location's "Not sure
// yet", editable later on EventDetails.jsx; the venue from Google Places with
// its photo kept, Step3Location and onboardingSave.js; guest count, then the
// optional style, setting and traditions, Step4GuestCount and
// Step5WeddingType; progress saved after every step, Onboarding.jsx. The
// budget and currency steps sit behind ONBOARDING_FORK_ON, off, so neither is
// claimed.
const QUICK_START_BULLETS = [
  "Your names, your date and where you are celebrating",
  "No date or venue yet? Skip it and add it later",
  "Find your venue on Google Places, and its photo comes with it",
  "Your guest count, then your style, setting and traditions if you want to share them",
  "Progress saves after every step, so you can pick up where you left off",
];

const REPLIES_PHOTO = responsivePhoto("hf_20260905_124238_2e0981ad-2b66-46cc-948d-a8db441b4929_whdhah", 1536);
const SEATING_PHOTO = responsivePhoto("pin_kyoto_party", 1664);

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useScrollReveal(threshold = 0.2) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());
  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(([e]) => { setVisible(e.isIntersecting); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

// WHAT THE ACCORDION COVERS, AND WHEN IT WAS LAST RULED.
//
// Owner 2026-09-17, M2: the accordion used to restate the three deep dives
// below it word for word, plus a playlist item. It was rewritten to cover the
// rest of the product, and nothing the cards above or below already say. Copy
// approved by the owner 2026-09-19 with three edits: no personalized-greeting
// claim (post-launch), the calendar-subscribe bullet restored once the owner
// confirmed CALENDAR_FEED_SECRET is set in production, and the second-answer
// bullet kept because api/rsvp-submit.js appends and rsvpAggregation.js
// resolves latest-wins.
//
// REPLACED WHOLESALE, owner walkthrough 2026-10-08, item 1 of
// goals/2026-10-08-site-fixes-batch-1.md. Eight rows, in this order, copy
// dictated verbatim. The guest-suite row and the universes row are gone: the
// first because the product no longer leads with it, the second because
// universes have their own page.
//
// CONSEQUENCE WORTH NAMING: "universe" now appears nowhere on this page. It
// was only ever in the row that went. /universes is where that story lives.
//
// FOUR BULLETS PER ROW (owner ruling 2026-10-10, site fixes batch 2), after
// batch 1 had cut each row to one sentence and the accordion lost its weight.
// The rows and their order stay as batch 1 set them. Every bullet was checked
// against the product before it shipped; the vendors row names Google Places
// because the marketplace searches it.
//
// VENDORS FOLLOWS THE REFERENCE BLOCKS (owner rulings on #1092): no still, a
// line in the reference tone and five facts, each confirmed in the code:
//   contact, quote and deposit, VendorForm.jsx and VendorList.jsx (there is no
//     amount-owed field, so the old "what is still owed" went); Google Places,
//     VendorMarketplace.jsx through api/places-search.js; one tap to your list,
//     VendorCard.jsx "Add to my vendors" and vendorPlaces.js; researching to
//     booked, VendorForm.jsx's statuses; contracts, quotes and invoices filed,
//     VendorDetailPanel.jsx's Documents tab. Nothing sends an enquiry from the
//     studio (the marketplace links out), so that bullet went too.
const ALL_FEATURES = [
{ title: "Vendors and the marketplace", body: "Find them, book them, keep them straight. Every vendor lives in one list, from the first search to the signed contract.", bullets: ["Every vendor in one place, with contact details, quote and deposit", "A marketplace connected to Google Places, with vendors worldwide", "Add a marketplace find to your vendors in one tap", "Track each one from researching to booked", "Contracts, quotes and invoices filed with each vendor"] },
{ title: "Seating chart and the visualizer", bullets: ["Click a table, choose a name, and the seat is theirs.", "See who is still unseated at a glance", "Lay out the room on your venue's floor plan.", "A seating plan for each event, from the reception to the brunch"] },
{ title: "Calendar", bullets: ["One calendar for the whole engagement", "Deadlines, vendor payments and fittings beside every event on your run sheet", "Subscribe from your phone's calendar, so an edit here reaches it on its own.", "Export the run sheet for your vendors"] },
{ title: "Ava on every page", bullets: ["A short briefing each morning: what is coming up, what needs a decision", "Ask Ava from any page, about the page you are on", "Answers drawn from your own wedding, never generic advice", "Ask what is unpaid, who has not replied, or what still needs a decision"] },
{ title: "Mood board", bullets: ["Pin the looks you keep coming back to: colors, florals, dresses, tables", "Boards for the venue, the dress, the palette, or anything you name", "A note on every pin", "Inspiration next to the plan, not across six apps"] },
{ title: "Toasts and speeches", bullets: ["Who is speaking, in what order, for how long", "A short brief and a deadline for every speaker, so nobody writes theirs in the car", "Vow drafts in the tone you choose, refined until they sound like you", "Your vows locked behind a PIN"] },
{ title: "On the day details", bullets: ["Getting there, where to stay, who to call, what to wear", "Stay and Getting here pages for out-of-town guests", "Dress code and policies in one place", "Written once, shown to guests on your Guest Suite where they need it"] },
{ title: "Registry and cash funds", bullets: ["Link the registry you already have", "Products and cash funds side by side on one registry page", "Guests give toward a honeymoon or a specific gift", "Shown to guests only when you say so"] }];


const DOTS = ["#E03553", "#803D81", "#DDF762", "#6B2CAE", "#C2E5F3", "#0A1930"];

export default function Features() {
  useMarketingSeo();
  const [openFeature, setOpenFeature] = useState(null);

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans" style={{ scrollBehavior: "smooth" }}>
      <PublicNav />
      <ScrollProgress />

      {/* ── S1: HERO ─────────────────────────────────────────
          NAMING, because this has been conflated before: THIS is the Features
          hero — "Everything you needed. Plus a few things you didn't expect."
          over the walking figure. The red block further down the page
          ("All the powerful tools, beautifully designed...") is a separate
          statement banner, NOT the hero, and is not governed by the hero rule.

          Sitewide hero rule: every marketing hero is centered horizontally and
          vertically, and only the home page hero carries a CTA button. Both
          come from MarketingHero's defaults, so this passes no align and no
          cta rather than overriding them.

          This supersedes the previous align="left" + maxWidth 565 treatment,
          which pinned the headline into the empty field left of the subject to
          keep it off her. Centered, the headline crosses the figure again; that
          is the accepted consequence of applying one consistent rule across
          every page. maxWidth returns to 1000, the value in place before that
          change. */}
      <MarketingHero
        image={HERO.src}
        srcSet={HERO.srcSet}
        imagePosition="center 30%"
        overlay={0.2}
        title="Everything you needed. Plus a few things you didn't expect."
        maxWidth={1000}
        cta={{ label: "Get started", href: "/signup" }}
      />

      {/* ── S2: STATEMENT BANNER ─────────────────────────── */}
      <section style={{ background: "#FFFFFF", padding: "80px clamp(24px, 6vw, 80px)", textAlign: "center" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <p style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, color: "#0A0A0A", fontFamily: "Plus Jakarta Sans, sans-serif", margin: 0 }}>
            Openinvite brings your guest list, budget, schedule, seating chart and Guest Suite into one connected platform, so nothing falls through the cracks.
          </p>
        </div>
      </section>

      {/* ── S3: QUICK START ──────────────────────────────── */}
      <QuickStartSection />

      {/* ── S3: DASHBOARD ────────────────────────────────── */}
      <DashboardSection />

      {/* ── S5: THE APP ──────────────────────────────────────
          Its own section above the accordion, not a ninth row (app goal,
          item 2), built as the red section's twin with the dark box kept
          (site fixes batch 3, item 2). */}
      <FeaturesAppSection />

      {/* ── S6: ACCORDION ────────────────────────────────── */}
      <AccordionSection features={ALL_FEATURES} dots={DOTS} openFeature={openFeature} setOpenFeature={setOpenFeature} />

      {/* ── S7: FEATURE DEEP DIVES ───────────────────────── */}
      {/* Timeline (white), then Replies (black) and Seating (white) in
          Advanced guest management's place, then budget (black): the page
          keeps alternating. Replies carries the Ultra badge: "Online RSVP
          pages for guests" is in ULTRA_EXTRAS (src/lib/planFeatures.js), the
          RSVP step is Ultra-gated in src/lib/journeySteps.js, and the guest's
          meal choice in src/pages/FoodBeverage.jsx (MealOptionsUltraGate). */}
      <div style={{ background: "#FFFFFF" }}>
        <FeatureTimeline />
        <FeatureRow
          name="replies"
          ground="black"
          photo="right"
          src={REPLIES_PHOTO.src}
          srcSet={REPLIES_PHOTO.srcSet}
          alt="A woman in a white slip dress smiling at her phone"
          heading="Watch the replies roll in."
          body="Every guest gets their own link. They RSVP in seconds, pick their meal, request a song (yes, ABBA counts) and it all lands in your guest list, sorted by household."
          bullets={REPLIES_BULLETS}
          ultra
        />
        <FeatureRow
          name="seating"
          ground="white"
          photo="left"
          src={SEATING_PHOTO.src}
          srcSet={SEATING_PHOTO.srcSet}
          alt="Guests seated along a long dinner table under paper lanterns at night"
          heading="Seating, minus the drama."
          body="Pick a table, tap a name, and watch the gaps close. Ava can even draft the first plan for you."
          bullets={SEATING_BULLETS}
        />
        <FeatureBudget />
      </div>

      {/* ── S8: FINAL CTA ────────────────────────────────── */}
      <MarketingEndCap
        image={END_CAP.src}
        srcSet={END_CAP.srcSet}
        alt="A couple at their wedding reception"
        title="Consider wedding planning, upgraded."
        cta={{ label: "Start planning", href: "/signup" }}
      />

      <PublicFooter />
    </div>);

}

function QuickStartSection() {
  // The row the Replies and Seating rows are built from, rendered through the
  // same component so the three cannot drift apart; only the wizard keeps its
  // pale blue wash over the photograph.
  return (
    <FeatureRow
      name="quick-start"
      ground="black"
      photo="left"
      src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_INFLUENCER_Daniel_Farò_Photos_ID8195_hcbnri.jpg"
      alt="A person setting up their wedding plan on a laptop"
      heading="Quick start wizard"
      body="Get set up in seconds: enter your names, date, location, and vibe. No overwhelm, just momentum."
      bullets={QUICK_START_BULLETS}
      tint="rgba(194,229,243,0.12)"
    />
  );
}

function DashboardSection() {
  const [ref, visible] = useScrollReveal(0.2);
  const [imgScale, setImgScale] = useState(1.15);
  useEffect(() => {
    if (prefersReduced()) return;
    const handler = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const center = rect.top + rect.height / 2 - vh / 2;
      const p = Math.max(-1, Math.min(1, center / (vh * 0.6)));
      setImgScale(1.0 + Math.abs(p) * 0.15);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const BULLETS = ["Invite your partner or planner", "Set role-based permissions", "Assign tasks with deadlines", "Real-time collaborative updates", "Shared vendor & budget views", "Manage who sees sensitive data"];
  return (
    <>
    {/* The morning band ("Morning, Isla") is gone (owner review of #1092,
        2026-10-17): no screenshot or mock card on a Features section. */}
    <section ref={ref} style={{ background: "#FFFFFF", minHeight: "100vh", display: "flex", overflow: "hidden" }} className="flex-col lg:flex-row">
      <div className="w-full lg:w-1/2 order-2 lg:order-1 flex items-center" style={{ padding: "80px clamp(32px, 5vw, 64px)", opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(60px)", transition: `opacity 0.9s ${EASE} 0.15s, transform 1s ${EASE} 0.15s` }}>
        <div style={{ maxWidth: 552 }}>
          <FeatureSectionHeading color="#0A0A0A">Customizable Dashboard</FeatureSectionHeading>
          <p style={{ ...featureBodyTextStyle, color: "#444444", marginBottom: 32 }}>Invite your partner, planner, or mom. Set who sees what, and assign tasks like a pro.</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {BULLETS.map((b, i) =>
            <li key={i} style={{ padding: "11px 0", borderBottom: i < BULLETS.length - 1 ? "1px solid #E8E8E8" : "none", color: "#444444", fontSize: 14, lineHeight: 1.5 }}>
                {b}
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="w-full lg:w-1/2 order-1 lg:order-2" style={{ position: "relative", minHeight: 320, overflow: "hidden", flexShrink: 0 }}>
        <img src={PHOTOS.photoN} alt="Wedding photo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transform: `scale(${imgScale})`, transition: prefersReduced() ? "none" : "transform 0.1s linear", opacity: visible ? 1 : 0 }} />
        <div className="lg:hidden" style={{ paddingBottom: "66.66%", position: "relative" }} />
      </div>
    </section>
    </>);

}

// Shared grid for the seating/budget video showcases — the video column

function AccordionSection({ features, dots, openFeature, setOpenFeature }) {
  const [ref, visible] = useScrollReveal(0.1);
  return (
    <section ref={ref} style={{ background: "#F5F5F3", padding: "120px 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(32px, 6vw, 80px)" }}>
        <AnimDivider />
        <div>
          {features.map((f, i) =>
          <div
            key={i}
            style={{
              borderBottom: "1px solid #E0E0DC",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: prefersReduced() ? "none" : `opacity 0.6s ${EASE} ${i * 0.08}s, transform 0.6s ${EASE} ${i * 0.08}s`
            }}>
            
              <button
              className="w-full flex items-center justify-between py-6 text-left"
              onClick={() => setOpenFeature(openFeature === i ? null : i)}
              // NO COLORED BAR (owner ruling 2026-10-10, site fixes batch 2):
              // the open row once carried a 3px left border in one of six
              // colors, and its glyph took the same color. Both are gone; the
              // row keeps its indent and the glyph is the page's text color.
              style={{ paddingLeft: 16 }}>
              
                <span style={{ color: "#0A0A0A", fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>{f.title}</span>
                <span style={{ fontSize: 20, fontWeight: 300, marginLeft: 16, color: "#0A0A0A" }}>{openFeature === i ? "−" : "+"}</span>
              </button>
              {openFeature === i &&
            <div style={{ paddingBottom: 32, paddingLeft: 20 }}>
                  {f.body && <p style={{ color: "#444444", fontSize: 15, lineHeight: 1.6, margin: "0 0 12px", maxWidth: 560 }}>{f.body}</p>}
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {f.bullets.map((b, bi) =>
                <li key={bi} style={{ padding: "10px 0", borderBottom: bi < f.bullets.length - 1 ? "1px solid #E8E8E8" : "none", color: "#444444", fontSize: 14, lineHeight: 1.5 }}>
                        {b}
                      </li>
                )}
                  </ul>
                </div>
            }
            </div>
          )}
        </div>
      </div>
    </section>);

}

// The old FinalCTASection ("Ready to start planning?" on flat black) is gone
// — every marketing page now closes on the shared MarketingEndCap instead.