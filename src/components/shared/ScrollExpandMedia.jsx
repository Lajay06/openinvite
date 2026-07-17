/**
 * src/components/shared/ScrollExpandMedia.jsx
 *
 * Ported from the owner's Next.js/TypeScript reference component (a small
 * video that expands to full-bleed as the page scrolls). Two adaptations
 * from the original, both deliberate:
 *
 * 1. Platform: no next/image, no 'use client', plain JSX (this app is
 *    Vite + React Router, not Next.js).
 *
 * 2. Pinning mechanism: the reference implementation attaches window-level
 *    wheel/touch listeners on mount and force-scrolls to (0,0) the whole
 *    time the media isn't fully expanded — that only behaves correctly
 *    when the component IS the very first thing on the page (it hijacks
 *    ALL scrolling from load, regardless of where in the DOM it sits).
 *    This instance sits after the red hero section, not at the top, so
 *    that approach would fight the sections above it — the page would be
 *    unscrollable from the moment it loads while a component below the
 *    fold silently ate every scroll event. Replaced with the standard
 *    sticky-scroll-progress pin instead: a tall wrapper + a `position:
 *    sticky` inner panel, with expansion progress derived from the
 *    wrapper's own scroll position. Same expand-as-you-scroll outcome,
 *    scoped to wherever this component actually sits, and it never calls
 *    preventDefault on real scroll input — works with trackpad momentum,
 *    keyboard, and screen readers, which the wheel/touch-hijack approach
 *    doesn't.
 *
 * The reference component's youtube-iframe media branch was dropped —
 * this app has no youtube sources. The video path renders through
 * ProductMediaFrame/ProductVideo (this site's shared real-media
 * treatment) instead of a raw <video>, so it gets the same 14px frame
 * and Safari autoplay fix as every other product recording on the site.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ProductMediaFrame from "@/components/shared/ProductMediaFrame";
import ProductVideo from "@/components/shared/ProductVideo";

const WRAPPER_HEIGHT_VH = 250; // scroll distance the expansion is spread across
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function ScrollExpandMedia({
  mediaType = "video",
  mediaSrc,
  webmSrc,
  posterSrc,
  bgImageSrc,
  title,
  date,
  scrollToExpand,
  children,
}) {
  const reduced = prefersReduced();
  const [scrollProgress, setScrollProgress] = useState(reduced ? 1 : 0);
  const [showContent, setShowContent] = useState(reduced);
  const [isMobileState, setIsMobileState] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const checkIfMobile = () => setIsMobileState(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  useEffect(() => {
    if (reduced) return; // skip the scroll-linked pin entirely for motion-sensitive users
    const handleScroll = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const progress = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;
      setScrollProgress(progress);
      setShowContent(progress > 0.85);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [reduced]);

  const mediaWidth = 300 + scrollProgress * (isMobileState ? 650 : 1250);
  const mediaHeight = 400 + scrollProgress * (isMobileState ? 200 : 400);
  const textTranslateX = scrollProgress * (isMobileState ? 180 : 150);

  const firstWord = title ? title.split(" ")[0] : "";
  const restOfTitle = title ? title.split(" ").slice(1).join(" ") : "";

  const mediaBox = (
    <div
      style={{
        position: "relative",
        width: reduced ? "min(1250px, 95vw)" : `${mediaWidth}px`,
        height: reduced ? "min(700px, 85vh)" : `${mediaHeight}px`,
        maxWidth: "95vw",
        maxHeight: "85vh",
        boxShadow: "0 0 50px rgba(0,0,0,0.3)",
      }}
    >
      <ProductMediaFrame
        maxWidth="none"
        style={{ width: "100%", height: "100%", maxWidth: "none", margin: 0, aspectRatio: "auto" }}
      >
        {mediaType === "video" ? (
          <ProductVideo mp4={mediaSrc} webm={webmSrc} poster={posterSrc} alt={title || "Product video"} />
        ) : (
          <img src={mediaSrc} alt={title || "Media"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
      </ProductMediaFrame>
    </div>
  );

  const textBlock = (
    <>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 4, marginTop: 24 }}>
        {date && <p style={{ fontSize: 18, color: "rgba(255,255,255,0.75)", margin: 0, transform: reduced ? "none" : `translateX(-${textTranslateX}vw)` }}>{date}</p>}
        {scrollToExpand && <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.55)", margin: "4px 0 0", transform: reduced ? "none" : `translateX(${textTranslateX}vw)` }}>{scrollToExpand}</p>}
      </div>
      {title && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 20, flexWrap: "wrap", padding: "0 24px" }}>
          <h2 style={{ fontSize: "clamp(32px,5vw,64px)", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.02em", margin: 0, transform: reduced ? "none" : `translateX(-${textTranslateX}vw)` }}>{firstWord}</h2>
          <h2 style={{ fontSize: "clamp(32px,5vw,64px)", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.02em", margin: 0, transform: reduced ? "none" : `translateX(${textTranslateX}vw)` }}>{restOfTitle}</h2>
        </div>
      )}
    </>
  );

  if (reduced) {
    return (
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "80px 24px" }}>
        <img src={bgImageSrc} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {mediaBox}
          {textBlock}
        </div>
        {children && <div style={{ position: "relative", zIndex: 10, width: "100%" }}>{children}</div>}
      </section>
    );
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", height: `${WRAPPER_HEIGHT_VH}vh` }}>
      <section style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <motion.div
          style={{ position: "absolute", inset: 0, zIndex: 0 }}
          animate={{ opacity: 1 - scrollProgress }}
          transition={{ duration: 0.1 }}
        >
          <img src={bgImageSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.1)" }} />
        </motion.div>

        <div style={{ position: "relative", zIndex: 10, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {mediaBox}
          {textBlock}
        </div>

        {children && (
          <motion.div
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 40px 40px", zIndex: 10 }}
            animate={{ opacity: showContent ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        )}
      </section>
    </div>
  );
}
