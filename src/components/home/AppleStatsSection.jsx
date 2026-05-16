/**
 * Apple-style punchy stat section
 * #0A0A0A background, 3 columns with gradient stats
 */
import React, { useRef, useState, useEffect } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const STATS = [
  { number: "37", label: "planning tools", gradient: true },
  { number: "10,000+", label: "couples planning", gradient: false },
  { number: "$199", label: "one-time. forever.", gradient: true },
];

export default function AppleStatsSection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        background: "#0A0A0A",
        borderTop: "1px solid #1a1a1a",
        borderBottom: "1px solid #1a1a1a",
        padding: "100px clamp(32px, 6vw, 80px)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {STATS.map((stat, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              padding: "0 clamp(16px, 4vw, 60px)",
              borderRight: i < 2 ? "1px solid #222" : "none",
            }}
          >
            <div
              style={{
                fontSize: "clamp(64px, 10vw, 140px)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                marginBottom: 16,
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(40px)",
                transition: prefersReduced()
                  ? "none"
                  : `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s`,
                ...(stat.gradient
                  ? {
                      background: "linear-gradient(135deg, #E03553, #803D81)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }
                  : { color: "#FFFFFF" }),
              }}
            >
              {stat.number}
            </div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#888888",
                margin: 0,
                opacity: visible ? 1 : 0,
                transition: prefersReduced()
                  ? "none"
                  : `opacity 0.6s ease ${0.3 + i * 0.12}s`,
              }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .apple-stats-grid { grid-template-columns: 1fr !important; }
          .apple-stats-grid > div { border-right: none !important; border-bottom: 1px solid #222; padding: 40px 0 !important; }
          .apple-stats-grid > div:last-child { border-bottom: none; }
        }
      `}</style>
    </section>
  );
}