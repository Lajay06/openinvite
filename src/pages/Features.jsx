import React, { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PHOTOS } from "@/lib/photos";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import AnimDivider from "@/components/motion/AnimDivider";
import ApplePillButton from "@/components/motion/ApplePillButton";
import FeatureTimeline from "@/components/home/FeatureTimeline";
import FeaturePlaylists from "@/components/home/FeaturePlaylists";
import FeatureGuests from "@/components/home/FeatureGuests";
import FeatureBudget from "@/components/home/FeatureBudget";
import ScrollCue from "@/components/motion/ScrollCue";
import ProductVideo from "@/components/shared/ProductVideo";
import ProductMediaFrame from "@/components/shared/ProductMediaFrame";

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
{ title: "Smart budget tracker", accent: "#E03553", label: "Budget", desc: "Track everything in one place, from flowers to favours, with real-time visuals and Ava's tips." },
{ title: "Registry tool", accent: "#803D81", label: "Registry", desc: "Connect your dream registry or build your own: stylish, mobile, guest-friendly." },
{ title: "Ultimate planner", accent: "#6B2CAE", label: "Planning", desc: "The all-in-one planning workspace. Every detail, every vendor, every task." },
{ title: "AI integration", accent: "#DDF762", label: "Ava", desc: "Smart suggestions, personalised insights, and Ava always one step ahead." }];


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

      {/* ── S5b: SEATING, REAL PRODUCT VIDEO ─────────────── */}
      <SeatingSection />

      {/* ── S5c: BUDGET, REAL PRODUCT VIDEO ──────────────── */}
      <BudgetSection />

      {/* ── S6: ACCORDION ────────────────────────────────── */}
      <AccordionSection features={ALL_FEATURES} borders={ACCORDION_BORDERS} dots={DOTS} openFeature={openFeature} setOpenFeature={setOpenFeature} />

      {/* ── S7: FEATURE DEEP DIVES ───────────────────────── */}
      <div style={{ background: "#FFFFFF" }}>
        <FeatureTimeline />
        <FeaturePlaylists />
        <FeatureGuests />
        <FeatureBudget />
      </div>

      {/* ── S8: FINAL CTA ────────────────────────────────── */}
      <FinalCTASection onCTA={handleCTA} />

      <PublicFooter />
    </div>);

}

