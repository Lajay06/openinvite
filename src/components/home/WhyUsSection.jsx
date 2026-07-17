/**
 * WhyUsSection — replaces PriceHonestySection, which replaced the original
 * "So, why us?" rotating photo ring before that.
 *
 * The ring never answered its own question — it just spun 20 stock photos.
 * The price-comparison receipt that followed it answered honestly, but
 * read like a pricing page in disguise (a line-item table, a running
 * total) rather than an answer to "why us" as a feeling. Pricing already
 * gets its own dedicated, honest closing moment further down this page —
 * this section's only job is emotional: one confident statement per
 * viewport, no bullets, no comparison table, no icons. Three plain
 * full-height sections in normal document flow, not sticky-pinned —
 * deliberately, after diagnosing this page's dead-space problem as five
 * consecutive scroll-jacked sections stacked back to back. This section
 * just scrolls, like a normal page.
 */
import { useRef, useState, useEffect } from "react";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useReveal(threshold = 0.35) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());
  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Moment({ kicker, kickerColor, statement, background }) {
  const [ref, visible] = useReveal();
  const reduced = prefersReduced();
  return (
    <section
      ref={ref}
      style={{
        minHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "80px clamp(24px, 8vw, 120px)",
        background,
      }}
    >
      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: kickerColor,
        fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 28,
        opacity: visible ? 1 : 0, transition: reduced ? "none" : `opacity 0.7s ${EASE}`,
      }}>
        {kicker}
      </p>
      <h2 style={{
        fontSize: "clamp(32px, 5.5vw, 76px)", fontWeight: 700, color: "#FFFFFF",
        letterSpacing: "-0.03em", lineHeight: 1.08, maxWidth: 920, margin: 0,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: reduced ? "none" : `opacity 0.8s ${EASE} 0.1s, transform 0.8s ${EASE} 0.1s`,
      }}>
        {statement}
      </h2>
    </section>
  );
}

export default function WhyUsSection() {
  return (
    <div>
      <Moment
        kicker="So, why us?"
        kickerColor="#E03553"
        statement="Wedding planning isn't hard because of the invitation. It's hard because everything about it lives in six different tabs."
        background="#0A0A0A"
      />
      <Moment
        kicker="The relief"
        kickerColor="#FFFFFF"
        statement="So we put it all in one place. Ava remembers what you'd forget, so you get to actually enjoy this part."
        background="linear-gradient(135deg, #E03553, #803D81)"
      />
      <Moment
        kicker="The point"
        kickerColor="#DDF762"
        statement="This is the plan that lets you be a guest at your own wedding, for once."
        background="#0A0A0A"
      />
    </div>
  );
}
