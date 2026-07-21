/**
 * UniverseMiniHero — a full-bleed photo moment between the features
 * carousel and UniverseTeaserSection. Fades in as it enters the viewport,
 * a dark overlay keeps the headline legible against the photo (no text
 * outline/stroke effect), and a short taster row previews what a universe
 * actually covers before UniverseTeaserSection expands into the real
 * photos and copy.
 */
import { useRef, useState, useEffect } from "react";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const TASTER_ITEMS = ["Invitations", "Guest website", "Styling", "Matched automatically"];

export default function UniverseMiniHero() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.25 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} style={{ position: "relative", width: "100%", minHeight: "90vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img
        src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/alex-plesovskich-VPrTqd8B230-unsplash_gwgyej.jpg"
        alt=""
        loading="lazy"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
      />
      {/* A flat, uniform overlay rather than an edge gradient — the text
          block is vertically centred, not anchored to one side, so every
          line needs the same contrast behind it regardless of where it
          falls against the photo. */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,10,0.62)" }} />

      <div style={{
        position: "relative", zIndex: 2, textAlign: "center", padding: "clamp(80px, 12vw, 160px) clamp(24px, 6vw, 80px)", maxWidth: 900,
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 1s ${EASE}, transform 1s ${EASE}`,
      }}>
        <p style={{
          fontSize: "clamp(16px, 2vw, 22px)", color: "rgba(255,255,255,0.75)",
          fontFamily: "'Plus Jakarta Sans', sans-serif", margin: "0 0 16px",
        }}>
          Have you ever seen invitations like this before?
        </p>
        <h2 style={{
          fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.06,
          color: "#FFFFFF", margin: "0 0 40px", fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          It's more than an invite. It's a whole universe.
        </h2>
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 12,
          fontSize: 14, color: "rgba(255,255,255,0.65)", fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          {TASTER_ITEMS.map((item, i) => (
            <span key={item} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {i > 0 && <span style={{ color: "rgba(255,255,255,0.3)" }}>&middot;</span>}
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
