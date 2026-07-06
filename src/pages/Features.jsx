import React, { useState, useRef, useEffect } from "react";
import { PHOTOS } from "@/lib/photos";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import AnimDivider from "@/components/motion/AnimDivider";
import { ArrowUpRight } from "lucide-react";
import HorizontalCardShelf from "@/components/shared/HorizontalCardShelf";
import ApplePillButton from "@/components/motion/ApplePillButton";
import FeatureTimeline from "@/components/home/FeatureTimeline";
import FeaturePlaylists from "@/components/home/FeaturePlaylists";
import FeatureGuests from "@/components/home/FeatureGuests";
import FeatureBudget from "@/components/home/FeatureBudget";
import ScrollCue from "@/components/motion/ScrollCue";

const FEATURE_ZOOM_IMAGES = [
{ src: "https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg", alt: "Wedding planning" },
{ src: "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185610/justin-follis-A7Um4oi-UYU-unsplash_bbjjam.jpg", alt: "Wedding moment" },
{ src: "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185610/jeffrey-clayton-KFtKSReIoRs-unsplash_qhubdf.jpg", alt: "Wedding moment" },
{ src: "https://res.cloudinary.com/dsr84xknv/image/upload/v1779241859/rio-syhputra-a7vmvXei7fE-unsplash_vojinz.jpg", alt: "Wedding moment" },
{ src: "https://res.cloudinary.com/dsr84xknv/image/upload/v1779218325/DTS_Misc_1__Nick_Fancher__Nick_Fancher_Photos_ID6784_fveq2c.jpg", alt: "Wedding moment" },
{ src: "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185631/DTS_Early_Honey_Moon_Tino_Renato_Photos_ID3576_v8vxs0.jpg", alt: "Wedding moment" },
{ src: "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185626/DTS_MOTHERLY_Shauna_Summers_Photos_ID10728_vz25fa.jpg", alt: "Wedding moment" }];


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

const ESSENTIALS = [
{ title: "Smart Budget Tracker", accent: "#E03553", label: "BUDGET", desc: "Track everything in one place — from flowers to favours — with real-time visuals and AI tips.", bg: PHOTOS.photoP },
{ title: "Registry Tool", accent: "#803D81", label: "REGISTRY", desc: "Connect your dream registry or build your own — stylish, mobile, and guest-friendly.", bg: PHOTOS.photoQ },
{ title: "Ultimate Planner", accent: "#6B2CAE", label: "PLANNING", desc: "The all-in-one planning workspace. Every detail, every vendor, every task.", bg: PHOTOS.photoR },
{ title: "AI Integration", accent: "#DDF762", label: "AI", desc: "Smart suggestions, personalised insights, and Ava always one step ahead.", bg: PHOTOS.photoFeatAI },
{ title: "Guest Suite", accent: "#C2E5F3", label: "GUESTS", desc: "From RSVP to seating — manage every guest with zero stress and total control.", bg: PHOTOS.photoFeatGuests },
{ title: "Collaborative Playlists", accent: "#E03553", label: "MUSIC", desc: "Curate the ultimate soundtrack. Spotify-connected, guest-friendly, effortlessly organised.", bg: PHOTOS.photoFeatMusic },
// NEW-COPY-DRAFT — seating planner mentioned nowhere on this page before (MARKETING_AUDIT.md sequence item 1)
{ title: "Seating Planner", accent: "#6B2CAE", label: "SEATING", desc: "Drag-and-drop your reception layout, assign guests table by table, and let Ava suggest the smartest arrangement.", bg: PHOTOS.photoR }];


