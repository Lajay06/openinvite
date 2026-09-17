/* global document, window, getComputedStyle */
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

/**
 * THE RIGHT PANEL'S TAB ROW, READ AS GEOMETRY AND AS A HIT TEST.
 *
 * Measured at 390 before the fix: the panel is 147px and Design + Content +
 * Settings needed more than that at their inline 13px, so the row overflowed
 * and the last tab ran past the edge of the screen — the three labels read as
 * one word.
 *
 * Two questions, and the second is why this is not just a width check:
 *   · does every tab END INSIDE the viewport;
 *   · is every LABEL still readable inside its own button — because shrinking
 *     the row without shrinking the text satisfies the first and hides the
 *     words. A clipped label keeps its full box (DECISION-LOG 2026-09-17), so
 *     the label is hit-tested at its own centre, not measured.
 */
const readTabs = (page) => page.evaluate(() => {
  const row = document.querySelector('.wb-right-tabs');
  if (!row) return null;
  const btns = [...row.querySelectorAll('button')];
  return {
    count: btns.length,
    labels: btns.map((b) => (b.innerText || '').trim()),
    rowWidth: Math.round(row.getBoundingClientRect().width),
    pastTheEdge: btns.filter((b) => b.getBoundingClientRect().right > window.innerWidth + 1).length,
    // THE LABEL, NOT THE BUTTON. A plant clipped the text inside each button
    // with `overflow: hidden` at 13px and this check stayed green, because
    // hit-testing the button's centre finds the BUTTON whether or not its text
    // fits. The word is what a person reads, so the word is what is measured:
    // its own range rect must sit inside the button's box, and the button must
    // not be scrolling its content out of sight.
    unreadable: btns.filter((b) => {
      const r = b.getBoundingClientRect();
      if (r.width <= 0) return true;
      if (b.scrollWidth > b.clientWidth + 1) return true;          // text wider than its box
      const node = [...b.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      if (!node) return true;
      const range = document.createRange();
      range.selectNodeContents(node);
      const t = range.getBoundingClientRect();
      if (t.width <= 0) return true;
      if (t.right > r.right + 1 || t.left < r.left - 1) return true; // spills its button
      const hit = document.elementFromPoint(Math.round(t.left + t.width / 2), Math.round(t.top + t.height / 2));
      return !(hit && (hit === b || b.contains(hit) || b.contains(hit.parentElement)));
    }).length,
    fontSize: btns[0] ? getComputedStyle(btns[0]).fontSize : null,
    scrollsItself: row.scrollWidth > row.clientWidth + 1,
  };
});

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

  // ── THE RIGHT PANEL'S TABS ───────────────────────────────────────────────
  const tabs = await readTabs(page);
  check(`${width}: the right panel's tabs are there`, !!tabs && tabs.count === 3,
    tabs ? `${tabs.count} tabs at ${tabs.fontSize}: ${tabs.labels.join(' · ')}` : 'no tab row');
  if (tabs) {
    check('  every tab ends inside the screen', tabs.pastTheEdge === 0,
      tabs.pastTheEdge ? `${tabs.pastTheEdge} tab(s) past the right edge in a ${tabs.rowWidth}px row` : `all three inside a ${tabs.rowWidth}px row`);
    check('  and every label is readable in its own button', tabs.unreadable === 0,
      tabs.unreadable ? `${tabs.unreadable} label(s) clipped or covered` : 'nothing clipped');
    check('  and the row does not scroll sideways inside itself', tabs.scrollsItself === false,
      tabs.scrollsItself ? `scrollWidth exceeds the panel` : 'fits');
  }
  await ctx.close();
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
