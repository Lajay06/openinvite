/**
 * GrainOverlay — barely-perceptible stone/plaster texture for universe dark sections.
 *
 * Usage: render as the FIRST child of a `position: relative` dark container.
 * It sits at natural DOM order (below later siblings) with no explicit z-index,
 * so content stacks on top without any z-index wrangling.
 *
 * The SVG uses feTurbulence fractalNoise — GPU-friendly, no external image.
 * baseFrequency="0.65" + numOctaves="4" → fine plaster/stone grain feel.
 * feColorMatrix desaturates to grey, matching Aman's monochrome identity.
 */
import React from 'react';

// Pre-encoded grain SVG (200×200, tileable via stitchTiles="stitch")
const GRAIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">` +
  `<filter id="g">` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch"/>` +
  `<feColorMatrix type="saturate" values="0"/>` +
  `</filter>` +
  `<rect width="200" height="200" filter="url(#g)"/>` +
  `</svg>`
);
const GRAIN_URI = `url("data:image/svg+xml,${GRAIN_SVG}")`;

export default function GrainOverlay({ opacity = 0.04 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position:         'absolute',
        inset:            0,
        pointerEvents:    'none',
        backgroundImage:  GRAIN_URI,
        backgroundRepeat: 'repeat',
        backgroundSize:   '200px 200px',
        opacity,
      }}
    />
  );
}
