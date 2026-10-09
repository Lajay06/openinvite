/**
 * scripts/tour-recordings/record-stills.mjs
 *
 * THE PHONE STILLS FOR THE MARKETING SITE, AT 390.
 *
 * The app goal (goals/2026-10-10-app-on-the-marketing-site.md) puts phones on
 * the home page, the Features page and /app. A phone frame wants one image,
 * not a video, so each still is the product at 390 by 844 from the rich
 * fixture, captured at 2x, with no drawn cursor: the recording context
 * installs the cursor but only a chapter mounts it, and a still never does.
 *
 *   CAPTURE_BASE_URL=http://localhost:4230 node scripts/tour-recordings/record-stills.mjs
 *   CAPTURE_BASE_URL=... node scripts/tour-recordings/record-stills.mjs --upload
 *   CAPTURE_BASE_URL=... node scripts/tour-recordings/record-stills.mjs --only=guests-reply --upload
 *
 * A still is a module in ./stills/ with a key, a startPath and an optional
 * prepare(page) run before the picture. Uploads go to
 * studio-tour/stills/<key>/390-<take>, a new path every time, overwrite off.
 * WITHOUT --upload NOTHING LEAVES THE MACHINE.
 */
/* global window, document, getComputedStyle */  // used inside page.evaluate(), which runs in the browser
import { readdirSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { recordingContext } from './lib/record.mjs';
import { cloudinaryConfig, uploadStill, stillUrl } from './lib/cloudinary.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4230';
const OUT = process.env.RECORDING_OUT || '/tmp/openinvite-tour-recordings';
const upload = process.argv.includes('--upload');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map((x) => x.trim()) : null;

const stills = [];
for (const f of readdirSync(new URL('./stills/', import.meta.url)).filter((x) => x.endsWith('.mjs')).sort()) {
  const still = (await import(new URL(`./stills/${f}`, import.meta.url))).default;
  if (!only || only.includes(still.key)) stills.push(still);
}

mkdirSync(`${OUT}/stills`, { recursive: true });
const browser = await chromium.launch();
const shots = [];
for (const still of stills) {
  const ctx = await recordingContext(browser, { width: 390, height: 844, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}${still.startPath}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6500); // the harness's own settling wait
    if (still.prepare) await still.prepare(page);
    // NO CURSOR IN A STILL. The recording context installs the drawn cursor
    // for video, and it mounts itself on the page; a still is a phone screen,
    // where there is no pointer, so it is removed and kept from coming back.
    await page.evaluate(() => {
      if (window.__oiCursor) window.__oiCursor.mount = () => {};
      document.getElementById('oi-recording-cursor')?.remove();
    });
    const file = `${OUT}/stills/${still.key}-390.png`;
    await page.screenshot({ path: file });
    shots.push({ key: still.key, file });
    console.log(`  ${still.key} @ 390 ... ${file}`);
  } catch (e) {
    console.log(`  ${still.key} @ 390 FAILED: ${String(e.message || e).split('\n')[0].slice(0, 130)}`);
  } finally {
    await ctx.close();
  }
}
await browser.close();

if (upload) {
  const config = cloudinaryConfig();
  if (!config) { console.error('  CLOUDINARY_URL missing or malformed. Nothing uploaded.'); process.exit(1); }
  console.log('\n  Entries for STILLS in src/lib/studioTour.js:\n');
  for (const s of shots) {
    const body = await uploadStill({ file: s.file, key: s.key, widthLabel: '390', config });
    console.log(`  '${s.key}': '${stillUrl({ cloud: config.cloud, publicId: body.public_id, version: body.version })}',`);
  }
}
