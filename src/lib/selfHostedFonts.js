/**
 * selfHostedFonts.js -- GENERATED, do not hand-edit.
 *
 * Every display family the product can render, self-hosted via @fontsource
 * instead of fonts.googleapis.com. Replaces the runtime <link> injection that
 * sent each visitor's IP to Google whenever a universe-themed page rendered.
 *
 * WHY A LAZY MAP AND NOT PLAIN IMPORTS: importing all 44 families eagerly
 * would put thousands of @font-face blocks into the render-blocking CSS. The
 * previous design was already lazy (one <link> per universe, cached), and this
 * preserves that -- each face is a dynamic import, so Vite code-splits it and
 * the browser fetches a family only when something asks for it.
 *
 * Each entry lists its faces EXPLICITLY. The face list is the contract: it is
 * exactly the weights and styles the old googleFonts specs requested, unioned
 * across the universe catalog, FONT_OPTIONS and TYPOGRAPHY_PAIRINGS. Nothing
 * is globbed and nothing is derived by convention -- a family whose folder
 * name does not match its display name would otherwise fail silently.
 *
 * @fontsource ships Google's own subset files with Google's own unicode-range
 * boundaries, so glyph coverage is unchanged and the browser still downloads
 * only the ranges a page needs.
 *
 * Licence: all families here are OFL. Self-hosting is licence-clean.
 *
 * 44 families, 137 faces.
 * CJK families (Noto Sans KR/SC, Zen Kaku Gothic New) are included as of L1c.
 * They are the reason the lazy map matters most: @fontsource ships Google's own
 * ~100-124 unicode-range slices PER WEIGHT for them, so a Seoul guest site
 * downloads the handful of ranges its text actually uses -- tens of KB -- not
 * the ~15 MB the whole family weighs. Shipping them whole, or substituting a
 * system stack, were both rejected: one is a real regression for exactly the
 * couples those universes exist for, the other breaks same-faces.
 */

