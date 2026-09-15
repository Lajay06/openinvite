/* global document, getComputedStyle */
/**
 * THE HOME HERO KEEPS BOTH FACES AT PHONE WIDTHS.
 *
 * Owner report, 2026-09-15: the home hero cuts the man's head off on a phone.
 * It did. The photograph is 4:3 and Wix-hosted, so there is no srcset, no
 * Cloudinary g_faces and no second crop to reach for — `background-size: cover`
 * on a portrait frame scales to the frame's HEIGHT and throws the width away.
 *
 * WHAT IS MEASURED, AND WHY IT IS ARITHMETIC RATHER THAN A SCREENSHOT.
 *
 * A face is not something a test can see. What it can do is compute exactly
 * which horizontal band of the photograph survives the crop, from the frame's
 * own box and the painted background-size/position, and assert that the band
 * the faces are in is inside it. The face positions were measured once, off
 * the 1440 render where the whole width is visible: 33.5% and 80% of the image
 * width. The band that must survive is 30% to 84%.
 *
 * THE FIGURES BELONG TO ONE PHOTOGRAPH. If the hero picture is ever replaced,
 * these numbers are about someone else's face, so the run refuses rather than
 * passing quietly — the asset id is checked first, and a different id fails by
 * name asking for the band to be re-measured.
 */
import { chromium } from 'playwright';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4202';
// The master this band was measured from.
const ASSET_ID = 'd2df22_8e79926ce6c74e55aa7ee84c8a8be77c';
const FACE_BAND = [0.30, 0.84];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/**
 * The fraction of the background image's width that is actually painted, and
 * where it starts — read from the painted values, not from the stylesheet.
 */
const visibleBand = (page) => page.evaluate(() => {
  const el = document.querySelector('.home-hero');
  if (!el) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const url = (cs.backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1] || '';
  // The master is 4:3. `cover` scales by whichever axis needs the larger
  // factor; on every frame this rule cares about that is the height.
  const ratio = 4 / 3;
  const painted = { w: r.height * ratio, h: r.height };
  if (painted.w < r.width) { painted.w = r.width; painted.h = r.width / ratio; }
  const fraction = Math.min(1, r.width / painted.w);
  // background-position-x as a percentage: it places (position% of the image's
  // overflow) to the left of the frame.
  const px = cs.backgroundPositionX;
  const pct = /%$/.test(px) ? parseFloat(px) / 100 : (px === 'center' ? 0.5 : 0.5);
  const start = pct * (1 - fraction);
  return { url, frame: { w: Math.round(r.width), h: Math.round(r.height) }, fraction, start, end: start + fraction };
});

// CHROMIUM, LIKE EVERY OTHER GUARD IN THIS LANE. CI installs chromium alone
// (ci.yml:329), so a webkit launch is a guard that cannot run — and a guard
// that cannot run is not a stricter test, it is no test. Nothing here is
// engine-dependent: the band is computed from the element's own box and its
// painted background values.
const browser = await chromium.launch();

for (const [w, h, label] of [[390, 844, '390 x 844'], [430, 932, '430 x 932'], [1440, 900, '1440 x 900']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const b = await visibleBand(page);
  if (!b) { check(`${label}: the hero is on the page`, false, '.home-hero not found'); await ctx.close(); continue; }
  // PRESENCE BEFORE PROPERTIES, and identity before either: the band below is
  // about one photograph.
  check(`${label}: it is still the photograph these figures were measured from`,
    b.url.includes(ASSET_ID), b.url.includes(ASSET_ID) ? ASSET_ID.slice(0, 12) + '…' : `a different asset: ${b.url.slice(0, 80)}`);
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  check(`  and the crop keeps both faces`,
    b.start <= FACE_BAND[0] && b.end >= FACE_BAND[1],
    `shows ${pct(b.start)}–${pct(b.end)} of the width; the faces need ${pct(FACE_BAND[0])}–${pct(FACE_BAND[1])}`);
  check(`  and the hero is no taller than the screen`, b.frame.h <= h, `${b.frame.h}px in ${h}px`);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
