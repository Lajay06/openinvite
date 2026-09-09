/* global document, getComputedStyle, Image, innerHeight, innerWidth, Range */
/**
 * EVERY LABEL IN THE BUILDER'S RIGHT PANEL, MEASURED FROM PAINT.
 *
 * ── WHAT WAS WRONG ──────────────────────────────────────────────────────────
 *
 * The panel is #1C1C1E. `FLabel`, the primitive every section label in it goes
 * through, was written for a light editor and hard-coded rgba(10,10,10,0.6).
 * Measured from paint: 1.12:1. Not "low contrast" — invisible. TEXT COLOR,
 * BACKGROUND, SIZE, ALIGNMENT, SPACING, STYLE, HEADING FONT, BODY FONT and
 * every input label in Content and Settings were painting near-black ink on a
 * near-black ground, so the block editor read as unlabelled grids of swatches
 * and the Text color section read as absent.
 *
 * ── WHY MEASURED, AND WHY FROM PAINT ────────────────────────────────────────
 *
 * A source check ("no FLabel uses a dark color") is the guard that would have
 * passed on the broken build: the label's own `color` was never the whole
 * story, because what a label is painted ON is decided by an ancestor several
 * levels up. So this reads pixels. The browser screenshots itself, decodes the
 * PNG into a canvas, and each label is measured inside the RANGE RECTS OF ITS
 * OWN TEXT — not its element box.
 *
 * That distinction cost a wrong reading during the audit. HEADING FONT's
 * `<label>` is display:block and spans the panel; its box happened to overlap
 * the white font name beside it, and the box-based measurement read 5.13:1 for
 * a label that is actually at 1.12:1. A tight glyph rect cannot be rescued by
 * a bright neighbour.
 *
 * ── EVERY SURFACE, NOT THE ONE THAT WAS REPORTED ────────────────────────────
 *
 * The report named the block editor. The defect was in a shared primitive, so
 * it was in all four surfaces at once: the block editor (twice — a quote block
 * is the only type that shows STYLE), the Design tab, Content and Settings. A
 * guard that only visited the reported surface would pass on three broken
 * ones.
 *
 * ── AND THE PICKER ACTUALLY PAINTS ──────────────────────────────────────────
 *
 * The custom text color added beside the background's is asserted end to end:
 * choose a hex, and the words on the canvas are that hex. `resolveBlockStyle`
 * fell through to theme.lightText for any key it did not recognise, so without
 * its own escape hatch the picker would have been a control that changes a
 * swatch and nothing else.
 *
 * Usage: npm run test:design-tab-contrast  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';
const FLOOR = 4.5;

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const BLOCKS = [
  { id: 'h1', type: 'heading', order: 0, content: { text: 'A heading' } },
  { id: 'q1', type: 'quote', order: 1, content: { text: 'Words worth repeating.', attribution: 'Someone' } },
];
const seed = {
  ...SEED,
  WeddingDetails: [{ ...SEED.WeddingDetails[0], homeContent: { blocks: BLOCKS } }],
};

/** The one #1C1C1E column flush to the right edge — found by position, not by
 *  a background color several ancestors also carry. */
const PANEL = `[...document.querySelectorAll('div')]
  .filter(d => getComputedStyle(d).backgroundColor === 'rgb(28, 28, 30)')
  .filter(d => { const r = d.getBoundingClientRect(); return r.width > 150 && r.width < 520 && Math.abs(r.right - innerWidth) < 3; })
  .sort((a, c) => c.getBoundingClientRect().height - a.getBoundingClientRect().height)[0]`;

/**
 * Measures every <label> in the right panel, ONE AT A TIME, each scrolled to
 * the middle of the viewport before its own screenshot.
 *
 * The cheaper shape — scroll in viewport-sized steps, one screenshot per step,
 * measure everything visible — was tried and read wrong twice in the same run:
 * BODY FONT came back 1:1 (ink identical to ground, i.e. flat pixels) and a
 * SPACING label came back 1.56:1 with a dark red ink lifted from the Delete
 * block button. Both are the same fault: the rects are read after the
 * screenshot, and anything that moves or paints in between makes the
 * measurement describe a place rather than an element. One label, one
 * screenshot, taken where the label certainly is.
 */
