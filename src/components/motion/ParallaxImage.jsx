/**
 * ParallaxImage — wraps an <img> with scroll-driven translateY parallax.
 * speed: 0 = no parallax, 0.3 = moves at 30% of scroll speed
 */
import React, { useRef } from "react";
import { useScrollEngine } from "@/hooks/useScrollEngine";

export default function ParallaxImage({ src, alt, speed = 0.25, className = "", wrapperClassName = "", style = {} }) {
  const imgRef = useRef(null);
  const prefersReduced = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  useScrollEngine((scrollY) => {
    if (prefersReduced || !imgRef.current) return;
    const el = imgRef.current;
    const rect = el.parentElement.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const offset = (window.innerHeight / 2 - center) * speed;
    el.style.transform = `translateY(${offset}px)`;
  });

  return (
    <div className={`overflow-hidden ${wrapperClassName}`} style={{ ...style }}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`w-full block will-change-transform ${className}`}
        style={{ transform: "translateY(0)" }}
      />
    </div>
  );
}