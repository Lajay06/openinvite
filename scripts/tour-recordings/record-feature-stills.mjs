/* global window, document */  // used inside page.evaluate(), which runs in the browser
/**
 * scripts/tour-recordings/record-feature-stills.mjs
 *
 * THE PRODUCT INSIDE /features: TIGHTLY CROPPED STILLS AT THE SITE'S 3:2.
 * Site fixes batch 3, item 4 (goals/2026-10-11-site-fixes-batch-3.md, owner
 * rulings 2026-10-11): each feature section gets one real still of that exact
 * feature, from the rich fixture, with no dashboard chrome, no browser chrome
 * and no device frame. The page adapts nothing; the still adapts to the page.
 *
 * Each still is a module in ./feature-stills/ with a key, a startPath, an
 * optional prepare(page), and frame(page), which returns the element box the
 * still is about. The crop is that box cut to exactly 3:2 (cropTo32 below),
 * captured at 2x.
 *
 *   CAPTURE_BASE_URL=http://localhost:4230 node scripts/tour-recordings/record-feature-stills.mjs
 *   CAPTURE_BASE_URL=... node scripts/tour-recordings/record-feature-stills.mjs --upload
 *
 * Uploads go to studio-tour/stills/<key>/<width>-<take>, a new path every time,
 * overwrite off. WITHOUT --upload NOTHING LEAVES THE MACHINE.
 */
import { readdirSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { recordingContext } from './lib/record.mjs';
import { cloudinaryConfig, uploadStill } from './lib/cloudinary.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4230';
const OUT = process.env.RECORDING_OUT || '/tmp/openinvite-tour-recordings';
const upload = process.argv.includes('--upload');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map((x) => x.trim()) : null;
const RATIO = 3 / 2;

// --set=tour-moments shoots /tour's wide frames from ./tour-moments/ instead.
const setArg = process.argv.find((a) => a.startsWith('--set='));
const SET = setArg ? setArg.slice('--set='.length) : 'feature-stills';
const stills = [];
for (const f of readdirSync(new URL(`./${SET}/`, import.meta.url)).filter((x) => x.endsWith('.mjs')).sort()) {
  const still = (await import(new URL(`./${SET}/${f}`, import.meta.url))).default;
  if (!only || only.includes(still.key)) stills.push(still);
}

/**
 * The element's box, cut to exactly 3:2, never grown: a wider box loses its
 * right edge, a deeper one its bottom. Growing a crop pulls in whatever sits
 * around the element (the top bar, tabs, filters), which is dashboard chrome
 * the ruling keeps out, so each still frames an element already close to 3:2.
 */
export function cropTo32(box, ratio = RATIO) {
  let { x, y, width: w, height: h } = box;
  if (w / h > ratio) w = h * ratio; else h = w / ratio;
  return { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(w / ratio) };
}

mkdirSync(`${OUT}/${SET}`, { recursive: true });
const browser = await chromium.launch();
const shots = [];
for (const still of stills) {
  const height = still.viewportHeight || 1100;
  // A still may ask for a narrower window when 1440 spreads its subject too
  // thin to read at the 552 it is shown at (the morning page's sentence).
  const width = still.viewportWidth || 1440;
  // USD, like the rest of the marketing site (owner ruling 2026-10-11): the
  // fixture's account is Australian, and the stills are read on a US site.
  const ctx = await recordingContext(browser, { width, height, deviceScaleFactor: 2, user: { currency: 'USD' } });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}${still.startPath}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6500); // the harness's own settling wait
    // NO CURSOR IN A STILL, as record-stills.mjs.
    await page.evaluate(() => {
      if (window.__oiCursor) window.__oiCursor.mount = () => {};
      document.getElementById('oi-recording-cursor')?.remove();
    });
    if (still.prepare) await still.prepare(page);
    const box = await still.frame(page);
    // A still may name its own ratio (the 2:1 morning band, owner ruling
    // 2026-10-12); every other still is the site's 3:2.
    const clip = cropTo32(box, still.ratio || RATIO);
    const file = `${OUT}/${SET}/${still.key}-${width}.png`;
    await page.screenshot({ path: file, clip });
    shots.push({ key: still.key, file, width });
    console.log(`  ${still.key} @ ${width} ... ${file}  (${clip.width} by ${clip.height} CSS px at 2x)`);
  } catch (e) {
    console.log(`  ${still.key} @ ${width} FAILED: ${String(e.message || e).split('\n')[0].slice(0, 130)}`);
  } finally {
    await ctx.close();
  }
}
await browser.close();

if (upload) {
  const config = cloudinaryConfig();
  if (!config) { console.error('  CLOUDINARY_URL missing or malformed. Nothing uploaded.'); process.exit(1); }
  console.log('\n  Entries for FEATURE_STILLS in src/lib/studioTour.js:\n');
  for (const s of shots) {
    const body = await uploadStill({ file: s.file, key: s.key, widthLabel: String(s.width), config });
    console.log(`  '${s.key}': 'https://res.cloudinary.com/${config.cloud}/image/upload/f_auto,q_auto:good,w_1104/v${body.version}/${body.public_id}',`);
  }
}