async function measureLabels(page) {
  const count = await page.evaluate(`(() => { const p = ${PANEL}; return p ? p.querySelectorAll('label').length : 0; })()`);
  const rows = [];
  for (let i = 0; i < count; i++) {
    await page.evaluate(`(() => { const p = ${PANEL}; if (!p) return;
      p.querySelectorAll('label')[${i}]?.scrollIntoView({ block: 'center' }); })()`);
    await page.waitForTimeout(320);
    const shot = (await page.screenshot()).toString('base64');
    const row = await page.evaluate(async ({ b64, panelExpr, idx }) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0);
      const scale = img.width / innerWidth;
      // eslint-disable-next-line no-eval
      const panel = eval(panelExpr);
      const el = panel && panel.querySelectorAll('label')[idx];
      if (!el) return null;
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (!text) return null;

      const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

      // THE GLYPHS, not the element box. A display:block label spans the panel
      // and can overlap something bright beside it — that is exactly how the
      // audit first read HEADING FONT at 5.13:1 when it was painting at 1.12.
      // CLIPPED IS NOT THE SAME AS PRESENT. The Design tab's Typography
      // section collapses to `max-height: 0; overflow: hidden`, and its labels
      // keep full-size client rects inside it. Measuring those read flat panel
      // pixels — 1:1 — and reported two perfectly good labels as invisible.
      // A rect that falls outside a clipping ancestor is not on screen.
      const clipped = (r) => {
        for (let a = el.parentElement; a; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.overflow === 'visible' && cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
          const b = a.getBoundingClientRect();
          if (r.bottom > b.bottom + 0.5 || r.top < b.top - 0.5 || r.right > b.right + 0.5 || r.left < b.left - 0.5) return true;
        }
        return false;
      };
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter(r => r.width > 1 && r.height > 1
        && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth
        && !clipped(r));
      if (!rects.length) return { text, css: getComputedStyle(el).color, offscreen: true };
      const counts = new Map();
      const px = [];
      for (const r of rects) {
        const d = cx.getImageData(Math.round(r.left * scale), Math.round(r.top * scale),
          Math.max(1, Math.round(r.width * scale)), Math.max(1, Math.round(r.height * scale))).data;
        for (let i = 0; i < d.length; i += 4) {
          const p = [d[i], d[i + 1], d[i + 2]];
          px.push(p);
          const k = p.join(',');
          counts.set(k, (counts.get(k) || 0) + 1);
        }
      }
      const ground = [...counts.entries()].sort((a, c) => c[1] - a[1])[0][0].split(',').map(Number);
      let ink = ground, best = -1;
      for (const p of px) { const q = Math.abs(lum(p) - lum(ground)); if (q > best) { best = q; ink = p; } }
      return { text, css: getComputedStyle(el).color, ground: `rgb(${ground})`, ink: `rgb(${ink})`, ratio: +ratio(ink, ground).toFixed(2) };
    }, { b64: shot, panelExpr: PANEL, idx: i });
    if (row) rows.push(row);
  }
  return rows;
}

/**
 * Opens every collapsed section in the panel. The Typography section is shut
 * by default, and a label nobody can see is a label nobody has measured — the
 * two font labels are exactly the ones the shared primitive was breaking.
 */
async function expandAll(page) {
  for (let i = 0; i < 6; i++) {
    const opened = await page.evaluate(`(() => { const p = ${PANEL}; if (!p) return 0;
      const shut = [...p.querySelectorAll('p')].filter(e => (e.innerText || '').includes('\u25B6'));
      shut.forEach(e => e.click());
      return shut.length; })()`);
    if (!opened) break;
    await page.waitForTimeout(500);
  }
}

async function surface(page, name, expect) {
  await expandAll(page);
  const rows = await measureLabels(page);
  console.log(`  · ${name}: ${rows.length} label(s)`);
  for (const want of expect) {
    const hit = rows.find(r => r.text.toUpperCase() === want.toUpperCase());
    check(`${name}: "${want}" is present`, !!hit, hit ? `${hit.ratio}:1` : 'not rendered');
  }
  for (const r of rows) {
    if (r.offscreen) { check(`${name}: "${r.text}" could be brought on screen`, false, `clipped or off-viewport — css ${r.css}`); continue; }
    check(`${name}: "${r.text}" reads at ${r.ratio}:1`, r.ratio >= FLOOR, `${r.ink} on ${r.ground} — css ${r.css}`);
  }
  return rows;
}

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 900, seed });
const page = await ctx.newPage();
await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
await page.waitForTimeout(7000);

console.log('\n  The builder right panel, measured from paint\n');

// ── the three tabs, before any block is selected ────────────────────────────
for (const [tab, expect] of [['Design', ['Heading font', 'Body font']], ['Content', ['Hero photo']]]) {
  await page.getByRole('button', { name: tab, exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await surface(page, `${tab} tab`, expect);
}
// SETTINGS IS SWEPT BUT NOT EXPECTED TO CARRY ONE. Its section headings are
// SLabel, a <p> at rgba(255,255,255,0.4), and its single FLabel is inside the
// password gate, which is off until a couple turns it on. Zero labels here is
// the truth about the surface rather than a miss — so the sweep runs (a label
// that appears later is measured like any other) and nothing asserts a count.
await page.getByRole('button', { name: 'Settings', exact: true }).first().click().catch(() => {});
await page.waitForTimeout(1500);
await surface(page, 'Settings tab', []);

// ── the block editor, on a heading ──────────────────────────────────────────
await page.getByRole('button', { name: 'Edit Heading' }).first().click({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(2000);
const heading = await surface(page, 'block editor (heading)', ['Text color', 'Background', 'Size', 'Alignment', 'Spacing']);

// ── and on a quote, the only type that shows Style ──────────────────────────
await page.evaluate(() => document.querySelector('[aria-label="Close"]')?.click());
await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'Edit Quote' }).first().click({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(2000);
await surface(page, 'block editor (quote)', ['Style']);

// ── the custom text color paints ────────────────────────────────────────────
//
// PRESENCE FIRST: a picker that is not there cannot fail a color assertion,
// and "the words are not #7B2D8E" is true of a page with no picker at all.
const picker = page.getByLabel('Custom text color');
const present = await picker.count();
check('the custom text color picker is beside the swatches', present === 1, `${present} found`);
if (present === 1) {
  await picker.fill('#7b2d8e');
  await page.waitForTimeout(1800);
  const painted = await page.evaluate(() => {
    const q = [...document.querySelectorAll('[aria-label="Edit Quote"]')][0];
    if (!q) return 'no quote block';
    // THE ELEMENT THAT OWNS THE TEXT NODE. `find(e => e.innerText.includes(...))`
    // returns the outermost wrapper, which inherits from the page rather than
    // from the block — it read rgb(10,10,10) for a quote that was painting
    // #7B2D8E perfectly, and would have reported the feature broken.
    const el = [...q.querySelectorAll('*')]
      .find(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.includes('Words worth repeating')));
    return el ? getComputedStyle(el).color : 'no text found';
  });
  check('  and the words on the canvas are that color', painted === 'rgb(123, 45, 142)', painted);
}

await browser.close();

const failed = results.filter(r => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