const ACCORDION_BORDERS = ["#E03553", "#803D81", "#6B2CAE", "#DDF762", "#C2E5F3", "#0A1930", "#E03553"];
const ALL_FEATURES = [
{ title: "Advanced Guest Management", bullets: ["Unlimited guest lists", "Real-time RSVP tracking", "Dietary preference tracking", "Smart table assignments", "Guest tagging & categories", "Centralised contact management"] },
{ title: "Smart Budget Tracking", bullets: ["Budget vs. actual spend tracking", "Vendor payment scheduling", "Category-based budgeting", "Visual expense analytics", "Friendly payment reminders", "Subtle cost-saving suggestions"] },
{ title: "Timeline & Schedule Planning", bullets: ["Visual timeline builder", "Vendor coordination made easy", "Assign tasks to your crew", "Track deadlines without drama", "Share the schedule with key players", "Create your seamless day-of rundown"] },
{ title: "Collaborative Playlists", bullets: ["Spotify integration", "Let guests submit their favourite tracks", "Organise songs by vibe or moment", "Share playlists in a click", "DJ collaboration made effortless", "Create a music timeline"] },
{ title: "Photo & Memory Management", bullets: ["Collect photos from all stages", "Guests can share their moments too", "Visual memory timeline", "Create albums", "Easy downloads", "Slideshow generator"] },
{ title: "Registry Integration", bullets: ["One-click registry linking", "Sync with major platforms", "Share seamlessly with guests"] },
{ title: "Venue Management", bullets: ["Track multiple venues", "Upload contracts & notes", "Capture must-know logistics"] },
// NEW-COPY-DRAFT — vendor management mentioned nowhere on this page before (MARKETING_AUDIT.md sequence item 2)
{ title: "Vendor Management", bullets: ["Add and organise every vendor", "Track contracts and payment schedules", "Centralised contact details", "Link vendors to budget categories"] },
// NEW-COPY-DRAFT — guest polls mentioned nowhere in marketing before (MARKETING_AUDIT.md: "mentioned nowhere")
{ title: "Guest Polls", bullets: ["Pre-built poll templates — cocktails, first dance, dessert and more", "Custom polls for anything you like", "Real-time vote tracking", "Ava insights on the results"] },
// NEW-COPY-DRAFT — vows & speeches mentioned nowhere on this page before (MARKETING_AUDIT.md sequence item 4)
{ title: "Vows & Speeches", bullets: ["A dedicated writing space for vows and speeches", "AI-powered suggestions when you're stuck", "Keep every draft in one place"] },
// NEW-COPY-DRAFT — moodboard mentioned nowhere on this page before (MARKETING_AUDIT.md sequence item 5)
{ title: "Moodboard", bullets: ["Upload inspiration images", "Organise boards by venue, dress, colour palette and more", "Pinterest integration", "Share boards with your vendors"] },
// NEW-COPY-DRAFT — per-event smart RSVP, mentioned nowhere in marketing before
{ title: "Per-Event Smart RSVP", bullets: ["Invite guests to specific events — ceremony, reception, or both", "Guests RSVP and choose their meal for each event they're invited to", "Plus-ones handled per event, not just once"] },
// NEW-COPY-DRAFT — virtual guestbook, mentioned nowhere in marketing before
{ title: "Virtual Guestbook", bullets: ["Guests leave a message straight from your wedding website", "No account needed for guests to sign it", "Read every message back, any time"] },
// NEW-COPY-DRAFT — guest styling questionnaire, mentioned nowhere in marketing before
{ title: "Guest Styling Questionnaire", bullets: ["A quick quiz tells guests what to wear to your wedding", "Suggestions based on your dress code, per event", "Optional — turn it on only if you want it"] }];


const DOTS = ["#E03553", "#803D81", "#DDF762", "#6B2CAE", "#C2E5F3", "#0A1930"];