function ZoomParallax({ images }) {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ['start start', 'end end'] });

  const scale4 = useTransform(scrollYProgress, [0, 1], [1, 4]);
  const scale5 = useTransform(scrollYProgress, [0, 1], [1, 5]);
  const scale6 = useTransform(scrollYProgress, [0, 1], [1, 6]);
  const scale8 = useTransform(scrollYProgress, [0, 1], [1, 8]);
  const scale9 = useTransform(scrollYProgress, [0, 1], [1, 9]);
  const scales = [scale4, scale5, scale6, scale5, scale6, scale8, scale9];

  const positions = [
  { top: '0', left: '0', height: '100%', width: '100%' },
  { top: '-30vh', left: '5vw', height: '30vh', width: '35vw' },
  { top: '-10vh', left: '-25vw', height: '45vh', width: '20vw' },
  { top: '0', left: '27.5vw', height: '25vh', width: '25vw' },
  { top: '27.5vh', left: '5vw', height: '25vh', width: '20vw' },
  { top: '27.5vh', left: '-22.5vw', height: '25vh', width: '30vw' },
  { top: '22.5vh', left: '25vw', height: '15vh', width: '15vw' }];


  const textOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div ref={container} style={{ position: 'relative', height: '300vh' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: '#0A0A0A' }}>
        {images.map((img, index) => {
          const scale = scales[index % scales.length];
          const pos = positions[index] || positions[0];
          return (
            <motion.div
              key={index}
              style={{
                scale,
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
              
              <div style={{
                position: 'relative',
                top: pos.top,
                left: pos.left,
                height: index === 0 ? '25vh' : pos.height,
                width: index === 0 ? '25vw' : pos.width
              }}>
                <img
                  src={img.src}
                  alt={img.alt || `feature-${index}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                
              </div>
            </motion.div>);

        })}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', zIndex: 10 }}>
          <motion.p style={{
            color: '#DDF762', fontSize: '11px', fontWeight: 500,
            letterSpacing: '0.25em',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            marginBottom: '12px', opacity: textOpacity
          }}>
            Scroll to explore
          </motion.p>
          <motion.h2 style={{
            color: '#FFFFFF', fontSize: 'clamp(24px, 3vw, 42px)',
            fontWeight: 700, letterSpacing: '-0.02em',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            opacity: textOpacity
          }}>
            Everything you needed<br />and plenty more.
          </motion.h2>
        </div>
      </div>
    </div>);

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
          <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#FFFFFF", marginBottom: 24, overflow: "visible", whiteSpace: "normal", wordBreak: "normal", hyphens: "none" }}>Quick start wizard</h2>
          <p style={{ color: "#AAAAAA", lineHeight: 1.7, fontSize: 16 }}>Get set up in seconds: enter your names, date, location, and vibe. No overwhelm, just momentum.</p>
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
        <img src={PHOTOS.photoN} alt="Wedding photo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transform: `scale(${imgScale})`, transition: prefersReduced() ? "none" : "transform 0.1s linear", opacity: visible ? 1 : 0 }} />
        <div className="lg:hidden" style={{ paddingBottom: "66.66%", position: "relative" }} />
      </div>
    </section>);

}

function AvaSection({ essentials }) {
  const [ref, curtainUp] = useScrollReveal(0);
  return (
    <section ref={ref} style={{ position: "relative", padding: "140px clamp(24px, 6vw, 80px)", background: "#0A0A0A" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64, opacity: curtainUp ? 1 : 0, transition: `opacity 0.8s ${EASE} 0.15s` }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#DDF762", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 16 }}>
            What's included
          </p>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 64px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFF", margin: 0, overflow: "visible", hyphens: "none" }}>The essentials</h2>
        </div>
        <EssentialsGrid items={essentials} visible={curtainUp} />
      </div>
    </section>);

}

// A clean, considered grid on a solid background — no photo behind it, no
// per-row left/right text split (the round-2 layout put the title on the
// left and the description on the right of the same row, which broke
// awkwardly at in-between widths). Each cell is one consistent vertical
// stack: label, title, description, all left-aligned, same hierarchy in
// every cell.
function EssentialsGrid({ items, visible }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1px",
      background: "rgba(255,255,255,0.08)",
    }}>
      {items.map((item, i) => (
        <div
          key={item.title}
          style={{
            background: "#0A0A0A", padding: "48px 40px",
            opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: `opacity 0.6s ${EASE} ${0.1 + i * 0.08}s, transform 0.6s ${EASE} ${0.1 + i * 0.08}s`,
          }}
        >
          <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: item.accent, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 20 }}>
            {item.label}
          </span>
          <h3 style={{ color: "#FFF", fontWeight: 700, fontSize: "clamp(24px, 2.2vw, 32px)", letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 14px" }}>
            {item.title}
          </h3>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 280 }}>
            {item.desc}
          </p>
        </div>
      ))}
    </div>
  );
}



function SeatingSection() {
  const [ref, visible] = useScrollReveal(0.2);
  return (
    <section ref={ref} style={{ background: "#F5F5F3", padding: "120px clamp(32px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 48, alignItems: "center" }}>
        <div style={{
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#803D81", marginBottom: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Seating
          </p>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 24 }}>
            A real canvas for a real guest list.
          </h2>
          <p style={{ color: "#444444", lineHeight: 1.7, fontSize: 16 }}>
            Drag tables into place, assign guests one at a time or let Ava suggest a starting layout. This is an actual recording of the seating tool, not a mockup.
          </p>
        </div>
        <div style={{
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${EASE} 0.1s, transform 0.7s ${EASE} 0.1s`,
        }}>
          <ProductMediaFrame aspectRatio="16/10" maxWidth="none" dark={false}>
            <ProductVideo
              mp4="https://res.cloudinary.com/dsr84xknv/video/upload/product-shots/flow-02-seating-exploration.mp4"
              webm="https://res.cloudinary.com/dsr84xknv/video/upload/product-shots/flow-02-seating-exploration.webm"
              poster="https://res.cloudinary.com/dsr84xknv/image/upload/product-shots/flow-02-seating-exploration-poster.jpg"
              alt="Screen recording of the Openinvite seating canvas"
            />
          </ProductMediaFrame>
        </div>
      </div>
    </section>
  );
}

function BudgetSection() {
  const [ref, visible] = useScrollReveal(0.2);
  return (
    <section ref={ref} style={{ background: "#FFFFFF", padding: "120px clamp(32px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 48, alignItems: "center" }}>
        <div style={{
          order: 2,
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
        }}>
          <ProductMediaFrame aspectRatio="16/10" maxWidth="none" dark={false}>
            <ProductVideo
              mp4="https://res.cloudinary.com/dsr84xknv/video/upload/product-shots/flow-04-budget-tracker.mp4"
              webm="https://res.cloudinary.com/dsr84xknv/video/upload/product-shots/flow-04-budget-tracker.webm"
              poster="https://res.cloudinary.com/dsr84xknv/image/upload/product-shots/flow-04-budget-tracker-poster.jpg"
              alt="Screen recording of the real Openinvite budget tracker"
            />
          </ProductMediaFrame>
        </div>
        <div style={{
          order: 1,
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${EASE} 0.1s, transform 0.7s ${EASE} 0.1s`,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#E03553", marginBottom: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Budget
          </p>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 24 }}>
            Every dollar, in real time.
          </h2>
          <p style={{ color: "#444444", lineHeight: 1.7, fontSize: 16 }}>
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
              style={{ borderLeft: openFeature === i ? `3px solid ${borders[i]}` : "3px solid transparent", paddingLeft: 16, transition: "border-color 0.2s ease" }}>
              
                <span style={{ color: "#0A0A0A", fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>{f.title}</span>
                <span style={{ fontSize: 20, fontWeight: 300, marginLeft: 16, color: openFeature === i ? borders[i] : "rgba(10,10,10,0.4)" }}>{openFeature === i ? "−" : "+"}</span>
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

function FinalCTASection({ onCTA }) {
  const [ref, visible] = useScrollReveal(0.2);
  return (
    <section ref={ref} style={{ background: "#0A0A0A", padding: "160px 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(32px, 6vw, 80px)", transform: visible ? "scale(1)" : "scale(0.92)", opacity: visible ? 1 : 0, transition: prefersReduced() ? "none" : `transform 0.9s ${EASE}, opacity 0.7s ${EASE}` }}>
        <AnimDivider />
        <h2 style={{ fontSize: "clamp(32px, 4vw, 64px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFF", marginTop: 32, marginBottom: 24, overflow: "visible", whiteSpace: "normal", wordBreak: "normal", hyphens: "none" }}>Ready to start planning?</h2>
        <ApplePillButton onClick={onCTA}>Get started</ApplePillButton>
      </div>
    </section>);

}