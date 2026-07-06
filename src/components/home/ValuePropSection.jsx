/**
 * Value prop section — "All the powerful tools..."
 * Full-width image with natural height (zero cropping), text overlaid.
 */
import React, { useRef, useEffect, useState } from "react";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const TEXT = "All the powerful tools, beautifully designed to make wedding planning smooth, stylish, and seriously organised.";
const IMG_SRC = "https://static.wixstatic.com/media/d2df22_c34b84a5b42f49b0963b953b94c0e8c4~mv2.jpg";

export default function ValuePropSection() {
  const sectionRef = useRef(null);
  const [textIn, setTextIn] = useState(prefersReduced());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTextIn(true);
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
      style={{ position: "relative", width: "100%", overflow: "hidden" }}
    >
      {/* Full-width natural-height image — no cropping */}
      <img
        src={IMG_SRC}
        alt="Openinvite platform"
        style={{ width: "100%", height: "auto", display: "block" }}
      />

      {/* Text overlay — absolute on desktop, relative on mobile */}
      {isMobile ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(28px, 5vw, 56px)",
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
              opacity: textIn ? 1 : 0,
              transform: textIn ? "translateX(0)" : "translateX(-30px)",
              transition: prefersReduced() ? "none" : `opacity 0.8s ${EASE}, transform 0.8s ${EASE}`,
            }}
          >
            {TEXT}
          </h2>
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "80px",
            transform: "translateY(-50%)",
            maxWidth: "55vw",
            zIndex: 10,
          }}
        >
          <h2
            style={{
              fontSize: "clamp(32px, 4vw, 56px)",
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
              overflow: "visible",
              whiteSpace: "normal",
              wordBreak: "normal",
              hyphens: "none",
              opacity: textIn ? 1 : 0,
              transform: textIn ? "translateX(0)" : "translateX(-40px)",
              transition: prefersReduced() ? "none" : `opacity 0.8s ${EASE}, transform 0.8s ${EASE}`,
            }}
          >
            {TEXT}
          </h2>
        </div>
      )}
    </section>
  );
}