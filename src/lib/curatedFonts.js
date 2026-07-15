/**
 * src/lib/curatedFonts.js
 *
 * Curated font system (feat/block-styling-curated) — fixes the Typography
 * picker, which was completely inert: resolveTypography() in
 * universeStyling.js gave a universe's own `typography` field unconditional
 * priority over weddingDetails.activeTypography, and every real wedding has
 * an activeUniverse (defaults to 'aman' — see the Base44 WeddingDetails
 * schema), so the activeTypography branch was permanently dead code.
 *
 * Design principle (locked): couples choose FROM a small, curated,
 * per-universe-appropriate set of fonts — never a free Google Fonts search,
 * never an arbitrary family. Every font below is a real family already
 * vetted for this app: either a universe's own existing default (see
 * UNIVERSE_CONFIGS in websiteThemes.js) or a small, deliberately chosen
 * addition (Playfair Display, EB Garamond) in the same register.
 *
 * UNIVERSE_DEFAULT_FONT_IDS maps each universe to the CURATED_FONTS entries
 * that reproduce its existing typography byte-for-byte — this is what makes
 * "no override set" (every wedding today, including John & Suzanne)
 * resolve to the exact same output as before this change. Verified in
 * tests/persistence/curated-fonts.mjs.
 */

export const CURATED_FONTS = {
  // ── Heading-capable serif / display ──────────────────────────
  'cormorant-garamond': { label: 'Cormorant Garamond', family: '"Cormorant Garamond", serif', googleFonts: 'Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400', weight: 400 },
  'fraunces': { label: 'Fraunces', family: '"Fraunces", serif', googleFonts: 'Fraunces:ital,wght@0,300;0,600;1,400', weight: 400 },
  'shippori-mincho': { label: 'Shippori Mincho', family: '"Shippori Mincho", serif', googleFonts: 'Shippori+Mincho:wght@400;500;600', weight: 400 },
  'yeseva-one': { label: 'Yeseva One', family: '"Yeseva One", serif', googleFonts: 'Yeseva+One', weight: 400 },
  'amiri': { label: 'Amiri', family: '"Amiri", serif', googleFonts: 'Amiri:ital,wght@0,400;0,700;1,400;1,700', weight: 400 },
  'bebas-neue': { label: 'Bebas Neue', family: '"Bebas Neue", sans-serif', googleFonts: 'Bebas+Neue', weight: 400 },
  'lora': { label: 'Lora', family: '"Lora", serif', googleFonts: 'Lora:ital,wght@0,400;0,600;1,400', weight: 400 },
  'bodoni-moda': { label: 'Bodoni Moda', family: '"Bodoni Moda", serif', googleFonts: 'Bodoni+Moda:ital,wght@0,400;0,600;1,400', weight: 400 },
  'bitter': { label: 'Bitter', family: '"Bitter", serif', googleFonts: 'Bitter:ital,wght@0,400;0,600;1,400', weight: 400 },
  'montserrat-heading': { label: 'Montserrat', family: '"Montserrat", sans-serif', googleFonts: 'Montserrat:wght@300;400;500;700', weight: 700 },
  'playfair-display': { label: 'Playfair Display', family: '"Playfair Display", serif', googleFonts: 'Playfair+Display:ital,wght@0,400;0,600;0,700;1,400', weight: 400 },
  'eb-garamond': { label: 'EB Garamond', family: '"EB Garamond", serif', googleFonts: 'EB+Garamond:ital,wght@0,400;0,500;1,400', weight: 400 },

  // ── Body-capable sans / serif ─────────────────────────────────
  'jost': { label: 'Jost', family: '"Jost", sans-serif', googleFonts: 'Jost:wght@300;400;500', weight: 400 },
  'karla': { label: 'Karla', family: '"Karla", sans-serif', googleFonts: 'Karla:wght@300;400;500', weight: 400 },
  'zen-kaku-gothic-new': { label: 'Zen Kaku Gothic New', family: '"Zen Kaku Gothic New", sans-serif', googleFonts: 'Zen+Kaku+Gothic+New:wght@300;400;500', weight: 400 },
  'poppins': { label: 'Poppins', family: '"Poppins", sans-serif', googleFonts: 'Poppins:wght@300;400;500', weight: 400 },
  'nunito-sans': { label: 'Nunito Sans', family: '"Nunito Sans", sans-serif', googleFonts: 'Nunito+Sans:wght@300;400;500', weight: 400 },
  'ibm-plex-sans': { label: 'IBM Plex Sans', family: '"IBM Plex Sans", sans-serif', googleFonts: 'IBM+Plex+Sans:wght@300;400;500', weight: 400 },
  'mulish': { label: 'Mulish', family: '"Mulish", sans-serif', googleFonts: 'Mulish:wght@300;400;500', weight: 400 },
  'lato': { label: 'Lato', family: '"Lato", sans-serif', googleFonts: 'Lato:wght@300;400;700', weight: 400 },
  'josefin-sans': { label: 'Josefin Sans', family: '"Josefin Sans", sans-serif', googleFonts: 'Josefin+Sans:wght@300;400;500', weight: 400 },
  // Same full weight range as montserrat-heading, deliberately — when both
  // heading and body resolve to Montserrat (Mykonos's own default), the two
  // fragments are identical strings and dedupe to ONE family= param,
  // reproducing the universe's original single-fragment googleFonts query
  // exactly (see resolveTypography in universeStyling.js).
  'montserrat-body': { label: 'Montserrat', family: '"Montserrat", sans-serif', googleFonts: 'Montserrat:wght@300;400;500;700', weight: 400 },

  // ── feat/block-styling-v2: additional fonts for the 30-font catalog ──
  // (FONT_CATALOG below) — not referenced by any UNIVERSE_DEFAULT_FONT_IDS
  // / UNIVERSE_FONT_OPTIONS entry, purely available via the free heading/
  // body dropdowns.
  'inter': { label: 'Inter', family: '"Inter", sans-serif', googleFonts: 'Inter:wght@300;400;500;600;700', weight: 400 },
  'work-sans': { label: 'Work Sans', family: '"Work Sans", sans-serif', googleFonts: 'Work+Sans:wght@300;400;500;600', weight: 400 },
  'dm-sans': { label: 'DM Sans', family: '"DM Sans", sans-serif', googleFonts: 'DM+Sans:wght@400;500;700', weight: 400 },
  'space-grotesk': { label: 'Space Grotesk', family: '"Space Grotesk", sans-serif', googleFonts: 'Space+Grotesk:wght@400;500;600;700', weight: 400 },
  'raleway': { label: 'Raleway', family: '"Raleway", sans-serif', googleFonts: 'Raleway:wght@300;400;500;600', weight: 400 },
  'nunito': { label: 'Nunito', family: '"Nunito", sans-serif', googleFonts: 'Nunito:wght@300;400;600;700', weight: 400 },
  'cormorant': { label: 'Cormorant', family: '"Cormorant", serif', googleFonts: 'Cormorant:ital,wght@0,400;0,500;0,600;1,400', weight: 400 },
  'cinzel': { label: 'Cinzel', family: '"Cinzel", serif', googleFonts: 'Cinzel:wght@400;500;600;700', weight: 400 },
  'libre-baskerville': { label: 'Libre Baskerville', family: '"Libre Baskerville", serif', googleFonts: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400', weight: 400 },

  // ── feat/universes-expansion-10: new heading/body faces for the 10 new
  // Ultra universes. Noto Sans KR/SC are CJK faces — Google's css2 endpoint
  // subsets these into many small per-script @font-face blocks with their
  // own unicode-range automatically (no extra config needed here); a page
  // only ever downloads the glyph ranges its own text actually uses.
  'prata': { label: 'Prata', family: '"Prata", serif', googleFonts: 'Prata', weight: 400 },
  'abril-fatface': { label: 'Abril Fatface', family: '"Abril Fatface", serif', googleFonts: 'Abril+Fatface', weight: 400 },
  'sora': { label: 'Sora', family: '"Sora", sans-serif', googleFonts: 'Sora:wght@300;400;500;600', weight: 400 },
  'hind': { label: 'Hind', family: '"Hind", sans-serif', googleFonts: 'Hind:wght@300;400;500;600', weight: 400 },
  'source-sans-3': { label: 'Source Sans 3', family: '"Source Sans 3", sans-serif', googleFonts: 'Source+Sans+3:wght@300;400;500;600', weight: 400 },
  'manrope': { label: 'Manrope', family: '"Manrope", sans-serif', googleFonts: 'Manrope:wght@300;400;500;600', weight: 400 },
  'outfit': { label: 'Outfit', family: '"Outfit", sans-serif', googleFonts: 'Outfit:wght@300;400;500;600', weight: 400 },
  'noto-sans-kr': { label: 'Noto Sans KR', family: '"Noto Sans KR", sans-serif', googleFonts: 'Noto+Sans+KR:wght@300;400;500;700', weight: 400 },
  'noto-sans-sc': { label: 'Noto Sans SC', family: '"Noto Sans SC", sans-serif', googleFonts: 'Noto+Sans+SC:wght@300;400;500;700', weight: 400 },
  // Added after Aspen/Monaco's first heading-font picks (Libre Baskerville,
  // Cormorant Garamond) turned out to collide with fonts the existing 10
  // already use — every universe's heading AND body font must be globally
  // distinct (tests/persistence/universe-styling.mjs), so each needed a
  // fresh, thematically-close alternative instead.
  'spectral': { label: 'Spectral', family: '"Spectral", serif', googleFonts: 'Spectral:wght@300;400;500;600', weight: 400 },
  'antic-didone': { label: 'Antic Didone', family: '"Antic Didone", serif', googleFonts: 'Antic+Didone', weight: 400 },
  // Aspen's body font — the app's own dashboard font (Plus Jakarta Sans,
  // already loaded globally via index.html), reused deliberately as a
  // guest-site body font, distinct from every other universe's own family.
  'plus-jakarta-sans': { label: 'Plus Jakarta Sans', family: '"Plus Jakarta Sans", sans-serif', googleFonts: 'Plus+Jakarta+Sans:wght@300;400;500', weight: 400 },
};

/**
 * The 30-font catalog for the free heading/body dropdowns (feat/block-
 * styling-v2, item 7) — one entry per unique family (Montserrat appears
 * once here even though CURATED_FONTS has it twice for the Mykonos-default
 * weight split above). Still a fixed, curated list — not the full Google
 * Fonts catalogue — but no longer filtered per universe: any of the 30 can
 * be picked as either the heading or the body font, for any universe.
 * Per-universe curation now lives only in the one-click pairing presets
 * (universePairingPresets), not in which fonts are selectable at all.
 */
export const FONT_CATALOG = [
  'playfair-display', 'cormorant-garamond', 'cormorant', 'fraunces', 'bodoni-moda', 'eb-garamond',
  'libre-baskerville', 'lora', 'bitter', 'amiri', 'shippori-mincho', 'yeseva-one', 'cinzel', 'bebas-neue',
  'inter', 'montserrat-heading', 'work-sans', 'dm-sans', 'space-grotesk', 'raleway', 'nunito', 'nunito-sans',
  'poppins', 'lato', 'karla', 'jost', 'josefin-sans', 'mulish', 'ibm-plex-sans', 'zen-kaku-gothic-new',
  'prata', 'abril-fatface', 'sora', 'hind', 'source-sans-3', 'manrope', 'outfit', 'noto-sans-kr', 'noto-sans-sc',
  'spectral', 'antic-didone', 'plus-jakarta-sans',
].map(id => ({ id, ...CURATED_FONTS[id] }));

/** Each universe's own default heading/body font, expressed as CURATED_FONTS ids. */
export const UNIVERSE_DEFAULT_FONT_IDS = {
  aman: { headingFontId: 'cormorant-garamond', bodyFontId: 'jost' },
  tulum: { headingFontId: 'fraunces', bodyFontId: 'karla' },
  kyoto: { headingFontId: 'shippori-mincho', bodyFontId: 'zen-kaku-gothic-new' },
  capri: { headingFontId: 'yeseva-one', bodyFontId: 'poppins' },
  marrakech: { headingFontId: 'amiri', bodyFontId: 'nunito-sans' },
  brooklyn: { headingFontId: 'bebas-neue', bodyFontId: 'ibm-plex-sans' },
  bali: { headingFontId: 'lora', bodyFontId: 'mulish' },
  paris: { headingFontId: 'bodoni-moda', bodyFontId: 'lato' },
  capetown: { headingFontId: 'bitter', bodyFontId: 'josefin-sans' },
  mykonos: { headingFontId: 'montserrat-heading', bodyFontId: 'montserrat-body' },
  amalfi: { headingFontId: 'cormorant', bodyFontId: 'work-sans' },
  sedona: { headingFontId: 'cinzel', bodyFontId: 'sora' },
  aspen: { headingFontId: 'spectral', bodyFontId: 'plus-jakarta-sans' },
  taj: { headingFontId: 'prata', bodyFontId: 'hind' },
  havana: { headingFontId: 'abril-fatface', bodyFontId: 'raleway' },
  edinburgh: { headingFontId: 'eb-garamond', bodyFontId: 'source-sans-3' },
  monaco: { headingFontId: 'antic-didone', bodyFontId: 'manrope' },
  florence: { headingFontId: 'libre-baskerville', bodyFontId: 'dm-sans' },
  seoul: { headingFontId: 'outfit', bodyFontId: 'noto-sans-kr' },
  shanghai: { headingFontId: 'playfair-display', bodyFontId: 'noto-sans-sc' },
};

/**
 * Curated alternates per universe — deliberately small and mood-matched,
 * not the full registry. First id in each list is always that universe's
 * own default (see UNIVERSE_DEFAULT_FONT_IDS), so "back to universe
 * default" is always the first, most visible option in the picker.
 */
export const UNIVERSE_FONT_OPTIONS = {
  aman: { headingFontIds: ['cormorant-garamond', 'playfair-display', 'eb-garamond'], bodyFontIds: ['jost', 'karla', 'mulish'] },
  tulum: { headingFontIds: ['fraunces', 'lora', 'amiri'], bodyFontIds: ['karla', 'mulish', 'jost'] },
  kyoto: { headingFontIds: ['shippori-mincho', 'eb-garamond', 'cormorant-garamond'], bodyFontIds: ['zen-kaku-gothic-new', 'jost', 'josefin-sans'] },
  capri: { headingFontIds: ['yeseva-one', 'fraunces', 'playfair-display'], bodyFontIds: ['poppins', 'nunito-sans', 'lato'] },
  marrakech: { headingFontIds: ['amiri', 'fraunces', 'bodoni-moda'], bodyFontIds: ['nunito-sans', 'karla', 'josefin-sans'] },
  brooklyn: { headingFontIds: ['bebas-neue', 'montserrat-heading', 'bodoni-moda'], bodyFontIds: ['ibm-plex-sans', 'jost', 'karla'] },
  bali: { headingFontIds: ['lora', 'fraunces', 'amiri'], bodyFontIds: ['mulish', 'karla', 'nunito-sans'] },
  paris: { headingFontIds: ['bodoni-moda', 'playfair-display', 'eb-garamond'], bodyFontIds: ['lato', 'jost', 'josefin-sans'] },
  capetown: { headingFontIds: ['bitter', 'lora', 'eb-garamond'], bodyFontIds: ['josefin-sans', 'mulish', 'nunito-sans'] },
  mykonos: { headingFontIds: ['montserrat-heading', 'bebas-neue', 'playfair-display'], bodyFontIds: ['montserrat-body', 'poppins', 'jost'] },
  amalfi: { headingFontIds: ['cormorant', 'playfair-display', 'bodoni-moda'], bodyFontIds: ['work-sans', 'nunito-sans', 'jost'] },
  sedona: { headingFontIds: ['cinzel', 'prata', 'bitter'], bodyFontIds: ['sora', 'karla', 'mulish'] },
  aspen: { headingFontIds: ['spectral', 'libre-baskerville', 'cormorant-garamond'], bodyFontIds: ['plus-jakarta-sans', 'jost', 'inter'] },
  taj: { headingFontIds: ['prata', 'cinzel', 'amiri'], bodyFontIds: ['hind', 'nunito-sans', 'poppins'] },
  havana: { headingFontIds: ['abril-fatface', 'bebas-neue', 'playfair-display'], bodyFontIds: ['raleway', 'nunito-sans', 'poppins'] },
  edinburgh: { headingFontIds: ['eb-garamond', 'cormorant-garamond', 'bitter'], bodyFontIds: ['source-sans-3', 'josefin-sans', 'lato'] },
  monaco: { headingFontIds: ['antic-didone', 'cormorant-garamond', 'playfair-display'], bodyFontIds: ['manrope', 'inter', 'lato'] },
  florence: { headingFontIds: ['libre-baskerville', 'eb-garamond', 'lora'], bodyFontIds: ['dm-sans', 'lato', 'work-sans'] },
  seoul: { headingFontIds: ['outfit', 'inter', 'space-grotesk'], bodyFontIds: ['noto-sans-kr', 'jost', 'work-sans'] },
  shanghai: { headingFontIds: ['playfair-display', 'cinzel', 'cormorant'], bodyFontIds: ['noto-sans-sc', 'manrope', 'lato'] },
};

/**
 * One-click pairing presets for a universe — the default pairing plus one
 * curated alternate combo, both drawn from that universe's own
 * UNIVERSE_FONT_OPTIONS (never an arbitrary cross-universe combination).
 */
export function universePairingPresets(universeKey) {
  const def = UNIVERSE_DEFAULT_FONT_IDS[universeKey];
  const opts = UNIVERSE_FONT_OPTIONS[universeKey];
  if (!def || !opts) return [];
  const altHeading = opts.headingFontIds[1] || def.headingFontId;
  const altBody = opts.bodyFontIds[1] || def.bodyFontId;
  return [
    { id: 'default', label: 'Universe classic', headingFontId: def.headingFontId, bodyFontId: def.bodyFontId },
    { id: 'alt', label: 'Alternate pairing', headingFontId: altHeading, bodyFontId: altBody },
  ];
}
