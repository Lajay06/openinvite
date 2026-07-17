/**
 * src/components/shared/ScrollExpandMedia.jsx
 *
 * Pinned scroll-scrub: the video's own playback position is driven
 * directly by scroll progress (video.currentTime = progress * duration),
 * not an independent autoplaying clock. Round 2's version expanded the
 * media box from small to full-bleed as you scrolled, but let the video
 * play on its own timeline — scroll fast and you'd miss half of it, scroll
 * slow and it'd finish early and just loop. Now scroll IS the timeline:
 * scrub down to play forward, scrub up to play backward, stop scrolling
 * and the video stops exactly where you left it. The box still expands
 * small-to-full-bleed on the same progress value, so "the window-
 * expansion component" identity stays intact — expansion and playback
 * are now the same scroll-driven number instead of two independent ones.
 *
 * Sticky + tall-wrapper (unchanged from round 2, still deliberate): a
 * tall wrapper with a `position: sticky` inner panel. The section pins
 * centred in the viewport for the wrapper's full scrollable range, and
 * only releases — continuing to the next section — once that range (and
 * so the scrub) is exhausted. No JS scroll-hijacking/preventDefault, so
 * it stays smooth in both directions and works with trackpad momentum,
 * keyboard, and screen readers.
 *
 * Ported from the owner's Next.js/TypeScript reference component; see
 * git history on this file for the fuller platform-port rationale
 * (no next/image, no 'use client', plain JSX).
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ProductMediaFrame from "@/components/shared/ProductMediaFrame";

const WRAPPER_HEIGHT_VH = 250; // scroll distance the expansion+scrub is spread across
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
  const videoRef = useRef(null);
  const progressRef = useRef(reduced ? 1 : 0); // scrub needs the latest value without waiting on React state

  useEffect(() => {
    const checkIfMobile = () => setIsMobileState(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Scrub the video to match: only ever seeks, never plays on its own —
  // scroll is the only thing that advances the timeline.
  const scrubToProgress = (progress) => {
    const v = videoRef.current;
    if (!v || !v.duration || Number.isNaN(v.duration)) return;
    const target = progress * v.duration;
    if (Math.abs(v.currentTime - target) > 0.01) v.currentTime = target;
  };

  useEffect(() => {
    if (reduced) return; // skip the scroll-linked pin/scrub entirely for motion-sensitive users
    const handleScroll = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const progress = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;
      progressRef.current = progress;
      setScrollProgress(progress);
      setShowContent(progress > 0.85);
      scrubToProgress(progress);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [reduced]);

  // Video loads metadata asynchronously — as soon as duration is known,
  // scrub to wherever scroll currently is instead of showing frame 0.
  const handleLoadedMetadata = () => scrubToProgress(progressRef.current);

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
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            poster={posterSrc}
            aria-label={title || "Product video"}
            onLoadedMetadata={handleLoadedMetadata}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          >
            {/* mp4 first deliberately — Safari picks the first source it can
                decode; see ProductVideo.jsx for the fuller rationale. */}
            <source src={mediaSrc} type="video/mp4" />
            {webmSrc && <source src={webmSrc} type="video/webm" />}
          </video>
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
