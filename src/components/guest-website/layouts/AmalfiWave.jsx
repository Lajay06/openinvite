/**
 * AmalfiWave — Amalfi's signature mark: a single gentle sine curve (soft,
 * flowing, sea-level) with a small round "citrus" accent riding its peak.
 * Distinct from Bali's WaveDivider (a fuller, more tropical double-crest
 * curve) and Capri's CitrusScallop (repeating bumps) — one quiet line, one
 * quiet dot, evoking horizon-and-grove rather than either.
 */
import React from 'react';

export default function AmalfiWave({ color = '#000000', opacity = 0.4, width = 160, height = 32, style }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 32" style={{ width, height, opacity, display: 'block', ...style }}>
      <path d="M4 20 C 40 4, 80 36, 116 18" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="132" cy="14" r="4" fill="none" stroke={color} strokeWidth="1.1" />
    </svg>
  );
}
