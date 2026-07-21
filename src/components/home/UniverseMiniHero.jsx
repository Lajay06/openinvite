/**
 * UniverseMiniHero — a full-width beat between the features carousel and
 * UniverseTeaserSection. Purely typographic: one large statement, generous
 * breathing room, no photos or CTA of its own, so it reads as a pause that
 * signals "universes are a big deal" right before UniverseTeaserSection
 * expands into the actual photos and copy. Dark, confident, matches the
 * rest of the homepage.
 */
import { useRef, useState, useEffect } from "react";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function UniverseMiniHero() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} style={{ background: "#0A0A0A", padding: "clamp(140px, 18vw, 240px) clamp(24px, 6vw, 80px)", textAlign: "center" }}>
      <div style={{
        width: 40, height: 2, background: "linear-gradient(90deg, #E03553, #803D81)", margin: "0 auto 40px",
        opacity: visible ? 1 : 0, transition: `opacity 0.6s ${EASE}`,
      }} />
      <h2 style={{
        fontSize: "clamp(40px, 7vw, 88px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.04,
        color: "#FFFFFF", margin: "0 auto", maxWidth: 900, fontFamily: "'Plus Jakarta Sans', sans-serif",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
        transition: `opacity 0.9s ${EASE} 0.1s, transform 0.9s ${EASE} 0.1s`,
      }}>
        This isn't a theme. It's a whole universe.
      </h2>
    </section>
  );
}
