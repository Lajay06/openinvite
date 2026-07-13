/**
 * VineRule — the "capetown-estate" layout's signature motif: a fine
 * horizontal rule with a single small leaf sprig repeating along its
 * length, like a botanical border on an estate's own stationery.
 * Generated as a tiled SVG data URI (the same technique ZelligeDivider
 * uses), tinted to the wedding's theme colour — distinct from Bali's
 * WaveDivider (a single smooth curve) by being a straight line carrying
 * small discrete leaf marks, not a curved path itself.
 */
import React from 'react';

const TILE_W = 30;
const TILE_H = 16;

function tileSvgDataUri(color) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${TILE_H}" viewBox="0 0 ${TILE_W} ${TILE_H}">` +
    `<line x1="0" y1="8" x2="${TILE_W}" y2="8" stroke="${color}" stroke-width="0.8"/>` +
    `<path d="M15 8 C 13 4, 17 4, 15 8 C 17 5.5, 19 7, 15 8 Z" fill="${color}"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export default function VineRule({ color = '#000000', opacity = 0.5, height = TILE_H, style }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        height,
        backgroundImage: tileSvgDataUri(color),
        backgroundSize: `${TILE_W}px ${TILE_H}px`,
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'left center',
        opacity,
        ...style,
      }}
    />
  );
}
