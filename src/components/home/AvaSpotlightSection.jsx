import React, { useState, useEffect, useRef } from "react";

const PJS = "'Plus Jakarta Sans', sans-serif";

const ROWS = [
  {
    heading: "Smart suggestions",
    description: "Personalized recommendations based on your style and budget",
  },
  {
    heading: "Budget intelligence",
    description: "Real-time tips to keep spending on track without compromise",
  },
  {
    heading: "Guest insights",
    description: "Dietary, seating, and RSVP patterns analyzed automatically",
  },
  {
    heading: "Timeline optimization",
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
      // The two columns were a hardcoded "40% 60%" with a 40px gap and no
      // breakpoint. Percentages of the content box plus a fixed gap always
      // exceed 100%, which is invisible at desktop widths but overflows on a
      // phone: at 390px the content box is 342px, and 40% + 60% + 40px comes
      // to 382px, putting the row's right edge at 406 against a 390 viewport
      // and making the whole page scroll sideways. Single column below md
      // removes the gap from the horizontal budget entirely; above md the
      // original proportions are preserved via minmax(0, …) so a long word
      // can't push a column past its track either.
      className="ava-row-grid"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "40px 0",
        display: "grid",
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
          // Sized to render the sentence on exactly two lines at 1440.
          //
          // This BREAKS the deliberate match to the Universes section intro
          // heading (UniverseTeaserSection.jsx, clamp(32px, 5vw, 60px)) that
          // #319 set up. The two goals are incompatible: measured at 1440,
          // two lines needs a 1248px container at 52px and 1152px at 48px,
          // and at 60px it is unreachable at any width the viewport allows
          // (still 3 lines at 1392px, the full width minus padding). Two
          // lines was the explicit instruction, so the type match gives way.
          fontSize: "clamp(32px, 3.33vw, 48px)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
          color: "#FFFFFF",
          // 672 -> 1200, which is the cap the parent div already imposes, so
          // this widens the paragraph without changing the section's layout
          // for the rows below it.
          maxWidth: 1200,
          // Centered in the band between the banner above and the first row
          // divider below: the section's own 120px padding-top sets the gap
          // above, so the gap below is an equal 120px margin-bottom. The
          // previous 48px padding-bottom sat INSIDE the box, which both made
          // the two gaps unequal (120 vs 48, so the text sat low) and made
          // them awkward to compare when measuring.
          margin: "0 auto 120px",
          fontFamily: PJS,
        }}>
          Ava learns your style, your budget, and your vision, then helps you make smarter decisions at every step.
        </p>
        {ROWS.map((row, i) => (
          <AnimatedRow key={i} row={row} delay={i * 100} />
        ))}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />
        <style>{`
          .ava-row-grid { grid-template-columns: 1fr; }
          @media (min-width: 768px) {
            .ava-row-grid { grid-template-columns: minmax(0, 40%) minmax(0, 60%); }
          }
        `}</style>
      </div>
    </section>
  );
}
