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
 *
 * Root cause of an earlier "reads as a static picture" bug, found by
 * testing WebKit specifically (Chromium played it fine, WebKit didn't):
 * Safari does not reliably honor the `autoplay` HTML attribute on a
 * <video> that's mounted dynamically by React after initial page load —
 * confirmed via Playwright's webkit engine (paused: true, currentTime: 0,
 * readyState: 1 despite the autoplay attribute being present). The fix is
 * an explicit imperative .play() call once the element exists, with the
 * returned promise caught — if the browser still blocks it (e.g. a data-
 * saver mode), the poster attribute is the honest fallback, not a crash.
 */
import { useEffect, useRef, useState } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function ProductVideo({ mp4, webm, poster, alt, style }) {
  const wrapperRef = useRef(null);
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);
  const reduced = prefersReduced();

  useEffect(() => {
    if (reduced || !wrapperRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!inView || reduced || !videoRef.current) return;
    const v = videoRef.current;
    v.muted = true; // belt-and-braces: Safari's autoplay gate checks the property, not just the attribute
    const playPromise = v.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => { /* still blocked (e.g. data-saver) — poster stays visible via the poster attribute */ });
    }
  }, [inView, reduced]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", ...style }}>
      {reduced || !inView ? (
        <img src={poster} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
          aria-label={alt}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        >
          {/* mp4/h264 listed first deliberately — Safari's source-selection
              picked webm here even though it can't decode vp9 at all
              (stuck at readyState 1 forever, confirmed via WebKit testing),
              rather than falling through to mp4. Browsers pick the first
              source they can play, so mp4 first means every engine
              (Safari included) gets a source it can actually decode; the
              bandwidth cost of losing webm's efficiency in Chrome/Firefox
              is a fair trade for the video reliably playing everywhere. */}
          <source src={mp4} type="video/mp4" />
          <source src={webm} type="video/webm" />
        </video>
      )}
    </div>
  );
}
