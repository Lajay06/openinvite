/* global document, window, Image, getComputedStyle */
/**
 * scripts/test-home-app-photo.mjs
 *
 * THE HOME APP SECTION'S COPY SITS IN THE SCRIM'S DARK BAND AND CAN BE READ.
 * Batch 3 amendment A (goals/2026-10-11-site-fixes-batch-3.md), with the
 * owner's guard ruling of 2026-10-11: the 55% test is on the BODY box's top,
 * every type size stays as specified, and the 4.5:1 check runs on the body's
 * four corners and on the heading's, because the heading sits higher in the
 * scrim and that is where contrast is most likely to slip.
 *
 * A browser guard because both are facts about paint. The photograph, the
 * object-position crop and the gradient decide what is behind each corner, so
 * the copy is hidden, the section is screenshotted with the real photograph
 * loaded (test:marketing-routes blocks remote images, so this cannot live
 * there), and each corner's pixel is read against the copy's white.
 *
 *   CAPTURE_BASE_URL=http://localhost:4173 npm run test:home-app-photo
 */
import { chromium } from 'playwright';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
const MIN_CONTRAST = 4.5;
const BODY_TOP_AT_LEAST = 0.55;

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const luminance = ([r, g, b]) => {
  const f = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
// The copy is white; a corner's contrast is white against what is painted there.
const againstWhite = (rgb) => 1.05 / (luminance(rgb) + 0.05);

console.log(`\n  The home app section, painted, against ${BASE}:\n`);
const browser = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
  // The page scrolls smoothly; a screenshot taken mid-scroll measures the
  // section above. Scroll instantly, then let it settle.
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelectorAll('[style*="scroll-behavior"]').forEach((x) => { x.style.scrollBehavior = 'auto'; });
    const s = document.querySelector('[data-home-app]');
    window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
  });
  await page.waitForFunction(() => { const i = document.querySelector('[data-home-app-photo]'); return !!i && i.complete && i.naturalWidth > 0; }, null, { timeout: 30000 });
  await page.waitForTimeout(800);

  const geo = await page.evaluate(() => {
    const s = document.querySelector('[data-home-app]').getBoundingClientRect();
    const box = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const out = { section: { y: s.top, h: s.height }, body: box('[data-app-body]'), heading: box('[data-app-heading]') };
    // Hide the copy and anything fixed over the section, so each corner reads
    // the photograph under the scrim and nothing else.
    document.querySelector('[data-home-app-copy]').style.visibility = 'hidden';
    document.querySelectorAll('body *').forEach((e) => { if (getComputedStyle(e).position === 'fixed') e.style.visibility = 'hidden'; });
    return out;
  });
  await page.waitForTimeout(200);

  const bodyTop = (geo.body.y - geo.section.y) / geo.section.h;
  check(`${w}: the body's top is below ${Math.round(BODY_TOP_AT_LEAST * 100)}% of the section's height`, bodyTop >= BODY_TOP_AT_LEAST, `${(bodyTop * 100).toFixed(1)}%`);

  const shot = await page.screenshot();
  const corners = await page.evaluate(async ({ data, boxes }) => {
    const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const at = (x, y) => [...g.getImageData(Math.round(x), Math.round(y), 1, 1).data].slice(0, 3);
    const four = (b) => [at(b.x + 2, b.y + 2), at(b.x + b.w - 3, b.y + 2), at(b.x + 2, b.y + b.h - 3), at(b.x + b.w - 3, b.y + b.h - 3)];
    return { body: four(boxes.body), heading: four(boxes.heading) };
  }, { data: shot.toString('base64'), boxes: { body: geo.body, heading: geo.heading } });

  for (const which of ['body', 'heading']) {
    const ratios = corners[which].map(againstWhite);
    const worst = Math.min(...ratios);
    // A pure black corner is the section's floor showing, not the photograph:
    // the image did not paint, and a pass on it would prove nothing.
    const painted = corners[which].some(([r, g, b]) => r + g + b > 12);
    check(`${w}: the ${which} reads at ${MIN_CONTRAST}:1 at all four corners`, painted && worst >= MIN_CONTRAST,
      `${ratios.map((r) => r.toFixed(2)).join(', ')}${painted ? '' : ', nothing painted'}`);
  }
  await page.close();
}
await browser.close();

const failed = results.filter((ok) => !ok).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed\n`);
process.exit(failed ? 1 : 0);
