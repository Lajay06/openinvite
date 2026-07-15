/**
 * SeoulOrb — Seoul's signature mark: soft layered concentric rings, a
 * frosted-glass-orb gradient shape reduced to line art — the "modern UI"
 * counterpart to EnsoRing's brushed calligraphy circle: perfectly regular
 * and layered rather than hand-drawn and singular.
 */
import React from 'react';

export default function SeoulOrb({ color = '#000000', opacity = 0.4, size = 60, style }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 60 60" style={{ opacity, display: 'block', ...style }}>
      <g fill="none" stroke={color} strokeWidth="1">
        <circle cx="30" cy="30" r="26" opacity="0.5" />
        <circle cx="30" cy="30" r="18" opacity="0.75" />
        <circle cx="30" cy="30" r="10" />
      </g>
    </svg>
  );
}