export default function Features() {
  const [openFeature, setOpenFeature] = useState(null);

  const handleCTA = () => {
    base44.auth.redirectToLogin(window.location.origin + createPageUrl("Dashboard"));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans" style={{ scrollBehavior: "smooth" }}>
      <PublicNav />
      <ScrollProgress />

      {/* ── S1: HERO ─────────────────────────────────────── */}
      <section style={{ position: "relative", height: "100vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src="https://res.cloudinary.com/dsr84xknv/image/upload/v1779185631/DTS_THE_INTERN_Shauna_Summers_Photos_ID11406_giy6nx.jpg"
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", zIndex: 1 }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)", zIndex: 2 }} />
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: 800, margin: "0 auto", padding: "0 40px" }}>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#FFFFFF", fontFamily: "'Plus Jakarta Sans', sans-serif", margin: "0 0 24px" }}>
            Everything you needed. Plus a few things you didn't expect.
          </h1>
          <ApplePillButton onClick={handleCTA} light={false}>Get started</ApplePillButton>
        </div>
        <ScrollCue />
      </section>

      {/* ── S2: ZOOM PARALLAX ────────────────────────────── */}
      <ZoomParallax images={FEATURE_ZOOM_IMAGES} />

      {/* ── S3: QUICK START ──────────────────────────────── */}
      <QuickStartSection />

      {/* ── S3: DASHBOARD ────────────────────────────────── */}
      <DashboardSection />

      {/* ── S4: AVA / ESSENTIALS ─────────────────────────── */}
      <AvaSection essentials={ESSENTIALS} />

      {/* NEW-COPY-DRAFT — daily update / AI briefing mentioned nowhere in marketing before
          (MARKETING_AUDIT.md sequence item 6 — unique differentiator, Ava-adjacent placement) */}
      <DailyUpdateSection />

      {/* ── S6: ACCORDION ────────────────────────────────── */}
      <AccordionSection features={ALL_FEATURES} borders={ACCORDION_BORDERS} dots={DOTS} openFeature={openFeature} setOpenFeature={setOpenFeature} />

      {/* ── S7: FEATURE DEEP DIVES ───────────────────────── */}
      <div style={{ background: "#FFFFFF" }}>
        <FeatureTimeline />
        <FeaturePlaylists />
        <FeatureGuests />
        <FeatureBudget />
      </div>

      {/* NEW-COPY-DRAFT — Guest Suite bundle (website builder + accommodation + transport +
          experience guide) mentioned only on Pricing before (MARKETING_AUDIT.md sequence item 7) */}
      <GuestSuiteSection />

      {/* NEW-COPY-DRAFT — universes grid: all 10 universe styles by name, with atmosphere
          descriptors pulled from src/pages/StudioUniverse.jsx's UNIVERSES data */}
      <UniversesGridSection />

      {/* ── S8: FINAL CTA ────────────────────────────────── */}
      <FinalCTASection onCTA={handleCTA} />

      <PublicFooter />
    </div>);

}

