/**
 * UniverseMiniHero — a full-viewport, cinematic photo moment between the
 * features carousel and UniverseTeaserSection. Entrance is staged rather
 * than a single fade: the photo scales down and settles into place first,
 * then the statement line lands.
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
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      style={{
        position: "relative", width: "100%", height: "100vh", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <img
        src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_Caldo_Daniel_Far%C3%B2_Photos_ID3960_av5mnb.jpg"
        alt=""
        loading="lazy"
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center",
          opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(1.12)",
          transition: `opacity 1.6s ${EASE}, transform 2.2s ${EASE}`,
        }}
      />

      <div style={{
        position: "relative", zIndex: 2, textAlign: "center", padding: "0 clamp(24px, 6vw, 80px)", maxWidth: 1100,
      }}>
        <h2 style={{
          fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.06,
          color: "#FFFFFF", margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif",
          // No dark overlay behind this photo anymore — a text-shadow (not
          // a full-bleed tint) keeps the headline legible against the
          // photo's lighter areas without dimming the image itself.
          textShadow: "0 2px 24px rgba(0,0,0,0.45)",
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)",
          transition: `opacity 1s ${EASE} 0.7s, transform 1s ${EASE} 0.7s`,
        }}>
          It's more than an invite. It's a whole universe.
        </h2>
      </div>
    </section>
  );
}
