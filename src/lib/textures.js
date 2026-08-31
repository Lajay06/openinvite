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
 * ── CALIBRATION: COMPOSITING MODEL FIRST, REGULARITY SECOND ─────────────────
 *
 * The original note ordered these families by REGULARITY — geometric patterns
 * read more salient than random noise at equal opacity, so linen and canvas
 * were set lower than grain. That is true, and it is NOT the dominant
 * variable, which is why it produced a level the owner rejected on sight.
 *
 * The dominant variable is HOW THE TEXTURE COMPOSITES:
 *
 *   - a GRID (linen, canvas) paints a black stroke at alpha `o`, so the step
 *     is `ground * o` — ONE-SIDED DARKENING THAT SCALES WITH THE GROUND'S
 *     LUMINANCE. Loud on a light ground, nearly absent on a dark one.
 *   - NOISE (grain, plaster, paper) varies around a fixed midpoint, so the
 *     step is roughly `sigma * o` and BARELY MOVES WITH THE GROUND.
 *
 * Measured in dL* (CIELAB) against each universe's own two grounds: grids
 * swing 2.8-6.7x between dark and light; noise moves 0.7-1.1x, and slightly
 * the other way. Regularity cannot explain a 6x swing. Only compositing can.
 *
 * This matters because ONE overlay at `inset: 0` spans a whole guest page, and
 * four of the five pages are about half light ground. A grid's level is set by
 * the LIGHT ground; the dark one contributes almost nothing.
 *
 * ── AND dL* UNDER-PREDICTS FINER WEAVES: THE 0.84x CORRECTION ───────────────
 *
 * dL* is a PER-PIXEL step — how much darker a stroke pixel is than the ground
 * beside it. It has no term for tile period, stroke width or coverage, so it
 * cannot see that linen's 8px tile lands near the peak of human contrast
 * sensitivity (~3-4 cycles/degree at phone viewing distance) while canvas's
 * 16px tile sits below it.
 *
 * Measured, not assumed: matching canvas 0.015's computed dL* of 1.23 solves
 * to linen 0.0143. Shown both, the owner chose 0.012 — about 0.84x the
 * arithmetic answer, in the predicted direction. SO A FINER WEAVE NEEDS ABOUT
 * 0.84x THE OPACITY THAT EQUAL dL* WOULD SUGGEST.
 *
 * If a sixth texture is added, do not set it from dL* alone. The number looks
 * authoritative and is wrong for anything finer than canvas.
 *
 * Current levels, both chosen by eye against rendered specimens at 1:1:
 *   canvas 0.015 — UNCHANGED, the original calibration was correct
 *   linen  0.012 — was 0.020
 * The three noise defaults are untouched and remain the C1 engineering
 * judgement; they have not been re-measured against this standard.
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
    // 0.012, not the 0.0143 that equal-dL*-with-canvas solves to: linen's 8px
    // period is near the eye's peak sensitivity and reads louder than the
    // per-pixel number predicts. See the 0.84x correction in the header.
    defaultOpacity: 0.012,
  },
  canvas: {
    id: 'canvas',
    label: 'Canvas',
    system: 'procedural',
    backgroundImage: CANVAS_URI,
    backgroundSize: '16px 16px',
    // UNCHANGED and deliberately so. Four universes overrode this upward (to
    // 0.030 at bali, 2x) and that drift was the defect; shown 0.030 / 0.015 /
    // 0.010 at 1:1 the owner chose 0.015 — the value that was already here.
    defaultOpacity: 0.015,
  },
};

export const DEFAULT_TEXTURE_ID = 'grain';

/** @returns the registry entry for `id`, falling back to grain if unknown/missing. */
export function getTexture(id) {
  return TEXTURE_REGISTRY[id] || TEXTURE_REGISTRY[DEFAULT_TEXTURE_ID];
}
