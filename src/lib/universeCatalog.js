/**
 * The single source of truth for the Design Studio universe picker
 * (fix/design-studio-entrance). Every palette/type/motion/motif/tag/
 * description value comes straight from UNIVERSE_CONFIGS
 * (websiteThemes.js) — this file only adds a display name and a stable
 * display order; it never hardcodes a colour or font. This is the fix for
 * the bug the old UniverseSelector.jsx had: its swatches were a second,
 * independently-maintained copy of the palette that had drifted out of
 * sync with UNIVERSE_CONFIGS (e.g. its Capri swatch was the old flagged
 * navy/lemon palette, long since corrected in the real config).
 */
import { UNIVERSE_CONFIGS } from './websiteThemes.js';

export const ULTRA_UNIVERSE_IDS = new Set(['marrakech', 'paris']);

export const STYLE_TAGS = ['minimal', 'luxury', 'tropical', 'coastal', 'romantic', 'classic', 'desert', 'urban'];

const DISPLAY_NAME = {
  aman: 'Aman',
  tulum: 'Tulum',
  kyoto: 'Kyoto',
  capri: 'Capri',
  marrakech: 'Marrakech',
  brooklyn: 'Brooklyn',
  bali: 'Bali',
  paris: 'Paris',
  capetown: 'Cape Town',
  mykonos: 'Mykonos',
};

// Fixed display order — stable across renders/filters so tiles never
// visibly reshuffle when a filter changes which ones are shown.
const ORDER = ['aman', 'tulum', 'kyoto', 'capri', 'marrakech', 'brooklyn', 'bali', 'paris', 'capetown', 'mykonos'];

export const UNIVERSE_CATALOG = ORDER.map(id => {
  const cfg = UNIVERSE_CONFIGS[id] || {};
  return {
    id,
    name: DISPLAY_NAME[id] || id,
    isUltra: ULTRA_UNIVERSE_IDS.has(id),
    colors: cfg.colors || {},
    typography: cfg.typography || {},
    motion: cfg.motion || {},
    texture: cfg.texture || null,
    layout: cfg.layout || null,
    copy: cfg.copy || {},
    tagline: cfg.tagline || '',
    tags: cfg.tags || [],
    tileDescription: cfg.tileDescription || '',
    motifNote: cfg.motifNote || '',
    worldStory: cfg.worldStory || '',
    imageUrl: cfg.imageUrl || null,
  };
});

export function getUniverse(id) {
  return UNIVERSE_CATALOG.find(u => u.id === id) || null;
}
