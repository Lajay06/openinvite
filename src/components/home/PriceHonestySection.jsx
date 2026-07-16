/**
 * PriceHonestySection — replaces the old "So, why us?" rotating photo ring.
 *
 * The ring never answered its own question — it just spun 20 stock photos.
 * This section answers it with the thing that actually differentiates
 * Openinvite: everywhere else, wedding planning is six separate tools with
 * six separate bills. Here it's one price. The line items below are
 * illustrative of what stitching a planning stack together typically costs
 * — not a claim about any named competitor's current pricing.
 */
import { useRef, useState, useEffect } from "react";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const LINE_ITEMS = [
  { label: "Guest list & RSVP tracking", note: "a standalone tool", price: 20, unit: "/mo" },
  { label: "Wedding website builder", note: "plus hosting", price: 25, unit: "/mo" },
  { label: "Digital invitation design", note: "per design, one use", price: 99, unit: "" },
  { label: "Budget & vendor tracking", note: "a spreadsheet upgrade", price: 12, unit: "/mo" },
  { label: "Seating chart planner", note: "one-time licence", price: 20, unit: "" },
  { label: "An AI planning assistant", note: "mostly, nowhere at all", price: 0, unit: "" },
];

const TOTAL = LINE_ITEMS.reduce((sum, item) => sum + item.price, 0);

export default function PriceHonestySection() {
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const reduced = prefersReduced();

  useEffect(() => {
    if (reduced) { setProgress(1); return; }
    let rafId = null;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scrollable = el.offsetHeight - window.innerHeight;
        const scrolled = -rect.top;
        setProgress(Math.max(0, Math.min(1, scrollable > 0 ? scrolled / scrollable : 1)));
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => { window.removeEventListener("scroll", handleScroll); if (rafId) cancelAnimationFrame(rafId); };
  }, [reduced]);

  // Reveal timeline across the scroll: kicker fades 0→0.08, each line item
  // steps in across 0.12→0.62, the running total ticks 0.55→0.72, the
  // strike-through + reveal lands 0.72→0.86, holds to 1.
  const kickerOpacity = 1 - Math.min(1, progress / 0.08);
  const itemStep = 0.5 / LINE_ITEMS.length;
  const itemProgress = (i) => Math.max(0, Math.min(1, (progress - 0.12 - i * itemStep) / (itemStep * 0.8)));
  const totalTickProgress = Math.max(0, Math.min(1, (progress - 0.55) / 0.17));
  const displayedTotal = Math.round(TOTAL * totalTickProgress);
  const revealProgress = Math.max(0, Math.min(1, (progress - 0.72) / 0.14));

  return (
    <div ref={sectionRef} style={{ position: "relative", height: "320vh", background: "#0A0A0A" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 clamp(24px, 6vw, 80px)", width: "100%" }}>

          {/* Kicker — the question, fading as the answer arrives */}
          <p style={{
            position: "absolute", top: "18%", left: 0, right: 0, textAlign: "center",
            fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 600, color: "#FFFFFF",
            letterSpacing: "-0.02em", fontFamily: "'Plus Jakarta Sans', sans-serif",
            opacity: kickerOpacity, pointerEvents: "none", margin: 0,
          }}>
            So, why us?
          </p>

          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#E03553",
            fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 20,
            opacity: 1 - kickerOpacity,
          }}>
            The honest version
          </p>

          {/* Itemised "stitching it together" receipt */}
          <div style={{ opacity: 1 - kickerOpacity }}>
            {LINE_ITEMS.map((item, i) => {
              const p = itemProgress(i);
              const struck = totalTickProgress > 0.05;
              return (
                <div key={item.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16,
                  padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.1)",
                  opacity: p, transform: `translateY(${(1 - p) * 14}px)`,
                }}>
                  <span style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#FFFFFF", fontFamily: "'Plus Jakarta Sans', sans-serif", position: "relative" }}>
                    {item.label}
                    <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{item.note}</span>
                    {struck && (
                      <span style={{
                        position: "absolute", left: 0, top: "38%", height: 1, background: "rgba(255,255,255,0.5)",
                        width: "100%", transform: "scaleX(1)", transformOrigin: "left",
                        transition: reduced ? "none" : `transform 0.4s ${EASE}`,
                      }} />
                    )}
                  </span>
                  <span style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "rgba(255,255,255,0.6)", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap" }}>
                    {item.price > 0 ? `$${item.price}${item.unit}` : "not included"}
                  </span>
                </div>
              );
            })}

            {/* Running total */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "20px 0 0", opacity: totalTickProgress > 0 ? 1 : 0 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Before your wedding even starts
              </span>
              <span style={{ fontSize: "clamp(20px, 2.5vw, 26px)", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Plus Jakarta Sans', sans-serif", fontVariantNumeric: "tabular-nums" }}>
                ${displayedTotal}+
              </span>
            </div>
          </div>

          {/* The reveal */}
          <div style={{
            marginTop: 40, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.15)",
            opacity: revealProgress, transform: `translateY(${(1 - revealProgress) * 20}px)`,
          }}>
            <h2 style={{
              fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, color: "#FFFFFF",
              letterSpacing: "-0.02em", lineHeight: 1.05, margin: "0 0 16px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              <span style={{ color: "#DDF762" }}>$79. Once.</span> Everything.
            </h2>
            <p style={{
              fontSize: "clamp(15px, 1.6vw, 18px)", color: "rgba(255,255,255,0.6)",
              lineHeight: 1.6, maxWidth: 520, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              One flat price for every tool above, plus the universes, plus Ava.
              No per-guest fees, no add-on unlocks, no surprise invoice three
              months before your wedding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
