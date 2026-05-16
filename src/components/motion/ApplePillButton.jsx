/**
 * Apple iPhone 17 Pro-style pill button
 * Dark variant (default): glass on dark bg
 * Light variant: glass on light bg
 */
import React, { useState } from "react";

export default function ApplePillButton({ children, onClick, href, light = false, theme = "dark", style = {}, className = "" }) {
  const [hovered, setHovered] = React.useState(false);

  const isLight = light || theme === "light";

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: isLight ? "rgba(10,10,10,0.08)" : "#E03553",
    backdropFilter: isLight ? "blur(12px)" : "none",
    WebkitBackdropFilter: isLight ? "blur(12px)" : "none",
    border: isLight ? "1px solid rgba(10,10,10,0.12)" : "none",
    borderRadius: 999,
    padding: "12px 24px",
    color: isLight ? "#0A0A0A" : "#FFFFFF",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "clamp(13px, 1.2vw, 15px)",
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 0.2s ease, background 0.2s ease",
    textDecoration: "none",
    outline: "none",
    ...style
  };

  const hoverStyle = hovered ? {
    transform: "scale(1.03)",
    background: isLight ? "rgba(10,10,10,0.14)" : "#c42d47",
  } : {};

  const Tag = href ? "a" : "button";

  return (
    <Tag
      href={href}
      onClick={onClick}
      style={{ ...base, ...hoverStyle }}
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      type={href ? undefined : "button"}>
      {children}
    </Tag>
  );
}