/* global document, getComputedStyle */
/**
 * EVERY FILTER ROW IS THE SHARED PILL.
 *
 * Owner ruling 2026-09-07: "selected = black pill white text; unselected = the
 * Theme tab's grey outline pill; hover on unselected = black pill." And,
 * pointedly: the previous pass's inventory was done by GREPPING, and it missed
 * rows — the owner found unselected filters still rendering as bare words.
 *
 * SO THIS INVENTORIES BY RENDERING. It walks every dashboard route, finds the
 * rows that ARE filter sets — three or more small controls laid out in a row,
 * each of which toggles a view rather than performing an action — and fails on
 * any member that is not a `.filter-pill`.
 *
 * A grep cannot do this. A filter row is not a syntactic shape; it is three
 * buttons that happen to sit beside each other, and the pages that got it
 * wrong got it wrong in four different syntaxes (a local `Pill`, a raw
 * `<button>` with an inline style, a `btn-primary`/`btn-editorial-secondary`
 * pair, and an underlined tab strip).
 *
 * WHAT IS NOT A FILTER ROW, and why the heuristic says so:
 *   - a TAB STRIP changes what the page IS, not what the list shows. Tabs are
 *     square-cornered and underlined here; pills are round. Excluded by radius.
 *   - a TOOLBAR ACTION row does something (Export CSV · + Add guest). Excluded
 *     because its members are `btn-primary` / `btn-editorial-secondary`.
 *
 * Usage: npm run test:filter-pills  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

const own = { created_by: 'fixture@example.com', created_by_id: 'u1' };
const day = SEED.WeddingDetails[0].weddingDate.slice(0, 10);
const SEEDED = {
  ...SEED,
  Schedule: [
    { id: 's1', event_name: 'Ceremony', category: 'ceremony', event_date: day, start_time: '15:00', location: 'A', responsible_person: null, notes: null, description: null, end_time: null, ...own },
    { id: 's2', event_name: 'Speeches', category: 'reception', event_date: day, start_time: '19:00', location: 'B', responsible_person: null, notes: null, description: null, end_time: null, ...own },
  ],
};

const PAGES = [
  '/Guests', '/Schedule', '/Budget', '/TodoList', '/Vendors',
  '/Seating', '/Moodboard', '/Messages', '/Music', '/Polls',
];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

console.log('\n  Every filter row is the shared pill:\n');

const browser = await chromium.launch();
const found = [];

// ── THE STATES, READ OFF THE PAINT ─────────────────────────────────────────
//
// BY BACKGROUND, NOT BY BORDER, and that distinction is the whole reason this
// section was rewritten. The previous version asserted `borderColor` was an
// rgba(10,10,10,…) value and passed — while every unselected pill in the
// product rendered as BARE TEXT. getComputedStyle still reports a border
// COLOUR when border-style is `none`, and index.css:1045's
// `[class*="pill"] { border: none !important }` had stripped the width off
// every pill in the tree. A colour with no width paints nothing, so the guard
// was reading a value no person could see.
//
// A background cannot be faked that way: it is either painted or it is not.

/** The Theme tab's unselected pill — the reference every other row must match. */
async function themeUnselected() {
  const ctx = await seededContext(browser, { width: 1440, height: 1000, seed: SEEDED });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/event-details`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3500);
  await page.getByRole('button', { name: /^Theme/i }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  for (const t of ["What's the aesthetic?", 'Atmosphere', 'Season']) {
    const el = page.getByText(t, { exact: true }).first();
    if (await el.count()) { await el.click().catch(() => {}); await page.waitForTimeout(800); }
  }
  const out = await page.evaluate(() => {
    const off = [...document.querySelectorAll('.filter-pill')].find((p) => !p.classList.contains('active'));
    if (!off) return null;
    const cs = getComputedStyle(off);
    return { bg: cs.backgroundColor, fg: cs.color, radius: cs.borderTopLeftRadius };
  });
  await ctx.close();
  return out;
}

const REFERENCE = await themeUnselected();
check('the Theme tab’s unselected pill is a painted fill, not bare text',
  !!REFERENCE && REFERENCE.bg !== 'rgba(0, 0, 0, 0)' && REFERENCE.bg !== 'transparent',
  REFERENCE ? `${REFERENCE.bg} / ${REFERENCE.fg}` : 'no pill found on the Theme tab');
check('  and it is the shared class, so the two cannot diverge',
  !!REFERENCE, 'Event details › Theme renders .filter-pill');

for (const path of PAGES) {
  const ctx = await seededContext(browser, { width: 1440, height: 950, seed: SEEDED });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3500);

  const out = await page.evaluate(() => {
    const rows = [];
    for (const el of document.querySelectorAll('div')) {
      if (getComputedStyle(el).display !== 'flex') continue;
      const kids = [...el.children].filter((c) => /^(BUTTON|A)$/.test(c.tagName) && (c.innerText || '').trim());
      if (kids.length < 3) continue;
      const radii = kids.map((k) => getComputedStyle(k).borderRadius);
      // Round = a pill row. Square = a tab strip, which is a different thing.
      if (!radii.every((r) => parseFloat(r) >= 99)) continue;
      // AN ACTION ROW IS NOT A FILTER ROW. "Export CSV · + Add guest" is
      // round and sits in the toolbar too; it DOES something rather than
      // narrowing a list, and it wears the button vocabulary. The first
      // version of this guard failed those rows, which would have meant
      // turning every toolbar action into a filter pill — the opposite of
      // the rule.
      const classes = kids.map((k) => k.className || '');
      if (classes.some((c) => /btn-primary|btn-editorial/.test(c))) continue;
      // A row inside a FORM or a DIALOG is choosing a value for a record —
      // a priority, a category — not filtering a list. To do's High/Medium/
      // Low chips are a semantic color system the owner kept by name.
      if (el.closest('form') || el.closest('[role="dialog"]')) continue;
      if (el.closest('[data-not-a-filter]')) continue;
      const bad = kids.filter((k) => !/\bfilter-pill\b/.test(k.className || ''))
        .map((k) => `${k.tagName.toLowerCase()}.${(k.className || '(no class)').split(' ')[0]}: ${k.innerText.trim().slice(0, 16)}`);
      rows.push({ kind: bad.length ? 'not-shared' : 'ok', labels: kids.map((k) => k.innerText.trim().slice(0, 16)), bad });
    }
    return rows;
  });

  const broken = out.filter((r) => r.bad.length);
  check(`${path} — ${out.length} pill row(s), all shared`,
    broken.length === 0,
    broken.length ? broken.map((r) => r.bad.slice(0, 3).join(' · ')).join(' | ') : `${out.length} row(s)`);
  if (broken.length) found.push(`${path}: ${broken.map((r) => r.labels.join('/')).join(' | ')}`);

  // AND WHAT AN UNSELECTED PILL ACTUALLY PAINTS, on this page, against the
  // Theme tab's own value. This is the check the owner asked for: not "is it
  // the right class" — #698 proved a pill can wear the class and render as
  // nothing — but "is the background the reference background, and is it
  // painted at all".
  const paint = await page.evaluate(() => {
    const off = [...document.querySelectorAll('.filter-pill')].filter((p) => !p.classList.contains('active'));
    return [...new Set(off.map((p) => getComputedStyle(p).backgroundColor))];
  });
  if (paint.length) {
    check(`  its unselected pills paint ${REFERENCE ? REFERENCE.bg : 'the reference'}`,
      paint.every((bg) => bg === (REFERENCE && REFERENCE.bg)), paint.join(' · '));
    check('  and none of them is transparent',
      paint.every((bg) => bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent'), paint.join(' · '));
  }
  await ctx.close();
}


{
  const ctx = await seededContext(browser, { width: 1440, height: 950, seed: SEEDED });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const states = await page.evaluate(() => {
    const pills = [...document.querySelectorAll('.filter-pill')];
    const on = pills.find((p) => p.classList.contains('active'));
    const off = pills.find((p) => !p.classList.contains('active'));
    const read = (el) => (el ? { bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el).color } : null);
    return { on: read(on), off: read(off) };
  });
  check('selected is the black pill, white text',
    states.on && states.on.bg === 'rgb(10, 10, 10)' && states.on.fg === 'rgb(255, 255, 255)',
    states.on ? `${states.on.bg} / ${states.on.fg}` : 'no active pill');
  await ctx.close();
}

await browser.close();

if (found.length) {
  console.log('\n  Rows that are not the shared pill:\n');
  found.forEach((f) => console.log(`    ${f}`));
}

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
