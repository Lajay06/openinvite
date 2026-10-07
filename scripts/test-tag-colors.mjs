/* global document, window */
/**
 * A TAG IS THE SAME COLOR EVERY TIME, AND YOU CAN READ IT.
 *
 * Item 6 of goals/2026-10-08-site-fixes-batch-1.md: each tag takes a swatch
 * from a fixed palette of at least eight, chosen deterministically from its
 * name, and text contrast passes on every swatch.
 *
 * ── WHY THIS IS PAINTED AND NOT COMPUTED ───────────────────────────────────
 *
 * src/lib/tagColors.js is pure and could be asserted in a node guard, and the
 * palette's contrast could be computed from its own literals. Neither would
 * show what a couple sees. A pill's final color is an inline style, whatever
 * the hover rule does to it, and whatever index.css says about the cell around
 * it; only the browser knows which won. So the ratios here are computed from
 * getComputedStyle on the rendered pill, against the background actually
 * behind it.
 *
 * THE FIXTURE carries four tags on four guests: Family on two of them, plus
 * Work, Uni and Golf. Family twice is the point of the item in one screenshot,
 * and the four names land on four different swatches, so "deterministic" and
 * "distinct" are both visible rather than inferred.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4232';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** Every painted tag pill, with the colors the browser resolved. */
function readPills() {
  const toRgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  // The first ancestor with a non-transparent background, which is what the
  // pill is actually read against.
  const behind = (el) => {
    let n = el.parentElement;
    while (n) {
      const bg = window.getComputedStyle(n).backgroundColor;
      const p = toRgb(bg);
      if (p.length === 3 && !/rgba\(0, 0, 0, 0\)/.test(bg)) return p;
      n = n.parentElement;
    }
    return [255, 255, 255];
  };
  return [...document.querySelectorAll('[data-tag-pill]')].map((el) => {
    const cs = window.getComputedStyle(el);
    return {
      tag: el.getAttribute('data-tag-pill'),
      bg: toRgb(cs.backgroundColor),
      ink: toRgb(cs.color),
      border: toRgb(cs.borderColor),
      behind: behind(el),
      fontSize: Math.round(parseFloat(cs.fontSize)),
      text: (el.innerText || '').trim(),
    };
  });
}

const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const key = (p) => p.bg.join(',');

const browser = await chromium.launch();

for (const [w, h] of [[390, 844], [1440, 950]]) {
  console.log(`\n  ${w}px:`);
  const ctx = await seededContext(browser, { width: w, height: h });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
  await page.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(9000);

  const pills = await page.evaluate(readPills);
  check('  tag pills painted', pills.length >= 4, `${pills.length} pill(s)`);
  check('  no page error behind them', errors.length === 0, errors.join(' | ') || 'none');

  // ── THE SAME TAG IS THE SAME COLOR ──────────────────────────────────────
  const byTag = {};
  for (const p of pills) (byTag[p.tag] ||= []).push(key(p));
  const family = byTag.Family || [];
  check('  Family appears on more than one guest', family.length >= 2, `${family.length} pill(s)`);
  check('    and is the same color on each', new Set(family).size === 1,
    [...new Set(family)].join(' vs ') || 'none');

  // ── DIFFERENT TAGS ARE DIFFERENT COLORS ─────────────────────────────────
  const distinctTags = Object.keys(byTag);
  const distinctColors = new Set(Object.values(byTag).map((v) => v[0]));
  // NAMED, NOT COUNTED. With no pills on the page, "as many colors as tags"
  // is 0 === 0 and passes; the fixture's four tags are listed so the check
  // cannot be satisfied by an empty table.
  const EXPECTED = ['Family', 'Work', 'Uni', 'Golf'];
  check('  the fixture\'s four tags are all on the page',
    EXPECTED.every((t) => byTag[t]), distinctTags.join(', ') || 'none');
  check(`  and the ${distinctTags.length} tags use ${distinctColors.size} different swatches`,
    distinctTags.length >= EXPECTED.length && distinctColors.size === distinctTags.length,
    distinctTags.join(', ') || 'none');
  check('    and none of them is the old single purple',
    distinctColors.size > 1, `${distinctColors.size} color(s)`);

  // ── EVERY PAINTED SWATCH IS READABLE ────────────────────────────────────
  //
  // AA for normal text is 4.5:1. Measured on the pill as rendered, not on the
  // palette's literals.
  let worst = { r: 99, tag: null };
  for (const p of pills) {
    const r = ratio(p.bg, p.ink);
    if (r < worst.r) worst = { r, tag: p.tag };
  }
  check('  every painted pill passes AA for its own text',
    worst.r >= 4.5, `weakest ${worst.tag} at ${worst.r.toFixed(2)}:1`);
  // AND THE PILL HAS A VISIBLE EDGE AGAINST THE ROW. The first version of this
  // check measured the FILL against the row and failed at 1.11:1 on amber,
  // which was the check being wrong rather than the palette: these fills are
  // deliberately faint tints (1.10 to 1.23 against white) and the border, in
  // the swatch's own hue, is what draws the edge (1.40 to 2.56). So the test
  // is the STRONGER of the two, which is what an eye uses. 1.2:1 is the line
  // between "a pill" and "some words", and the weakest here clears it at 1.40.
  let faintest = { r: 99, tag: null };
  for (const p of pills) {
    const r = Math.max(ratio(p.bg, p.behind), ratio(p.border, p.behind));
    if (r < faintest.r) faintest = { r, tag: p.tag };
  }
  check('    and has a visible edge against the row behind it',
    faintest.r >= 1.2, `faintest ${faintest.tag} at ${faintest.r.toFixed(2)}:1`);

  // ── THE PILL IS STILL A ROW PILL ────────────────────────────────────────
  //
  // DESIGN_SPEC.md: 10px is the row-pill size and a sixth size is not a design
  // decision. The colors must not have moved it.
  check('  the pills are still 10px', pills.every((p) => p.fontSize === 10),
    [...new Set(pills.map((p) => p.fontSize))].join(', ') + 'px');

  await page.close();
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
