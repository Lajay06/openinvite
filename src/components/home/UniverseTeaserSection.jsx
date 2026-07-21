/**
 * UniverseTeaserSection — universes were missing from the homepage
 * entirely after round 2 removed the carousel's Universes card and the
 * old "Invitations x Guest Suite" section. High-level only: four real
 * universe photos as a taste of the range, not the full 20-universe grid
 * (that's the dedicated Universes page's job). Dark, confident, minimal —
 * matches the rest of the homepage.
 */
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UNIVERSE_CATALOG } from "@/lib/universeCatalog";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PREVIEW_IDS = ["tulum", "kyoto", "capri", "paris"];
const PREVIEW = PREVIEW_IDS
  .map((id) => UNIVERSE_CATALOG.find((u) => u.id === id))
  .filter(Boolean);

export default function UniverseTeaserSection() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} style={{ background: "#0A0A0A", padding: "140px clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{
          fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 700, color: "#FFFFFF",
          letterSpacing: "-0.03em", lineHeight: 1.08, margin: "0 auto 20px", maxWidth: 760,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
          transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
        }}>
          One aesthetic vision, from your invitation to your thank you notes.
        </h2>
        <p style={{
          fontSize: 17, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, maxWidth: 520, margin: "0 auto 56px",
          opacity: visible ? 1 : 0, transition: `opacity 0.7s ${EASE} 0.1s`,
        }}>
          Choose a universe and every piece of your wedding follows it, automatically.
        </p>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 56,
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: `opacity 0.7s ${EASE} 0.15s, transform 0.7s ${EASE} 0.15s`,
        }}>
          {PREVIEW.map((u) => (
            <div key={u.id} style={{ position: "relative", aspectRatio: "3 / 4", overflow: "hidden" }}>
              <img
                src={u.imageUrl}
                alt={`The ${u.name} universe`}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0) 100%)" }} />
              <p style={{
                position: "absolute", bottom: 16, left: 16, right: 16, color: "#FFFFFF", fontWeight: 700,
                fontSize: 18, letterSpacing: "-0.01em", margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                {u.name}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/universes')}
          style={{
            padding: "16px 40px", borderRadius: 999, border: "none",
            background: "linear-gradient(135deg, #E03553, #803D81)", color: "#FFFFFF",
            fontSize: 14, fontWeight: 600, letterSpacing: "0.02em", cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            opacity: visible ? 1 : 0, transition: `opacity 0.6s ${EASE} 0.2s`,
          }}
        >
          Explore all 20 universes &rarr;
        </button>
      </div>
    </section>
  );
}
