/**
 * Sticky section label — fixed top-left, updates as sections enter viewport
 */
import React, { useEffect, useState } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function StickySectionLabel({ sections }) {
  // sections: [{ id: string, label: string }]
  const [current, setCurrent] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prefersReduced()) return;

    const observers = [];
    let visibleSections = {};

    sections.forEach(({ id, label }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          visibleSections[id] = entry.isIntersecting;
          // Find first visible section
          const first = sections.find((s) => visibleSections[s.id]);
          if (first) {
            setCurrent(first.label);
            setVisible(true);
          } else {
            setVisible(false);
          }
        },
        { threshold: 0.5 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        left: 48,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "#888888",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-8px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        zIndex: 500,
        pointerEvents: "none",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {current}
    </div>
  );
}