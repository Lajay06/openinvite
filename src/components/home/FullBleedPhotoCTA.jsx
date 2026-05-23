/**
 * Full-bleed photo CTA — cinematic dark section before pricing
 */
import React, { useRef, useState, useEffect } from "react";
const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const IMG = "https://static.wixstatic.com/media/d2df22_d44e25f4998148b5a36522f648fbc794~mv2.jpg";

export default function FullBleedPhotoCTA({ onCTA }) {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(
      ([e]) => {if (e.isIntersecting) {setVisible(true);obs.disconnect();}},
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
        width: "100%",
        height: "70vh",
        minHeight: 480,
        overflow: "hidden",
        display: "flex",
        alignItems: "center"
      }}>
      
      {/* Background image */}
      <img src="https://media.base44.com/images/public/68731d183f075e406eda2236/700612442_DTS_Modern_Home_Rob_Christain_Crosby_Photos_ID3654.jpg"

      alt="Wedding moment"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center"
      }} />
      

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0) 100%)",
          zIndex: 2,
          pointerEvents: "none"
        }} />
      

      {/* Text */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          paddingLeft: "clamp(24px, 6vw, 80px)",
          maxWidth: "55vw",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: prefersReduced() ? "none" : `opacity 0.8s ${EASE}, transform 0.8s ${EASE}`
        }}>
        
        <h2
          style={{
            fontSize: "clamp(32px, 4vw, 56px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "#FFFFFF",
            hyphens: "none",
            marginBottom: 36,
            lineHeight: 1.05,
            whiteSpace: "nowrap"
          }}>
          Your wedding deserves this.
        </h2>
      </div>
    </section>);

}