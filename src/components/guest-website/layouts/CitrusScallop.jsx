/**
 * CitrusScallop — the "capri-citrus" layout's signature motif: a repeating
 * row of semicircle bumps along one edge, like the scalloped pith of a
 * halved citrus fruit. Generated with a single CSS radial-gradient
 * (no image), bright and present rather than woven-quiet — Capri's
 * restraint is in the muted palette, not in how loud the motif reads.
 *
 * `orientation="horizontal"` bumps downward along a horizontal strip;
 * `"vertical"` bumps rightward along a vertical strip (for column
 * dividers in CapriFooter).
 */
import React from 'react';

export default function CitrusScallop({ color = '#000000', bumpSize = 7, orientation = 'horizontal', style, className }) {
  const isHorizontal = orientation === 'horizontal';
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        width: isHorizontal ? '100%' : bumpSize * 2,
        height: isHorizontal ? bumpSize * 2 : '100%',
        backgroundImage: isHorizontal
          ? `radial-gradient(circle at 50% 0, ${color} ${bumpSize}px, transparent ${bumpSize}px)`
          : `radial-gradient(circle at 0 50%, ${color} ${bumpSize}px, transparent ${bumpSize}px)`,
        backgroundSize: isHorizontal ? `${bumpSize * 2}px 100%` : `100% ${bumpSize * 2}px`,
        backgroundRepeat: isHorizontal ? 'repeat-x' : 'repeat-y',
        ...style,
      }}
    />
  );
}
