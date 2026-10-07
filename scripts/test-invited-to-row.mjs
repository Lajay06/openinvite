/* global document, window */
/**
 * THE "INVITED TO" COLUMN IS ONE ROW, WHATEVER THE WEDDING LOOKS LIKE.
 *
 * Item 4 of goals/2026-10-08-site-fixes-batch-1.md: with two or more events the
 * chips wrapped and broke the row, so the ruling is one row, never wrapping, up
 * to two chips, then a "+N" pill that opens the rest on hover or tap, with the
 * column width unchanged.
 *
 * ── WHY A BROWSER AND NOT A PROPERTY CHECK ─────────────────────────────────
 *
 * "Never wrapping" is a fact about geometry. A source check can see
 * flexWrap: 'nowrap' and still miss a chip that pushes the row to two lines,
 * and it cannot see whether tapping the pill actually reveals anything. So
 * this reads the painted rows: how many chips share a line, how tall the line
 * is, and what appears after a tap and after a hover.
 *
 * ── THE FIXTURE MAKES THE CASE REACHABLE ───────────────────────────────────
 *
 * The render seed has three events, so every guest row is the overflow case
 * exactly: two chips inline and a "+1". A two-event wedding would never show a
 * pill and a one-event wedding never wrapped in the first place.
 *
 * ── AND WHY EVERY CHIP IS STILL IN THE DOM ─────────────────────────────────
 *
 * A chip is a control: clicking it invites or removes. Dropping the overflow
 * ones would remove a capability from three events up, and
 * scripts/test-per-event-dashboard.mjs reads every [data-invited-to] on the
 * page to assert the fixture's invitations. This guard pins the count so the
 * next person to "simplify" the cell cannot quietly take either away.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4232';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** What the first guest row's status cell looks like, measured. */
function readCell() {
  const cells = [...document.querySelectorAll('[data-invited-to]')]
    .map((el) => el.closest('div'))
    .filter(Boolean);
  // The cell is the flex container that holds the inline chips.
  const first = [...document.querySelectorAll('[data-invited-to]')][0];
  let box = first;
  for (let i = 0; i < 4 && box; i += 1) {
    const cs = window.getComputedStyle(box);
    if (cs.display === 'flex') break;
    box = box.parentElement;
  }
  const inPanel = (el) => !!el.closest('[data-invited-overflow-panel]');
  const all = [...document.querySelectorAll('[data-invited-to]')];
  const row = all.filter((el) => box && box.contains(el));
  const laidOut = row.filter((el) => el.getBoundingClientRect().width > 0 && !inPanel(el));
  // The visual pill, not the zero-line-height button around it.
  const pillBox = (el) => (el.firstElementChild || el).getBoundingClientRect();
  const tops = [...new Set(laidOut.map((el) => Math.round(pillBox(el).top)))];
  const pill = box ? box.querySelector('[data-invited-overflow]') : null;
  const panel = box ? box.querySelector('[data-invited-overflow-panel]') : null;
  const chipH = laidOut.length ? Math.round(pillBox(laidOut[0]).height) : 0;
  return {
    cells: cells.length,
    chipsInDom: row.length,
    laidOut: laidOut.length,
    lines: tops.length,
    cellHeight: box ? Math.round(box.getBoundingClientRect().height) : 0,
    // THE LAST PILL'S RIGHT EDGE AGAINST THE CELL'S, which is the horizontal
    // half of "one row": chips that fit on a line but spill past the column
    // would pass a tops check and still be wrong.
    //
    // HEIGHT IS NOT USED ANYWHERE HERE, and that is deliberate. The chip
    // button carries lineHeight: 0 (a pre-existing choice that kills the
    // inline gap), so a pill's BOX is its 2px of padding while its glyphs
    // paint outside that box: the cell reads as 6px tall with 9px of ink on
    // one single line. Any height or overflow assertion measures that gap
    // rather than wrapping. One row is proven by equal tops and a known
    // inline count instead.
    spillRight: laidOut.length && box
      ? Math.round(Math.max(...laidOut.map((el) => pillBox(el).right))
                   - box.getBoundingClientRect().right)
      : 0,
    chipHeight: chipH,
    cellWidth: box ? Math.round(box.getBoundingClientRect().width) : 0,
    pillText: pill ? (pill.innerText || '').trim() : null,
    pillExpanded: pill ? pill.getAttribute('aria-expanded') : null,
    panelShown: panel ? window.getComputedStyle(panel).display !== 'none' : null,
    panelChips: panel ? panel.querySelectorAll('[data-invited-to]').length : 0,
    overflowChipVisible: panel
      ? [...panel.querySelectorAll('[data-invited-to]')].some((el) => el.getBoundingClientRect().width > 0)
      : false,
    totalChips: all.length,
  };
}

const browser = await chromium.launch();

for (const [w, h] of [[390, 844], [1440, 950]]) {
  console.log(`\n  ${w}px:`);
  const ctx = await seededContext(browser, { width: w, height: h });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
  await page.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(9000);

  const at_rest = await page.evaluate(readCell);
  check('  the column rendered its chips', at_rest.totalChips > 0, `${at_rest.totalChips} chip(s) on the page`);
  check('  no page error behind it', errors.length === 0, errors.join(' | ') || 'none');

  // ── ONE ROW ─────────────────────────────────────────────────────────────
  check('  the chips sit on ONE line', at_rest.lines === 1, `${at_rest.lines} line(s)`);
  check('    and no chip spills past the column',
    at_rest.spillRight <= 1, `${at_rest.spillRight}px past the right edge`);
  check('  two chips are laid out inline, not three', at_rest.laidOut === 2, `${at_rest.laidOut} inline`);
  check('  and the rest sit behind a +N pill', at_rest.pillText === '+1', at_rest.pillText || 'no pill');
  check('  the column is no wider than it was', at_rest.cellWidth <= 320, `${at_rest.cellWidth}px of 320`);

  // ── EVERY CHIP IS STILL THERE ───────────────────────────────────────────
  check('  the hidden chip is in the DOM, not dropped', at_rest.panelChips === 1, `${at_rest.panelChips} in the panel`);
  check('    so all three events are still readable per row',
    at_rest.chipsInDom === 3, `${at_rest.chipsInDom} for this guest`);
  check('  the panel starts closed', at_rest.panelShown === false && at_rest.pillExpanded === 'false',
    `shown=${at_rest.panelShown} expanded=${at_rest.pillExpanded}`);

  // ── A TAP OPENS IT ──────────────────────────────────────────────────────
  await page.evaluate(() => document.querySelector('[data-invited-overflow]').click());
  await page.waitForTimeout(400);
  const tapped = await page.evaluate(readCell);
  check('  tapping the pill reveals the rest',
    tapped.panelShown === true && tapped.overflowChipVisible, `shown=${tapped.panelShown}`);
  check('    and says so to a screen reader', tapped.pillExpanded === 'true', `expanded=${tapped.pillExpanded}`);
  check('    without the row growing a second line', tapped.lines === 1, `${tapped.lines} line(s)`);

  await page.evaluate(() => document.querySelector('[data-invited-overflow]').click());
  await page.waitForTimeout(400);
  const closed = await page.evaluate(readCell);
  check('  tapping again closes it', closed.panelShown === false, `shown=${closed.panelShown}`);

  // ── AND SO DOES A HOVER ─────────────────────────────────────────────────
  await page.hover('[data-invited-overflow]');
  await page.waitForTimeout(400);
  const hovered = await page.evaluate(readCell);
  check('  hovering reveals it too',
    hovered.panelShown === true && hovered.overflowChipVisible, `shown=${hovered.panelShown}`);

  await page.close();
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
