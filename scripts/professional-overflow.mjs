/* global document */
/**
 * scripts/professional-overflow.mjs
 *
 * Openinvite Professional: no horizontal overflow on the seed data, at 1440
 * and at 390 (owner ruling 2026-10-14). For every page below, the document
 * must not scroll sideways and no table may be wider than its own box.
 *
 * A BROWSER CHECK. It needs a server with the /professional routes mounted
 * and VITE_PROFESSIONAL=1, so it cannot join the browser shards until the
 * held routes PR lands; until then it is run against a local build:
 *   CAPTURE_BASE_URL=http://localhost:4291 node scripts/professional-overflow.mjs
 * Every request that leaves the base URL is refused: seed data only.
 *
 * Exits 1 on any overflow, naming the page, the width and the box.
 */
import { chromium } from 'playwright';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
export const PAGES = [
  '/professional/app',
  '/professional/app/events/ev_1',
  '/professional/app/events/ev_1/run-sheet',
  '/professional/app/events/ev_1/guests',
  '/professional/app/events/ev_1/vendors',
  '/professional/app/events/ev_1/payments',
  '/professional/app/vendors',
  '/professional/app/payments',
  '/professional/app/tasks',
  '/professional/app/day-of/ev_1',
  '/professional',
];
const WIDTHS = [1440, 390];

const browser = await chromium.launch();
const failures = [];
let checked = 0;
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const origin = new URL(BASE).origin;
  await page.route('**/*', (r) => (r.request().url().startsWith(origin) || /fonts\.(googleapis|gstatic)\.com|res\.cloudinary\.com/.test(r.request().url()) ? r.continue() : r.abort()));
  for (const path of PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const found = await page.evaluate(() => {
      const out = [];
      const doc = document.documentElement;
      if (doc.scrollWidth > doc.clientWidth + 1) out.push(`page scrolls sideways: ${doc.scrollWidth} in ${doc.clientWidth}`);
      document.querySelectorAll('table').forEach((t, i) => {
        const box = t.parentElement;
        if (t.scrollWidth > box.clientWidth + 1) out.push(`table ${i + 1} (${t.getAttribute('aria-label') || 'unnamed'}): ${t.scrollWidth} in a ${box.clientWidth} box`);
      });
      return out;
    });
    checked += 1;
    for (const f of found) failures.push(`${width}px ${path}: ${f}`);
  }
  await ctx.close();
}
await browser.close();
if (failures.length) {
  console.error(`\n  ✗ Horizontal overflow on ${failures.length} count(s):\n${failures.map((f) => `    ${f}`).join('\n')}\n`);
  process.exit(1);
}
console.log(`\n  ✓ No horizontal overflow: ${checked} page loads at 1440 and 390, seed data only.\n`);
