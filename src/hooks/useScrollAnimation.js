import { useEffect, useRef } from "react";

/**
 * Attach to a container ref — all children with .anim-* classes
 * get .anim-visible added when they scroll into view.
 */
export function useScrollAnimation() {
  const ref = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const els = ref.current?.querySelectorAll(".anim-fade-up, .anim-fade-left, .anim-fade-right") ?? [];
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("anim-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return ref;
}