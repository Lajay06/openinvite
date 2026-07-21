/**
 * Feature 3 — Advanced Guest Management
 * LIGHT section: #FFFFFF background, #0A0A0A text, one strong photo right
 */
import React, { useRef, useEffect, useState } from "react";
import { useAppleReveal } from "@/hooks/useAppleReveal";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const BULLETS = [
"Unlimited guest lists",
"Real-time RSVP tracking",
"Dietary preference tracking",
"Smart table assignments",
"Guest tagging & categories",
"Centralised contact management"];


const GW = ({ children }) =>
<span style={{ background: "linear-gradient(135deg, #E03553, #803D81)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
    {children}
  </span>;


export default function FeatureGuests({ children }) {
  const sectionRef = useRef(null);
  const h2Ref = useRef(null);
  const bodyRef = useRef(null);
  const [photoIn, setPhotoIn] = useState(prefersReduced());
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
    if (prefersReduced()) {
      setPhotoIn(true);
      setContentIn(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setContentIn(true);
          setPhotoIn(true);
        } else {
          setContentIn(false);
          setPhotoIn(false);
        }
      },
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
        borderBottom: "1px solid #E8E8E8"
      }}
      className="flex-col lg:flex-row">
      
      {/* Text — left half, fades in */}
      <div
        className="w-full lg:w-1/2 order-2 lg:order-1 feature-content flex items-center"
        style={{
          minWidth: 0,
          flexShrink: 1,
          padding: "80px clamp(32px, 5vw, 64px)",
          opacity: contentIn ? 1 : 0,
          transform: contentIn ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
          position: "relative",
          zIndex: 2
        }}>
        
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
            }}>
            Advanced <span style={{ background: "linear-gradient(135deg, #E03553, #803D81)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Guest</span> Management
            </h2>

          <p ref={bodyRef} className="feature-body-text" style={{ color: "#444444", lineHeight: 1.7, marginBottom: 32, fontSize: 16, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            From RSVP tracking to seating charts, we handle the guest list chaos so you can stay cool, calm, and perfectly in control.
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {BULLETS.map((b, i) =>
            <li key={i} style={{ padding: "11px 0", borderBottom: i < BULLETS.length - 1 ? "1px solid #E8E8E8" : "none", color: "#444444", fontSize: 14, lineHeight: 1.5 }}>
                {b}
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Right side — one strong photo, not four copies of the same one.
          The old 2x2 grid mapped over 4 distinct URLs but the <img> inside
          ignored the loop variable and hardcoded a 5th, unrelated URL —
          the same photo rendered four times. See npm run audit:images. */}
      <div
        className="w-full lg:w-1/2 order-1 lg:order-2"
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: 480,
          opacity: photoIn ? 1 : 0,
          transform: photoIn ? "scale(1)" : "scale(1.04)",
          transition: prefersReduced() ? "none" : `opacity 0.8s ${EASE}, transform 0.8s ${EASE}`,
        }}>
        <img
          src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_SOJOURN_Franco_Dupuy_Photos_ID10730_je7niq.jpg"
          alt="A person managing their wedding plans on a laptop"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
            position: "absolute",
            inset: 0,
          }}
        />
      </div>
    </section>);

}