/**
 * ScrollProgress — fixed vertical progress bar on right edge.
 * Fills with brand gradient as user scrolls.
 */
import React, { useEffect, useRef, useState } from "react";
import { useScrollEngine } from "@/hooks/useScrollEngine";

export default function ScrollProgress() {
  const fillRef = useRef(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPulse(true), 600);
    const t2 = setTimeout(() => setPulse(false), 1400);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  useScrollEngine(() => {
    if (!fillRef.current) return;
    const total = document.body.scrollHeight - window.innerHeight;
    const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
    fillRef.current.style.height = `${pct}%`;
  });

  return (
    <div
      style={{
        position: "fixed",
        right: 28,
        top: "50%",
        transform: "translateY(-50%)",
        width: 2,
        height: 60,
        background: "#222",
        zIndex: 100,
        opacity: pulse ? 1 : 0.5,
        transition: "opacity 0.4s ease",
      }}
    >
      <div
        ref={fillRef}
        style={{
          width: "100%",
          height: "0%",
          background: "linear-gradient(to bottom, #E03553, #803D81)",
          transition: "height 0.05s linear",
        }}
      />
    </div>
  );
}