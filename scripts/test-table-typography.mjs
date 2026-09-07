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
    const primaryCell = cells.find((c) => parseInt(window.getComputedStyle(c).fontWeight, 10) >= 500) || cells[1] || cells[0];
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
      // THE PIXELS, not the declaration. Ink height of the primary text,
      // measured off the render, because a font-size that matches can still
      // paint differently if a transform or a face substitution intervenes.
      primaryText: td.innerText.trim().slice(0, 24),
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
  check('body cell padding matches exactly',
    guests.cellPadding === schedule.cellPadding, `${guests.cellPadding} · ${schedule.cellPadding}`);
  check('header cell padding matches exactly',
    guests.headPadding === schedule.headPadding, `${guests.headPadding} · ${schedule.headPadding}`);
  check('and the row divider is the same',
    guests.divider === schedule.divider, `${guests.divider} · ${schedule.divider}`);
}

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
