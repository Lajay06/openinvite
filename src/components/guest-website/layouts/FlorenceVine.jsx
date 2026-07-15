/**
 * FlorenceVine — Florence's signature mark: a loose, sketch-like vine curl
 * with small leaf accents — deliberately less formal than Cape Town's
 * VineRule (a tidy estate-stationery botanical rule); Florence's reads
 * closer to a fresco-sketch line than a printed border.
 */
import React from 'react';

export default function FlorenceVine({ color = '#000000', opacity = 0.45, width = 160, height = 36, style }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 36" style={{ width, height, opacity, display: 'block', ...style }}>
      <g fill="none" stroke={color} strokeWidth="1" strokeLinecap="round">
        <path d="M4 20 C 30 4, 50 34, 80 18 S 130 4, 156 18" />
        <path d="M40 12 C 44 6, 50 6, 52 12" />
        <path d="M108 12 C 112 6, 118 6, 120 12" />
      </g>
    </svg>
  );
}
