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
 *
 * THE BLIND SPOT IS CLOSED, 2026-09-30. Bounding-rect detection cannot see an
 * element whose own scrollWidth exceeds its box: its rect sits inside the
 * viewport while its CONTENT does not. photography was exactly that case, and
 * the probe could report the overflow while naming no offender. It now asks
 * both questions, rect first and then content, and prints which one answered.
 * The rect pass is kept rather than replaced, because the two find different
 * things: a 1400px canvas escaping its container is a rect finding, and six
 * tab labels squeezed into boxes too small for them is a content finding.
 *
 * NO EXCEPTIONS. There were two, seating at 103px and photography at 8px,
 * carried from the day this was written. They were not exceptions; they were
 * two dashboard pages that scrolled sideways on a phone, and they were only
 * visible at all once this guard started running in CI (2026-09-30, with the
 * browser lane split). Both are fixed: the seating frame scrolls within itself
 * and the photography tab row does too. Any overflow now fails.
 */
/* eslint-env browser */
/* global document, window, getComputedStyle */
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
      const name = (e) => `<${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : ''}> "${(e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28)}"`;
      // AN ELEMENT INSIDE A HORIZONTALLY CONTAINED ANCESTOR IS NOT THE BUG.
      // A tab row or a canvas frame that scrolls within itself is the fix, and
      // its children legitimately sit past the viewport.
      const contained = (e) => {
        for (let n = e.parentElement; n && n !== document.documentElement; n = n.parentElement) {
          const ox = getComputedStyle(n).overflowX;
          if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
        }
        return false;
      };
      const all = [...document.querySelectorAll('*')];
      // 1. BY RECT: an element whose box escapes the viewport.
      const byRect = all
        .map(e => ({ e, b: e.getBoundingClientRect() }))
        .filter(x => x.b.width > 0 && x.b.right > vw + 1 && !contained(x.e))
        .sort((a, b) => b.b.right - a.b.right)[0];
      if (byRect) return `by rect, right=${Math.round(byRect.b.right)}  ${name(byRect.e)}`;
      // 2. BY CONTENT: an element whose own scrollWidth exceeds its box. This
      // is what the rect pass cannot see, and what photography was.
      const byContent = all
        .filter(e => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible')
        .map(e => ({ e, excess: e.scrollWidth - e.clientWidth }))
        .sort((a, b) => b.excess - a.excess)[0];
      if (byContent) return `by content, ${byContent.e.scrollWidth}px in a ${byContent.e.clientWidth}px box  ${name(byContent.e)}`;
      return 'no offender found by either pass';
    });
    console.log(`  ❌ ${surface.padEnd(13)} +${over}px   ${who}`);
    failures++;
  } else {
    console.log(`  ✅ ${surface}`);
  }
}
await browser.close();

console.log(`\n  ${measured}/${SURFACES.length} surfaces measured, ${failures} failing, no exceptions\n`);
if (CONTROL) {
  if (failures > 0) { console.log('  CONTROL PASSED — the probe fails when overflow exists.\n'); process.exit(0); }
  console.log('  CONTROL FAILED — the probe did NOT catch an injected 780px row.\n'); process.exit(1);
}
process.exit(failures ? 1 : 0);
