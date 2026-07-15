/**
 * SedonaContour — Sedona's signature mark: nested horizon-line arcs
 * stacked like mesa strata / topographic contour lines. Organic, uneven
 * spacing (not perfectly concentric like SunRayArc/EnsoRing) — reads as
 * rock layers, not a sunrise.
 */
import React from 'react';

export default function SedonaContour({ color = '#000000', opacity = 0.45, width = 180, height = 40, style }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 180 40" style={{ width, height, opacity, display: 'block', ...style }}>
      <g fill="none" stroke={color} strokeWidth="1" strokeLinecap="round">
        <path d="M0 36 Q 45 30, 90 34 T 180 32" />
        <path d="M0 26 Q 50 18, 95 24 T 180 20" />
        <path d="M0 14 Q 40 6, 85 12 T 180 8" />
      </g>
    </svg>
  );
}
