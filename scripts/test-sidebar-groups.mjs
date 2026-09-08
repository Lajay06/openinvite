/* global document, localStorage, getComputedStyle */
/**
 * THE SIDEBAR OPENS SHUT, REMEMBERS WHAT YOU OPEN, AND SAYS SO WITH A CHEVRON.
 *
 * ── WHY THIS IS A RENDER GUARD ──────────────────────────────────────────────
 *
 * All three properties are about what a couple sees on a first load, and none
 * of them is visible to source analysis. "Collapsed by default" is a claim
 * about the DOM after mount; "remembered per device" is a claim about the DOM
 * after a reload with storage carried across; and the chevron is a claim about
 * a rendered glyph. A file can say all three and render none of them.
 *
 * ── THE MEMORY IS CHECKED THE ONLY WAY IT CAN BE ────────────────────────────
 *
 * By reloading. A test that toggles a group, reads React state back and calls
 * that persistence proves nothing about the next visit — the state was already
 * in memory. So the group is opened, the page is reloaded in the same context,
 * and the group has to still be open. And the reverse, which is the half that
 * catches a default of "open": a fresh context with NO stored preference must
 * show every group closed.
 *
 * ── THE CHEVRON ─────────────────────────────────────────────────────────────
 *
 * It replaced a pair of text-presentation carets, U+25BC and U+25B6. Those
 * were legitimate under the emoji rule — that rule is about presentation, not
 * about a Unicode block — so nothing swept them; they were simply not the
 * shape the rest of the dashboard draws. The check is therefore in two parts:
 * an svg is present and rotates, AND neither of those two glyphs is anywhere
 * in the sidebar. Without the second half, reintroducing an arrow BESIDE the
 * chevron would pass.
 *
 * Usage: npm run test:sidebar-groups  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';
const GROUPS = ['Planning', 'Guests', 'Style & experience', 'Vendors'];
/** The carets the chevron replaced, and any other arrow that might creep back. */
const ARROWS = ['▼', '▶', '▲', '◀', '↓', '→', '←', '↑', '➤'];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** Reads every group header: its label, whether it is open, and its indicator. */
const readGroups = (page) => page.evaluate((groups) => {
  const out = {};
  for (const label of groups) {
    const el = [...document.querySelectorAll('[role="button"][aria-expanded]')]
      .find((d) => (d.getAttribute('aria-label') || '') === label);
    if (!el) { out[label] = null; continue; }
    const svg = el.querySelector('svg:last-of-type');
    const cs = svg ? getComputedStyle(svg) : null;
    out[label] = {
      expanded: el.getAttribute('aria-expanded') === 'true',
      // The label's own size and colour, to compare the indicator against.
      labelStyle: (() => { const s = el.querySelector('span'); const c = s && getComputedStyle(s); return c ? { size: c.fontSize, color: c.color } : null; })(),
      icon: svg ? { cls: svg.getAttribute('class') || '', w: svg.getAttribute('width'), color: cs.color, transform: cs.transform } : null,
      text: (el.innerText || ''),
    };
  }
  return out;
}, GROUPS);

console.log('\n  The sidebar groups:\n');

const browser = await chromium.launch();

// ── first load, nothing stored ──────────────────────────────────────────────
{
  const ctx = await seededContext(browser, { width: 1440, height: 950, seed: SEED });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/DailyUpdate`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4500);

  const g = await readGroups(page);
  // PRESENCE BEFORE PROPERTIES: without the headers on screen, "nothing is
  // open" is true of a page that rendered nothing at all.
  const found = GROUPS.filter((l) => g[l]);
  check('the four groups are in the sidebar', found.length === GROUPS.length,
    found.join(', ') || 'no group headers at all');

  if (found.length === GROUPS.length) {
    const open = GROUPS.filter((l) => g[l].expanded);
    check('  on a first load with nothing stored, every one of them is closed',
      open.length === 0, open.length ? `open: ${open.join(', ')}` : 'all four closed');

    // The indicator, on the group that was there to read.
    const one = g.Planning;
    check('  the indicator is a chevron, not a text glyph',
      !!one.icon && /chevron-down/.test(one.icon.cls), one.icon ? one.icon.cls : 'no svg');
    check('  it is turned -90 degrees while closed',
      !!one.icon && /matrix\(0, -1, 1, 0/.test(one.icon.transform),
      one.icon ? one.icon.transform : 'no transform');
    check('  it is the size and colour of the label beside it',
      !!one.icon && one.icon.w === '10' && one.labelStyle && one.icon.color === one.labelStyle.color,
      one.icon ? `${one.icon.w}px ${one.icon.color} vs label ${one.labelStyle?.size} ${one.labelStyle?.color}` : 'no svg');

    const strays = await page.evaluate((arrows) => {
      const nav = document.querySelector('nav') || document.body;
      const t = nav.innerText || '';
      return arrows.filter((a) => t.includes(a));
    }, ARROWS);
    check('  and no arrow glyph is left anywhere in the sidebar',
      strays.length === 0, strays.join(' ') || 'none');
  } else {
    for (const n of ['  on a first load with nothing stored, every one of them is closed',
      '  the indicator is a chevron, not a text glyph', '  it is turned -90 degrees while closed',
      '  it is the size and colour of the label beside it',
      '  and no arrow glyph is left anywhere in the sidebar']) check(n, false, 'no group headers');
  }
  await ctx.close();
}

// ── open one, reload, and it is still open ──────────────────────────────────
{
  const ctx = await seededContext(browser, { width: 1440, height: 950, seed: SEED });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/DailyUpdate`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4500);

  const opened = await page.locator('[role="button"][aria-label="Guests"]').first()
    .click().then(() => true).catch(() => false);
  await page.waitForTimeout(600);
  const afterClick = await readGroups(page);
  check('a group opens when it is clicked',
    opened && afterClick.Guests?.expanded === true, opened ? String(afterClick.Guests?.expanded) : 'not clickable');

  check('  and the chevron turns back upright',
    /matrix\(1, 0, 0, 1/.test(afterClick.Guests?.icon?.transform || '') || afterClick.Guests?.icon?.transform === 'none',
    afterClick.Guests?.icon?.transform || 'no transform');

  // THE RELOAD IS THE TEST. Reading state back without one proves nothing.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  const afterReload = await readGroups(page);
  check('  and it is still open after a reload', afterReload.Guests?.expanded === true,
    `Guests ${afterReload.Guests?.expanded}`);
  check('  while the ones nobody opened are still closed',
    ['Planning', 'Style & experience', 'Vendors'].every((l) => afterReload[l]?.expanded === false),
    ['Planning', 'Style & experience', 'Vendors'].filter((l) => afterReload[l]?.expanded).join(', ') || 'all three closed');

  // Per DEVICE: it is in this browser's storage, not on the record.
  const stored = await page.evaluate(() => { try { return localStorage.getItem('oi_sidebar_groups'); } catch { return 'THREW'; } });
  check('  and the memory is this device’s, in localStorage', !!stored && stored !== 'THREW' && stored.includes('Guests'),
    stored || 'nothing stored');
  await ctx.close();
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
