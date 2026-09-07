/* global document, window */
/**
 * NOTHING INTERACTIVE SITS UNDER THE FLOATING AVA BUTTON.
 *
 * Owner, 2026-09-07: the Send invites "Next" button was hidden behind it. The
 * button is 44px at bottom:32 right:32 (Layout.jsx), so it covers a fixed
 * corner of every page in the product — and anything a page puts there is
 * unreachable, not merely ugly.
 *
 * THE TEST IS elementFromPoint, NOT A SOURCE SCAN. Whether a control ends up
 * under that corner depends on layout, scroll position and viewport, none of
 * which a grep can see. This asks the browser what is actually at those
 * coordinates and fails if the answer is anything but the button itself (or
 * the chrome it sits in).
 *
 * Usage: npm run test:ava-safe-area  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

/** Pages with a bottom-right action, or a long scroll that ends in one. */
const PAGES = [
  '/DailyUpdate', '/Guests', '/Schedule', '/Budget', '/TodoList',
  '/Vendors', '/Seating', '/Moodboard', '/Messages', '/ceremony-details',
];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

console.log('\n  Nothing interactive sits under the floating Ava button:\n');

const browser = await chromium.launch();

/**
 * What the browser finds at the button's corner, from the top down.
 * Returns the first element that is NOT the Ava button or one of its
 * ancestors — i.e. what a click would hit if the button were not there.
 */
async function underTheButton(page) {
  return page.evaluate(() => {
    const ava = document.querySelector('[aria-label="Chat with Ava"], [aria-label="Close Ava"]');
    if (!ava) return { noButton: true };
    const r = ava.getBoundingClientRect();
    // Four points across the button's own rect, so a control peeking out at
    // one corner is still caught.
    const points = [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + 4, r.top + 4],
      [r.right - 4, r.top + 4],
      [r.left + 4, r.bottom - 4],
    ];
    // THE ELEMENT ITSELF, NOT ITS ANCESTORS. The first version called
    // `.closest(interactive)` and walked UP, so a page panel carrying a
    // tabindex reported as a control sitting under the button — /Budget
    // failed on a 900px-wide div whose corner is empty space. What matters is
    // whether a CONTROL is there, so the element under the point must be one.
    const CONTROL = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"]';
    const found = [];
    for (const [x, y] of points) {
      for (const el of document.elementsFromPoint(x, y)) {
        if (el === ava || ava.contains(el) || el.contains(ava)) continue;
        if (!el.matches(CONTROL)) continue;
        found.push(`${el.tagName.toLowerCase()}${el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : ''}: ${(el.innerText || '').trim().slice(0, 24)}`);
        break;
      }
    }
    return { hits: [...new Set(found)], rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
  });
}

for (const path of PAGES) {
  const ctx = await seededContext(browser, { width: 1440, height: 900, seed: SEED });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3500);
  // Scrolled to the bottom, which is where a footer action bar actually is.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  const out = await underTheButton(page);
  if (out.noButton) {
    check(`${path} — the Ava button is on the page`, false, 'not found');
  } else {
    check(`${path} — the corner is the button’s alone`,
      out.hits.length === 0, out.hits.join(' · ') || `clear at ${out.rect.x},${out.rect.y}`);
  }
  await ctx.close();
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
