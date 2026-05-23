/**
 * Feature 2 — Collaborative Playlists
 * Dark centred section with expandable feature accordion.
 */
import React, { useRef, useEffect, useState } from "react";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const BULLETS = [
"Spotify integration — seamless",
"Let guests submit their favourite tracks",
"Organise songs by vibe or moment",
"Share playlists in a click",
"DJ collaboration made effortless",
"Create a music timeline that keeps the energy just right"];


export default function FeaturePlaylists() {
  const sectionRef = useRef(null);
  const [textIn, setTextIn] = useState(prefersReduced());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setTextIn(true), 200);
        } else {
          setTextIn(false);
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
        background: "#0A0A0A",
        borderBottom: "1px solid #222222",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh"
      }}>
      
      <div
        style={{
          padding: "120px 80px",
          maxWidth: 700,
          width: "100%",
          margin: "0 auto",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: textIn ? 1 : 0,
          transform: textIn ? "translateY(0)" : "translateY(28px)",
          transition: `opacity 0.8s ${EASE}, transform 0.8s ${EASE}`
        }}>
        
        {/* Headline */}
        <h2 style={{
          fontSize: "clamp(48px, 7vw, 96px)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.0,
          color: "#FFFFFF",
          margin: "0 0 16px 0",
          textAlign: "center",
          width: "100%",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
        }}>
          Collaborative Playlists.
        </h2>

        {/* Subtitle */}
        <p style={{
          fontSize: 16,
          fontWeight: 400,
          color: "#AAAAAA",
          maxWidth: "60ch",
          margin: "0 auto 48px",
          lineHeight: 1.7,
          textAlign: "center"
        }}>
          Curate the ultimate wedding soundtrack — and let your guests be part of the vibe.
        </p>

        {/* Expand button */}
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 100,
            padding: "14px 14px 14px 24px",
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.02em",
            cursor: "pointer",
            transition: `all 0.3s ${EASE}`
          }}
          onMouseEnter={(e) => {e.currentTarget.style.background = "rgba(255,255,255,0.14)";e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";}}
          onMouseLeave={(e) => {e.currentTarget.style.background = "rgba(255,255,255,0.08)";e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";}}>
          
          {open ? "Hide features −" : "See all features +"}
          <span style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #E03553, #803D81)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 16,
            transition: `transform 0.3s ${EASE}`,
            transform: open ? "rotate(180deg)" : "rotate(0deg)"
          }}>
            ↓
          </span>
        </button>

        {/* Accordion feature list */}
        <div
          style={{
            maxHeight: open ? 400 : 0,
            overflow: "hidden",
            transition: `max-height 0.5s ${EASE}`,
            marginTop: open ? 32 : 0
          }}>
          
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {BULLETS.map((b, i) =>
            <li key={i} style={{ padding: "12px 0", borderBottom: i < BULLETS.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none", color: "#AAAAAA", fontSize: 14, lineHeight: 1.5, textAlign: "center" }}>
                {b}
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>);

}