/**
 * HavanaSunburst — Havana's signature mark: a thin Art Deco fan of
 * straight rays from a single base point. Retro-glamour geometry (film-
 * poster energy) kept to the same hairline weight as every other motif —
 * a fan of lines, never a filled sunburst badge.
 */
import React from 'react';

export default function HavanaSunburst({ color = '#000000', opacity = 0.45, width = 140, height = 70, style }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 140 70" style={{ width, height, opacity, display: 'block', ...style }}>
      <g stroke={color} strokeWidth="1" strokeLinecap="round">
        <path d="M70 70 L70 6" />
        <path d="M70 70 L40 12" />
        <path d="M70 70 L100 12" />
        <path d="M70 70 L16 30" />
        <path d="M70 70 L124 30" />
        <path d="M70 70 L4 60" />
        <path d="M70 70 L136 60" />
      </g>
    </svg>
  );
}
