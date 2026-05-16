/**
 * useSpotlight — attaches a radial brand-tint spotlight that follows
 * the cursor on the given element ref. Only active on dark sections.
 */
import { useEffect } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useSpotlight(ref, baseBg = "#0A0A0A") {
  useEffect(() => {
    if (prefersReduced() || !ref.current) return;
    const el = ref.current;

    let raf;
    let cx = 0, cy = 0;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      cx = e.clientX - rect.left;
      cy = e.clientY - rect.top;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.background = `radial-gradient(600px circle at ${cx}px ${cy}px, rgba(224,53,83,0.04) 0%, transparent 40%), ${baseBg}`;
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.background = baseBg;
    };

    el.addEventListener("mousemove", onMove, { passive: true });
    el.addEventListener("mouseleave", onLeave, { passive: true });
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [ref, baseBg]);
}