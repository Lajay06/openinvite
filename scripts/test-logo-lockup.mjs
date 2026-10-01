#!/usr/bin/env node
/**
 * scripts/test-logo-lockup.mjs
 *
 * THE HEADER AND THE FOOTER MUST DRAW THE SAME LOGO.
 *
 * They did not. The header used the whole of /openinvite-logo.png, whose
 * wordmark is baked in white for a dark bar; the footer could not use that on
 * white, so it cropped the asset to the mark and set "Openinvite" beside it as
 * text, CENTRED on the mark. The asset does not centre its wordmark: it sits
 * 29.4% of the mark's height lower. Two lockups, one of them by accident.
 *
 * WHAT THIS MEASURES, AND WHY IT IS A PIXEL SCAN. The header is a single <img>,
 * so its mark and its wordmark are not DOM nodes and no geometry can be read
 * off them. Both logos are therefore screenshotted and scanned: the mark is the
 * SATURATED ink (it is a gradient in both places) and the wordmark is the
 * unsaturated ink to the right of the gap. That gives one number for each,
 * measured the same way, from what was actually painted rather than from what
 * a style says.
 *
 * A DOM assertion would have passed while the two looked different, which is
 * the whole reason this file exists.
 */
import { chromium } from 'playwright';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
/** The offset the artwork itself has, as a fraction of the mark's height. */
const ASSET_RATIO = 0.294;
/** How far the two lockups may disagree. One pixel at a 20px mark is 0.05. */
const TOLERANCE = 0.05;

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** Scan one PNG buffer for the mark's box and the wordmark's box. */
async function measure(page, buffer) {
  const b64 = buffer.toString('base64');
  return page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const px = (x, y) => { const i = (y * c.width + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
    // The background is whatever the corner is. Ink is anything unlike it.
    const bg = px(0, 0);
    const unlike = (p) => Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 90 && p[3] > 40;
    const sat = (p) => Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) > 40;
    const cols = [];
    for (let x = 0; x < c.width; x++) {
      let top = -1, bot = -1, coloured = 0, ink = 0;
      for (let y = 0; y < c.height; y++) {
        const p = px(x, y);
        if (!unlike(p)) continue;
        ink++;
        if (top < 0) top = y;
        bot = y;
        if (sat(p)) coloured++;
      }
      cols.push({ x, top, bot, coloured, ink });
    }
    const marked = cols.filter((k) => k.coloured > 1);
    if (!marked.length) return null;
    const markX1 = marked[marked.length - 1].x;
    const markTop = Math.min(...marked.map((k) => k.top).filter((v) => v >= 0));
    const markBot = Math.max(...marked.map((k) => k.bot));
    const word = cols.filter((k) => k.x > markX1 + 2 && k.ink > 0);
    if (!word.length) return null;
    const wordTop = Math.min(...word.map((k) => k.top).filter((v) => v >= 0));
    const wordBot = Math.max(...word.map((k) => k.bot));
    const markH = markBot - markTop + 1;
    const offset = ((wordTop + wordBot) / 2) - ((markTop + markBot) / 2);
    return {
      markH, wordH: wordBot - wordTop + 1,
      offset: Math.round(offset * 10) / 10,
      ratio: Math.round((offset / markH) * 1000) / 1000,
    };
  }, b64);
}

console.log('\n  The header and the footer draw one lockup\n');
const browser = await chromium.launch();

for (const [w, h] of [[1440, 950], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1200);
  console.log(`  ${w}px:`);

  const logos = page.locator('[data-logo]');
  const n = await logos.count();
  // At 390 the nav renders one bar, at 1440 the other; either way the page
  // carries exactly one header logo and one footer logo that are visible.
  const visible = [];
  for (let i = 0; i < n; i++) {
    const el = logos.nth(i);
    if (await el.isVisible().catch(() => false)) visible.push(el);
  }
  check('  the page has exactly two visible logos, header and footer', visible.length === 2, `${visible.length} of ${n} rendered`);
  if (visible.length !== 2) { await ctx.close(); continue; }

  const [header, footer] = visible;
  const kinds = [];
  for (const el of [header, footer]) {
    kinds.push(await el.locator('[data-logo-lockup]').first().getAttribute('data-logo-lockup').catch(() => null));
  }
  check('  both come from the shared component', kinds.every(Boolean), kinds.join(' and '));

  const m = [];
  for (const el of [header, footer]) {
    const shot = await el.screenshot();
    m.push(await measure(page, shot));
  }
  const [hm, fm] = m;
  check('  both lockups can be measured', !!hm && !!fm,
    hm && fm ? `header mark ${hm.markH}px, footer mark ${fm.markH}px` : 'a scan found no mark or no wordmark');
  if (!hm || !fm) { await ctx.close(); continue; }

  console.log(`        header  mark ${hm.markH}px  wordmark ${hm.wordH}px  offset ${hm.offset}px  ratio ${hm.ratio}`);
  console.log(`        footer  mark ${fm.markH}px  wordmark ${fm.wordH}px  offset ${fm.offset}px  ratio ${fm.ratio}`);

  check('  the wordmark sits at the same height against the mark in both',
    Math.abs(hm.ratio - fm.ratio) <= TOLERANCE,
    `${hm.ratio} against ${fm.ratio}, ${Math.abs(hm.ratio - fm.ratio).toFixed(3)} apart (tolerance ${TOLERANCE})`);
  check('  and that height is the artwork\'s own, not a centring',
    Math.abs(hm.ratio - ASSET_RATIO) <= TOLERANCE && Math.abs(fm.ratio - ASSET_RATIO) <= TOLERANCE,
    `asset is ${ASSET_RATIO}`);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed\n`);
if (failed) process.exit(1);
