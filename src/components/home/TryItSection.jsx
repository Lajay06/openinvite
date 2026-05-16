/**
 * "Try it. Love it." CTA section
 * Animation: entire section zooms in from scale(0.92) → scale(1).
 * Background transitions from #0A0A0A to #0A1930 as it enters.
 */
import React, { useRef, useEffect, useState } from "react";
import AnimDivider from "@/components/motion/AnimDivider";
import { PHOTOS } from "@/lib/photos";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function TryItSection({ onCTA }) {
  const sectionRef = useRef(null);
  const [entered, setEntered] = useState(prefersReduced());

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setEntered(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        paddingTop: 160,
        paddingBottom: 160,
        overflow: "hidden",
        backgroundImage: `url(${PHOTOS.photoJ})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
      className="px-6 lg:px-12"
    >
      <div style={{ position: "absolute", inset: 0, background: entered ? "rgba(10,25,48,0.88)" : "rgba(10,10,10,0.92)", transition: prefersReduced() ? "none" : `background 1s ${EASE}`, zIndex: 1 }} />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1200,
          margin: "0 auto",
          transform: entered ? "scale(1)" : "scale(0.92)",
          opacity: entered ? 1 : 0,
          transition: prefersReduced()
            ? "none"
            : `transform 0.9s ${EASE}, opacity 0.7s ${EASE}`,
        }}
      >
        <AnimDivider />
        <h2
          style={{
            fontSize: "clamp(40px, 5vw, 64px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            marginBottom: "1.5rem",
            marginTop: 32,
            color: "#DDF762",
            overflow: "visible",
            whiteSpace: "normal",
            wordBreak: "normal",
            hyphens: "none",
            overflowWrap: "break-word",
          }}
        >
          Try it. Love it.
        </h2>
        <p style={{ color: "#7a9ab5" }} className="text-lg max-w-lg mb-10 leading-relaxed">
          Take Openinvite for a spin — no commitments, no pressure. Your dream wedding workspace starts here.
        </p>
        <button onClick={onCTA} className="btn-editorial-primary">Start for free</button>
      </div>
    </section>
  );
}