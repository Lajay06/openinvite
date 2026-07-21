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

// Gating is config-driven: a universe is Ultra iff its own UNIVERSE_CONFIGS
// entry declares tier: 'ultra' (feat/universes-expansion-10 — previously a
// hardcoded id Set here, independent of config, that someone would have to
// remember to update by hand every time a universe's tier changed or a new
// universe shipped).
export const ULTRA_UNIVERSE_IDS = new Set(
  Object.keys(UNIVERSE_CONFIGS).filter(id => UNIVERSE_CONFIGS[id]?.tier === 'ultra')
);

export const STYLE_TAGS = [
  'minimal', 'luxury', 'tropical', 'coastal', 'romantic', 'classic', 'desert', 'urban',
  'natural', 'premium', 'ornamental', 'retro', 'heritage', 'fashion', 'editorial', 'contemporary', 'glamour',
];

const DISPLAY_NAME = {
  london: 'London',
  tulum: 'Tulum',
  kyoto: 'Kyoto',
  capri: 'Capri',
  marrakech: 'Marrakech',
  brooklyn: 'Brooklyn',
  bali: 'Bali',
  paris: 'Paris',
  capetown: 'Cape Town',
  mykonos: 'Mykonos',
  amalfi: 'Amalfi',
  sedona: 'Sedona',
  aspen: 'Aspen',
  taj: 'Taj',
  havana: 'Havana',
  edinburgh: 'Edinburgh',
  monaco: 'Monaco',
  florence: 'Florence',
  seoul: 'Seoul',
  shanghai: 'Shanghai',
};

// Display order — derived from UNIVERSE_CONFIGS' own key order (which is
// its declaration order in websiteThemes.js: the original 10, then the 10
// new Ultra universes from feat/universes-expansion-10, appended not
// interleaved) rather than a second hand-maintained list. A universe added
// to UNIVERSE_CONFIGS with no other changes here now appears automatically,
// in whatever position it was declared — no drift possible between "what
// universes exist" and "what the picker/marketing page shows".
const ORDER = Object.keys(UNIVERSE_CONFIGS);

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
