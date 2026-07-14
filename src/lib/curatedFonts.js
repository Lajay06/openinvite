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
};

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
