/**
 * Feature 1 — Timeline & Schedule Planning
 * LIGHT section: #FFFFFF background, #0A0A0A text, photo on left
 * Scroll-driven curtain reveal with monochrome bullets
 */
import React, { useRef, useEffect, useState } from "react";
import { PHOTOS } from "@/lib/photos";
import { useAppleReveal } from "@/hooks/useAppleReveal";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const BULLETS = [
  "Visual timeline builder",
  "Vendor coordination made easy",
  "Assign tasks to your crew",
  "Track deadlines without drama",
  "Share the schedule with key players",
  "Create your seamless day-of rundown",
];

const GW = ({ children }) => (
  <span style={{ background: "linear-gradient(135deg, #E03553, #803D81)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
    {children}
  </span>
);

export default function FeatureTimeline() {
  const sectionRef = useRef(null);
  const h2Ref = useRef(null);
  const bodyRef = useRef(null);
  const [contentIn, setContentIn] = useState(prefersReduced());
  useAppleReveal(h2Ref);

  useEffect(() => {
    if (prefersReduced() || !bodyRef.current) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!bodyRef.current) return;
        if (e.isIntersecting) bodyRef.current.classList.add("visible");
        else bodyRef.current.classList.remove("visible");
      },
      { threshold: 0.2 }
    );
    obs.observe(bodyRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(
      ([e]) => { setContentIn(e.isIntersecting); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        background: "#FFFFFF",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "row",
        overflow: "visible",
        position: "relative",
        borderBottom: "1px solid #E8E8E8",
      }}
      className="flex-col lg:flex-row"
    >
      {/* Photo — slides from LEFT */}
      <div
        className="w-full lg:w-[55%] order-1 lg:order-1"
        style={{
          position: "relative",
          minHeight: 320,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <img
          src="https://static.wixstatic.com/media/d2df22_2bbfee1f5b034379a76f063c2f97f653~mv2.jpg"
          alt="French outdoor venue chandelier"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            opacity: contentIn ? 1 : 0,
            transform: contentIn ? "translateX(0)" : "translateX(-100px)",
            transition: `opacity 0.9s ${EASE}, transform 1s ${EASE}`,
          }}
        />
        {/* Warm duotone overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(224,53,83,0.18)",
            mixBlendMode: "multiply",
            pointerEvents: "none",
          }}
        />
        {/* Mobile fallback height */}
        <div className="lg:hidden" style={{ paddingBottom: "66.66%", position: "relative" }} />
      </div>

      {/* Text — content wrapper */}
      <div
        className="w-full lg:w-[45%] order-2 lg:order-2 feature-content flex items-center"
        style={{
          minWidth: 0,
          flexShrink: 1,
          padding: "80px clamp(32px, 5vw, 64px)",
          opacity: contentIn ? 1 : 0,
          transform: contentIn ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
          position: "relative",
          zIndex: 2,
        }}
      >

        <div style={{ maxWidth: 480 }}>
          <h2
             ref={h2Ref}
             style={{
               fontSize: "clamp(28px, 4vw, 48px)",
               fontWeight: 700,
               letterSpacing: "-0.02em",
               lineHeight: 1.1,
               color: "#0A0A0A",
               marginBottom: 24,
               overflow: "visible",
               whiteSpace: "normal",
               wordBreak: "normal",
               hyphens: "none",
               overflowWrap: "break-word",
               fontFamily: "'Plus Jakarta Sans',sans-serif",
             }}
           >
             Timeline & <span style={{ color: '#E03553' }}>Schedule</span> Planning
           </h2>
          <p
            ref={bodyRef}
            className="feature-body-text"
            style={{ color: "#444444", lineHeight: 1.7, marginBottom: 32, fontSize: 16, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif" }}
          >
            Run the day like a director, with an intuitive, drag-and-drop builder that keeps every moment smooth, stylish, and on time.
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {BULLETS.map((b, i) => (
              <li key={i} style={{ padding: "11px 0", borderBottom: i < BULLETS.length - 1 ? "1px solid #E8E8E8" : "none", color: "#444444", fontSize: 14, lineHeight: 1.5 }}>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}