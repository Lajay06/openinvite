/**
 * marketingImage — responsive Cloudinary delivery for the full-bleed marketing
 * photos (heroes, end caps, the Home banner).
 *
 * WHY THIS EXISTS
 * Every full-bleed photo on the site was being painted soft. Measured on
 * production at 1898x846 with devicePixelRatio 2, true decoded pixels (see the
 * naturalWidth note below), the delivered image covered this fraction of the
 * device pixels its box actually needs:
 *
 *   Tour hero          0.31x     Home end cap       0.42x
 *   Home banner        0.30x     Features end cap   0.42x
 *   Features hero      0.34x     Ava end cap        0.42x
 *   Ava hero           0.34x     Pricing end cap    0.42x
 *   Universes hero     0.34x     Universes CTA      0.42x
 *   Gifting hero       0.34x     About hero         0.68x
 *   Tour end cap       0.34x     Pricing hero       0.68x
 *
 * Nothing reached 1.0x. A 1440-wide file in a 1440-wide box is upscaled 2x on
 * every retina display, and that is what "low quality" looked like.
 *
 * MEASURING THIS YOURSELF — read this before trusting a number
 * For an <img> with srcset, `naturalWidth` returns the DENSITY-CORRECTED
 * intrinsic width, not the real decoded pixels: the Pricing hero reports 1898
 * while actually decoding 2560 (2560 / (2560w over a 1898px sizes) = 1898).
 * Ratios computed from naturalWidth are wrong. Fetch `img.currentSrc` and read
 * `createImageBitmap(blob).width` instead. This is the image-side twin of the
 * computed-style trap: the property tells you what the element was told, not
 * what reached the eye.
 *
 * THE CEILING IS THE UPLOADED ASSET
 * `c_limit` never upscales, so a candidate wider than the master silently
 * returns the master. Only two marketing photos are print originals (Pricing
 * hero 6667x5000, About hero 6720x4480); the rest are 1280 or 1600px web
 * exports and CANNOT reach 1.0x at 2x no matter what this file does. That is
 * why `sourceWidth` is a required argument rather than something we guess: it
 * makes each asset's real ceiling explicit at the call site, keeps the srcset
 * descriptors honest (never advertise a width the file cannot deliver), and
 * turns "which photos need better masters" into a grep instead of an audit.
 */

const CLOUD = "https://res.cloudinary.com/dsr84xknv/image/upload";

// Standard ladder. Stops at 3840 deliberately: that covers a 1920px CSS
// viewport at dpr 2, which is the top of the real range for this audience.
// Without the stop, a 4K display at dpr 2 would ask for 7680 and Cloudinary
// would happily hand back the 5.7MB raw original — the exact failure the width
// cap was introduced to prevent. The cap stays; it just moves up to where 2x
// actually needs it.
const LADDER = [640, 960, 1280, 1600, 1920, 2560, 3200, 3840];
const MAX_WIDTH = 3840;

// At and above this width the file is only ever chosen by a display painting
// it at >=2 device pixels per CSS pixel, so compression artifacts land
// sub-pixel and are not resolvable. Below it the file can be painted near 1:1,
// where q_50 WOULD show, so those candidates keep q_auto.
//
// Measured on the Pricing master, acutance (mean gradient magnitude of the
// painted device pixels) against a q_100 reference, cover-fitted to 3784x1692:
//
//   q_auto w_1440   157KB   61%      <- the old non-srcset fallback
//   q_auto w_2560   389KB   85%      <- what shipped before this change
//   q_50   w_3200   402KB   88%      <- sharper than the above, same bytes
//   q_50   w_3840   524KB   91%      <- chosen
//   q_60   w_3840   616KB   92%
//   q_auto w_3840   857KB   94%
//
// More pixels at lower quality beats fewer pixels at higher quality, which is
// why this is a per-width quality rather than a flat drop. 3840/q_50 is the
// knee: past it, 333KB more buys 3 points.
const RETINA_ONLY_WIDTH = 2560;
const RETINA_QUALITY = "q_50";

/**
 * Build src + srcSet for a full-bleed Cloudinary photo.
 *
 * @param publicId     Cloudinary public id, version prefix included if the
 *                     existing URL had one (e.g. "v1779185631/DTS_FOO_abc").
 *                     Pass it exactly as it appeared in the old URL — some ids
 *                     carry percent-encoded characters and must not be touched.
 * @param sourceWidth  Real pixel width of the uploaded master. Get it from
 *                     `${CLOUD}/fl_getinfo/${publicId}.jpg` — do not estimate.
 * @param transform    Optional Cloudinary transform applied BEFORE the width
 *                     step, for crops. Prefer a ratio crop that keeps the full
 *                     source width; a fixed-pixel crop throws away resolution
 *                     before the ladder ever sees it (see Tour.jsx).
 * @param croppedWidth When `transform` narrows the image, the width the crop
 *                     leaves behind — that, not sourceWidth, is the ceiling.
 */
export function responsivePhoto(publicId, sourceWidth, { transform = "", croppedWidth } = {}) {
  const ceiling = Math.min(croppedWidth ?? sourceWidth, MAX_WIDTH);
  const widths = [...new Set([...LADDER.filter((w) => w < ceiling), ceiling])];

  const url = (w) =>
    `${CLOUD}/${transform ? `${transform}/` : ""}` +
    `f_auto,${w >= RETINA_ONLY_WIDTH ? RETINA_QUALITY : "q_auto"},w_${w},c_limit/${publicId}.jpg`;

  return {
    // Fallback for the no-srcset path only. Capped at 1920 so a browser that
    // ignores srcSet never pulls the largest candidate.
    src: url(widths.filter((w) => w <= 1920).pop() ?? widths[0]),
    srcSet: widths.map((w) => `${url(w)} ${w}w`).join(", "),
  };
}

/**
 * `sizes` for a 100vw x 100vh hero using object-fit: cover.
 *
 * NOT 100vw. When the viewport is taller than the image is (portrait phones),
 * cover scales to fill the HEIGHT, so the browser needs roughly 134vh of image
 * width, not 100vw — a 390x844 phone needs ~1125px, not 390px. Getting this
 * wrong makes the browser pick a candidate several steps too small, which is
 * the single most common cause of a responsive image looking soft.
 */
export const HERO_SIZES = "(max-aspect-ratio: 4/3) 134vh, 100vw";

/**
 * `sizes` for the end cap: 100vw x 70vh, min-height 480. At 70vh the box is
 * wide enough relative to its height that cover is width-driven on every
 * viewport the site supports, so plain 100vw is correct here.
 */
export const ENDCAP_SIZES = "100vw";
