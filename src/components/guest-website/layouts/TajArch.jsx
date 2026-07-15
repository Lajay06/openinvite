/**
 * TajArch — Taj's signature mark: a thin ogee (pointed Mughal) arch
 * outline, the genuine architectural silhouette rather than a filled
 * mandala/paisley illustration — "woven, not printed" applied to
 * ornamental Indian architecture instead of Marrakech's zellige lattice.
 */
import React from 'react';

export default function TajArch({ color = '#000000', opacity = 0.5, width = 120, height = 100, style }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 100" style={{ width, height, opacity, display: 'block', ...style }}>
      <path
        d="M4 96 L4 50 C4 28 16 10 60 10 C104 10 116 28 116 50 L116 96"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
      />
      <path
        d="M20 96 L20 52 C20 36 32 24 60 24 C88 24 100 36 100 52 L100 96"
        fill="none"
        stroke={color}
        strokeWidth="0.8"
        opacity="0.7"
      />
    </svg>
  );
}
