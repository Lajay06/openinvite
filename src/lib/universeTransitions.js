/**
 * The 10 universe-entrance transition treatments (PR B1). Each universe
 * declares its `transitionStyle` id in UNIVERSE_CONFIGS (websiteThemes.js);
 * UniverseEntranceOverlay.jsx looks the id up here and renders the matching
 * motion. Grouped by the universe's own `tags`, not arbitrarily — see the
 * PR description for the full pairing rationale.
 *
 * Every style animates only opacity/transform/clip-path/filter (never
 * width/height/top/left), keeping all 10 compositor-friendly. `overlayLayer`
 * values are rendered by UniverseEntranceOverlay as pre-rendered CSS/SVG
 * textures (reusing src/lib/textures.js's procedural grain) or CSS
 * gradients — never a per-frame JS particle simulation, which is the actual
 * jank risk on mid-range laptops, not the wipe shape itself.
 */

export const TRANSITION_STYLES = {
  'aperture-iris': {
    label: 'Aperture iris reveal',
    clipPath: ['circle(0% at 50% 50%)', 'circle(150% at 50% 50%)'],
    ease: 'circOut',
    overlayLayer: null,
  },
  'zoom-punch': {
    label: 'Zoom-punch snap',
    scale: [1.12, 0.98, 1],
    ease: 'easeOut',
    // Punchy on purpose — never let a universe's own (possibly slow) motion
    // duration dilute this one into a lazy fade.
    fastCapSeconds: 0.5,
    overlayLayer: null,
  },
  'canopy-bloom': {
    label: 'Canopy bloom',
    scale: [1.06, 1],
    ease: 'easeInOut',
    overlayLayer: 'radial-warm',
  },
  'whitespace-unfold': {
    label: 'Whitespace unfold',
    // Draws out to a thin full-width line first, then unfolds vertically —
    // reads as restrained/minimal rather than a plain centred zoom.
    clipPath: ['inset(50% 46% 50% 46%)', 'inset(50% 0% 50% 0%)', 'inset(0% 0% 0% 0%)'],
    times: [0, 0.4, 1],
    ease: 'easeInOut',
    overlayLayer: null,
  },
  'horizon-wash': {
    label: 'Horizon wash',
    clipPath: ['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)'],
    ease: 'easeInOut',
    overlayLayer: null,
  },
  'soft-focus-dissolve': {
    label: 'Soft focus dissolve',
    filterBlur: ['18px', '0px'],
    ease: 'easeOut',
    overlayLayer: null,
  },
  'sand-drift-wipe': {
    label: 'Sand drift wipe',
    // A slanted (20%-skewed) edge sweeping left→right, off-screen to
    // full-coverage. Both keyframes are 4-point polygons so Framer Motion
    // interpolates the shape directly.
    clipPath: [
      'polygon(-30% 0%, -30% 0%, -50% 100%, -50% 100%)',
      'polygon(-30% 0%, 150% 0%, 130% 100%, -50% 100%)',
    ],
    ease: 'easeInOut',
    overlayLayer: 'grain-drift',
  },
  'curtain-draw': {
    label: 'Curtain draw',
    panels: true,
    ease: 'circOut',
    overlayLayer: null,
  },
  'gilded-shimmer-expand': {
    label: 'Gilded shimmer expand',
    scale: [1.08, 1],
    ease: 'easeOut',
    overlayLayer: 'light-sweep',
  },
  'grain-fade-waltz': {
    label: 'Grain-fade waltz',
    // Deliberately no scale/clip-path — the stillness IS the character,
    // in contrast to every other, higher-energy style.
    ease: 'easeInOut',
    overlayLayer: 'grain-static',
  },
};

export function getTransitionStyle(id) {
  return TRANSITION_STYLES[id] || TRANSITION_STYLES['aperture-iris'];
}
