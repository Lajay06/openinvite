/* global document, window */
/**
 * THE INVITED-TO CHIPS ARE PILLS IN EVERY ROW, NOT A STRIPE THROUGH THE TEXT.
 *
 * Item 4 of goals/2026-10-11-dashboard-fixes-batch-1.md, from the owner's
 * screenshot: the pills collapsed in rows that also carried an email and a
 * phone, rendering as a thin colored stripe through the text, while the row
 * with no contact details showed them at full height.
 *
 * ── WHAT WAS ACTUALLY WRONG, MEASURED BEFORE THE FIX ───────────────────────
 *
 * Every chip painted FOUR PIXELS tall, at 390 and at 1440, in every row: 2px
 * of padding top and bottom around a ZERO line box. The chip button carried
 * lineHeight: 0 to kill the inline-baseline gap under the pill, and CHIP_BASE
 * never set a line-height of its own, so it inherited the zero. The glyphs are
 * 10px and painted outside the 4px box they were meant to sit in.
 *
 * So the contact column was not the cause, it was the contrast: a taller row
 * centers a 4px pill in more empty space, which is what made it obvious where
 * an email and a phone were present and easy to miss where they were not. The
 * pill was equally broken in both.
 *
 * ── WHY THIS IS A BROWSER GUARD ────────────────────────────────────────────
 *
 * Because a source read cannot see it. The declaration that broke the pill was
 * on a DIFFERENT element from the pill, one level up, and said lineHeight: 0,
 * which looks deliberate and was. What is wrong is the painted result, and the
 * only way to know a pill contains its own text is to measure the box and the
 * text. scripts/test-invited-to-row.mjs even recorded this, as a note
 * explaining why it could not assert height: "a pill's BOX is its 2px of
 * padding while its glyphs paint outside that box". That note described the
 * defect and read as a constraint. This guard is the other reading.
 *
 * ── THE FIXTURE CARRIES BOTH ROW SHAPES ────────────────────────────────────
 *
 * One guest with an email AND a phone, one with neither, because the owner's
 * report is a comparison between those two rows. Its own seed rather than the
 * shared fixture's, whose three guests all have an email: the sparse row does
 * not exist there, and adding a guest to the shared seed would move the
 * per-event counts that two other guards pin.
 */
import { chromium } from 'playwright';
import { seededContext, FIXTURES } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4233';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** The two rows the owner compared, built on the default fixture's events. */
const base = FIXTURES.default.seed;
const withContact = { ...base.Guest[0], id: 'gcontact', name: 'Grace Hopper', email: 'grace@example.com', phone: '+61412345678' };
const sparse = { ...base.Guest[1], id: 'gsparse', name: 'Harper Reid' };
delete sparse.email;
delete sparse.phone;
const SEED = { ...base, Guest: [withContact, sparse] };

/** Every row that has chips, measured as painted. */
function readRows() {
  const rows = [];
  for (const tr of document.querySelectorAll('tr')) {
    const chips = [...tr.querySelectorAll('[data-invited-to]')];
    if (chips.length === 0) continue;

    // The PILL, not the button around it: the button is a bare wrapper and the
    // background, the padding and the radius all live on the span inside it.
    const pillOf = (el) => (el.firstElementChild || el);
    const laidOut = chips.filter((el) => el.getBoundingClientRect().width > 0
      && !el.closest('[data-invited-overflow-panel]'));

    // ── FINDING THE CHIP ROW, THE HARD WAY AND FOR A REASON ───────────────
    //
    // Walked up from a chip rather than selected by a class, so a restyle
    // cannot point this at the wrong box. But "the first flex ancestor" is
    // NOT the row: CSS blockifies an inline-flex flex ITEM to flex, so the
    // chip's own button computes as display:flex and the walk stopped on it.
    // Every row measurement was then a chip against itself, which passed
    // every check for the wrong reason. Caught by two plants that capped the
    // real row and went unnoticed.
    //
    // The row is the ancestor that holds ALL of this row's chips.
    let chipRow = chips[0].parentElement;
    for (let i = 0; i < 6 && chipRow; i += 1) {
      const holds = chipRow.querySelectorAll('[data-invited-to]').length;
      if (holds >= chips.length && window.getComputedStyle(chipRow).display === 'flex') break;
      chipRow = chipRow.parentElement;
    }

    const overflow = tr.querySelector('[data-invited-overflow]');
    const text = tr.innerText || '';
    rows.push({
      name: text.split('\n')[0] || '(unnamed)',
      // AN ADDRESS OR A LONG RUN OF DIGITS. Read off the painted row rather
      // than from the fixture, so the guard is measuring the row it found.
      hasContact: /@/.test(text) || /\+?\d{8,}/.test(text),
      chipHeights: laidOut.map((el) => Math.round(pillOf(el).getBoundingClientRect().height)),
      chipRowHeight: chipRow ? Math.round(chipRow.getBoundingClientRect().height) : 0,
      overflowHeight: overflow ? Math.round(overflow.getBoundingClientRect().height) : null,
      overflowText: overflow ? (overflow.innerText || '').trim() : null,
      // THE CELL MUST NOT CAP THE ROW. A fixed height with overflow hidden
      // leaves every chip's own box intact and only clips the paint, so
      // comparing boxes cannot see it. This reads the cap itself.
      chipRowCapped: (() => {
        const box = chipRow;
        if (!box) return true;
        const cs = window.getComputedStyle(box);
        const clipped = cs.overflowY !== 'visible' && cs.overflow !== 'visible';
        const fixed = cs.height !== 'auto' && parseFloat(cs.height) < 12;
        const maxed = cs.maxHeight !== 'none' && parseFloat(cs.maxHeight) < 12;
        return (clipped && fixed) || maxed;
      })(),
      // THE TEXT MUST FIT INSIDE THE BOX. A pill whose line box is shorter
      // than its own font is the defect, stated as a measurement rather than
      // as a pixel count that a type change would falsify.
      fits: laidOut.every((el) => {
        const cs = window.getComputedStyle(pillOf(el));
        const lh = parseFloat(cs.lineHeight);
        const fs = parseFloat(cs.fontSize);
        return Number.isFinite(lh) && Number.isFinite(fs) && lh >= fs;
      }),
      shrinks: laidOut.some((el) => window.getComputedStyle(el).flexShrink !== '0'
        || window.getComputedStyle(pillOf(el)).flexShrink !== '0'),
      // PADDING IS PART OF THE SPEC: "the chips keep their padding and height
      // in every row". A pill with no padding clears the height floor on its
      // line box alone, so the floor cannot stand in for this.
      padded: laidOut.every((el) => {
        const cs = window.getComputedStyle(pillOf(el));
        return parseFloat(cs.paddingTop) >= 2 && parseFloat(cs.paddingBottom) >= 2
          && parseFloat(cs.paddingLeft) >= 6 && parseFloat(cs.paddingRight) >= 6;
      }),
    });
  }
  return rows;
}

