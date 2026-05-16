/**
 * MagneticButton — pulls toward cursor on hover, ripple on click.
 * Drop-in replacement for any <button>.
 */
import React, { useRef, useCallback } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function MagneticButton({ children, onClick, className, style, ...rest }) {
  const btnRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (prefersReduced() || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btnRef.current.style.transition = "transform 0.1s ease";
    btnRef.current.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!btnRef.current) return;
    btnRef.current.style.transition = "transform 0.4s cubic-bezier(0.16,1,0.3,1)";
    btnRef.current.style.transform = "translate(0, 0)";
  }, []);

  const handleClick = useCallback((e) => {
    if (prefersReduced() || !btnRef.current) { onClick?.(e); return; }
    const btn = btnRef.current;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement("span");
    ripple.className = "ripple-span";
    ripple.style.cssText = `
      position:absolute;
      width:${size}px;height:${size}px;
      left:${x}px;top:${y}px;
      background:rgba(255,255,255,0.2);
      border-radius:50%;
      transform:scale(0);
      pointer-events:none;
    `;
    btn.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
    onClick?.(e);
  }, [onClick]);

  return (
    <button
      ref={btnRef}
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  );
}