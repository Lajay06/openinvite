/**
 * UniverseMiniHero — a full-viewport, cinematic photo moment between the
 * features carousel and UniverseTeaserSection. Entrance is staged rather
 * than a single fade: the photo scales down and settles into place first,
 * then the question line lands, then the statement line — three beats
 * instead of one flat cut-in. A dark overlay keeps the headline legible
 * against the photo (no text outline/stroke effect).
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
        src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_BANDITS_PALI_MENDEZ_Photos_ID14260_s1kb8c.jpg"
        alt=""
        loading="lazy"
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center",
          opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(1.12)",
          transition: `opacity 1.6s ${EASE}, transform 2.2s ${EASE}`,
        }}
      />
      {/* A flat, uniform overlay rather than an edge gradient — the text
          block is vertically centred, not anchored to one side, so every
          line needs the same contrast behind it regardless of where it
          falls against the photo. */}
      <div style={{
        position: "absolute", inset: 0, background: "rgba(10,10,10,0.62)",
        opacity: visible ? 1 : 0, transition: `opacity 1.6s ${EASE}`,
      }} />

      <div style={{
        position: "relative", zIndex: 2, textAlign: "center", padding: "0 clamp(24px, 6vw, 80px)", maxWidth: 900,
      }}>
        <p style={{
          fontSize: "clamp(16px, 2vw, 22px)", color: "rgba(255,255,255,0.75)",
          fontFamily: "'Plus Jakarta Sans', sans-serif", margin: "0 0 16px",
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(22px)",
          transition: `opacity 0.9s ${EASE} 0.7s, transform 0.9s ${EASE} 0.7s`,
        }}>
          Have you ever seen invitations like this before?
        </p>
        <h2 style={{
          fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.06,
          color: "#FFFFFF", margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif",
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)",
          transition: `opacity 1s ${EASE} 1.3s, transform 1s ${EASE} 1.3s`,
        }}>
          It's more than an invite. It's a whole universe.
        </h2>
      </div>
    </section>
  );
}
