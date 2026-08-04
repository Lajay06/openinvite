import React, { useState, useRef, useEffect } from "react";
import { PHOTOS } from "@/lib/photos";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import AnimDivider from "@/components/motion/AnimDivider";
import ApplePillButton from "@/components/motion/ApplePillButton";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";
import FeatureTimeline from "@/components/home/FeatureTimeline";
import FeatureGuests from "@/components/home/FeatureGuests";
import FeatureBudget from "@/components/home/FeatureBudget";
import FeatureSectionHeading, { featureBodyTextStyle } from "@/components/home/FeatureSectionHeading";
import MarketingHero from "@/components/marketing/MarketingHero";
import ProductVideo from "@/components/shared/ProductVideo";
import ProductMediaFrame from "@/components/shared/ProductMediaFrame";


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

const ACCORDION_BORDERS = ["#E03553", "#803D81", "#6B2CAE", "#DDF762", "#C2E5F3", "#0A1930", "#E03553"];
const ALL_FEATURES = [
{ title: "Advanced guest management", bullets: ["Unlimited guest lists", "Real-time RSVP tracking", "Dietary preference tracking", "Smart table assignments", "Guest tagging & categories", "Centralised contact management"] },
{ title: "Smart budget tracking", bullets: ["Budget vs. actual spend tracking", "Vendor payment scheduling", "Category-based budgeting", "Visual expense analytics", "Friendly payment reminders", "Subtle cost-saving suggestions"] },
{ title: "Timeline & schedule planning", bullets: ["Visual timeline builder", "Vendor coordination made easy", "Assign tasks to your crew", "Track deadlines without drama", "Share the schedule with key players", "Create your seamless day-of rundown"] },
{ title: "Collaborative playlists", bullets: ["Spotify integration", "Let guests submit their favourite tracks", "Organise songs by vibe or moment", "Share playlists in a click", "DJ collaboration made effortless", "Create a music timeline"] },
{ title: "Photo & memory management", bullets: ["Collect photos from all stages", "Guests can share their moments too", "Visual memory timeline", "Create albums", "Easy downloads", "Slideshow generator"] },
{ title: "Registry integration", bullets: ["One-click registry linking", "Sync with major platforms", "Share seamlessly with guests"] },
{ title: "Venue management", bullets: ["Track multiple venues", "Upload contracts & notes", "Capture must-know logistics"] }];


const DOTS = ["#E03553", "#803D81", "#DDF762", "#6B2CAE", "#C2E5F3", "#0A1930"];

export default function Features() {
  useMarketingSeo();
  const [openFeature, setOpenFeature] = useState(null);

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans" style={{ scrollBehavior: "smooth" }}>
      <PublicNav />
      <ScrollProgress />

      {/* ── S1: HERO ─────────────────────────────────────── */}
      <MarketingHero
        image="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1779185631/DTS_THE_INTERN_Shauna_Summers_Photos_ID11406_giy6nx.jpg"
        imagePosition="center 30%"
        title="Everything you needed. Plus a few things you didn't expect."
        cta={{ label: "Get started", href: "/signup" }}
        maxWidth={1000}
      />

      {/* ── S2: STATEMENT BANNER ─────────────────────────── */}
      <section style={{ background: "#FFFFFF", padding: "80px clamp(24px, 6vw, 80px)", textAlign: "center" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <p style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, color: "#0A0A0A", fontFamily: "Plus Jakarta Sans, sans-serif", margin: 0 }}>
            Openinvite brings your guest list, budget, schedule, seating chart and website into one connected platform, so nothing falls through the cracks.
          </p>
        </div>
      </section>

      {/* ── S3: QUICK START ──────────────────────────────── */}
      <QuickStartSection />

      {/* ── S3: DASHBOARD ────────────────────────────────── */}
      <DashboardSection />

      {/* ── S5b: SEATING, REAL PRODUCT VIDEO ─────────────── */}
      <SeatingSection />

      {/* ── S5c: BUDGET, REAL PRODUCT VIDEO ──────────────── */}
      <BudgetSection />

      {/* ── S6: ACCORDION ────────────────────────────────── */}
      <AccordionSection features={ALL_FEATURES} borders={ACCORDION_BORDERS} dots={DOTS} openFeature={openFeature} setOpenFeature={setOpenFeature} />

      {/* ── S7: FEATURE DEEP DIVES ───────────────────────── */}
      <div style={{ background: "#FFFFFF" }}>
        <FeatureTimeline />
        <FeatureGuests />
        <FeatureBudget />
      </div>

      {/* ── S8: FINAL CTA ────────────────────────────────── */}
      <FinalCTASection />

      <PublicFooter />
    </div>);

}

