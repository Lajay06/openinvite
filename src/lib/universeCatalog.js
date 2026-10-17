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
import { heroDeliveryWidth, HERO_MASTERS, heroPublicId } from './heroMasters.js';
import { getSampleWedding } from './sampleContent/index.js';
import { subjectCropUrl } from './universeGallery.js';

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
    transitionStyle: cfg.transitionStyle || 'aperture-iris',
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

/**
 * THE PICTURE MARKETING SHOWS FOR A UNIVERSE.
 *
 * Owner ruling 2026-09-07: the twenty-universe grid and the five-universe
 * scroll were still serving `/universes/<id>.jpg` — local files that predate
 * the Cloudinary folders the owner has since replaced. This returns the
 * universe's CURRENT hero, the same photograph the design studio shows, so
 * marketing and the product cannot drift apart.
 *
 * RESOLVED LAZILY, NOT BAKED INTO THE CATALOG. The first version computed it
 * inside the UNIVERSE_CATALOG map and every universe came back with the old
 * static: sampleContent is not initialised at the moment this module's
 * top-level map runs, so `getSampleWedding` returned undefined twenty times
 * and the fallback won — silently, which is the worst way for that to fail.
 * A function called at render time has no such ordering problem.
 *
 * The sample URL carries `w_2048` for a full-bleed hero — four times the bytes
 * a grid tile needs, and the wrong shape. `c_fill,g_faces:auto` takes the
 * tile's own 3:2 crop from the master and centres it on the PEOPLE — g_auto
 * alone cropped Kyoto's man out of his own tile, because saliency on a wide
 * photograph of two people often picks the architecture between them.
 * g_faces:auto falls back to g_auto by itself when no face is detected.
 *
 * @param {string} id
 * @returns {string|null} a Cloudinary URL, or the local static as a fallback
 */
export function universeTileImage(id, { width = 1200, height = 800 } = {}) {
  const cover = getSampleWedding(id)?.coverPhoto;
  const cropped = cover ? (subjectWindowUrl(id, cover, { width, height }) || subjectCropUrl(cover, { width, height })) : null;
  return cropped || getUniverse(id)?.imageUrl || null;
}

/**
 * WHERE THE COUPLE IS, for the heroes face detection gets wrong in a portrait
 * tile (owner review of #1092, 2026-10-17). The subject's horizontal center
 * as a fraction of the master's width, measured off the master, the same
 * figures heroFocus.js records for the phone hero: brooklyn's couple spans
 * 26-50% and g_faces:auto finds no face, so the 3:4 tile was the bodega;
 * havana's spans 38-62% and the detector's bystanders pushed the woman off
 * the right edge; 0.56, not the midpoint, because her skirt swings past 62%
 * and the man at 38% has room to spare. The other eighteen tiles were checked on a contact sheet
 * and keep g_faces:auto.
 */
export const TILE_SUBJECT_CENTER = { brooklyn: 0.38, havana: 0.56 };

/**
 * A tile narrower than its master, cut around the measured subject: first an
 * explicit crop of the master at the tile's aspect, centered on the couple and
 * held inside the frame, then the fill to the tile's size. Null when the
 * universe has no measurement, the master is unmeasured, or the image is not
 * portrait (the 16:9 scroll is a hero, framed by heroFocus.js), so everything
 * else is unchanged.
 */
function subjectWindowUrl(id, cover, { width, height }) {
  const center = TILE_SUBJECT_CENTER[id];
  const publicId = heroPublicId(cover);
  const master = HERO_MASTERS[publicId];
  if (center == null || !master || width > height) return null;
  const cropWidth = Math.round(master.height * width / height);
  const x = Math.max(0, Math.min(master.width - cropWidth, Math.round(center * master.width - cropWidth / 2)));
  const base = String(cover).split('/image/upload/')[0];
  return `${base}/image/upload/c_crop,x_${x},y_0,w_${cropWidth},h_${master.height}/c_fill,f_auto,q_auto,w_${width},h_${height}/${publicId}`;
}

/**
 * THE FULL-BLEED SCROLL'S OWN WIDTH, PER UNIVERSE.
 *
 * /universes' five-universe scroll renders at the full viewport — 1440 CSS px
 * on a desktop, so 2880 device px at 2x.
 *
 * THIS USED TO BE ONE NUMBER: SCROLL_SAFE_WIDTH = 1376, the smallest master
 * across the twenty (tulum's), because asking for more than a master holds
 * makes Cloudinary upscale and CHARGE for it — `w_1600` on a 1280px master
 * measured 34% MORE bytes than no width at all, for no more detail. One safe
 * number is correct for the smallest universe and wasteful for the other
 * nineteen, and with 4K masters now in nineteen folders it was the single
 * biggest cause of the softness the owner is looking at.
 *
 * The ceiling is now each universe's own master — see heroMasters.js. The
 * comment above SCROLL_SAFE_WIDTH said it was "the one line to raise when
 * they land"; raising it was not enough, because amalfi has not been re-shot
 * and a flat 2880 would upscale it.
 */
export function universeScrollImage(id) {
  const cover = getSampleWedding(id)?.coverPhoto;
  const width = heroDeliveryWidth(cover);
  return universeTileImage(id, { width, height: Math.round(width * 9 / 16) });
}
