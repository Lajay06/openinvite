/**
 * src/lib/textures.js
 *
 * Procedural texture token registry (TEXTURE_LIBRARY_SPEC.md, C3 step 1 —
 * "token plumbing, procedural-only"). Each texture is addressed by a stable
 * `id` — nothing outside this file or TextureOverlay.jsx knows or cares how
 * a texture is rendered, which is what lets image textures (C3 step 2) slot
 * into the same interface later without touching any consumer.
 *
 * `grain` is token #1 — migrated byte-for-byte from the original C1
 * GrainOverlay.jsx (feTurbulence fractalNoise, baseFrequency 0.65,
 * numOctaves 4, fully desaturated) so London's default renders with zero
 * visual change.
 *
 * Default opacities are calibrated against the C1 "barely-there" standard
 * (visible on close inspection of flat areas, invisible at a glance) using
 * grain's tuned 0.025 as the reference. Regular geometric patterns (linen,
 * canvas) read more perceptually salient than random noise at equal
 * opacity, so they're calibrated lower; lower-frequency noise (plaster)
 * produces larger contiguous blobs that also read stronger, so it sits
 * slightly below grain too. These are engineering-judgment starting points
 * per the spec's own build-sequence note ("verify live before merge") —
 * fine-tune visually against London on preview before shipping wider.
 */

function svgDataUri(svgMarkup) {
  return `url("data:image/svg+xml,${encodeURIComponent(svgMarkup)}")`;
}

// ── grain — token #1, unchanged from the original C1 GrainOverlay.jsx ────────
const GRAIN_URI = svgDataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">` +
  `<filter id="g">` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch"/>` +
  `<feColorMatrix type="saturate" values="0"/>` +
  `</filter>` +
  `<rect width="200" height="200" filter="url(#g)"/>` +
  `</svg>`
);

// ── plaster — soft mottled variation, lower frequency than grain ────────────
const PLASTER_URI = svgDataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">` +
  `<filter id="p">` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="3" stitchTiles="stitch"/>` +
  `<feColorMatrix type="saturate" values="0"/>` +
  `</filter>` +
  `<rect width="200" height="200" filter="url(#p)"/>` +
  `</svg>`
);

// ── paper — subtle fibre noise, slightly warmer than grain ──────────────────
// Non-fractal turbulence (finer, more "fibrous" than fractalNoise) with a
// small residual saturation left in — full desaturation (saturate=0, as
// grain/plaster use) reads pure neutral grey; leaving ~12% saturation keeps
// a faint warm cast from the raw noise's RGB variance.
const PAPER_URI = svgDataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">` +
  `<filter id="pa">` +
  `<feTurbulence type="turbulence" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>` +
  `<feColorMatrix type="saturate" values="0.12"/>` +
  `</filter>` +
  `<rect width="200" height="200" filter="url(#pa)"/>` +
  `</svg>`
);

// ── linen — fine cross-hatch weave ───────────────────────────────────────────
// Geometric SVG pattern (not turbulence) — two diagonal line sets crossing
// at a tight 8px pitch, approximating a plain-weave fabric's regular grid
// at the scale this renders (a screen-viewed "barely-there" overlay, not a
// macro photo) without needing a real tileable image asset.
const LINEN_URI = svgDataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">` +
  `<path d="M0,8 L8,0" stroke="#000000" stroke-width="0.6"/>` +
  `<path d="M0,0 L8,8" stroke="#000000" stroke-width="0.6"/>` +
  `</svg>`
);

// ── canvas — coarser weave than linen ────────────────────────────────────────
// Same cross-hatch family as linen, larger pitch and thicker stroke —
// coarser weave, per the spec.
const CANVAS_URI = svgDataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">` +
  `<path d="M0,16 L16,0" stroke="#000000" stroke-width="1.1"/>` +
  `<path d="M0,0 L16,16" stroke="#000000" stroke-width="1.1"/>` +
  `</svg>`
);

export const TEXTURE_REGISTRY = {
  grain: {
    id: 'grain',
    label: 'Grain',
    system: 'procedural',
    backgroundImage: GRAIN_URI,
    backgroundSize: '200px 200px',
    defaultOpacity: 0.025, // reference value — C1's tuned London default
  },
  plaster: {
    id: 'plaster',
    label: 'Plaster',
    system: 'procedural',
    backgroundImage: PLASTER_URI,
    backgroundSize: '200px 200px',
    defaultOpacity: 0.02,
  },
  paper: {
    id: 'paper',
    label: 'Paper',
    system: 'procedural',
    backgroundImage: PAPER_URI,
    backgroundSize: '200px 200px',
    defaultOpacity: 0.025,
  },
  linen: {
    id: 'linen',
    label: 'Linen',
    system: 'procedural',
    backgroundImage: LINEN_URI,
    backgroundSize: '8px 8px',
    defaultOpacity: 0.02,
  },
  canvas: {
    id: 'canvas',
    label: 'Canvas',
    system: 'procedural',
    backgroundImage: CANVAS_URI,
    backgroundSize: '16px 16px',
    defaultOpacity: 0.015,
  },
};

export const DEFAULT_TEXTURE_ID = 'grain';

/** @returns the registry entry for `id`, falling back to grain if unknown/missing. */
export function getTexture(id) {
  return TEXTURE_REGISTRY[id] || TEXTURE_REGISTRY[DEFAULT_TEXTURE_ID];
}
