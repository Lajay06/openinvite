/* global document */
/**
 * THE SAMPLE-CONTENT BANNER IS EDITING CHROME, AND STAYS THERE.
 *
 * Owner report, Run 5 T2: the white "sample content…" banner shows in Preview.
 * It did — `RealWebsitePreview` renders BOTH the builder canvas and the
 * full-screen preview, and the banner was conditioned only on whether sample
 * content was in use.
 *
 * The distinction was already in the props and unused: StudioWebsite binds
 * `editable` to `canvasMode === 'edit'` and FullScreenPreview passes nothing,
 * so it defaults false. One condition covers all three surfaces.
 *
 * ── WHY THE PUBLISHED CHECK IS HERE ANYWAY ─────────────────────────────────
 *
 * The guest site cannot show this banner: it is rendered by
 * MultiPageWeddingWebsite, which does not import RealWebsitePreview, and a
 * persistence guard asserts that import graph directly. This checks the
 * PAINTED page regardless, because "it cannot happen by construction" is the
 * kind of sentence that stays in a comment after the construction changes.
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';
import { sampleUniverseIds } from '../src/lib/sampleContent/index.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4209';
const BANNER = /Sample content, so you can see this universe/i;

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const seen = (page) => page.evaluate(() => ({
  marked: document.querySelectorAll('[data-sample-banner]').length,
  text: (document.body.innerText || ''),
}));

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 950 });

// ── THE FIXTURE HAS TO BE SAMPLED, OR EVERY ABSENCE BELOW IS FREE ──────────
//
// SEED.WeddingDetails[0] carries no `activeUniverse`, so withSampleContent()
// returns isSampled:false and the banner cannot appear on any surface. The
// first version of this guard read that as the product failing to show it.
// One record, one universe that HAS sample content, scoped to this run.
const SAMPLED = { ...SEED.WeddingDetails[0], activeUniverse: sampleUniverseIds()[0] };

// ── 1. the studio, editing ─────────────────────────────────────────────────
const page = await ctx.newPage();
await page.route((u) => /\/api\/my-wedding-details/.test(typeof u === 'string' ? u : u.href), (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLED) }));
await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(10000);
const edit = await seen(page);
// PRESENCE BEFORE PROPERTIES: if the banner never shows anywhere, every
// absence below is free. The fixture's wedding leaves pages empty, so sample
// content is in use and the banner is expected here.
check('the banner shows while editing', edit.marked === 1 && BANNER.test(edit.text),
  edit.marked ? 'one banner, editing' : 'no banner at all — the rest of this run proves nothing');

// ── 2. the same canvas, switched to preview ────────────────────────────────
//
// TWO BUTTONS SAY "Preview" and they are different surfaces: the canvas-mode
// toggle (paired with "Edit", StudioWebsite.jsx:828) and the header action
// that opens the full-screen overlay. The first version of this check clicked
// one and counted the other's canvas, which reads as the fix not working.
// The toggle is the one with an "Edit" sibling.
const toggled = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const edit = btns.find((b) => (b.innerText || '').trim() === 'Edit');
  if (!edit) return false;
  const sib = [...(edit.parentElement?.querySelectorAll('button') || [])]
    .find((b) => (b.innerText || '').trim() === 'Preview');
  if (!sib) return false;
  sib.click();
  return true;
});
await page.waitForTimeout(3000);
const preview = await seen(page);
check('  the canvas has an edit/preview toggle', toggled, toggled ? 'found beside "Edit"' : 'no toggle found');
check('  and the banner is gone in preview mode', preview.marked === 0 && !BANNER.test(preview.text),
  preview.marked ? `${preview.marked} banner(s) still painted` : 'gone');

// ── 2b. and the full-screen Preview action ─────────────────────────────────
//
// Scoped INSIDE the preview frame: the edit canvas stays mounted behind the
// overlay, so a document-wide count would find its banner and call it a
// failure. R8 gave the frame `data-preview-frame`, which is what makes this
// answerable at all.
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const edit = btns.find((b) => (b.innerText || '').trim() === 'Edit');
  const toggle = edit?.parentElement;
  const action = btns.find((b) => (b.innerText || '').trim() === 'Preview' && b.parentElement !== toggle);
  action?.click();
});
await page.waitForTimeout(4000);
const frame = await page.evaluate(() => {
  const f = document.querySelector('[data-preview-frame]');
  if (!f) return null;
  return { marked: f.querySelectorAll('[data-sample-banner]').length, text: (f.innerText || '').length };
});
check('  the Preview action opens the device frame', !!frame, frame ? `${frame.text} characters in the frame` : 'no [data-preview-frame]');
if (frame) {
  check('    and no banner inside it', frame.marked === 0, frame.marked ? `${frame.marked} banner(s) in the frame` : 'none');
}

// ── 3. the published site ──────────────────────────────────────────────────
const guest = await ctx.newPage();
await guest.goto(`${BASE}/w/ada-and-alan`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await guest.waitForTimeout(6000);
const published = await seen(guest);
check('  and never on the published site', published.marked === 0 && !BANNER.test(published.text),
  published.text.length ? `${published.text.length} characters rendered, no banner` : 'the page is empty — this check is vacuous');
// The guest page must actually have rendered, or its absence proves nothing.
check('    (and that page did render)', published.text.length > 200, `${published.text.length} characters`);

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
