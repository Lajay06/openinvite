/**
 * WaveDivider — the "bali-organic" layout's section boundary: a smooth SVG
 * wave path (a real generated curve, not an image) used in place of a
 * straight rule wherever this layout needs to separate content — the
 * organic, curved counterpart to every other layout's straight lines
 * (HairlineRule/VerticalRule/ZelligeDivider/TicketStub). This is how
 * Bali's "curved dividers, soft edges" is achieved without adding
 * border-radius to content blocks, which the project's own design rules
 * reserve for buttons/pills only.
 */
import React from 'react';

export default function WaveDivider({ color = '#000000', opacity = 0.3, height = 20, style }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 20"
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block', opacity, ...style }}
    >
      <path
        d="M0 10 C 25 0, 50 20, 75 10 S 125 0, 150 10 S 190 18, 200 10"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