function QuickStartSection() {
  const [ref, visible] = useScrollReveal(0.2);
  return (
    <section ref={ref} style={{ background: "#0A0A0A", minHeight: "100vh", display: "flex", flexDirection: "row", overflow: "hidden" }} className="flex-col lg:flex-row">
      <div className="w-full lg:w-1/2 order-1" style={{ position: "relative", minHeight: 320, overflow: "hidden", flexShrink: 0 }}>
        <img src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_INFLUENCER_Daniel_Farò_Photos_ID8195_hcbnri.jpg" alt="A person setting up their wedding plan on a laptop" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-100px)", transition: `opacity 0.9s ${EASE}, transform 1s ${EASE}` }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(194,229,243,0.12)", mixBlendMode: "multiply", pointerEvents: "none" }} />
        <div className="lg:hidden" style={{ paddingBottom: "66.66%", position: "relative" }} />
      </div>
      <div className="w-full lg:w-1/2 order-2 flex items-center" style={{ padding: "80px clamp(32px, 5vw, 64px)", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(40px)", transition: `opacity 0.9s ${EASE} 0.2s, transform 0.9s ${EASE} 0.2s` }}>
        <div style={{ maxWidth: 552 }}>
          <FeatureSectionHeading color="#FFFFFF">Quick start wizard</FeatureSectionHeading>
          <p style={{ ...featureBodyTextStyle, color: "rgba(255,255,255,0.4)" }}>Get set up in seconds: enter your names, date, location, and vibe. No overwhelm, just momentum.</p>
        </div>
      </div>
    </section>);

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
    <section ref={ref} style={{ background: "#F5F5F3", minHeight: "100vh", display: "flex", flexDirection: "row", overflow: "hidden" }} className="flex-col lg:flex-row">
      <div className="w-full lg:w-1/2 order-2 lg:order-1 flex items-center" style={{ padding: "80px clamp(32px, 5vw, 64px)", opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(60px)", transition: `opacity 0.9s ${EASE} 0.15s, transform 1s ${EASE} 0.15s` }}>
        <div style={{ maxWidth: 552 }}>
          <FeatureSectionHeading color="#0A0A0A">Customisable Dashboard</FeatureSectionHeading>
          <p style={{ ...featureBodyTextStyle, color: "#444444", marginBottom: 32 }}>Invite your partner, planner, or mum. Set who sees what, and assign tasks like a pro.</p>
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
    </section>);

}

// Shared grid for the seating/budget video showcases — the video column
// gets more room than the text (1.15fr vs 1fr) so the media reads as the
// main event, not an equal-weight afterthought. Single column on mobile.
function FeatureVideoGridStyle() {
  return (
    <style>{`
      .feature-video-grid { display: grid; grid-template-columns: 1fr; gap: 56px; align-items: center; }
      @media (min-width: 900px) {
        .feature-video-grid { grid-template-columns: 1.15fr 1fr; gap: 72px; }
      }
    `}</style>
  );
}

function SeatingSection() {
  const [ref, visible] = useScrollReveal(0.2);
  return (
    <section ref={ref} style={{ background: "#F5F5F3", padding: "160px clamp(32px, 6vw, 80px)" }}>
      <FeatureVideoGridStyle />
      <div className="feature-video-grid" style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div style={{
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${EASE} 0.1s, transform 0.7s ${EASE} 0.1s`,
        }}>
          <ProductMediaFrame aspectRatio="16/10" maxWidth="none" dark={false}>
            <ProductVideo
              mp4="https://res.cloudinary.com/dsr84xknv/video/upload/product-shots/flow-02-seating-exploration.mp4"
              webm="https://res.cloudinary.com/dsr84xknv/video/upload/product-shots/flow-02-seating-exploration.webm"
              poster="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/product-shots/flow-02-seating-exploration-poster.jpg"
              alt="Screen recording of the Openinvite seating canvas"
            />
          </ProductMediaFrame>
        </div>
        <div style={{
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
        }}>
          <FeatureSectionHeading color="#0A0A0A" style={{ fontSize: "clamp(32px, 4.2vw, 56px)", lineHeight: 1.08, marginBottom: 28 }}>
            A real canvas for a real guest list.
          </FeatureSectionHeading>
          <p style={{ ...featureBodyTextStyle, color: "#444444", lineHeight: 1.75, fontSize: 18, maxWidth: 420 }}>
            Drag tables into place, assign guests one at a time or let Ava suggest a starting layout. This is an actual recording of the seating tool, not a mockup.
          </p>
        </div>
      </div>
    </section>
  );
}

function BudgetSection() {
  const [ref, visible] = useScrollReveal(0.2);
  return (
    <section ref={ref} style={{ background: "#FFFFFF", padding: "160px clamp(32px, 6vw, 80px)" }}>
      <FeatureVideoGridStyle />
      <div className="feature-video-grid" style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div style={{
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${EASE} 0.1s, transform 0.7s ${EASE} 0.1s`,
        }}>
          <ProductMediaFrame aspectRatio="16/10" maxWidth="none" dark={false}>
            <ProductVideo
              mp4="https://res.cloudinary.com/dsr84xknv/video/upload/product-shots/flow-04-budget-tracker.mp4"
              webm="https://res.cloudinary.com/dsr84xknv/video/upload/product-shots/flow-04-budget-tracker.webm"
              poster="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/product-shots/flow-04-budget-tracker-poster.jpg"
              alt="Screen recording of the real Openinvite budget tracker"
            />
          </ProductMediaFrame>
        </div>
        <div style={{
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
        }}>
          <FeatureSectionHeading color="#0A0A0A" style={{ fontSize: "clamp(32px, 4.2vw, 56px)", lineHeight: 1.08, marginBottom: 28 }}>
            Every dollar, in real time.
          </FeatureSectionHeading>
          <p style={{ ...featureBodyTextStyle, color: "#444444" }}>
            Budget versus actual spend, category by category. This is the real tracker with a real 201-guest wedding's numbers in it.
          </p>
        </div>
      </div>
    </section>
  );
}


function AccordionSection({ features, borders, dots, openFeature, setOpenFeature }) {
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
              style={{ borderLeft: openFeature === i ? `3px solid ${borders[i]}` : "3px solid transparent", paddingLeft: 16, transition: "border-color 0.2s ease" }}>
              
                <span style={{ color: "#0A0A0A", fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>{f.title}</span>
                <span style={{ fontSize: 20, fontWeight: 300, marginLeft: 16, color: openFeature === i ? borders[i] : "rgba(10,10,10,0.6)" }}>{openFeature === i ? "−" : "+"}</span>
              </button>
              {openFeature === i &&
            <div style={{ paddingBottom: 32, paddingLeft: 20 }}>
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

function FinalCTASection() {
  const [ref, visible] = useScrollReveal(0.2);
  return (
    <section ref={ref} style={{ background: "#0A0A0A", padding: "160px 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(32px, 6vw, 80px)", textAlign: "center", transform: visible ? "scale(1)" : "scale(0.92)", opacity: visible ? 1 : 0, transition: prefersReduced() ? "none" : `transform 0.9s ${EASE}, opacity 0.7s ${EASE}` }}>
        <AnimDivider />
        <h2 style={{ fontSize: "clamp(32px, 4vw, 64px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFF", marginTop: 32, marginBottom: 24, overflow: "visible", whiteSpace: "normal", wordBreak: "normal", hyphens: "none" }}>Ready to start planning?</h2>
        <ApplePillButton href="/signup">Get started</ApplePillButton>
      </div>
    </section>);

}