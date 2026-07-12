/**
 * ZelligeDivider — a fine, generated (not image) geometric motif used as a
 * section rule/border. Modelled on the interlocking star-and-lattice
 * geometry of Moroccan zellige tilework, rendered as a single-stroke SVG
 * data URI tinted to the wedding's own theme colour at low opacity — "woven
 * throughout" texture-of-craft, never a loud decorative flourish.
 *
 * Colour is baked into the data URI per-instance (unlike the fixed-palette
 * procedural textures in src/lib/textures.js) because it needs to follow
 * each wedding's resolved theme.accent/lightText, not a static tone.
 *
 * `orientation="horizontal"` tiles left-to-right as a rule; `"vertical"`
 * tiles top-to-bottom as a column divider (used by EditorialGridFooter).
 */
import React from 'react';

const TILE = 40;

function tileSvgDataUri(color) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">` +
    `<g fill="none" stroke="${color}" stroke-width="0.85" stroke-linejoin="round">` +
    `<path d="M20 3 L25.5 14.5 L38 15 L28.5 22.5 L32 34 L20 27 L8 34 L11.5 22.5 L2 15 L14.5 14.5 Z"/>` +
    `<circle cx="20" cy="20" r="2.4"/>` +
    `</g>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export default function ZelligeDivider({
  color = '#000000',
  opacity = 0.35,
  orientation = 'horizontal',
  height,
  width,
  style,
  className,
}) {
  const backgroundImage = tileSvgDataUri(color);
  const dims = orientation === 'horizontal'
    ? { width: '100%', height: height ?? TILE, backgroundSize: `${TILE}px ${TILE}px`, backgroundRepeat: 'repeat-x' }
    : { width: width ?? TILE, height: '100%', backgroundSize: `${TILE}px ${TILE}px`, backgroundRepeat: 'repeat-y' };

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        ...dims,
        backgroundImage,
        backgroundPosition: 'center',
        opacity,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
