/**
 * Ava AI Spotlight — light #F5F5F3, two columns
 */
import React, { useRef, useState, useEffect } from "react";
import ApplePillButton from "@/components/motion/ApplePillButton";
import { createPageUrl } from "@/utils";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const CAPABILITIES = [
{
  icon: "✦",
  title: "Smart Suggestions",
  body: "Personalised recommendations based on your style and budget"
},
{
  icon: "✦",
  title: "Budget Intelligence",
  body: "Real-time tips to keep spending on track without compromise"
},
{
  icon: "✦",
  title: "Guest Insights",
  body: "Dietary, seating, and RSVP patterns analysed automatically"
},
{
  icon: "✦",
  title: "Timeline Optimisation",
  body: "Day-of schedule refined to perfection"
}];


export default function AvaSpotlightSection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(
      ([e]) => {if (e.isIntersecting) {setVisible(true);obs.disconnect();}},
      { threshold: 0.15 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        background: "#F5F5F3",
        padding: "120px clamp(24px, 6vw, 80px)"
      }}>
      
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "80px",
          alignItems: "center"
        }}>
        
        {/* LEFT — text */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : "translateX(-32px)",
            transition: prefersReduced() ? "none" : `opacity 0.8s ${EASE}, transform 0.8s ${EASE}`
          }}>
          
          


           <h2
             style={{
               fontSize: "clamp(28px, 3.5vw, 48px)",
               fontWeight: 700,
               letterSpacing: "-0.02em",
               color: "#0A0A0A",
               hyphens: "none",
               marginBottom: 20,
               lineHeight: 1.2,
               fontFamily: "'Plus Jakarta Sans',sans-serif",
             }}>

             Meet Ava. Your personal wedding intelligence.
           </h2>
           <p
             style={{
               fontSize: 16,
               color: "#444444",
               lineHeight: 1.7,
               maxWidth: 640,
               margin: '0 auto 40px'
             }}>

             Ava learns your style, your budget, and your vision — then helps you make smarter decisions at every step. From vendor suggestions to seating optimisation, Ava is always thinking ahead.
           </p>

          {/* Capabilities list — clean rows with separators */}
          <div style={{ maxWidth: 640, margin: "0 auto 40px", width: "100%" }}>
            {CAPABILITIES.map((cap, i) => (
              <div key={i} style={{
                padding: "16px 0",
                borderBottom: i < CAPABILITIES.length - 1 ? "1px solid rgba(10,10,10,0.08)" : "none",
                textAlign: "left",
              }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px 0", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  {cap.title}
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#444444", margin: 0, lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  {cap.body}
                </p>
              </div>
            ))}
          </div>

          <ApplePillButton href={createPageUrl("Features")} theme="dark">
            Meet Ava +
          </ApplePillButton>
        </div>

        {/* RIGHT — Ava visual */}
        








































        
      </div>

      <style>{`
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @media (max-width: 768px) {
          .ava-spotlight-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>);

}