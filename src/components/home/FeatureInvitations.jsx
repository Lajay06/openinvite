/**
 * Feature 5 — Digital Invitations
 * LIGHT section final: #FFFFFF background, #0A0A0A text
 */
import React, { useRef, useEffect, useState } from "react";
import ApplePillButton from "@/components/motion/ApplePillButton";
import { useAppleReveal } from "@/hooks/useAppleReveal";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const BODY = "Make a first impression that actually impresses. Design stunning digital invites, send with ease, and keep tabs on every RSVP.";

const GW = ({ children }) =>
<span style={{ background: "linear-gradient(135deg, #E03553, #803D81)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
    {children}
  </span>;


export default function FeatureInvitations({ onCTA }) {
  const sectionRef = useRef(null);
  const h2Ref = useRef(null);
  const [contentIn, setContentIn] = useState(prefersReduced());
  const [wordCount, setWordCount] = useState(prefersReduced() ? 999 : 0);
  useAppleReveal(h2Ref);

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setContentIn(true);
          const words = BODY.split(" ");
          words.forEach((_, i) => {
            setTimeout(() => setWordCount(i + 1), 600 + i * 30);
          });
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const words = BODY.split(" ");

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        background: "#0A0A0A"
      }}>
      


      {/* Text content */}
      <div
        className="feature-content"
        style={{
          position: "relative",
          zIndex: 3,
          padding: "120px 80px",
          maxWidth: 700,
          margin: "0 auto",
          textAlign: "center",
          opacity: contentIn ? 1 : 0,
          transform: contentIn ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`
        }}>
        
        <h2
          ref={h2Ref}
          style={{
            fontSize: "clamp(48px, 7vw, 96px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.0,
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
          <span style={{ background: "linear-gradient(135deg, #E03553, #803D81)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Universes</span>
        </h2>

        <p style={{ color: "#AAAAAA", lineHeight: 1.8, marginBottom: 40, fontSize: 16, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
          Choose your aesthetic universe. Every invitation, asset and piece of design follows a single visual vision — from your Save the Date to your Thank You Notes. 9 universes, 10 pieces each.
        </p>

        <ApplePillButton onClick={onCTA} light style={{ marginTop: 8 }}>
          Get started
        </ApplePillButton>
      </div>
    </section>);

}