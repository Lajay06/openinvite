/**
 * wixImage — adaptive delivery for the handful of full-bleed photos still
 * hosted on static.wixstatic.com.
 *
 * THIS IS AN INTERIM MEASURE, NOT THE DESTINATION.
 * These photos belong on Cloudinary behind `responsivePhoto()` like every other
 * full-bleed image. They are not there yet because their masters are only
 * 1280px wide, so moving them without a re-export buys tidiness and nothing
 * else. `scripts/test-marketing-images.mjs` keeps them in OFF_CDN_ALLOWLIST so
 * the debt stays visible and nothing NEW can join them.
 *
 * WHAT THIS DOES BUY, MEASURED (2026-08-10)
 * Wix supports `/v1/fill/w_,h_,al_c,q_/file.webp` and the site was requesting
 * the bare original every time — no format negotiation, no width adaptation.
 * The originals are also pathologically encoded: the Home hero ships 664 KB for
 * 1280x960, while the SAME photo re-encoded to WebP at the same size is a small
 * fraction of that. So this is pure weight, at identical pixels.
 *
 * WHAT IT DOES NOT BUY: SHARPNESS.
 * Wix will happily serve `w_6000` from a 1280px master — it never caps, and the
 * extra pixels are interpolated. Measured acutance against the untouched
 * original, cover-fitted to 3784x1692 device px:
 *
 *   w_1440   77%      w_2880   98%
 *   w_2000   94%      w_4000   99%
 *
 * It asymptotes toward the original and never exceeds it, which is the
 * signature of upscaling rather than detail. 1280x960 IS the master. That is
 * why the ladder below is capped at the master's real width: asking for more
 * would cost bytes for pixels that do not exist, exactly the trap `c_limit`
 * protects us from on the Cloudinary side.
 */

const WIX = "https://static.wixstatic.com/media";

// q_95, NOT Wix's q_85 default. The re-encode was supposed to be free — same
// master, same pixels, just a better container — and measurement said
// otherwise, so this is set from the numbers rather than left at the default.
//
// Acutance retained vs the untouched original, and mean absolute luma error,
// both measured on the painted result (cover-fitted to 3784x1692 device px):
//
//            HERO              BANNER            BUDGET
//   q_85     79%  dE 1.43      61%  dE 0.41      62%  dE 1.00
//   q_95     97%  dE 0.90      69%  dE 0.34      74%  dE 0.74
//   q_100    99%  dE 0.67
//
// Read the two columns together. On the hero — a detailed image — q_85 loses a
// fifth of its edge energy, which is a visible softening on the first thing
// every visitor sees, so q_85 was rejected. On the banner and the budget photo
// the percentage looks worse still, but those originals are very smooth
// (reference acutance 0.22 and 0.88 against the hero's 1.67), so the metric is
// dividing by almost nothing and exaggerates: their dE stays under 1/255, i.e.
// under a single 8-bit level of average error, which is not resolvable.
//
// q_95 keeps dE below 1/255 on all three while still removing 63-92% of the
// bytes. q_100 buys 2 more points on the hero for another 106 KB.
const QUALITY = 95;
const LADDER = [640, 960, 1280];

/**
 * @param id        Wix media id including the `~mv2.ext` suffix.
 * @param masterW   True master width. Do not estimate — Wix will serve any
 *                  width you ask for, so the response cannot tell you this.
 * @param masterH   True master height, so `fill` preserves the exact aspect
 *                  and never crops.
 */
export function wixPhoto(id, masterW, masterH) {
  const aspect = masterW / masterH;
  const url = (w) =>
    `${WIX}/${id}/v1/fill/w_${w},h_${Math.round(w / aspect)},al_c,q_${QUALITY}/file.webp`;

  const widths = LADDER.filter((w) => w < masterW).concat(masterW);
  return {
    src: url(masterW),
    srcSet: [...new Set(widths)].map((w) => `${url(w)} ${w}w`).join(", "),
  };
}
