/**
 * HeroParallax — multi-layer parallax for the hero section.
 * Each layer moves at a different speed creating depth.
 */
import React, { useRef, useEffect, useState } from "react";
import { useScrollEngine } from "@/hooks/useScrollEngine";

export default function HeroParallax({ onCTA }) {
  const bgRef = useRef(null);
  const overlayRef = useRef(null);
  const headlineRef = useRef(null);
  const subRef = useRef(null);
  const contentRef = useRef(null);

  // Hero scroll-out — content fades/scales as you scroll past
  useScrollEngine((scrollY) => {
    if (!contentRef.current) return;
    const vh = window.innerHeight;
    const progress = Math.min(1, scrollY / (vh * 0.6));
    contentRef.current.style.opacity = String(1 - progress * 0.85);
    contentRef.current.style.transform = `scale(${1 - progress * 0.05}) translateY(${scrollY * 0.1}px)`;

    if (headlineRef.current) {
      headlineRef.current.style.transform = `translateY(${scrollY * 0.1}px)`;
    }
    if (subRef.current) {
      subRef.current.style.transform = `translateY(${scrollY * 0.15}px)`;
    }
  });

  // Load-in animation state
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),  // label
      setTimeout(() => setPhase(2), 400),  // headline chars
      setTimeout(() => setPhase(3), 1100), // sub
      setTimeout(() => setPhase(4), 1500), // cta
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const headline = "Openinvite.";
  const chars = headline.split("");

  return (
    <section
      ref={bgRef}
      style={{
        position: "relative",
        width: "100vw",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `url(https://static.wixstatic.com/media/d2df22_72f2a56a2dcd42079ffc9f93a59e9422~mv2.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        overflow: "hidden",
      }}
    >
      {/* Overlay layer */}
      <div
        ref={overlayRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 50%, rgba(0,0,0,0.88) 100%)",
          willChange: "transform",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div
        ref={contentRef}
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          padding: "0 24px",
          maxWidth: 900,
          willChange: "transform, opacity",
        }}
      >
        {/* Label */}
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#DDF762",
            marginBottom: "1.5rem",
            opacity: phase >= 1 ? 1 : 0,
            transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          Wedding planning, reimagined
        </p>

        {/* Headline with char stagger */}
        <div ref={headlineRef} style={{ willChange: "transform", marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontSize: "clamp(52px, 8vw, 96px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              color: "#ffffff",
              display: "block",
            }}
            aria-label={headline}
          >
            {chars.map((ch, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  whiteSpace: ch === " " ? "pre" : "normal",
                  opacity: phase >= 2 ? 1 : 0,
                  transform: phase >= 2 ? "translateY(0)" : "translateY(80px)",
                  transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${0.05 + i * 0.04}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${0.05 + i * 0.04}s`,
                }}
              >
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </h1>
        </div>

        {/* Subheadline */}
        <div ref={subRef} style={{ willChange: "transform" }}>
          <p
            style={{
              fontSize: "clamp(16px, 2vw, 24px)",
              fontWeight: 400,
              color: "#CCCCCC",
              marginBottom: "2.5rem",
              opacity: phase >= 3 ? 1 : 0,
              filter: phase >= 3 ? "blur(0px)" : "blur(6px)",
              transition: "opacity 0.7s cubic-bezier(0.16,1,0.3,1), filter 0.7s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            because planning your wedding should feel exciting.
          </p>
        </div>

        {/* CTA */}
        <div
          style={{
            opacity: phase >= 4 ? 1 : 0,
            transform: phase >= 4 ? "scale(1) translateY(0)" : "scale(0.95) translateY(12px)",
            transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <button
            onClick={onCTA}
            className="btn-editorial-primary"
            style={{ padding: "16px 48px", fontSize: 12 }}
          >
            Try it out
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <ScrollCue />
    </section>
  );
}

function ScrollCue() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease",
      }}
    >
      <span style={{ fontFamily: "Inter", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888" }}>Scroll</span>
      <div style={{ width: 1, height: 40, background: "#222", overflow: "hidden" }}>
        <div style={{
          width: "100%",
          height: "50%",
          background: "linear-gradient(to bottom, #E03553, #803D81)",
          animation: "scrollCue 1.6s cubic-bezier(0.16,1,0.3,1) infinite",
        }} />
      </div>
      <style>{`@keyframes scrollCue { 0%{transform:translateY(-100%)} 100%{transform:translateY(220%)} }`}</style>
    </div>
  );
}