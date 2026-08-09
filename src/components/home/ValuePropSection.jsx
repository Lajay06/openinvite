/**
 * Value prop section — "All the powerful tools..."
 * Full-width image with natural height (zero cropping), text overlaid.
 */
import React, { useRef, useEffect, useState } from "react";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const TEXT = "All the powerful tools, beautifully designed to make wedding planning smooth, stylish, and seriously organized.";
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
      style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}
    >
      {/* Was width:100% / height:auto, so the section height was the image's
          intrinsic 1280x853 ratio at full width — 960px at 1440, i.e. 107vh.
          The banner could therefore never sit on screen at once and always
          needed scrolling to center. 100vh + cover is the treatment the hero
          (MarketingHero) and the universe photo band (UniverseMiniHero)
          already use, so this matches them rather than inventing a third. */}
      <img
        src={IMG_SRC}
        alt="Openinvite platform"
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center", display: "block",
        }}
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
              fontSize: "clamp(22px, 6vw, 40px)",
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
        /* The subject sits on the right of the photo. Her silhouette's
            leftmost edge, measured off the source image (1280x853), is x 720
            at its tightest across y 120-660 — so the text has to stay left of
            720/1280 of the width. At 80vw it did not: the block ran 4 wide
            lines that crossed her face by up to 314px at 1440.

            Width alone cannot fix it at 72px. 820px is the narrowest maxWidth
            that still wraps to 5 lines, and it clears her by only 5px, which
            is inside font-rendering noise. Dropping to 68px is what buys real
            clearance. Measured worst-case per-line gap at 1440:
              80vw  / 72px -> 4 lines, -314px  (overlaps)
              820px / 72px -> 5 lines,   +5px  (ceiling for width-only)
              760px / 68px -> 5 lines,  +51px  <- used
            Everything here is in vw because the photo is width:100% with no
            crop, so her silhouette sits at a fixed *fraction* of the width at
            every viewport. Fixed px offsets or a capped font break that
            relationship: the working 1440 values held at 1440 and above but
            overlapped her by 33px at 1280 and 178px at 1024. Expressed as
            fractions of the 1440 layout (left 80px, box 760px, text 68px)
            they hold at every width. */
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "5.56vw",
            transform: "translateY(-50%)",
            maxWidth: "52.8vw",
            zIndex: 10,
          }}
        >
          <h2
            style={{
              fontSize: "clamp(30px, 4.72vw, 110px)",
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