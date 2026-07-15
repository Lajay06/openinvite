/**
 * ShanghaiCloud — Shanghai's signature mark: a stylised "auspicious cloud"
 * (ruyi cloud) swirl, the recurring architectural motif from Chinese
 * lattice screens and cornices — a real decorative-arts pattern, not a
 * dragon/lantern cliché, kept to the same hairline weight as every other
 * universe's mark.
 */
import React from 'react';

export default function ShanghaiCloud({ color = '#000000', opacity = 0.45, width = 140, height = 50, style }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 140 50" style={{ width, height, opacity, display: 'block', ...style }}>
      <g fill="none" stroke={color} strokeWidth="1" strokeLinecap="round">
        <path d="M10 36 C 10 24, 26 24, 28 34 C 30 20, 50 20, 52 34 C 54 22, 72 22, 72 36" />
        <path d="M20 36 C 34 44, 58 44, 72 36" />
        <path d="M78 30 C 78 20, 92 20, 94 28 C 96 18, 112 18, 112 30" />
        <path d="M84 30 C 94 36, 106 36, 112 30" />
      </g>
    </svg>
  );
}
