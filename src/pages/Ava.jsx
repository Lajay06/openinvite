import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

// ── Scroll animation hook ─────────────────────────────────────
function useInView(threshold = 0.15, once = true) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting);
      if (e.isIntersecting && once) observer.disconnect();
    }, { threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);
  return [ref, inView];
}

// ── Count-up hook ─────────────────────────────────────────────
function useCountUp(target, inView, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (typeof target !== "number") {setVal(target);return;}
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);
  return val;
}

// ── Ava features ──────────────────────────────────────────────
const avaFeatures = [
{ value: "autofill", label: "Auto-Fill Website", description: "Ava reads your planning details and builds your entire wedding website in seconds — venue, story, FAQ, travel, all populated beautifully.", detail: "Just answer a few questions during setup and Ava writes your welcome message, love story, event details and FAQ automatically. One click, fully personalised.", icon: "✦", color: "#E03553", bg: "https://res.cloudinary.com/dsr84xknv/image/upload/v1779218328/DTS_PLAYER_TWO_JELLY_LUISE_Photos_ID13458_a53qq3.jpg", bgPosition: "center center" },
{ value: "budget", label: "Smart Budget Tips", description: "Ava monitors your spending patterns and proactively suggests where you can save — without compromising what matters most.", detail: "When your florals go over budget, Ava suggests reallocation options. When a vendor quote comes in high, Ava benchmarks it against typical costs for your area.", icon: "◈", color: "#803D81", bg: "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185602/DTS_Remote_Studio_Tino_Renato_Photos_ID3726_vgcgmv.jpg", bgPosition: "center center" },
{ value: "checklist", label: "Personalised Checklist", description: "Ava generates a custom wedding checklist based on your date, venue, style and priorities — not a generic template.", detail: "A beach elopement 3 months away needs different tasks than a 200-person ballroom wedding 12 months out. Ava knows the difference and plans accordingly.", icon: "⬡", color: "#6B2CAE", bg: "https://res.cloudinary.com/dsr84xknv/image/upload/v1779240971/kiet-trinh-L5gTFp1iGHE-unsplash_lpjp5z.jpg", bgPosition: "center center" },
{ value: "guests", label: "Guest Intelligence", description: "Ava analyses your guest list to surface insights — dietary clusters, seating conflicts, RSVP patterns — and makes smart suggestions.", detail: "Ava spots that 40% of your guests are vegetarian before you finalise the menu, or flags that two guests who should not be seated near each other are assigned to adjacent tables.", icon: "◇", color: "#DDF762", bg: "https://res.cloudinary.com/dsr84xknv/image/upload/v1779240973/DTS_Remote_Studio_Tino_Renato_Photos_ID3722_copy_qbcgts.jpg", bgPosition: "center center" },
{ value: "vows", label: "Vow Writing Assistant", description: "Stuck on your vows? Ava helps you find the right words — prompting, suggesting, and refining until they feel completely yours.", detail: "Tell Ava your story, your partner's qualities, and the tone you want (funny, heartfelt, poetic). Ava drafts something real — not a template, a starting point that sounds like you.", icon: "✧", color: "#C2E5F3", bg: "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185622/alok-verma-ARLh7m5S4VA-unsplash_eslg13.jpg", bgPosition: "center center" }];


const SLIDE_DURATION = 6000;

