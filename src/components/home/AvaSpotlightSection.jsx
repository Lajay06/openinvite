import React from "react";

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

export default function AvaSpotlightSection() {
  return (
    <section style={{ background: "#F5F4F0", padding: "120px clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {ROWS.map((row, i) => (
          <div
            key={i}
            style={{
              borderTop: "1px solid rgba(10,10,10,0.08)",
              padding: "40px 0",
              display: "grid",
              gridTemplateColumns: "40% 60%",
              gap: 40,
              alignItems: "start",
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
        ))}
        <div style={{ borderTop: "1px solid rgba(10,10,10,0.08)" }} />
      </div>
    </section>
  );
}