const browser = await chromium.launch();

for (const [w, h] of [[1440, 950], [390, 844]]) {
  console.log(`\n  ${w}px:`);
  const ctx = await seededContext(browser, { width: w, height: h, seed: SEED });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
  await page.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(9000);

  const rows = await page.evaluate(readRows);
  check('  the rows rendered their chips', rows.length >= 2, `${rows.length} row(s) with chips`);
  check('  no page error behind them', errors.length === 0, errors.join(' | ') || 'none');

  const contactRow = rows.find((r) => r.hasContact);
  const sparseRow = rows.find((r) => !r.hasContact);
  check('  the fixture gave both shapes: one row with contact, one without',
    !!contactRow && !!sparseRow,
    `${rows.map((r) => `${r.name}:${r.hasContact ? 'contact' : 'bare'}`).join(', ')}`);

  if (!contactRow || !sparseRow) break;

  // ── NO CHIP IS A STRIPE ─────────────────────────────────────────────────
  //
  // A FLOOR, NOT A PINNED NUMBER. 12px is the smallest box that can hold the
  // chip's own 10px text; the fix paints 18px. Pinning 18 would go red on a
  // type change that was perfectly fine, and pinning nothing is what let 4px
  // ship.
  const FLOOR = 12;
  for (const r of rows) {
    check(`  every chip in the ${r.hasContact ? 'contact' : 'bare'} row is a pill, not a stripe`,
      r.chipHeights.length > 0 && r.chipHeights.every((hh) => hh >= FLOOR),
      `[${r.chipHeights.join(', ')}]px, floor ${FLOOR}`);
    check('    its text fits inside its own box',
      r.fits, r.fits ? 'line box >= font size' : 'line box shorter than the font');
    check('    and it cannot be squeezed by the row around it',
      !r.shrinks, r.shrinks ? 'flex-shrink is not 0' : 'flex-shrink: 0');
    check('    and it keeps its padding, which the height floor cannot prove',
      r.padded, r.padded ? '>= 2px vertical, >= 6px horizontal' : 'padding lost');
  }

  // ── THE OVERFLOW PILL IS A CHIP TOO ─────────────────────────────────────
  check('  the "+N" overflow pill is the same height as a chip',
    contactRow.overflowHeight !== null
      && contactRow.overflowHeight >= FLOOR
      && Math.abs(contactRow.overflowHeight - contactRow.chipHeights[0]) <= 1,
    `+N ${contactRow.overflowHeight}px against chip ${contactRow.chipHeights[0]}px (${contactRow.overflowText})`);

  // ── AND THE ROW IS THE SAME EITHER WAY ──────────────────────────────────
  //
  // THE CHIP ROW, not the table row. A table row with an email and a phone in
  // it is legitimately taller than one with neither; what must not differ is
  // the box the chips are laid out in, because that is what the owner was
  // comparing and it is the only one the cell controls.
  check('  the cell does not cap the chip row\u2019s height',
    !contactRow.chipRowCapped && !sparseRow.chipRowCapped,
    `contact capped=${contactRow.chipRowCapped}, bare capped=${sparseRow.chipRowCapped}`);
  check('  the chip row is no shorter than one full chip',
    contactRow.chipRowHeight >= Math.max(...contactRow.chipHeights)
      && sparseRow.chipRowHeight >= Math.max(...sparseRow.chipHeights),
    `contact ${contactRow.chipRowHeight}px, bare ${sparseRow.chipRowHeight}px`);
  check('  and it is the same height with and without a contact present',
    contactRow.chipRowHeight === sparseRow.chipRowHeight,
    `${contactRow.chipRowHeight}px vs ${sparseRow.chipRowHeight}px`);
  check('    as are the chips themselves',
    Math.max(...contactRow.chipHeights) === Math.max(...sparseRow.chipHeights),
    `${Math.max(...contactRow.chipHeights)}px vs ${Math.max(...sparseRow.chipHeights)}px`);

  await ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
