/**
 * src/lib/caveatFont.js
 *
 * CAVEAT, SELF-HOSTED, FOR THE GIFT FLOW'S HANDWRITING STYLE.
 * Owner ruling 2026-10-13: the handwriting pill and the claim page's note are
 * live text in the handwriting face, not a raster, so they inherit color and
 * stay sharp at any size and on retina. Caveat is not one of the @fontsource
 * families (src/lib/selfHostedFonts.js is generated from those), and adding a
 * package would mean committing a lockfile change, so the one face the flow
 * uses is served from public/fonts/caveat/ (latin, 400, from @fontsource/caveat
 * 5.2.8, OFL; the licence sits beside it as OFL.txt), as the owner approved.
 *
 * The email still renders the note as an image through Cloudinary, because
 * Gmail loads no web fonts; this is for pages only.
 */
export const CAVEAT = "'Caveat', cursive";

const FACE = `@font-face {
  font-family: 'Caveat';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/caveat/caveat-latin-400-normal.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}`;

/** Declares the face once per page. Safe to call from any render or effect. */
export function ensureCaveat() {
  if (typeof document === 'undefined' || document.getElementById('oi-caveat-face')) return;
  const style = document.createElement('style');
  style.id = 'oi-caveat-face';
  style.textContent = FACE;
  document.head.appendChild(style);
}
