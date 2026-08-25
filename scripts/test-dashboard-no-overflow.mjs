/**
 * scripts/test-dashboard-no-overflow.mjs
 *
 * ZERO HORIZONTAL OVERFLOW at 390px across every dashboard surface.
 *
 * WHY. Eight of sixteen surfaces scrolled sideways on a phone and had done for
 * an unknown length of time, because nobody was measuring. The owner's ruling
 * is that couples plan in fragments, on phones — "the phone should be an
 * extension of the planning tools" — and a dashboard that scrolls sideways on
 * half its pages contradicts that directly.
 *
 * A fix without this probe just resets the clock.
 *
 * THE CONTROL. `--control` injects a deliberately over-wide row into the first
 * surface and asserts the probe FAILS. A probe that cannot fail is not a probe,
 * and this one is guarding an invariant that regressed silently once already.
 *
 * WHAT IT MEASURES. document.scrollWidth against innerWidth. That catches the
 * page scrolling sideways, which is the defect. It deliberately does NOT flag
 * an element wider than the viewport INSIDE its own horizontally scrollable
 * container — a tab row that scrolls within itself is the fix, not the bug.
 */
/* eslint-env browser */
/* global document, window */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
const WIDTH = 390;
const CONTROL = process.argv.includes('--control');

const SURFACES = [
  'dashboard', 'guests', 'seating', 'budget', 'schedule', 'vendors', 'beauty',
  'moodboard', 'vowsspeeches', 'registry', 'music', 'photography', 'messages',
  'checklist', 'todolist', 'calendar',
];

console.log(`\n  Dashboard surfaces must not scroll sideways at ${WIDTH}px`);
if (CONTROL) console.log('  CONTROL RUN — a deliberate overflow is injected; this MUST fail\n');
else console.log('');

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: WIDTH, height: 1100 });
const page = await ctx.newPage();
let failures = 0, measured = 0;

for (const surface of SURFACES) {
  await page.goto(`${BASE}/${surface}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(900);

  // PRESENCE BEFORE PROPERTIES: an empty page cannot overflow, so a blank
  // render would pass vacuously. Require the page to have real content first.
  const chars = await page.evaluate(() => (document.body.innerText || '').length);
  if (chars < 200) {
    console.log(`  ❌ ${surface.padEnd(13)} PRESENCE FAILED (${chars} chars); not measured`);
    failures++; continue;
  }

  if (CONTROL && surface === SURFACES[0]) {
    await page.evaluate((w) => {
      const d = document.createElement('div');
      d.style.cssText = `width:${w * 2}px;height:4px;background:red`;
      document.body.appendChild(d);
    }, WIDTH);
    await page.waitForTimeout(120);
  }

  measured++;
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - window.innerWidth);
  if (over > 0) {
    const who = await page.evaluate(() => {
      const vw = window.innerWidth;
      const w = [...document.querySelectorAll('*')]
        .map(e => ({ e, b: e.getBoundingClientRect() }))
        .filter(x => x.b.width > 0 && x.b.right > vw + 1)
        .sort((a, b) => b.b.right - a.b.right)[0];
      return w ? `<${w.e.tagName.toLowerCase()}> "${(w.e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28)}"` : '?';
    });
    console.log(`  ❌ ${surface.padEnd(13)} +${over}px   ${who}`);
    failures++;
  } else {
    console.log(`  ✅ ${surface}`);
  }
}
await browser.close();

console.log(`\n  ${measured}/${SURFACES.length} surfaces measured, ${failures} overflowing\n`);
if (CONTROL) {
  if (failures > 0) { console.log('  CONTROL PASSED — the probe fails when overflow exists.\n'); process.exit(0); }
  console.log('  CONTROL FAILED — the probe did NOT catch an injected 780px row.\n'); process.exit(1);
}
process.exit(failures ? 1 : 0);
