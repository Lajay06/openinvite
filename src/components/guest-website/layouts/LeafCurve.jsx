/**
 * LeafCurve — the "bali-organic" layout's small signature accent: a
 * single flowing, hand-drawn-feeling curved stroke (abstract — a swash,
 * not a literal leaf illustration with veins/detail), generated as one
 * SVG path. Keeps Bali's tropical warmth CSS/SVG-generated rather than
 * clipart, per the design system's "no illustrations" quality bar.
 */
import React from 'react';

export default function LeafCurve({ color = '#000000', opacity = 0.55, size = 30, style }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      style={{ opacity, display: 'block', ...style }}
    >
      <path
        d="M 6 26 C 6 14, 14 6, 26 6 C 24 14, 22 20, 6 26 Z"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
