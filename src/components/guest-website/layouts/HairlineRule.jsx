/**
 * HairlineRule — the "aman-minimal" layout's signature mark: a single bare
 * rule, no pattern, no ornament. The deliberate anti-motif to
 * ZelligeDivider's woven zellige — Aman's "confident restraint" idiom uses
 * *removal* as the decorative gesture, so its one recurring mark is the
 * plainest possible line, appearing sparingly (once per section boundary),
 * never tiled or repeated as texture.
 */
import React from 'react';

export default function HairlineRule({ color = '#000000', opacity = 0.18, width = 56, thickness = 1, style }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height: thickness,
        backgroundColor: color,
        opacity,
        ...style,
      }}
    />
  );
}
