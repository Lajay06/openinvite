/**
 * useAppleReveal — attaches Apple-style scroll reveal to a ref element
 * opacity 0 → 1, scale 0.94 → 1, blur 4px → 0 driven by IntersectionObserver ratio
 */
import { useEffect } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useAppleReveal(ref) {
  useEffect(() => {
    if (!ref.current || prefersReduced()) return;
    const el = ref.current;

    el.style.opacity = "0";
    el.style.transform = "scale(0.94)";
    el.style.filter = "blur(4px)";
    el.style.transition = "none";
    el.style.willChange = "transform, opacity, filter";

    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ratio = entry.intersectionRatio;
          el.style.opacity = String(Math.min(1, ratio * 2.5));
          el.style.transform = `scale(${0.94 + ratio * 0.06})`;
          el.style.filter = `blur(${Math.max(0, 4 - ratio * 10)}px)`;

          if (ratio >= 0.98) {
            // Fully visible — clean up will-change
            el.style.willChange = "auto";
          }
        });
      },
      { threshold: thresholds }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
}