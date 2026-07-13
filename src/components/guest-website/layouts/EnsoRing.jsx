/**
 * EnsoRing — the "kyoto-vertical" layout's signature mark: a single
 * brushed, deliberately-incomplete circle (an ensō — the Japanese
 * calligraphic circle, drawn in one breath, never quite closed). Rendered
 * as a real SVG stroke arc (not a photo/illustration), rounded line-caps
 * giving it a brushed rather than mechanical feel. Small and quiet — a
 * seal-like accent, not a centrepiece.
 */
import React from 'react';

export default function EnsoRing({ color = '#000000', opacity = 0.5, size = 28, style }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ opacity, display: 'block', ...style }}
    >
      <path
        d="M 20 4 A 16 16 0 1 1 8.5 9.2"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
