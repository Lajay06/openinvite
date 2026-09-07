/* global document, getComputedStyle */
/**
 * NO PAGE DECLARES ITS OWN TYPE SCALE OR BUTTON SIZE.
 *
 * Owner ruling 2026-09-07: "we've already decided what the standard design
 * size is for these pills, so why are these massive?"
 *
 * WHY THIS IS A RENDER GUARD AND NOT A GREP. A page's font size is the sum of
 * an inline style, a Tailwind class, a shared component's default and
 * index.css's own rules — and the last of those carries `!important` on the
 * font FAMILY, which is exactly the trap that let twenty universes render in
 * the wrong face while their source said otherwise. The only honest question
 * is what the browser computed, so that is what this asks.
 *
 * WHAT IT MEASURES. Every input, label, button and filter pill on a set of
 * dashboard routes, and whether its computed font-size is one of the five
 * sizes in src/styles/typeScale.js. A sixth size is not a design decision, it
 * is a page forgetting the other five exist.
 *
 * Usage: npm run test:type-scale  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';
import { TYPE_SCALE } from '../src/styles/typeScale.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

const own = { created_by: 'fixture@example.com', created_by_id: 'u1' };
const day = SEED.WeddingDetails[0].weddingDate.slice(0, 10);
const SEEDED = {
  ...SEED,
  Schedule: [
    { id: 's1', event_name: 'Ceremony', category: 'ceremony', event_date: day, start_time: '15:00', location: 'The Old Observatory', responsible_person: null, notes: null, description: null, end_time: null, ...own },
    { id: 's2', event_name: 'Speeches', category: 'reception', event_date: day, start_time: '19:00', location: 'The Long Room', responsible_person: null, notes: null, description: null, end_time: null, ...own },
  ],
};

/** The routes a couple actually spends time on. */
const PAGES = [
  '/DailyUpdate', '/Guests', '/Schedule', '/Budget', '/TodoList', '/Vendors',
  '/Seating', '/Moodboard', '/Messages', '/Music', '/Polls', '/ceremony-details',
  // The send flow is a page now, and the owner named its buttons: "Send to
  // guests" and "Back" were huge.
  '/SendInvites',
];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

console.log(`\n  Every control is on the type scale (${TYPE_SCALE.join(' · ')}px):\n`);

const browser = await chromium.launch();
const offenders = [];

for (const path of PAGES) {
  const ctx = await seededContext(browser, { width: 1440, height: 950, seed: SEEDED });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3500);

  const bad = await page.evaluate((scale) => {
    const out = [];
    // Controls only. A heading, a headline and a stat numeral are typography,
    // not controls, and the owner's rule is about the control surface.
    const CONTROLS = 'input, textarea, select, button, label, .filter-pill, [role="button"]';
    for (const el of document.querySelectorAll(CONTROLS)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;          // not rendered
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      // SCREEN-READER FURNITURE IS NOT PAINTED. Radix renders a visually
      // hidden <select> for form semantics and an sr-only "Close" label; both
      // sit at the browser's default 16px and neither is ever seen. A guard
      // that fails on them is failing on the accessibility layer.
      if (el.closest('.sr-only') || el.getAttribute('aria-hidden') === 'true') continue;
      if (r.width <= 1 || r.height <= 1) continue;
      const size = Math.round(parseFloat(cs.fontSize));
      if (scale.includes(size)) continue;
      // ITS OWN TEXT, NOT ITS DESCENDANTS'. The first version used innerText,
      // which includes every child — so a sidebar row div (16px, painting
      // nothing) reported as a 16px control because the 14px span inside it
      // had words. Every nav row and every accordion header failed, and the
      // one real 16px button was buried among them. Same lesson as the
      // typography guard's leaf-versus-cell: judge what the element paints.
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(' ')
        .trim();
      // A CHECKBOX HAS NO TEXT. Its `value` defaults to the string "on",
      // which is not something anyone reads — the first version reported
      // every checkbox on the send page as a 16px control called "on".
      if (/^(checkbox|radio)$/i.test(el.getAttribute('type') || '')) continue;
      const text = own || el.value || el.getAttribute('placeholder') || '';
      if (!text) continue;
      out.push(`${size}px ${el.tagName.toLowerCase()}: ${text.slice(0, 22)}`);
    }
    return [...new Set(out)];
  }, TYPE_SCALE);

  check(`${path} — every control on the scale`, bad.length === 0, bad.slice(0, 4).join(' · ') || 'clean');
  if (bad.length) offenders.push(`${path}: ${bad.join(' · ')}`);
  await ctx.close();
}

await browser.close();

if (offenders.length) {
  console.log('\n  Off the scale:\n');
  offenders.forEach((o) => console.log(`    ${o}`));
}

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
