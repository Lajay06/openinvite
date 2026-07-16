/**
 * scripts/capture/videos.mjs
 *
 * Records the 3 flow videos (10-20s each). Read-only, same rules as
 * stills.mjs: scroll, hover, click things that only change local/view
 * state (previewing a universe, selecting a table) — never a button that
 * creates/edits/sends/deletes. Uses Playwright's built-in video recording.
 *
 * Usage: node scripts/capture/videos.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {
  BASE_URL, STATE_FILE, RAW_DIR, PROCESSED_DIR,
  VIEWPORT_DESKTOP, DEVICE_SCALE_FACTOR,
} from './config.mjs';
import { frameVideo } from './frame.mjs';

if (!fs.existsSync(STATE_FILE)) {
  console.error(`✗ No saved session at ${STATE_FILE}. Run: node scripts/capture/auth.mjs first.`);
  process.exit(1);
}

const WEDDING_SLUG = 'john-suzanne';
const RSVP_TOKEN_FILE = path.join(path.dirname(STATE_FILE), 'rsvp-token.txt');
const RSVP_TOKEN = fs.existsSync(RSVP_TOKEN_FILE) ? fs.readFileSync(RSVP_TOKEN_FILE, 'utf8').trim() : null;

const browser = await chromium.launch();
const videoTmpDir = path.join(RAW_DIR, 'video-tmp');
fs.mkdirSync(videoTmpDir, { recursive: true });

async function record(name, url, needsAuth, run) {
  const context = await browser.newContext({
    storageState: needsAuth ? STATE_FILE : undefined,
    viewport: VIEWPORT_DESKTOP,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: 'light',
    recordVideo: { dir: videoTmpDir, size: VIEWPORT_DESKTOP },
  });
  const page = await context.newPage();
  console.log(`→ recording ${name}: ${url}`);
  let ok = true;
  let errMsg = '';
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await run(page);
  } catch (err) {
    ok = false;
    errMsg = err.message;
    console.error(`  ✗ ${name} failed: ${err.message}`);
  }
  const video = page.video();
  await context.close(); // finalizes the video file
  if (!ok) return { name, ok: false, error: errMsg };

  const rawWebm = path.join(videoTmpDir, `${name}-raw.webm`);
  await video.saveAs(rawWebm);

  const { webmOut, mp4Out, posterOut } = await frameVideo({
    rawVideoPath: rawWebm,
    url: url.replace(/^https?:\/\//, ''),
    contentWidth: VIEWPORT_DESKTOP.width,
    contentHeight: VIEWPORT_DESKTOP.height,
    outBaseName: name,
    outDir: PROCESSED_DIR,
    scale: DEVICE_SCALE_FACTOR,
  });
  console.log(`  ✓ ${webmOut}\n  ✓ ${mp4Out}\n  ✓ ${posterOut}`);
  return { name, ok: true, webmOut, mp4Out, posterOut };
}

const results = [];

// ── Flow 1: Choosing a universe ────────────────────────────────────────
results.push(await record('flow-01-choosing-a-universe', `${BASE_URL}/studio/universe`, true, async (page) => {
  await page.waitForSelector('text=/universe/i', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // Scroll through the wall
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(900);
  // Hover a couple of cards before opening one — motion sells without
  // needing to touch anything write-worthy.
  const cards = page.locator('[class], article, div').filter({ hasText: /Kyoto|Aman|Tulum|Marrakech/i });
  const count = await cards.count();
  if (count > 0) await cards.first().hover().catch(() => {});
  await page.waitForTimeout(700);
  // Enter one universe's preview — enterUniverse() is pure client state
  // (setPhase/setOpenId), not a write; confirmed by reading UniverseStudio.jsx.
  // The actual commit action (handleSwitchUniverse -> WeddingDetails.update)
  // lives on a separate button inside the world view that this flow never
  // touches.
  const firstCard = cards.first();
  if (await firstCard.count() > 0) {
    await firstCard.click().catch(() => {});
    await page.waitForTimeout(2500);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(2000);
  }
}));

// ── Flow 2: Seating exploration ─────────────────────────────────────────
results.push(await record('flow-02-seating-exploration', `${BASE_URL}/Seating`, true, async (page) => {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  // Pan/hover the canvas
  await page.mouse.move(900, 600);
  await page.waitForTimeout(600);
  await page.mouse.move(1100, 700, { steps: 20 });
  await page.waitForTimeout(600);
  // Select a table to show its assignment panel — a view-state click only
  // (per Seating.jsx's handleSeatClick / table-select logic), never a drag.
  const table = page.locator('text=/^\\d+$/').first(); // table number label
  if (await table.count() > 0) {
    await table.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);
  }
  // Scroll the unassigned-guest sidebar to show scale (196 unassigned)
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(2000);
}));

// ── Flow 3: Guest RSVP experience ───────────────────────────────────────
if (RSVP_TOKEN) {
  results.push(await record('flow-03-guest-rsvp', `${BASE_URL}/rsvp/${RSVP_TOKEN}`, false, async (page) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(900);
    // Toggle "Attending" for the ceremony — a selection, not a submission;
    // the actual RSVP send is a separate, later Submit action this flow
    // never reaches.
    const attending = page.getByText('Attending', { exact: true }).first();
    if (await attending.count() > 0) {
      await attending.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(2500);
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(1800);
  }));
} else {
  console.warn('⚠ No RSVP token found — skipping the guest RSVP flow video.');
}

// Clean up the raw (unframed) recordings — only the processed output ships.
fs.rmSync(videoTmpDir, { recursive: true, force: true });

console.log('\n' + '='.repeat(60));
console.log('Videos summary:');
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}`);
console.log('='.repeat(60));

fs.writeFileSync(path.join(RAW_DIR, '..', 'videos-report.json'), JSON.stringify(results, null, 2));
await browser.close();

if (results.some(r => !r.ok)) process.exit(1);