// Was a scroll-linked pinned-and-scaling image montage (7 images scaling
// 1x-9x against scroll progress via useScroll/useTransform) — a textbook
// parallax effect per the motion consistency pass. Replaced with a static
// photo grid plus the single standard reveal (opacity + small translateY),
// same images, same copy, no scroll-linked transforms.
function ZoomParallax({ images }) {
  const [ref, visible] = useScrollReveal(0.15);
  const reduced = prefersReduced();
  return (
    <section ref={ref} style={{ background: '#0A0A0A', padding: 'clamp(64px, 8vw, 120px) clamp(24px, 5vw, 64px)' }}>
      <div style={{
        textAlign: 'center', marginBottom: 56,
        opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: reduced ? 'none' : `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
      }}>
        <p style={{
          color: '#DDF762', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif",
          marginBottom: 16,
        }}>
          Scroll to explore
        </p>
        <h2 style={{
          color: '#FFFFFF', fontSize: 'clamp(32px, 4vw, 56px)',
          fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1,
          fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0,
        }}>
          Everything you needed<br />and plenty more.
        </h2>
      </div>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16,
      }}>
        {images.map((img, index) => (
          <div
            key={index}
            style={{
              aspectRatio: '4 / 3', overflow: 'hidden',
              opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)',
              transition: reduced ? 'none' : `opacity 0.7s ${EASE} ${index * 0.06}s, transform 0.7s ${EASE} ${index * 0.06}s`,
            }}
          >
            <img
              src={img.src}
              alt={img.alt || `feature-${index}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
      </div>
    </section>
  );

}

function QuickStartSection() {
  const [ref, visible] = useScrollReveal(0.2);
  return (
    <section ref={ref} style={{ background: "#0A0A0A", minHeight: "100vh", display: "flex", flexDirection: "row", overflow: "hidden" }} className="flex-col lg:flex-row">
      <div className="w-full lg:w-1/2 order-1" style={{ position: "relative", minHeight: 320, overflow: "hidden", flexShrink: 0 }}>
        <img src={PHOTOS.photoM} alt="Wedding photo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-100px)", transition: `opacity 0.9s ${EASE}, transform 1s ${EASE}` }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(194,229,243,0.12)", mixBlendMode: "multiply", pointerEvents: "none" }} />
        <div className="lg:hidden" style={{ paddingBottom: "66.66%", position: "relative" }} />
      </div>
      <div className="w-full lg:w-1/2 order-2 flex items-center" style={{ padding: "80px clamp(32px, 5vw, 64px)", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(40px)", transition: `opacity 0.9s ${EASE} 0.2s, transform 0.9s ${EASE} 0.2s` }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{ width: 40, height: 2, background: "linear-gradient(90deg,#E03553,#803D81)", marginBottom: 24 }} />
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#C2E5F3", marginBottom: 16 }}>Getting started</p>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#FFFFFF", marginBottom: 24, overflow: "visible", whiteSpace: "normal", wordBreak: "normal", hyphens: "none" }}>Quick Start Wizard</h2>
          <p style={{ color: "#AAAAAA", lineHeight: 1.7, fontSize: 16 }}>Get set up in seconds — enter your names, date, location, and vibe. No overwhelm, just momentum.</p>
        </div>
      </div>
    </section>);

}

function DashboardSection() {
  const [ref, visible] = useScrollReveal(0.2);

  const BULLETS = ["Invite your partner or planner", "Set role-based permissions", "Assign tasks with deadlines", "Real-time collaborative updates", "Shared vendor & budget views", "Manage who sees sensitive data"];
  return (
    <section ref={ref} style={{ background: "#F5F5F3", minHeight: "100vh", display: "flex", flexDirection: "row", overflow: "hidden" }} className="flex-col lg:flex-row">
      <div className="w-full lg:w-1/2 order-2 lg:order-1 flex items-center" style={{ padding: "80px clamp(32px, 5vw, 64px)", opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(60px)", transition: `opacity 0.9s ${EASE} 0.15s, transform 1s ${EASE} 0.15s` }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{ width: 40, height: 2, background: "#803D81", marginBottom: 24 }} />
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#803D81", marginBottom: 16 }}>Collaboration</p>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#0A0A0A", marginBottom: 24, overflow: "visible", whiteSpace: "normal", wordBreak: "normal", hyphens: "none" }}>Customisable Dashboard</h2>
          <p style={{ color: "#444444", lineHeight: 1.7, fontSize: 16, marginBottom: 32 }}>Invite your partner, planner, or mum. Set who sees what, and assign tasks like a pro.</p>
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
        <img src={PHOTOS.photoN} alt="Wedding photo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", opacity: visible ? 1 : 0, transition: prefersReduced() ? "none" : `opacity 0.9s ${EASE} 0.15s` }} />
        <div className="lg:hidden" style={{ paddingBottom: "66.66%", position: "relative" }} />
      </div>
    </section>);

}

function AvaSection({ essentials }) {
  const [ref, curtainUp] = useScrollReveal(0);
  return (
    <section ref={ref} style={{
      position: "relative", padding: "0 0 80px",
      overflow: "hidden",
      backgroundImage: `url(${PHOTOS.photoO})`,
      backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "scroll"
    }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,10,0.88)", zIndex: 1 }} />
      {/* Curtain reveal */}
      <div style={{ position: "absolute", inset: 0, background: "#0A0A0A", zIndex: 10, transform: curtainUp ? "translateY(-100%)" : "translateY(0)", transition: `transform 0.9s ${EASE}`, pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 3 }}>
        <div style={{ textAlign: "center", marginBottom: 48, padding: "0 clamp(24px, 4vw, 64px)", opacity: curtainUp ? 1 : 0, transition: `opacity 0.8s ${EASE} 0.15s` }}>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFF", marginBottom: 12, overflow: "visible", hyphens: "none" }}>The Essentials</h2>
        </div>
        <HorizontalCardShelf cards={essentials} />
      </div>
    </section>);

}








function AccordionSection({ features, borders, dots, openFeature, setOpenFeature }) {
  const [ref, visible] = useScrollReveal(0.1);
  return (
    <section ref={ref} style={{ background: "#F5F5F3", padding: "120px 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(32px, 6vw, 80px)" }}>
        <AnimDivider />
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: "rgba(10,10,10,0.4)", margin: "24px 0 48px" }}>All features</p>
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
              style={{ borderLeft: openFeature === i ? `3px solid ${borders[i % borders.length]}` : "3px solid transparent", paddingLeft: 16, transition: "border-color 0.2s ease" }}>
              
                <span style={{ color: "#0A0A0A", fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>{f.title}</span>
                <span style={{ fontSize: 20, fontWeight: 300, marginLeft: 16, color: openFeature === i ? borders[i % borders.length] : "rgba(10,10,10,0.4)" }}>{openFeature === i ? "−" : "+"}</span>
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

// NEW-COPY-DRAFT — Daily update / AI briefing (MARKETING_AUDIT.md: "mentioned nowhere")
function DailyUpdateSection() {
  const [ref, visible] = useScrollReveal(0.2);
  const reduced = prefersReduced();
  const BULLETS = ["Today's countdown and weekly priorities", "Smart suggestions based on what's left to do", "Guest and vendor alerts you'd otherwise miss", "Budget insights, updated automatically"];
  return (
    <section ref={ref} style={{ background: "#0A1930", padding: "clamp(64px, 8vw, 120px) clamp(24px, 5vw, 64px)" }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto", textAlign: "center",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: reduced ? "none" : `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#DDF762", marginBottom: 16 }}>Daily update</p>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#FFFFFF", marginBottom: 20 }}>
          A briefing built just for your wedding, every day
        </h2>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 16, lineHeight: 1.7, maxWidth: 640, margin: "0 auto 40px" }}>
          Ava reads your whole plan and hands you a short daily briefing — what changed, what's next, and what needs your attention.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, maxWidth: 900, margin: "0 auto", textAlign: "left" }}>
          {BULLETS.map((b, i) => (
            <div key={i} style={{ border: "1px solid rgba(255,255,255,0.12)", padding: 20, color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.5 }}>
              {b}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// NEW-COPY-DRAFT — Guest Suite bundle (website builder, accommodation, transport,
// experience guide) — currently only named on Pricing (MARKETING_AUDIT.md sequence item 7)
function GuestSuiteSection() {
  const [ref, visible] = useScrollReveal(0.2);
  const reduced = prefersReduced();
  const ITEMS = [
    { title: "Website builder", desc: "A beautiful wedding website in minutes — pick a universe, drag in your sections, publish." },
    { title: "Accommodation guide", desc: "Curate places to stay near your venue so guests always know where to book." },
    { title: "Transport guide", desc: "Share parking, rideshare and public transport details in one guest-facing page." },
    { title: "Experience guide", desc: "A local guide for out-of-town guests — restaurants, activities, things to do while they're in town." },
  ];
  return (
    <section ref={ref} style={{ background: "#F5F5F3", padding: "clamp(64px, 8vw, 120px) clamp(24px, 5vw, 64px)" }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: reduced ? "none" : `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#803D81", margin: 0 }}>Guest suite</p>
          <span style={{ borderRadius: 999, background: "rgba(10,10,10,0.06)", color: "rgba(10,10,10,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em", padding: "2px 8px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>ultra</span>
        </div>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#0A0A0A", marginBottom: 20, maxWidth: 700 }}>
          A whole digital suite for your guests
        </h2>
        <p style={{ color: "#444444", fontSize: 16, lineHeight: 1.7, maxWidth: 640, marginBottom: 40 }}>
          Beyond invitations and RSVP, Ultra gives your wedding website a full guest experience — everything they need to know, in one place.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {ITEMS.map((item, i) => (
            <div key={i} style={{ border: "1px solid rgba(10,10,10,0.08)", padding: 24 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", marginBottom: 8 }}>{item.title}</p>
              <p style={{ fontSize: 13, color: "rgba(10,10,10,0.6)", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: "rgba(10,10,10,0.4)", marginTop: 24 }}>
          See it in action on the <a href="/universes" style={{ color: "#803D81", textDecoration: "underline" }}>universes showcase</a>.
        </p>
      </div>
    </section>
  );
}

// NEW-COPY-DRAFT — universes grid. Names + atmosphere descriptors sourced directly from
// src/pages/StudioUniverse.jsx's UNIVERSES data (the live product's own theme definitions),
// not invented copy. That file currently defines 11 universes, not 10 — see PR summary.
const MARKETING_UNIVERSES = [
  { name: "Aman", tagline: "Quiet luxury" },
  { name: "Tulum", tagline: "Barefoot luxury" },
  { name: "Kyoto", tagline: "Zen & ceremony" },
  { name: "Capri", tagline: "Italian coast" },
  { name: "Tokyo", tagline: "Editorial nightlife" },
  { name: "Marrakech", tagline: "Spice & gold" },
  { name: "Paris", tagline: "Haussmann romance" },
  { name: "Amalfi", tagline: "Sun-drenched coast" },
  { name: "Sedona", tagline: "Red rock ritual" },
  { name: "Aspen", tagline: "Black tie winter" },
  { name: "Santorini", tagline: "Aegean sculptural" },
];

function UniversesGridSection() {
  const [ref, visible] = useScrollReveal(0.1);
  const reduced = prefersReduced();
  return (
    <section ref={ref} style={{ background: "#FFFFFF", padding: "clamp(64px, 8vw, 120px) clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{
          textAlign: "center", marginBottom: 48,
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: reduced ? "none" : `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "rgba(10,10,10,0.4)", marginBottom: 16 }}>Website universes</p>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#0A0A0A", margin: 0 }}>
            A universe for every wedding
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {MARKETING_UNIVERSES.map((u, i) => (
            <div
              key={u.name}
              style={{
                border: "1px solid rgba(10,10,10,0.08)", padding: "20px 16px",
                opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
                transition: reduced ? "none" : `opacity 0.7s ${EASE} ${i * 0.04}s, transform 0.7s ${EASE} ${i * 0.04}s`,
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", marginBottom: 4 }}>{u.name}</p>
              <p style={{ fontSize: 12, color: "rgba(10,10,10,0.5)", margin: 0 }}>{u.tagline}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTASection({ onCTA }) {
  const [ref, visible] = useScrollReveal(0.2);
  return (
    <section ref={ref} style={{ background: "#0A0A0A", padding: "160px 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(32px, 6vw, 80px)", transform: visible ? "scale(1)" : "scale(0.92)", opacity: visible ? 1 : 0, transition: prefersReduced() ? "none" : `transform 0.9s ${EASE}, opacity 0.7s ${EASE}` }}>
        <AnimDivider />
        <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFF", marginTop: 32, marginBottom: 24, overflow: "visible", whiteSpace: "normal", wordBreak: "normal", hyphens: "none" }}>Ready to start planning?</h2>
        <ApplePillButton onClick={onCTA}>Get started</ApplePillButton>
      </div>
    </section>);

}