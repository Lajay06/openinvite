import React, { useEffect, useRef } from "react";

export default function LightSectionReveal({ children }) {
  const sectionRef = useRef(null);
  const curtainRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const curtain = curtainRef.current;
    const content = contentRef.current;

    if (!section || !curtain) return;

    const updateCurtain = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;

      // Progress: 0 when section bottom enters viewport, 1 when section top reaches viewport top
      const progress = Math.max(0, Math.min(1, 1 - rect.top / vh));

      // Curtain wipes upward: scaleY goes from 1 to 0
      const scale = Math.max(0, 1 - progress * 1.5);
      curtain.style.transform = `scaleY(${scale})`;

      // Content rises and fades in simultaneously
      if (content) {
        content.style.transform = `translateY(${Math.max(0, 40 - progress * 40)}px)`;
        content.style.opacity = progress;
      }
    };

    const handleScroll = () => {
      requestAnimationFrame(updateCurtain);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateCurtain();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        background: "#F5F5F3",
        overflow: "hidden",
      }}
    >
      {/* Dark curtain overlay that wipes upward */}
      <div
        ref={curtainRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "#0A0A0A",
          transformOrigin: "top center",
          zIndex: 10,
          pointerEvents: "none",
          transform: "scaleY(1)",
        }}
      />

      {/* Content that rises and fades in */}
      <div
        ref={contentRef}
        style={{
          position: "relative",
          zIndex: 5,
          opacity: 0,
          transform: "translateY(40px)",
        }}
      >
        {children}
      </div>
    </section>
  );
}