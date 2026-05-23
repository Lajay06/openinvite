/**
 * Feature 4 — Smart Budget Tracking
 * DARK section: #0A0A0A background, #FFFFFF text, photo right
 * Scroll-driven curtain with monochrome white bullets
 */
import React, { useRef, useEffect, useState } from "react";
import { PHOTOS } from "@/lib/photos";
import { useScrollEngine } from "@/hooks/useScrollEngine";
import { useSpotlight } from "@/hooks/useSpotlight";
import { useAppleReveal } from "@/hooks/useAppleReveal";


const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const BULLETS = [
  "Budget vs. actual spend tracking",
  "Vendor payment scheduling",
  "Category-based budgeting",
  "Visual expense analytics",
  "Friendly payment reminders",
  "Subtle cost-saving suggestions",
];

const GW = ({ children }) => (
  <span style={{ background: "linear-gradient(135deg, #E03553, #803D81)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
    {children}
  </span>
);

export default function FeatureBudget() {
  const sectionRef = useRef(null);
  const imgRef = useRef(null);
  const h2Ref = useRef(null);
  const bodyRef = useRef(null);
  const [contentIn, setContentIn] = useState(prefersReduced());
  const [imgScale, setImgScale] = useState(1.15);
  useSpotlight(sectionRef);
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

  // Parallax zoom on the photo
  useScrollEngine(() => {
    if (prefersReduced() || !sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const center = rect.top + rect.height / 2 - vh / 2;
    const progress = Math.max(-1, Math.min(1, center / (vh * 0.6)));
    setImgScale(1.0 + Math.abs(progress) * 0.15);
  });

  return (
    <section
      ref={sectionRef}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "row",
        overflow: "visible",
        background: "#0A0A0A",
        position: "relative",
        borderBottom: "1px solid #333333",
      }}
      className="flex-col lg:flex-row"
    >
      {/* Text — LEFT, dark bg, fades in */}
      <div
        className="w-full lg:w-1/2 order-2 lg:order-1 feature-content flex items-center"
        style={{
          background: "#0A0A0A",
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
              color: "#FFFFFF",
              marginBottom: 24,
              overflow: "visible",
              whiteSpace: "normal",
              wordBreak: "normal",
              hyphens: "none",
              overflowWrap: "break-word",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          >
            Smart <span style={{ background: "linear-gradient(135deg, #E03553, #803D81)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Budget</span> Tracking
          </h2>
          <p ref={bodyRef} className="feature-body-text" style={{ color: "#AAAAAA", lineHeight: 1.7, marginBottom: 32, fontSize: 16, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            Plan like a pro. Our budgeting tools give you full visibility, clear control, and a few clever nudges to keep things beautifully on track.
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {BULLETS.map((b, i) => (
              <li key={i} style={{ padding: "11px 0", borderBottom: i < BULLETS.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none", color: "#AAAAAA", fontSize: 14, lineHeight: 1.5 }}>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Photo — RIGHT, parallax zoom */}
       <div
         className="w-full lg:w-1/2 order-1 lg:order-2"
         style={{
           position: "relative",
           minHeight: 320,
           overflow: "hidden",
           flexShrink: 0,
         }}
       >
         <img
           ref={imgRef}
           src="https://static.wixstatic.com/media/d2df22_2d4ea077497f48679138b2e04dbc7e3a~mv2.jpg"
           alt="Wine being poured at outdoor table"
           style={{
             position: "absolute",
             inset: 0,
             width: "100%",
             height: "100%",
             objectFit: "cover",
             objectPosition: "center",
             transform: `scale(${imgScale})`,
             transition: prefersReduced() ? "none" : "transform 0.1s linear",
             opacity: contentIn ? 1 : 0,
           }}
         />
         <div className="lg:hidden" style={{ paddingBottom: "66.66%", position: "relative" }} />
       </div>
    </section>
  );
}