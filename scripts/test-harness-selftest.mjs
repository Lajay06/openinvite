/* global document, localStorage */
/**
 * Harness self-test — validate the instrument before trusting any finding.
 *
 * WHY THIS EXISTS. Four separate false signals came out of this harness before
 * anyone validated it: an api-segment glob that served JSON in place of the
 * app's JavaScript (every page blank), a flat wait that reported 34/34
 * surfaces missing, a sweep that measured the entrance overlay on all 13 guest
 * routes, and a character threshold that invented three critical mobile blanks.
 * Each was caught only because a later check happened to look. The pattern was
 * building instruments faster than validating them.
 *
 * Every control below must FIRE. A control that cannot fail proves nothing —
 * so each one deliberately breaks something and asserts the harness notices.
 *
 * Usage: npm run test:harness  (needs the dev server on :5173)
 */
import { chromium } from 'playwright';
import {
  seededContext, presenceThenProperties, assertHarnessServesModules,
  dismissEntrance, GUEST_ROUTE_EXPECT, KNOWN_BLIND_SPOTS, PUBLISHED_WEDDING,
} from './lib/renderHarness.mjs';

const BASE = process.env.RENDER_BASE || 'http://localhost:5173';
const SLUG = PUBLISHED_WEDDING.slug;
const results = [];
const record = (name, passed, detail) => {
  results.push({ name, passed, detail });
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();

// ── CONTROL 1: a page known to render must PASS ───────────────────────────
{
  const ctx = await seededContext(browser, { width: 1440, height: 900 });
  await dismissEntrance(ctx, SLUG);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/w/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4500);
  const r = await presenceThenProperties(page, [GUEST_ROUTE_EXPECT['']], async () => ({ seen: true }));
  record('control 1 — a page that renders is reported present', r.ok === true && r.seen === true,
    r.ok ? `found "${GUEST_ROUTE_EXPECT['']}"` : `missing ${r.missing}`);
  await ctx.close();
}

// ── CONTROL 2: a genuinely absent string must FAIL, and skip the property ──
{
  const ctx = await seededContext(browser, { width: 1440, height: 900 });
  await dismissEntrance(ctx, SLUG);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/w/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4500);
  let propertyRan = false;
  const r = await presenceThenProperties(page, ['__STRING_THAT_CANNOT_BE_ON_THE_PAGE__'], async () => {
    propertyRan = true;              // must NOT happen
    return { seen: true };
  });
  record('control 2 — an absent string fails and the property is SKIPPED',
    r.ok === false && r.skipped === true && propertyRan === false,
    `ok=${r.ok} skipped=${r.skipped} propertyRan=${propertyRan}`);
  await ctx.close();
}

// ── CONTROL 3: the entrance suppression is applied AND reported ──────────
{
  const ctx = await seededContext(browser, { width: 1440, height: 900 });
  const d = await dismissEntrance(ctx, SLUG);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/w/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const state = await page.evaluate((k) => ({
    key: localStorage.getItem(k),
    hasNav: document.body.innerText.includes('Our Story'),
  }), d.key);
  // Asserting what is TRUE: the key is set, it is reported, and the page is
  // reachable. NOT asserting that the overlay blocked anything -- it does not
  // under these conditions, and claiming otherwise is what went wrong before.
  record('control 3 — entrance suppression is applied and reported',
    d.dismissed === true && state.key === '1' && state.hasNav === true,
    `key=${state.key} reported=${d.dismissed} pageReachable=${state.hasNav}`);
  await ctx.close();
}

// ── CONTROL 4: a JS module served as JSON must ABORT the pass ─────────────
{
  const ctx = await seededContext(browser, { width: 1440, height: 900 });
  const good = await assertHarnessServesModules(ctx, BASE);
  // Now deliberately break it: answer the app's own modules with JSON, exactly
  // the api-segment-glob bug, and prove the guard notices.
  await ctx.route((url) => /\/src\/.*\.jsx?$/.test(typeof url === 'string' ? url : url.href),
    (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  const broken = await assertHarnessServesModules(ctx, BASE);
  record('control 4 — a JS module served as JSON is detected',
    good.ok === true && broken.ok === false,
    `healthy="${good.contentType}" broken="${broken.contentType}"`);
  await ctx.close();
}

await browser.close();

console.log('\n  Known blind spots, as declared by the harness:');
KNOWN_BLIND_SPOTS.forEach((b) => console.log(`    - ${b}`));

const failed = results.filter((r) => !r.passed);
console.log('\n  ' + '─'.repeat(58));
console.log(`  controls: ${results.length}   fired correctly: ${results.length - failed.length}   BROKEN: ${failed.length}`);
if (failed.length) console.log('  A control that does not fire proves nothing. Fix before trusting findings.');
process.exit(failed.length ? 1 : 0);
