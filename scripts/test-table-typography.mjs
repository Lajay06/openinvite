/* global document, window */
/**
 * Table typography — the EFFECT, not the declaration.
 *
 * R37 says every list-shaped surface renders through one shell. A source check
 * can prove they import the same component; it cannot prove they LOOK the
 * same, because src/index.css carries `* { font-family: … !important }` and a
 * cell's size and colour come from a Tailwind class three layers up. The same
 * reasoning that put test-guest-font-effect.mjs beside the static font parity
 * probe puts this beside data-table.mjs.
 *
 * IT READS THE LEAF, NOT THE CELL, and that distinction is the whole reason
 * this file had to be rewritten once. The first version read the <td>, which
 * is 14px in BOTH tables — so it passed while the owner could plainly see the
 * schedule's text was larger. The guest list never paints that 14px: every
 * name, email and table number sits in a nested span at 13px. A check aimed
 * one level too high agrees with itself and with nothing a person sees.
 *
 * Usage: npm run test:table-typography  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';
const own = { created_by: 'fixture@example.com', created_by_id: 'u1' };
const day = SEED.WeddingDetails[0].weddingDate.slice(0, 10);
const seed = {
  ...SEED,
  Schedule: [
    { id: 's1', event_name: 'Ceremony', category: 'ceremony', event_date: day, start_time: '15:00', location: 'The Old Observatory', ...own },
    { id: 's2', event_name: 'Reception', category: 'reception', event_date: day, start_time: '18:00', location: 'The Long Room', ...own },
  ],
};

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** The computed typography of a table's header cells and first body row. */
async function readTable(page) {
  return page.evaluate(() => {
    const pick = (el) => {
      const s = window.getComputedStyle(el);
      return {
        fontFamily: s.fontFamily.split(',')[0].replace(/["']/g, ''),
        fontSize: s.fontSize, fontWeight: s.fontWeight,
        letterSpacing: s.letterSpacing, textTransform: s.textTransform,
        color: s.color, lineHeight: s.lineHeight,
      };
    };
    const th = document.querySelector('table thead th:nth-child(2)');
    const tr = document.querySelector('table tbody tr');
    const cells = tr ? [...tr.querySelectorAll('td')].filter((c) => c.innerText.trim()) : [];
    // The deepest element that actually carries text — what the eye reads.
    const leafOf = (el) => {
      let best = el;
      const walk = (n) => { for (const c of n.children) { if (c.innerText && c.innerText.trim()) { best = c; walk(c); } } };
      walk(el);
      return best;
    };
    // THE PRIMARY CELL IS THE LARGEST TEXT IN THE ROW, not the heaviest.
    // It used to be "the first cell at weight >= 500", which worked only while
    // the schedule's secondary cells were lighter than its primary — i.e. only
    // while the bug the owner reported was present. With the weight floor
    // applied every cell is 600, and that heuristic picked the Date column and
    // reported a 12px/13px mismatch as a typography failure.
    const sizeOf = (el) => parseFloat(window.getComputedStyle(leafOf(el)).fontSize) || 0;
    const primaryCell = cells.slice().sort((a, b) => sizeOf(b) - sizeOf(a)
      || Number(window.getComputedStyle(leafOf(b)).fontWeight) - Number(window.getComputedStyle(leafOf(a)).fontWeight))[0];
    // No row means no table — report that, don't throw inside evaluate. A page
    // that failed to load used to crash the walker on `undefined.children`,
    // and a stack trace reads like a broken guard rather than a missing table.
    if (!primaryCell) return null;
    const td = leafOf(primaryCell);
    const headerRow = document.querySelector('table thead tr');
    return th && td ? {
      head: pick(th),
      cell: pick(td),
      headerBand: window.getComputedStyle(headerRow).backgroundColor,
      // THE PADDING, NOT THE HEIGHT, and read off the CELL rather than the
      // leaf: a guest row is taller because it carries a 32px avatar, and
      // forcing the heights equal would mean padding an event row to match
      // furniture it does not have. Padding is the shell's; typography is the
      // leaf's. Reading both off the same element got one of them wrong.
      cellPadding: window.getComputedStyle(primaryCell).padding,
      headPadding: window.getComputedStyle(th).padding,
      divider: window.getComputedStyle(tr).borderBottomColor + ' ' + window.getComputedStyle(tr).borderBottomWidth,
      // EVERY CELL IN THE ROW, not one. The first version sampled a single
      // cell and a plant that changed a different column's font size passed —
      // a check that looks at one place cannot see drift in the others.
      cellSizes: [...new Set(cells.map((c) => window.getComputedStyle(leafOf(c)).fontSize))].sort().join(' '),
      cellFonts: [...new Set(cells.map((c) => window.getComputedStyle(leafOf(c)).fontFamily.split(',')[0].replace(/["']/g, '')))].sort().join(' '),
      // EVERY WEIGHT PAINTED IN THE ROW. The owner saw the schedule's Time
      // column "in a light weight we never use" — 400 against a guest list
      // that paints 600 everywhere, because the guest list sets no weight on
      // its secondary spans and the schedule declared one. A size check cannot
      // see this; only the weights can.
      cellWeights: [...new Set(cells.map((c) => Number(window.getComputedStyle(leafOf(c)).fontWeight)))].sort((a, b) => a - b),
      // THE PIXELS, not the declaration. Ink height of the primary text,
      // measured off the render, because a font-size that matches can still
      // paint differently if a transform or a face substitution intervenes.
      primaryText: td.innerText.trim().slice(0, 24),
      // ── THE GLYPHS, MEASURED ────────────────────────────────────────────
      //
      // THE OWNER WAS RIGHT AND THIS FILE'S FIRST TWO VERSIONS WERE WRONG, so
      // the third stops asking the browser what it INTENDED and measures what
      // it DREW. Two numbers, neither of them a declared value:
      //
      //   inkAscent — the cap-height of the actual painted glyphs, from
      //   TextMetrics.actualBoundingBoxAscent with the leaf's RESOLVED font
      //   shorthand. If the face substitutes, or a size is scaled by a
      //   transform up the tree, the ink moves and this number moves with it;
      //   fontSize does not.
      //
      //   textBox — the height of the text node's own client rect via a
      //   Range, not the element's. The schedule's leaf is a flex container as
      //   tall as the whole row (45px), so its box says nothing about where
      //   the glyphs are; the Range says exactly.
      //
      // Verified against a screenshot at 1440 on this commit: both tables
      // measure a 10px cap-height in a 16px text box, and the crops are in the
      // PR. That is the evidence "getComputedStyle says 13px" could not give.
      ...(() => {
        const cs = window.getComputedStyle(td);
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`;
        const m = ctx.measureText('H');
        const node = [...td.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
        const rg = document.createRange(); rg.selectNodeContents(node || td);
        return {
          inkAscent: Math.round(m.actualBoundingBoxAscent * 100) / 100,
          textBox: Math.round(rg.getBoundingClientRect().height * 100) / 100,
          resolvedFont: ctx.font,
        };
      })(),
    } : null;
  });
}

const browser = await chromium.launch();
const open = async (path, extraSeed) => {
  const ctx = await seededContext(browser, { width: 1440, height: 1000, seed: extraSeed });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4500);
  const out = await readTable(page);
  await ctx.close();
  return out;
};

console.log('\n  Table typography — the guest list and the schedule are one table:\n');

const guests = await open('/Guests');
const schedule = await open('/Schedule', seed);
await browser.close();

if (!guests || !schedule) {
  check('both tables rendered', false, `guests=${!!guests} schedule=${!!schedule}`);
} else {
  for (const [what, a, b] of [['header cell', guests.head, schedule.head], ['body cell', guests.cell, schedule.cell]]) {
    for (const prop of ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'textTransform']) {
      check(`${what} ${prop} matches`, a[prop] === b[prop], `guests ${a[prop]} · schedule ${b[prop]}`);
    }
  }
  check('the header band is the same colour',
    guests.headerBand === schedule.headerBand, `${guests.headerBand} · ${schedule.headerBand}`);
  check('the PRIMARY TEXT is the same size — read off the leaf, not the cell',
    guests.head && guests.cell.fontSize === schedule.cell.fontSize,
    `guests ${guests.cell.fontSize} · schedule ${schedule.cell.fontSize} — the <td> is 14px in both; the text is not`);
  check('  and the same weight, line-height and colour',
    guests.cell.fontWeight === schedule.cell.fontWeight
      && guests.cell.color === schedule.cell.color,
    `${guests.cell.fontWeight}/${guests.cell.color} · ${schedule.cell.fontWeight}/${schedule.cell.color}`);
  // A SUBSET, NOT EQUALITY. The guest list has a column the schedule does not
  // — a contact cell with a second line at 12px — and demanding the two sets
  // match exactly would fail on a column that does not exist rather than on a
  // size that was invented. What must hold is that the schedule uses NO SIZE
  // the guest list does not.
  {
    const gs = new Set(guests.cellSizes.split(' '));
    const extra = schedule.cellSizes.split(' ').filter((x) => !gs.has(x));
    check('the schedule uses no text size the guest list does not',
      extra.length === 0, `guests [${guests.cellSizes}] · schedule [${schedule.cellSizes}]${extra.length ? ` · invented ${extra.join(' ')}` : ''}`);
  }
  check('  and the same face',
    guests.cellFonts === schedule.cellFonts, `${guests.cellFonts} · ${schedule.cellFonts}`);
  // THE WEIGHT FLOOR. The shell's secondary cell — the guest list's email and
  // phone — is the lightest weight this product paints in a table. Nothing in
  // the schedule may go below it.
  {
    const floor = Math.min(...guests.cellWeights);
    const lightest = Math.min(...schedule.cellWeights);
    check('no cell is lighter than the shell’s secondary weight',
      Number.isFinite(floor) && lightest >= floor,
      `guest list floor ${floor} · schedule lightest ${lightest} (schedule weights ${schedule.cellWeights.join(' ')})`);
    check('  and the guest list’s own floor is the 600 the secondary cell declares',
      floor === 600, `measured ${floor} — email and phone, 12px`);
  }
  check('body cell padding matches exactly',
    guests.cellPadding === schedule.cellPadding, `${guests.cellPadding} · ${schedule.cellPadding}`);
  check('header cell padding matches exactly',
    guests.headPadding === schedule.headPadding, `${guests.headPadding} · ${schedule.headPadding}`);
  check('and the row divider is the same',
    guests.divider === schedule.divider, `${guests.divider} · ${schedule.divider}`);
  // MEASURED INK, NOT A DECLARED SIZE — the check the owner's rejection asked
  // for. Both of these passed at 13px/13px while the schedule still looked
  // bigger, because the earlier guard read the <td>; both would still have
  // caught the version where it genuinely was bigger, because ink follows the
  // paint.
  // `undefined === undefined` IS TRUE, and the first version of these three
  // read guests.cell.inkAscent — a property that does not exist, because the
  // metrics hang off the table object, not the picked style. All three printed
  // PASS and "undefinedpx". A measurement check must fail when it measured
  // nothing, so every one of them requires a number first.
  const measured = (v) => typeof v === 'number' && v > 0;
  check('the PAINTED cap-height is the same, not just the declared size',
    measured(guests.inkAscent) && guests.inkAscent === schedule.inkAscent,
    `guests ${guests.inkAscent}px · schedule ${schedule.inkAscent}px of ink for a capital`);
  check('  and the text sits in a box of the same height',
    measured(guests.textBox) && guests.textBox === schedule.textBox,
    `guests ${guests.textBox}px · schedule ${schedule.textBox}px — the row heights differ (an avatar), the text box must not`);
  check('  and the browser resolved the same font shorthand for both',
    !!guests.resolvedFont && guests.resolvedFont === schedule.resolvedFont, guests.resolvedFont);
}

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
