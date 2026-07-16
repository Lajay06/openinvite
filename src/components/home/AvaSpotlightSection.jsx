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
        borderTop: "1px solid rgba(10,10,10,0.08)",
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
        color: "#0A0A0A",
        fontFamily: PJS,
        margin: 0,
        lineHeight: 1.2,
        letterSpacing: "-0.02em",
      }}>
        {row.heading}
      </h3>
      <p style={{
        fontSize: 16,
        color: "#555555",
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
    <section style={{ background: "#F5F4F0", padding: "120px clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <p style={{
          textAlign: "center",
          fontSize: 18,
          color: "#555555",
          maxWidth: 672,
          margin: "0 auto",
          paddingBottom: 48,
          lineHeight: 1.8,
          fontFamily: PJS,
        }}>
          Ava learns your style, your budget, and your vision, then helps you make smarter decisions at every step. From vendor suggestions to seating optimisation, she's always one step ahead.
        </p>
        {ROWS.map((row, i) => (
          <AnimatedRow key={i} row={row} delay={i * 100} />
        ))}
        <div style={{ borderTop: "1px solid rgba(10,10,10,0.08)" }} />
      </div>
    </section>
  );
}
