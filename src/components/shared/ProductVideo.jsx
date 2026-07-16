/**
 * src/components/shared/ProductVideo.jsx
 *
 * Real product screen-recordings on the marketing site, handled honestly:
 * - Lazy: the <video> only mounts once it's actually scrolled into view
 *   (IntersectionObserver), so it never costs bandwidth for a section a
 *   visitor scrolls past quickly.
 * - Never autoplaying audio: always muted — these are UI recordings with
 *   no narration anyway, but the element is muted regardless of that.
 * - prefers-reduced-motion: the poster frame renders as a plain <img> and
 *   the <video> element is never created at all, not just paused.
 */
import { useEffect, useRef, useState } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function ProductVideo({ mp4, webm, poster, alt, style }) {
  const wrapperRef = useRef(null);
  const [inView, setInView] = useState(false);
  const reduced = prefersReduced();

  useEffect(() => {
    if (reduced || !wrapperRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.25 }
    );
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, [reduced]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", ...style }}>
      {reduced || !inView ? (
        <img src={poster} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={poster}
          aria-label={alt}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        >
          <source src={webm} type="video/webm" />
          <source src={mp4} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
