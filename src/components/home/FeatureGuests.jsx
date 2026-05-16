/**
 * Feature 3 — Advanced Guest Management
 * LIGHT section: #FFFFFF background, #0A0A0A text, photo grid right
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
  const [tilesIn, setTilesIn] = useState([false, false, false, false]);
  const [contentIn, setContentIn] = useState(prefersReduced());
  useAppleReveal(h2Ref);

  useEffect(() => {
    if (prefersReduced() || !bodyRef.current) return;
    const obs = new IntersectionObserver(
      ([e]) => {if (e.isIntersecting) {bodyRef.current.classList.add("visible");obs.disconnect();}},
      { threshold: 0.2 }
    );
    obs.observe(bodyRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReduced()) {
      setTilesIn([true, true, true, true]);
      setContentIn(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setContentIn(true);
          [0, 1, 2, 3].forEach((i) => {
            setTimeout(() => setTilesIn((prev) => {const n = [...prev];n[i] = true;return n;}), i * 150);
          });
          obs.disconnect();
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

          <p ref={bodyRef} className="feature-body-text" style={{ color: "#555555", lineHeight: 1.7, marginBottom: 32, fontSize: 16, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            From RSVP tracking to seating charts, we handle the guest list chaos so you can stay cool, calm, and perfectly in control.
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {BULLETS.map((b, i) =>
            <li key={i} style={{ padding: "11px 0", borderBottom: i < BULLETS.length - 1 ? "1px solid #E8E8E8" : "none", color: "#555555", fontSize: 14, lineHeight: 1.5 }}>
                {b}
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Right side — 2x2 photo grid */}
       <div
        className="w-full lg:w-1/2 order-1 lg:order-2"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          minHeight: "100%"
        }}>
        
         {[
        "https://static.wixstatic.com/media/d2df22_b014095a4e4f42a9a415f314cad6b260~mv2.jpg",
        "https://static.wixstatic.com/media/d2df22_370cde85ab644a8fad626149c63f7f0c~mv2.jpg",
        "https://static.wixstatic.com/media/d2df22_d44e25f4998148b5a36522f648fbc794~mv2.jpg",
        "https://static.wixstatic.com/media/d2df22_f912572c44a94a71a99d2672ac25e364~mv2.jpg"].
        map((src, i) =>
        <div
          key={i}
          style={{
            position: "relative",
            overflow: "hidden",
            opacity: tilesIn[i] ? 1 : 0,
            transform: tilesIn[i] ? "rotateY(0deg)" : "rotateY(90deg)",
            transition: prefersReduced() ? "none" : `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
            transformOrigin: "center"
          }}>
          
             <img src="https://media.base44.com/images/public/68731d183f075e406eda2236/e633e01bc_DTS_Remote_Studio_Tino_Renato_Photos_ID3732.jpg"

          alt={`Guest management feature ${i + 1}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block"
          }} />
          
           </div>
        )}
       </div>
    </section>);

}