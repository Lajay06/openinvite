import React, { useState, useEffect, useRef } from "react";

const PJS = "'Plus Jakarta Sans', sans-serif";

const ROWS = [
  {
    heading: "Smart suggestions",
    description: "Personalised recommendations based on your style and budget",
  },
  {
    heading: "Budget intelligence",
    description: "Real-time tips to keep spending on track without compromise",
  },
  {
    heading: "Guest insights",
    description: "Dietary, seating, and RSVP patterns analysed automatically",
  },
  {
    heading: "Timeline optimisation",
    description: "Day-of schedule refined to perfection",
  },
];

function AnimatedRow({ row, delay }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { setVisible(entry.isIntersecting); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "40px 0",
        display: "grid",
        gridTemplateColumns: "40% 60%",
        gap: 40,
        alignItems: "start",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      <h3 style={{
        fontSize: "clamp(24px, 3vw, 36px)",
        fontWeight: 700,
        color: "#FFFFFF",
        fontFamily: PJS,
        margin: 0,
        lineHeight: 1.2,
        letterSpacing: "-0.02em",
      }}>
        {row.heading}
      </h3>
      <p style={{
        fontSize: 16,
        color: "rgba(255,255,255,0.5)",
        lineHeight: 1.8,
        fontFamily: PJS,
        margin: 0,
      }}>
        {row.description}
      </p>
    </div>
  );
}

export default function AvaSpotlightSection() {
  return (
    <section style={{ background: "#0A0A0A", padding: "120px clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Section intro. Deliberately sized to sit between the section's
            own weight and the AnimatedRow headings below it, which are
            clamp(24px, 3vw, 36px)/700 — this stays a step under them so it
            reads as the lead-in rather than competing with the first row.
            Solid white at 600 rather than the old 18px/400 at 50% white,
            which disappeared against the black band. */}
        <p style={{
          textAlign: "center",
          // Type matched exactly to the Universes section intro heading on
          // this same page (UniverseTeaserSection.jsx): the same
          // clamp(32px, 5vw, 60px) / 700 / -0.03em / 1.08, read from that
          // component rather than approximated. Supersedes the V3 sizing
          // (clamp(20px, 2.2vw, 28px) / 600 / 1.5), which is retired.
          fontSize: "clamp(32px, 5vw, 60px)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
          color: "#FFFFFF",
          maxWidth: 672,
          // Centred in the band between the banner above and the first row
          // divider below: the section's own 120px padding-top sets the gap
          // above, so the gap below is an equal 120px margin-bottom. The
          // previous 48px padding-bottom sat INSIDE the box, which both made
          // the two gaps unequal (120 vs 48, so the text sat low) and made
          // them awkward to compare when measuring.
          margin: "0 auto 120px",
          fontFamily: PJS,
        }}>
          Ava learns your style, your budget, and your vision, then helps you make smarter decisions at every step. From vendor suggestions to seating optimisation, Ava's always one step ahead.
        </p>
        {ROWS.map((row, i) => (
          <AnimatedRow key={i} row={row} delay={i * 100} />
        ))}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />
      </div>
    </section>
  );
}
