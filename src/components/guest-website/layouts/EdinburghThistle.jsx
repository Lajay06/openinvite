/**
 * EdinburghThistle — Edinburgh's signature mark: a single-line stylised
 * thistle (Scotland's own emblem) — a stem with a rounded bud outline,
 * quiet enough to read as a heritage-crest flourish rather than a
 * souvenir-shop icon.
 */
import React from 'react';

export default function EdinburghThistle({ color = '#000000', opacity = 0.5, size = 44, style }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 44 44" style={{ opacity, display: 'block', ...style }}>
      <g fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round">
        <path d="M22 40 L22 20" />
        <path d="M22 26 L12 32" />
        <path d="M22 26 L32 32" />
        <path d="M22 20 C14 20 10 14 12 6 C16 10 18 12 22 12 C26 12 28 10 32 6 C34 14 30 20 22 20 Z" />
      </g>
    </svg>
  );
}
