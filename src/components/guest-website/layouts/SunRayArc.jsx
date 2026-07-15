/**
 * SunRayArc — Tulum's signature mark: nested concentric arcs rising off a
 * baseline, a sunrise/sunset horizon rendered as thin generated line-work
 * (never a literal sun icon or palm-tree cliché). Fits the "coastal ledger"
 * idiom — sun-bleached, unhurried — the same restrained-geometry approach
 * as EnsoRing/WaveDivider, just concentric rather than circular or wave-y.
 */
import React from 'react';

export default function SunRayArc({ color = '#000000', opacity = 0.4, width = 160, height = 40, style }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 40"
      style={{ width, height, opacity, display: 'block', ...style }}
    >
      <g fill="none" stroke={color} strokeWidth="1" strokeLinecap="round">
        <path d="M 10 40 A 70 70 0 0 1 150 40" />
        <path d="M 30 40 A 50 50 0 0 1 130 40" />
        <path d="M 50 40 A 30 30 0 0 1 110 40" />
        <path d="M 70 40 A 10 10 0 0 1 90 40" />
      </g>
    </svg>
  );
}
