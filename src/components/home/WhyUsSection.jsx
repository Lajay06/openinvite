/**
 * WhyUsSection — round 3 rewrite.
 *
 * Round 2 built three separate full-viewport sections (plain document
 * flow, no pin) — the owner's read was that they felt like presentation
 * slides. Replaced with one pinned component: a single screen that stays
 * still while scroll crossfades between three short statements, releasing
 * to the next section once the sequence completes. Solid background only
 * (no gradient) per instruction. Copy rewritten to drop every trace of
 * negative framing (the old "six different tabs" / "what you'd forget"
 * angle) — positive and confident throughout, no em dashes, no
 * "x, not y" constructions.
 */
import { useRef, useState, useEffect } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const STATEMENTS = [
  "Planning your wedding, all in one beautiful place.",
  "Ava is right there with you, every step of the way.",
  "This is what enjoying the planning actually feels like.",
];

const FADE_FRACTION = 0.18; // portion of each statement's segment spent fading in/out

function useScrollProgress(ref, reduced) {
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    const handleScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      setProgress(total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [reduced]);
  return progress;
}

export default function WhyUsSection() {
  const wrapperRef = useRef(null);
  const reduced = prefersReduced();
  const progress = useScrollProgress(wrapperRef, reduced);

  if (reduced) {
    // No pin/crossfade for motion-sensitive users — just stack the three
    // statements as plain, normally-scrolled content so nothing is lost.
    return (
      <div style={{ background: "#0A0A0A" }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#E03553",
          fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: "center", padding: "80px 24px 0",
        }}>
          So, why us?
        </p>
        {STATEMENTS.map((s, i) => (
          <div key={i} style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px clamp(24px, 8vw, 120px)" }}>
            <h2 style={{
              fontSize: "clamp(32px, 5.5vw, 72px)", fontWeight: 700, color: "#FFFFFF",
              letterSpacing: "-0.03em", lineHeight: 1.1, maxWidth: 880, textAlign: "center", margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              {s}
            </h2>
          </div>
        ))}
      </div>
    );
  }

  const segmentSize = 1 / STATEMENTS.length;

  return (
    <div ref={wrapperRef} style={{ position: "relative", height: `${STATEMENTS.length * 100}vh` }}>
      <section style={{
        position: "sticky", top: 0, height: "100vh", overflow: "hidden", background: "#0A0A0A",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0 clamp(24px, 8vw, 120px)",
      }}>
        <p style={{
          position: "absolute", top: "18%", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em",
          color: "#E03553", fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          So, why us?
        </p>
        <div style={{ position: "relative", width: "100%", maxWidth: 920, height: "clamp(160px, 30vw, 260px)" }}>
          {STATEMENTS.map((s, i) => {
            const segStart = i * segmentSize;
            const segEnd = segStart + segmentSize;
            const local = Math.min(Math.max((progress - segStart) / (segEnd - segStart), 0), 1);
            let opacity;
            if (local < FADE_FRACTION) opacity = local / FADE_FRACTION;
            else if (local > 1 - FADE_FRACTION) opacity = (1 - local) / FADE_FRACTION;
            else opacity = 1;
            // Last statement holds fully visible once reached, rather than
            // fading out again right before the section releases.
            if (i === STATEMENTS.length - 1 && local > 1 - FADE_FRACTION) opacity = 1;
            return (
              <h2
                key={i}
                style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "clamp(32px, 5.5vw, 72px)", fontWeight: 700, color: "#FFFFFF",
                  letterSpacing: "-0.03em", lineHeight: 1.1, textAlign: "center", margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  opacity, pointerEvents: "none",
                }}
              >
                {s}
              </h2>
            );
          })}
        </div>
      </section>
    </div>
  );
}
