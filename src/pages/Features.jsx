import React, { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
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

const FEATURE_ZOOM_IMAGES = [
{ src: "https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg", alt: "Wedding planning" },
{ src: "https://static.wixstatic.com/media/d2df22_40822e26660c4112aef53ff2526c0345~mv2.jpg", alt: "Guest management" },
{ src: "https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg", alt: "Budget tracking" },
{ src: "https://static.wixstatic.com/media/d2df22_5ea2e70835a14465be546237fd1dd55a~mv2.jpg", alt: "Timeline planning" },
{ src: "https://static.wixstatic.com/media/d2df22_f0eef5788fdd4876a0a300e43228f919~mv2.jpg", alt: "Playlists" },
{ src: "https://static.wixstatic.com/media/d2df22_e30eff6d03424dd6baf63143722b2a3d~mv2.jpg", alt: "Invitations" },
{ src: "https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg", alt: "Registry" }];


const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useScrollReveal(threshold = 0.2) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());
  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(([e]) => {if (e.isIntersecting) {setVisible(true);obs.disconnect();}}, { threshold });
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
{ title: "Collaborative Playlists", accent: "#E03553", label: "MUSIC", desc: "Curate the ultimate soundtrack. Spotify-connected, guest-friendly, effortlessly organised.", bg: PHOTOS.photoFeatMusic }];


const ACCORDION_BORDERS = ["#E03553", "#803D81", "#6B2CAE", "#DDF762", "#C2E5F3", "#0A1930", "#E03553"];
const ALL_FEATURES = [
{ title: "Advanced Guest Management", bullets: ["Unlimited guest lists", "Real-time RSVP tracking", "Dietary preference tracking", "Smart table assignments", "Guest tagging & categories", "Centralised contact management"] },
{ title: "Smart Budget Tracking", bullets: ["Budget vs. actual spend tracking", "Vendor payment scheduling", "Category-based budgeting", "Visual expense analytics", "Friendly payment reminders", "Subtle cost-saving suggestions"] },
{ title: "Timeline & Schedule Planning", bullets: ["Visual timeline builder", "Vendor coordination made easy", "Assign tasks to your crew", "Track deadlines without drama", "Share the schedule with key players", "Create your seamless day-of rundown"] },
{ title: "Collaborative Playlists", bullets: ["Spotify integration", "Let guests submit their favourite tracks", "Organise songs by vibe or moment", "Share playlists in a click", "DJ collaboration made effortless", "Create a music timeline"] },
{ title: "Photo & Memory Management", bullets: ["Collect photos from all stages", "Guests can share their moments too", "Visual memory timeline", "Create albums", "Easy downloads", "Slideshow generator"] },
{ title: "Registry Integration", bullets: ["One-click registry linking", "Sync with major platforms", "Share seamlessly with guests"] },
{ title: "Venue Management", bullets: ["Track multiple venues", "Upload contracts & notes", "Capture must-know logistics"] }];


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
      <section style={{ background: "#F5F5F3", padding: "120px 80px", borderBottom: "1px solid #E0E0DC" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          

          
          <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#0A0A0A", marginBottom: "1rem", overflow: "visible", hyphens: "none", margin: "0 0 1rem 0" }}>
            Everything you needed. Plus a few things you didn't expect.
          </h1>
          
          

          
          <ApplePillButton onClick={handleCTA} light={false}>Get started +</ApplePillButton>
        </div>
      </section>

      {/* ── S2: ZOOM PARALLAX ────────────────────────────── */}
      <ZoomParallax images={FEATURE_ZOOM_IMAGES} />

      {/* ── S3: QUICK START ──────────────────────────────── */}
      <QuickStartSection />

      {/* ── S3: DASHBOARD ────────────────────────────────── */}
      <DashboardSection />

      {/* ── S4: AVA / ESSENTIALS ─────────────────────────── */}
      <AvaSection essentials={ESSENTIALS} />

      {/* ── S5: INVITATIONS x GUEST SUITE ────────────────── */}
      <InvitationsSection />

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
            letterSpacing: '0.25em', textTransform: 'uppercase',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            marginBottom: '12px', opacity: textOpacity
          }}>
            SCROLL TO EXPLORE
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
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#C2E5F3", marginBottom: 16 }}>Getting Started</p>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#FFFFFF", marginBottom: 24, overflow: "visible", whiteSpace: "normal", wordBreak: "normal", hyphens: "none" }}>Quick Start Wizard</h2>
          <p style={{ color: "#AAAAAA", lineHeight: 1.7, fontSize: 16 }}>Get set up in seconds — enter your names, date, location, and vibe. No overwhelm, just momentum.</p>
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
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#803D81", marginBottom: 16 }}>Collaboration</p>
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
  const [ref, curtainUp] = useScrollReveal(0.2);
  return (
    <section ref={ref} style={{
      position: "relative", padding: "120px 0 80px",
      backgroundImage: `url(${PHOTOS.photoO})`,
      backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed"
    }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,10,0.88)", zIndex: 1 }} />
      {/* Curtain reveal */}
      <div style={{ position: "absolute", inset: 0, background: "#0A0A0A", zIndex: 10, transform: curtainUp ? "translateY(-100%)" : "translateY(0)", transition: `transform 0.9s ${EASE}`, pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 3 }}>
        <div style={{ textAlign: "center", marginBottom: 48, padding: "0 clamp(24px, 4vw, 64px)", opacity: curtainUp ? 1 : 0, transition: `opacity 0.8s ${EASE} 0.15s` }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#DDF762", marginBottom: 16 }}>Meet Ava</p>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 64px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFF", marginBottom: 12, overflow: "visible", hyphens: "none" }}>The Essentials</h2>
          <p style={{ color: "#DDF762", fontSize: 20 }}>AI meets 'I do'.</p>
        </div>
        <HorizontalCardShelf cards={essentials} />
      </div>
    </section>);

}



function InvitationsSection() {
  const [ref, visible] = useScrollReveal(0.2);
  return null;











}

function AccordionSection({ features, borders, dots, openFeature, setOpenFeature }) {
  const [ref, visible] = useScrollReveal(0.1);
  return (
    <section ref={ref} style={{ background: "#F5F5F3", padding: "120px 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(32px, 6vw, 80px)" }}>
        <AnimDivider />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: "rgba(10,10,10,0.4)", margin: "24px 0 48px" }}>All Features</p>
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
        <p style={{ color: "#AAAAAA", fontSize: 16, marginBottom: 40, lineHeight: 1.7 }}>Join thousands of couples planning their perfect day.</p>
        <ApplePillButton onClick={onCTA}>Get started +</ApplePillButton>
      </div>
    </section>);

}