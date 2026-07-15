/**
 * AspenPine — Aspen's signature mark: a single-stroke pine-branch line, a
 * central stem with a few angled needle strokes. Minimal and geometric,
 * never a literal illustrated tree — the restrained, "premium hotel"
 * counterpart to a literal pine icon.
 */
import React from 'react';

export default function AspenPine({ color = '#000000', opacity = 0.5, size = 40, style }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 40 40" style={{ opacity, display: 'block', ...style }}>
      <g fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round">
        <path d="M20 4 L20 36" />
        <path d="M20 10 L10 18" />
        <path d="M20 10 L30 18" />
        <path d="M20 18 L8 27" />
        <path d="M20 18 L32 27" />
        <path d="M20 26 L12 34" />
        <path d="M20 26 L28 34" />
      </g>
    </svg>
  );
}