/** family display name -> array of dynamic CSS imports */
const FACE_LOADERS = {
  "Noto Sans KR": [
    () => import('@fontsource/noto-sans-kr/300.css'),
    () => import('@fontsource/noto-sans-kr/400.css'),
    () => import('@fontsource/noto-sans-kr/500.css'),
    () => import('@fontsource/noto-sans-kr/700.css'),
  ],
  "Noto Sans SC": [
    () => import('@fontsource/noto-sans-sc/300.css'),
    () => import('@fontsource/noto-sans-sc/400.css'),
    () => import('@fontsource/noto-sans-sc/500.css'),
    () => import('@fontsource/noto-sans-sc/700.css'),
  ],
  "Zen Kaku Gothic New": [
    () => import('@fontsource/zen-kaku-gothic-new/300.css'),
    () => import('@fontsource/zen-kaku-gothic-new/400.css'),
    () => import('@fontsource/zen-kaku-gothic-new/500.css'),
  ],
  "Abril Fatface": [
    () => import('@fontsource/abril-fatface/400.css'),
  ],
  "Amiri": [
    () => import('@fontsource/amiri/400.css'),
    () => import('@fontsource/amiri/400-italic.css'),
    () => import('@fontsource/amiri/700.css'),
    () => import('@fontsource/amiri/700-italic.css'),
  ],
  "Antic Didone": [
    () => import('@fontsource/antic-didone/400.css'),
  ],
  "Bebas Neue": [
    () => import('@fontsource/bebas-neue/400.css'),
  ],
  "Bitter": [
    () => import('@fontsource/bitter/400.css'),
    () => import('@fontsource/bitter/400-italic.css'),
    () => import('@fontsource/bitter/600.css'),
  ],
  "Bodoni Moda": [
    () => import('@fontsource/bodoni-moda/400.css'),
    () => import('@fontsource/bodoni-moda/400-italic.css'),
    () => import('@fontsource/bodoni-moda/600.css'),
  ],
  "Cinzel": [
    () => import('@fontsource/cinzel/400.css'),
    () => import('@fontsource/cinzel/500.css'),
    () => import('@fontsource/cinzel/600.css'),
    () => import('@fontsource/cinzel/700.css'),
  ],
  "Cormorant": [
    () => import('@fontsource/cormorant/400.css'),
    () => import('@fontsource/cormorant/400-italic.css'),
    () => import('@fontsource/cormorant/500.css'),
    () => import('@fontsource/cormorant/600.css'),
  ],
  "Cormorant Garamond": [
    () => import('@fontsource/cormorant-garamond/300.css'),
    () => import('@fontsource/cormorant-garamond/300-italic.css'),
    () => import('@fontsource/cormorant-garamond/400.css'),
    () => import('@fontsource/cormorant-garamond/400-italic.css'),
    () => import('@fontsource/cormorant-garamond/600.css'),
  ],
  "Crimson Text": [
    () => import('@fontsource/crimson-text/400.css'),
    () => import('@fontsource/crimson-text/400-italic.css'),
    () => import('@fontsource/crimson-text/600.css'),
  ],
  "DM Sans": [
    () => import('@fontsource/dm-sans/300.css'),
    () => import('@fontsource/dm-sans/400.css'),
    () => import('@fontsource/dm-sans/500.css'),
    () => import('@fontsource/dm-sans/700.css'),
  ],
  "DM Serif Display": [
    () => import('@fontsource/dm-serif-display/400.css'),
    () => import('@fontsource/dm-serif-display/400-italic.css'),
  ],
  "Didact Gothic": [
    () => import('@fontsource/didact-gothic/400.css'),
  ],
  "EB Garamond": [
    () => import('@fontsource/eb-garamond/400.css'),
    () => import('@fontsource/eb-garamond/400-italic.css'),
    () => import('@fontsource/eb-garamond/500.css'),
  ],
  "Fraunces": [
    () => import('@fontsource/fraunces/300.css'),
    () => import('@fontsource/fraunces/300-italic.css'),
    () => import('@fontsource/fraunces/400-italic.css'),
    () => import('@fontsource/fraunces/600.css'),
    () => import('@fontsource/fraunces/700.css'),
    () => import('@fontsource/fraunces/700-italic.css'),
  ],
  "Gilda Display": [
    () => import('@fontsource/gilda-display/400.css'),
  ],
  "Hind": [
    () => import('@fontsource/hind/300.css'),
    () => import('@fontsource/hind/400.css'),
    () => import('@fontsource/hind/500.css'),
    () => import('@fontsource/hind/600.css'),
  ],
  "IBM Plex Sans": [
    () => import('@fontsource/ibm-plex-sans/300.css'),
    () => import('@fontsource/ibm-plex-sans/400.css'),
    () => import('@fontsource/ibm-plex-sans/500.css'),
  ],
  "Inter": [
    () => import('@fontsource/inter/300.css'),
    () => import('@fontsource/inter/400.css'),
    () => import('@fontsource/inter/500.css'),
  ],
  "Josefin Sans": [
    () => import('@fontsource/josefin-sans/100.css'),
    () => import('@fontsource/josefin-sans/100-italic.css'),
    () => import('@fontsource/josefin-sans/300.css'),
    () => import('@fontsource/josefin-sans/300-italic.css'),
    () => import('@fontsource/josefin-sans/400.css'),
    () => import('@fontsource/josefin-sans/500.css'),
  ],
  "Jost": [
    () => import('@fontsource/jost/300.css'),
    () => import('@fontsource/jost/400.css'),
    () => import('@fontsource/jost/500.css'),
  ],
  "Karla": [
    () => import('@fontsource/karla/300.css'),
    () => import('@fontsource/karla/400.css'),
    () => import('@fontsource/karla/500.css'),
  ],
  "Lato": [
    () => import('@fontsource/lato/300.css'),
    () => import('@fontsource/lato/400.css'),
    () => import('@fontsource/lato/700.css'),
  ],
  "Libre Baskerville": [
    () => import('@fontsource/libre-baskerville/400.css'),
    () => import('@fontsource/libre-baskerville/400-italic.css'),
    () => import('@fontsource/libre-baskerville/700.css'),
  ],
  "Lora": [
    () => import('@fontsource/lora/400.css'),
    () => import('@fontsource/lora/400-italic.css'),
    () => import('@fontsource/lora/600.css'),
    () => import('@fontsource/lora/600-italic.css'),
  ],
  "Manrope": [
    () => import('@fontsource/manrope/300.css'),
    () => import('@fontsource/manrope/400.css'),
    () => import('@fontsource/manrope/500.css'),
    () => import('@fontsource/manrope/600.css'),
  ],
  "Marcellus": [
    () => import('@fontsource/marcellus/400.css'),
  ],
  "Montserrat": [
    () => import('@fontsource/montserrat/300.css'),
    () => import('@fontsource/montserrat/400.css'),
    () => import('@fontsource/montserrat/500.css'),
    () => import('@fontsource/montserrat/700.css'),
  ],
  "Mulish": [
    () => import('@fontsource/mulish/300.css'),
    () => import('@fontsource/mulish/400.css'),
    () => import('@fontsource/mulish/500.css'),
  ],
  "Nunito": [
    () => import('@fontsource/nunito/300.css'),
    () => import('@fontsource/nunito/400.css'),
    () => import('@fontsource/nunito/500.css'),
  ],
  "Nunito Sans": [
    () => import('@fontsource/nunito-sans/300.css'),
    () => import('@fontsource/nunito-sans/400.css'),
    () => import('@fontsource/nunito-sans/500.css'),
  ],
  "Outfit": [
    () => import('@fontsource/outfit/300.css'),
    () => import('@fontsource/outfit/400.css'),
    () => import('@fontsource/outfit/500.css'),
    () => import('@fontsource/outfit/600.css'),
  ],
  "Playfair Display": [
    () => import('@fontsource/playfair-display/400.css'),
    () => import('@fontsource/playfair-display/400-italic.css'),
    () => import('@fontsource/playfair-display/600.css'),
    () => import('@fontsource/playfair-display/700.css'),
    () => import('@fontsource/playfair-display/700-italic.css'),
  ],
  "Plus Jakarta Sans": [
    () => import('@fontsource/plus-jakarta-sans/300.css'),
    () => import('@fontsource/plus-jakarta-sans/400.css'),
    () => import('@fontsource/plus-jakarta-sans/500.css'),
  ],
  "Poppins": [
    () => import('@fontsource/poppins/300.css'),
    () => import('@fontsource/poppins/400.css'),
    () => import('@fontsource/poppins/500.css'),
  ],
  "Prata": [
    () => import('@fontsource/prata/400.css'),
  ],
  "Raleway": [
    () => import('@fontsource/raleway/300.css'),
    () => import('@fontsource/raleway/400.css'),
    () => import('@fontsource/raleway/500.css'),
    () => import('@fontsource/raleway/600.css'),
  ],
  "Rozha One": [
    () => import('@fontsource/rozha-one/400.css'),
  ],
  "Shippori Mincho": [
    () => import('@fontsource/shippori-mincho/400.css'),
    () => import('@fontsource/shippori-mincho/500.css'),
    () => import('@fontsource/shippori-mincho/600.css'),
  ],
  "Sora": [
    () => import('@fontsource/sora/300.css'),
    () => import('@fontsource/sora/400.css'),
    () => import('@fontsource/sora/500.css'),
    () => import('@fontsource/sora/600.css'),
  ],
  "Source Sans 3": [
    () => import('@fontsource/source-sans-3/300.css'),
    () => import('@fontsource/source-sans-3/400.css'),
    () => import('@fontsource/source-sans-3/500.css'),
    () => import('@fontsource/source-sans-3/600.css'),
  ],
  "Spectral": [
    () => import('@fontsource/spectral/300.css'),
    () => import('@fontsource/spectral/400.css'),
    () => import('@fontsource/spectral/500.css'),
    () => import('@fontsource/spectral/600.css'),
  ],
  "Work Sans": [
    () => import('@fontsource/work-sans/300.css'),
    () => import('@fontsource/work-sans/400.css'),
    () => import('@fontsource/work-sans/500.css'),
    () => import('@fontsource/work-sans/600.css'),
  ],
  "Yeseva One": [
    () => import('@fontsource/yeseva-one/400.css'),
  ],
};

const loaded = new Set();

/**
 * Loads every face of the named families, once each.
 * Unknown families are ignored rather than throwing: a stored couple choice
 * for a family we no longer ship should fall back to the CSS stack, not crash
 * their guest site.
 */
export function loadFontFamilies(families) {
  if (!Array.isArray(families)) return Promise.resolve();
  const work = [];
  for (const fam of families) {
    if (!fam || loaded.has(fam)) continue;
    const loaders = FACE_LOADERS[fam];
    if (!loaders) continue;
    loaded.add(fam);
    for (const load of loaders) work.push(load());
  }
  return Promise.all(work).catch(() => {});
}

/**
 * Pulls family names out of a legacy Google css2 spec
 * ("Cormorant+Garamond:ital,wght@0,300&family=Jost:wght@300"), so existing
 * call sites can keep passing the strings already stored in the catalog.
 */
export function familiesFromGoogleSpec(spec) {
  if (!spec || typeof spec !== 'string') return [];
  return spec.split('&family=')
    .map(part => decodeURIComponent(part.replace(/^family=/, '').split(':')[0]).replace(/\+/g, ' ').trim())
    .filter(Boolean);
}

export const SELF_HOSTED_FAMILIES = Object.keys(FACE_LOADERS);