// ── Carousel ──────────────────────────────────────────────────
function AvaCarousel({ inView }) {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  const runLoop = useCallback((ts) => {
    if (!startRef.current) startRef.current = ts;
    const elapsed = ts - startRef.current;
    const p = Math.min(elapsed / SLIDE_DURATION, 1);
    setProgress(p);
    if (p < 1) {
      rafRef.current = requestAnimationFrame(runLoop);
    } else {
      const next = (activeRef.current + 1) % avaFeatures.length;
      setActive(next);
      startRef.current = null;
      setProgress(0);
      rafRef.current = requestAnimationFrame(runLoop);
    }
  }, []);

  useEffect(() => {
    if (inView) {
      setActive(0);
      setProgress(0);
      startRef.current = null;
      rafRef.current = requestAnimationFrame(runLoop);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [inView, runLoop]);

  const goTo = (i) => {
    cancelAnimationFrame(rafRef.current);
    setActive(i);
    startRef.current = null;
    setProgress(0);
    rafRef.current = requestAnimationFrame(runLoop);
  };

  const feature = avaFeatures[active];

  return (
    <div>
      {/* Image area */}
      <div style={{ position: "relative", height: 520, overflow: "hidden", background: "#111" }}>
        <div
          key={active}
          style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${feature.bg})`,
            backgroundSize: "cover", backgroundPosition: feature.bgPosition,
            animation: "slideUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards"
          }} />
        
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)" }} />
        <div style={{ position: "absolute", bottom: 40, left: 48, maxWidth: 600 }}>
          <div style={{ fontSize: 32, color: feature.color, marginBottom: 8 }}>{feature.icon}</div>
          <h3 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 700, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.02em", animation: "fadeIn 0.5s ease forwards" }}>{feature.label}</h3>
          <p style={{ fontSize: 16, color: "#FFFFFF", lineHeight: 1.6, maxWidth: 500, margin: 0, animation: "fadeIn 0.5s 0.1s ease both" }}>{feature.detail}</p>
        </div>
      </div>
      {/* Buttons */}
      <div style={{ display: "flex", background: "#0F0F0F" }}>
        {avaFeatures.map((f, i) =>
        <button
          key={f.value}
          onClick={() => goTo(i)}
          style={{
            flex: 1, padding: "28px 20px", borderRight: i < 4 ? "1px solid #1A1A1A" : "none",
            background: "none", border: "none", borderRight: i < 4 ? "1px solid #1A1A1A" : "none",
            cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden",
            opacity: i === active ? 1 : 0.4, transition: "opacity 0.3s ease", minHeight: 100
          }}>

            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: "0 0 6px", fontFamily: "inherit" }}>{f.label}</p>
            <p style={{ fontSize: 12, color: "#CCCCCC", margin: 0, fontFamily: "inherit", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{f.description}</p>
            <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, background: f.color, width: i === active ? `${progress * 100}%` : "0%", transition: i === active ? "none" : "width 0.2s ease" }} />
          </button>
        )}
      </div>
    </div>);

}

// ── Stats row ─────────────────────────────────────────────────
const STATS = [
{ value: "10x", label: "Faster planning", color: "#E03553", numeric: null },
{ value: 37, label: "Tools powered by Ava", color: "#803D81", numeric: 37 },
{ value: "24/7", label: "Always available", color: "#DDF762", numeric: null },
{ value: "∞", label: "Personalised to you", color: "#6B2CAE", numeric: null }];


function StatCell({ stat, index, inView }) {
  const count = useCountUp(stat.numeric ?? 0, inView && stat.numeric !== null);
  const display = stat.numeric !== null ? count : stat.value;
  return (
    <div style={{ flex: "1 1 200px", borderRight: index < 3 ? "1px solid rgba(255,255,255,0.06)" : "none", padding: "48px 40px", textAlign: "center", opacity: inView ? 1 : 0, transition: `opacity 0.6s ${index * 0.1}s ease` }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: stat.color, margin: "0 auto 16px" }} />
      <p style={{ fontSize: 56, fontWeight: 700, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.03em", lineHeight: 1 }}>{display}</p>
    </div>);

}

// ── How it works cards ────────────────────────────────────────
const HOW_CARDS = [
{ num: "01", step: "LEARNS", heading: "Understands your wedding", body: "From the moment you start, Ava absorbs your details — your style, your priorities, your story, your budget. The more you plan, the smarter Ava gets.", icon: "🧠" },
{ num: "02", step: "PLANS", heading: "Builds your entire plan", body: "Ava auto-generates your personalised checklist, populates your website, flags budget risks, and creates seating suggestions — all based on your specific wedding.", icon: "📅" },
{ num: "03", step: "DELIVERS", heading: "Handles the details", body: "When something needs attention, Ava surfaces it. When you're stuck, Ava suggests. When it's time to write your vows, Ava helps you find the words.", icon: "✦" }];


// ── Comparison table ──────────────────────────────────────────
const TABLE_ROWS = [
{ feature: "Wedding website", without: "Built manually, takes hours", with: "Auto-filled in 60 seconds" },
{ feature: "Checklist", without: "Generic template", with: "Personalised to your wedding" },
{ feature: "Budget tracking", without: "Spreadsheet chaos", with: "Real-time AI monitoring" },
{ feature: "Vow writing", without: "Blank page anxiety", with: "Guided by Ava" },
{ feature: "Guest seating", without: "Stressful trial and error", with: "Smart conflict detection" },
{ feature: "Vendor coordination", without: "Emails everywhere", with: "Centralised with reminders" },
{ feature: "Day-of schedule", without: "Printed on paper", with: "Dynamic, shareable timeline" }];


// ── Feature split section ─────────────────────────────────────
function FeatureSplit({ bg, label, labelColor, headline, body, bullets, photo, reversed, bgColor }) {
  const [ref, inView] = useInView(0.1);
  return (
    <div ref={ref} style={{ display: "flex", flexDirection: reversed ? "row-reverse" : "row", minHeight: 560, background: bgColor }}>
      <div style={{ flex: 1, padding: "80px clamp(32px,5vw,80px)", display: "flex", flexDirection: "column", justifyContent: "center", opacity: inView ? 1 : 0, transform: inView ? "none" : `translateX(${reversed ? 40 : -40}px)`, transition: "opacity 0.7s ease, transform 0.7s ease" }}>
        <h2 style={{ fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 700, color: bgColor === "#0A0A0A" || bgColor === "#0A1930" ? "#fff" : "#0A0A0A", margin: "0 0 20px", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{headline}</h2>
        <p style={{ fontSize: 16, color: bgColor === "#0A0A0A" || bgColor === "#0A1930" ? "#CCCCCC" : "#444444", lineHeight: 1.7, marginBottom: 28, maxWidth: 440 }}>{body}</p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {bullets.map((b, i) =>
          <div key={i} style={{ padding: "12px 0", borderBottom: bgColor === "#0A0A0A" || bgColor === "#0A1930" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", fontSize: 14, color: bgColor === "#0A0A0A" || bgColor === "#0A1930" ? "#FFFFFF" : "#0A0A0A" }}>
              {b}
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 1, backgroundImage: `url(${photo})`, backgroundSize: "cover", backgroundPosition: "center", minHeight: 400 }} />
    </div>);

}

// ── Main page ─────────────────────────────────────────────────
export default function AvaPage() {
  const [statsRef, statsInView] = useInView(0.2);
  const [howRef, howInView] = useInView(0.1);
  const [tableRef, tableInView] = useInView(0.1);
  const [quoteRef, quoteInView] = useInView(0.2);
  const [carouselRef, carouselInView] = useInView(0.1, false);

  return (
    <div style={{ background: "#0A0A0A", fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      <PublicNav />

      <style>{`
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes charDrop { from { transform: translateY(-80px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scrollLine { 0%,100% { opacity: 1; transform: scaleY(1); } 50% { opacity: 0.3; transform: scaleY(0.3); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes punchIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <style>{`@keyframes heroScrollLine { 0%,100% { opacity: 1; transform: scaleY(1); } 50% { opacity: 0.3; transform: scaleY(0.4); } }`}</style>
        <img
          src="https://res.cloudinary.com/dsr84xknv/image/upload/v1779217006/DTS_Misc_1__Nick_Fancher__Nick_Fancher_Photos_ID6161_isrtef.jpg"
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }}
        />
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "0 40px", maxWidth: 900, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(64px, 10vw, 120px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.0, color: "#FFFFFF", margin: "0 0 24px" }}>
            Meet Ava
          </h1>
          <p style={{ fontSize: "clamp(18px, 2.5vw, 24px)", fontWeight: 400, color: "rgba(255,255,255,0.75)", margin: "0 0 16px", lineHeight: 1.5, fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "center" }}>
            Your AI wedding planner. Always thinking one step ahead.
          </p>
        </div>
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", color: "rgba(255,255,255,0.5)", fontFamily: "Plus Jakarta Sans, sans-serif", margin: 0 }}>Scroll</p>
          <div style={{ width: 1, height: 48, background: "linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)", transformOrigin: "top", animation: "heroScrollLine 2s ease-in-out infinite" }} />
        </div>
      </section>

      {/* ── STATEMENT BANNER ─────────────────────────────────── */}
      <section style={{ background: "#FFFFFF", padding: "80px clamp(24px, 6vw, 80px)", textAlign: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, color: "#0A0A0A", fontFamily: "Plus Jakarta Sans, sans-serif", margin: 0 }}>
            Ava takes the guesswork out of planning by using intelligence to personalise your journey, give smart suggestions, and help you stay calm, clear, and totally in control.
          </p>
        </div>
      </section>

      {/* ── CAROUSEL ─────────────────────────────────────────── */}
      <section ref={carouselRef} style={{ background: "#0A0A0A", padding: "80px 0 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(24px,5vw,80px)", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(32px,4vw,56px)", fontWeight: 700, color: "#fff", margin: "0 0 48px", letterSpacing: "-0.02em", opacity: carouselInView ? 1 : 0, transform: carouselInView ? "none" : "translateY(20px)", transition: "opacity 0.6s ease, transform 0.6s ease", textAlign: "center" }}>See what Ava can do.</h2>
        </div>
        <AvaCarousel inView={carouselInView} />
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section style={{ background: '#0A0A0A', padding: '120px clamp(24px, 5vw, 80px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 700, color: '#E03553', margin: '0 0 64px', letterSpacing: '-0.02em', fontFamily: 'Plus Jakarta Sans, sans-serif', textAlign: 'center', width: '100%' }}>
            Ava learns. Ava plans. Ava delivers.
          </h2>
          <div ref={howRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.08)' }}>
            {HOW_CARDS.map((c, i) => (
              <div key={i} style={{
                background: '#0A0A0A',
                padding: 40,
                position: 'relative',
                overflow: 'hidden',
                opacity: howInView ? 1 : 0,
                transform: howInView ? 'none' : 'translateY(30px)',
                transition: `opacity 0.6s ${i * 0.1}s ease, transform 0.6s ${i * 0.1}s ease`,
              }}>
                <p style={{ position: 'absolute', top: 20, right: 24, fontSize: 64, fontWeight: 700, color: 'rgba(255,255,255,0.04)', margin: 0, lineHeight: 1, pointerEvents: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.num}</p>
                <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.15)', marginBottom: 32 }} />
                <h3 style={{ fontSize: 20, fontWeight: 600, color: '#FFFFFF', margin: '0 0 16px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.heading}</h3>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE SPLITS ───────────────────────────────────── */}
      <FeatureSplit
        bgColor="#FFFFFF"
        label="WEBSITE BUILDER"
        labelColor="#DDF762"
        headline="Your website, written by Ava."
        body="Tell Ava about your love story, your venue, your vibe. Ava writes your welcome message, populates every page, and creates a beautiful wedding website — ready in under 60 seconds."
        bullets={["Couple names, date and venue auto-populated", "Love story written from your answers", "FAQ generated from your details", "Travel info and hotel suggestions", "Personalised welcome message"]}
        photo="https://res.cloudinary.com/dsr84xknv/image/upload/v1779241785/aditya-gautama-putra-k0tGYZ6Xbhg-unsplash_z5r24i.jpg"
        reversed={false} />
      
      <FeatureSplit
        bgColor="#0A0A0A"
        label="BUDGET INTELLIGENCE"
        labelColor="#803D81"
        headline="Budget smarter, not harder."
        body="Ava tracks every dollar, benchmarks against real wedding costs, and proactively alerts you before you overspend — not after. It's like having a financial advisor who only thinks about your wedding."
        bullets={["Real-time spend vs budget alerts", "Category reallocation suggestions", "Vendor quote benchmarking", "Payment reminder automation", "Cost-saving tips tailored to your style"]}
        photo="https://res.cloudinary.com/dsr84xknv/image/upload/v1779185605/DTS_Fall_Dinner_Kristine_Isabedra_Photos_ID2915_pqoldr.jpg"
        reversed={true} />
      
      <FeatureSplit
        bgColor="#FFFFFF"
        label="VOW WRITING"
        labelColor="#E03553"
        headline="The right words, finally."
        body="Writing vows is one of the hardest parts of planning. Ava makes it easier — not by giving you a template, but by asking the right questions and helping you craft something that genuinely sounds like you."
        bullets={["Guided vow prompts based on your story", "Tone selector: funny / heartfelt / poetic / traditional", "Draft and refine in real-time", "Word count and timing guidance", "Private — only you can see it"]}
        photo="https://res.cloudinary.com/dsr84xknv/image/upload/v1779233659/DTS_Grand_Design_Daniel_Far%C3%B2_Photos_ID4152_auimyj.jpg"
        reversed={false} />
      

      {/* ── QUOTE ────────────────────────────────────────────── */}
      










      

      {/* ── COMPARISON TABLE ─────────────────────────────────── */}
      <section style={{ background: "#0A0A0A", padding: "120px clamp(24px,5vw,80px)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px,3vw,48px)", fontWeight: 700, color: "#FFFFFF", margin: "0 0 48px", letterSpacing: "-0.02em" }}>Planning with Ava vs. planning without.</h2>
          <div ref={tableRef} style={{ border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#1A1A1A" }}>
              {["", "Without Ava", "With Ava"].map((h, i) =>
                <div key={i} style={{ padding: "18px 24px", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: i === 0 ? "transparent" : "#FFFFFF", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.1)" : "none", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{h}</div>
              )}
            </div>
            {TABLE_ROWS.map((row, i) =>
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: i % 2 === 1 ? "#111111" : "#0A0A0A", borderTop: "1px solid rgba(255,255,255,0.06)", opacity: tableInView ? 1 : 0, transform: tableInView ? "none" : "translateY(8px)", transition: `opacity 0.4s ${i * 0.05}s ease, transform 0.4s ${i * 0.05}s ease` }}>
                <div style={{ padding: "18px 24px", fontSize: 14, fontWeight: 600, color: "#FFFFFF", borderRight: "1px solid rgba(255,255,255,0.06)" }}>{row.feature}</div>
                <div style={{ padding: "18px 24px", fontSize: 14, color: "rgba(255,255,255,0.35)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>{row.without}</div>
                <div style={{ padding: "18px 24px", fontSize: 14, fontWeight: 600, color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DDF762", border: "1px solid #AAB000", flexShrink: 0 }} />
                  {row.with}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>


      <PublicFooter />
    </div>);

}