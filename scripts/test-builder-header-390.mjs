/* global document, getComputedStyle */
/**
 * NOTHING IN THE BUILDER OVERFLOWS ITSELF AT PHONE WIDTH.
 *
 * Two places, both found by looking at 390 rather than by reading source: the
 * top bar's title, and the right panel's tab row.
 *
 * At 390 the title was drawn straight through Save and Share. It is centred
 * with `position: absolute; left: 50%`, which takes it out of flow — so it
 * knows nothing about the two button groups either side and cannot be pushed
 * by them. On a desktop there is room and the collision never appears.
 *
 * ── WHY OVERLAP AND NOT A SCREENSHOT ────────────────────────────────────────
 *
 * "Does it look right" is not checkable. "Do any two of these boxes intersect"
 * is, exactly, and it is the actual defect: two pieces of text occupying the
 * same pixels. Every pair of leaf items in the bar is compared, so a fix that
 * moved the title clear of Save and into Publish would still fail.
 *
 * ── AND THE DESKTOP IS PINNED ───────────────────────────────────────────────
 *
 * The fix is a media query below 640, so above it nothing should change at
 * all. That is asserted rather than assumed: at 1440 the bar is still one
 * 48px row and the title is still absolutely positioned. A fix that quietly
 * restyled the desktop bar to solve the phone would pass an overlap check on
 * both widths and be wrong.
 *
 * ── AND THE RIGHT PANEL'S TABS ──────────────────────────────────────────────
 *
 * Measured at 390: the panel is 147px and Design + Content + Settings need 149
 * at their inline 13px, so the row overflowed and Settings ran past the edge of
 * the screen — the three labels read as one word. The check is that each tab
 * ends inside the viewport AND that no label is clipped inside its own button,
 * because shrinking the row without shrinking the text would satisfy the first
 * and hide the words.
 *
 * Usage: npm run test:builder-header-390  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const readBar = (page) => page.evaluate(() => {
  const bar = document.querySelector('.wb-builder-header');
  if (!bar) return null;
  const r = bar.getBoundingClientRect();
  // Leaf items only: the bar's own groups nest, and a parent always overlaps
  // its child. What must not overlap is two things a couple can read.
  const items = [...bar.querySelectorAll('button, span, a')]
    .filter((el) => !el.querySelector('button, span, a'))
    .map((el) => {
      const b = el.getBoundingClientRect();
      return { text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 22), x: b.x, y: b.y, w: b.width, h: b.height };
    })
    .filter((i) => i.w > 0 && i.h > 0);
  const title = bar.querySelector('.wb-builder-title');
  return {
    height: Math.round(r.height),
    items,
    titlePosition: title ? getComputedStyle(title).position : null,
  };
});

const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

console.log('\n  The builder header, at both widths:\n');

const browser = await chromium.launch();

for (const width of [390, 1440]) {
  const ctx = await seededContext(browser, { width, height: 900, seed: SEED });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);

  const bar = await readBar(page);
  // PRESENCE BEFORE PROPERTIES: no bar means no overlapping pairs, which is
  // not the same as a bar that fits.
  check(`${width}: the header is on screen with its items`, !!bar && bar.items.length >= 4,
    bar ? `${bar.items.length} item(s), ${bar.height}px tall` : 'no header');

  if (bar) {
    const clashes = [];
    for (let i = 0; i < bar.items.length; i++) {
      for (let j = i + 1; j < bar.items.length; j++) {
        if (overlaps(bar.items[i], bar.items[j])) clashes.push(`"${bar.items[i].text}" x "${bar.items[j].text}"`);
      }
    }
    check(`  and nothing in it overlaps anything else`, clashes.length === 0,
      clashes.join(' · ') || `${bar.items.length} items, no pair intersects`);

    if (width === 390) {
      check('  the title has come back into flow', bar.titlePosition === 'static', bar.titlePosition);
      check('  and the bar has grown to hold it', bar.height > 48, `${bar.height}px`);
    } else {
      // The desktop bar must be exactly what it was.
      check('  the desktop bar is still one row', bar.height === 48, `${bar.height}px`);
      check('  and its title is still centred out of flow', bar.titlePosition === 'absolute', bar.titlePosition);
    }
  } else {
    check(`  and nothing in it overlaps anything else`, false, 'no header');
    check('  width-specific checks', false, 'no header');
    check('  width-specific checks', false, 'no header');
  }

  // ── the right panel's tab row ─────────────────────────────────────────────
  const tabs = await page.evaluate((vw) => {
    const btns = [...document.querySelectorAll('.wb-right-tabs button')];
    if (!btns.length) return null;
    return {
      count: btns.length,
      panel: Math.round(btns[0].parentElement.getBoundingClientRect().width),
      // A label wider than the button it sits in is a clipped word, which is
      // what shrinking the row without shrinking the text would produce.
      clipped: btns.filter((b) => b.scrollWidth > Math.ceil(b.getBoundingClientRect().width)).map((b) => b.innerText.trim()),
      pastEdge: btns.filter((b) => Math.round(b.getBoundingClientRect().right) > vw).map((b) => b.innerText.trim()),
      size: getComputedStyle(btns[0]).fontSize,
    };
  }, width);
  check(`${width}: the right panel shows its three tabs`, !!tabs && tabs.count === 3,
    tabs ? `${tabs.count} in ${tabs.panel}px` : 'no tab row');
  if (tabs) {
    check('  none of them runs past the edge of the screen', tabs.pastEdge.length === 0,
      tabs.pastEdge.join(', ') || 'all inside');
    check('  and no label is clipped inside its own button', tabs.clipped.length === 0,
      tabs.clipped.join(', ') || `all readable at ${tabs.size}`);
    if (width === 1440) {
      check('  the desktop tabs are still 13px', tabs.size === '13px', tabs.size);
    }
  } else {
    check('  none of them runs past the edge of the screen', false, 'no tab row');
    check('  and no label is clipped inside its own button', false, 'no tab row');
  }
  await ctx.close();
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
