/**
 * Real universe data for the /mocks/universe/{a,b,c} Design Studio redesign
 * mocks (mock-only — not used by any production page). Pulled directly from
 * UNIVERSE_CONFIGS in src/lib/websiteThemes.js, the actual current palette/
 * type/motion/layout values each universe ships with today — not the stale
 * bg/accent pairs still hardcoded in UniverseSelector.jsx's thumbnail strip
 * (e.g. its Capri swatch is the OLD flagged navy/lemon palette, superseded
 * by the warm terracotta/gold rework already live in UNIVERSE_CONFIGS).
 *
 * A couple of UniverseSelector.jsx's taglines have drifted from the actual
 * design direction since the palette/framing work landed (its code comments
 * say so directly) — "Safari Chic" for Cape Town's now-vineyard-estate
 * direction, "French Romance" for Paris's now-deliberately-NOT-romantic
 * fashion-plate direction. This file uses taglines that match what the
 * current colors/type/copy actually describe, not the stale picker text.
 */
import { UNIVERSE_CONFIGS } from './websiteThemes';

export const ULTRA_UNIVERSE_IDS = new Set(['marrakech', 'paris']);

const META = {
  aman:      { name: 'Aman',      tagline: 'Quiet luxury' },
  tulum:     { name: 'Tulum',     tagline: 'Organic luxury' },
  kyoto:     { name: 'Kyoto',     tagline: 'Japanese minimalism' },
  capri:     { name: 'Capri',     tagline: 'Mediterranean summer' },
  marrakech: { name: 'Marrakech', tagline: 'Desert opulence' },
  brooklyn:  { name: 'Brooklyn',  tagline: 'Urban industrial' },
  bali:      { name: 'Bali',      tagline: 'Tropical spirit' },
  paris:     { name: 'Paris',     tagline: 'Fashion-plate chic' },
  capetown:  { name: 'Cape Town', tagline: 'Vineyard estate' },
  mykonos:   { name: 'Mykonos',   tagline: 'Aegean architecture' },
};

// Display order — leads with the two universes this mock must show in
// full (Capri open, Marrakech locked), rest follow the config's own order.
const ORDER = ['capri', 'marrakech', 'aman', 'tulum', 'kyoto', 'brooklyn', 'bali', 'paris', 'capetown', 'mykonos'];

export const MOCK_UNIVERSES = ORDER.map(id => {
  const cfg = UNIVERSE_CONFIGS[id] || {};
  return {
    id,
    name: META[id]?.name || id,
    tagline: META[id]?.tagline || '',
    isUltra: ULTRA_UNIVERSE_IDS.has(id),
    colors: cfg.colors || {},
    typography: cfg.typography || {},
    motion: cfg.motion || {},
    texture: cfg.texture || null,
    layout: cfg.layout || null,
    copy: cfg.copy || {},
  };
});

export function getMockUniverse(id) {
  return MOCK_UNIVERSES.find(u => u.id === id) || null;
}
