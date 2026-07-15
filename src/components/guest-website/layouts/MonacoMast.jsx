/**
 * MonacoMast — Monaco's signature mark: a thin triangular sail/mast
 * outline over a single waterline rule — a marina silhouette rendered as
 * hairline geometry, not a literal yacht illustration.
 */
import React from 'react';

export default function MonacoMast({ color = '#000000', opacity = 0.5, width = 100, height = 70, style }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 70" style={{ width, height, opacity, display: 'block', ...style }}>
      <g fill="none" stroke={color} strokeWidth="1" strokeLinecap="round">
        <path d="M50 6 L50 52" />
        <path d="M50 10 L78 50 L50 50 Z" />
        <path d="M6 60 L94 60" />
      </g>
    </svg>
  );
}
