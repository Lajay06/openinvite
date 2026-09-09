/* global document, getComputedStyle, Image, innerWidth, innerHeight */
/**
 * THE SEATING WORKSPACE: A LEFT RAIL AT THE SIDEBAR'S SCALE, AND A GRID THAT
 * REACHES THE EDGE OF THE FRAME AT EVERY ZOOM.
 *
 * ── (a) THE RAIL ────────────────────────────────────────────────────────────
 *
 * "Venue assets" and "Basic shapes" head a list of rows in a left rail, which
 * is what the sidebar's group labels do four inches to their left. They
 * carried NO fontSize at all, so they inherited 16px and rendered larger than
 * every row beneath them AND larger than the panel's own header — the one
 * piece of type in the workspace with no scale decision behind it was the
 * loudest thing in it.
 *
 * The assertion is RELATIVE, not a hard-coded 10px. It reads the sidebar's own
 * group label at run time and requires the panel's to match it. A guard
 * pinning the number would go green on a panel that had drifted away from a
 * sidebar which had itself moved; this one says "the same as the sidebar",
 * which is the actual ruling.
 *
 * ── (b) THE GRID ────────────────────────────────────────────────────────────
 *
 * The dot pattern was painted on the canvas div, which is 1400 wide and scales
 * with the zoom. At 0.4 the canvas covers 40% of its own width and the rest of
 * the frame — most of what a couple is looking at — was bare. The grid did not
 * fade at the edge; it stopped, at a hard line partway across the workspace.
 *
 * MEASURED FROM PAINT, AT THE EDGES, AT THREE ZOOMS. A patch of grid is a
 * patch with more than one color in it; bare frame is uniform. So each corner
 * of the visible frame is sampled and required to be non-uniform. The corners
 * are the whole point: the middle of the frame was never the broken part, and
 * a guard that sampled the middle would have passed on every build this fixes.
 *
 * Three zooms because the failure is zoom-shaped: minimum is where it was
 * worst, maximum is where a fix that over-corrected would tile to noise, and
 * 1.0 is the state nobody would have noticed breaking.
 *
 * Usage: npm run test:seating-canvas  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 900 });
const page = await ctx.newPage();
await page.goto(`${BASE}/Seating`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
await page.waitForTimeout(6000);

console.log('\n  The seating workspace\n');

// ── (a) the rail is at the sidebar's scale ──────────────────────────────────
const type = await page.evaluate(() => {
  const byText = (t) => [...document.querySelectorAll('span')].find(s => s.textContent.trim() === t);
  const read = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { size: parseFloat(cs.fontSize), weight: +cs.fontWeight, height: Math.round(el.getBoundingClientRect().height) };
  };
  // The sidebar's own group label and nav row, read live rather than assumed.
  const nav = document.querySelector('nav') || document.body;
  const group = [...nav.querySelectorAll('span')]
    .map(s => ({ s, cs: getComputedStyle(s) }))
    .find(({ s, cs }) => ['Planning', 'Guests', 'Finances', 'Extras'].includes(s.textContent.trim()) && +cs.fontWeight >= 700);
  const row = [...nav.querySelectorAll('span')].find(s => s.textContent.trim() === 'Guest list');

  const panel = byText('Layout items')?.closest('div')?.parentElement;
  const panelText = panel
    ? [...panel.querySelectorAll('span, button, p')]
        .filter(e => (e.textContent || '').trim() && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
        .map(e => ({ text: e.textContent.trim().slice(0, 24), size: parseFloat(getComputedStyle(e).fontSize) }))
    : [];
  return {
    sidebarGroup: read(group?.s), sidebarRow: read(row),
    venueAssets: read(byText('Venue assets')), basicShapes: read(byText('Basic shapes')),
    panelText,
  };
});

check('the sidebar\'s own group label was read', !!type.sidebarGroup, type.sidebarGroup ? `${type.sidebarGroup.size}px / ${type.sidebarGroup.weight}` : 'not found');
check('  and its nav row', !!type.sidebarRow, type.sidebarRow ? `${type.sidebarRow.size}px` : 'not found');
for (const [name, got] of [['Venue assets', type.venueAssets], ['Basic shapes', type.basicShapes]]) {
  check(`"${name}" is present`, !!got, got ? `${got.size}px / ${got.weight}` : 'not rendered');
  if (got && type.sidebarGroup) {
    check(`  "${name}" is the sidebar group label's size`, got.size === type.sidebarGroup.size, `${got.size}px vs ${type.sidebarGroup.size}px`);
    check(`  "${name}" is the sidebar group label's weight`, got.weight === type.sidebarGroup.weight, `${got.weight} vs ${type.sidebarGroup.weight}`);
  }
}
if (type.sidebarRow) {
  const tooBig = type.panelText.filter(t => t.size > type.sidebarRow.size);
  check(`nothing in the rail is larger than a sidebar row (${type.sidebarRow.size}px)`, tooBig.length === 0,
    tooBig.length ? tooBig.map(t => `"${t.text}" ${t.size}px`).join(', ') : `${type.panelText.length} pieces of text checked`);
}

// ── (b) the grid reaches the edge, at every zoom ─────────────────────────────
const zoomTo = async (target) => {
  const label = () => page.evaluate(() => {
    const s = [...document.querySelectorAll('span')].find(x => /^\d+%$/.test(x.textContent.trim()));
    return s ? parseInt(s.textContent, 10) / 100 : null;
  });
  const button = target === 'out' ? /zoom out/i : /zoom in/i;
  for (let i = 0; i < 14; i++) {
    const before = await label();
    await page.getByRole('button', { name: button }).first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(220);
    if (await label() === before) break;
  }
  await page.waitForTimeout(700);
  return label();
};

/** Non-uniform patches at the four corners of the visible frame. */
async function gridCoverage(page) {
  const shot = (await page.screenshot()).toString('base64');
  return page.evaluate(async (b64) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0);
    const scale = img.width / innerWidth;

    // The scrolling frame: the canvas div's own parent.
    const canvas = [...document.querySelectorAll('div')].find(d => /scale\(/.test(getComputedStyle(d).transform === 'none' ? '' : d.style.transform || ''));
    const frame = canvas && canvas.parentElement;
    if (!frame) return { error: 'frame not found' };
    const b = frame.getBoundingClientRect();
    // CLAMPED TO WHAT THE SCREENSHOT ACTUALLY HOLDS. The frame is 648 tall and
    // starts around y=425, so its own bottom edge is below a 900px viewport —
    // sampling there read one color and called a working grid broken. The
    // corners that matter are the corners of the visible frame.
    const r = {
      left: Math.max(0, b.left), top: Math.max(0, b.top),
      right: Math.min(innerWidth, b.right), bottom: Math.min(innerHeight, b.bottom),
    };
    r.width = r.right - r.left; r.height = r.bottom - r.top;
    if (r.width < 80 || r.height < 80) return { error: `frame barely visible: ${Math.round(r.width)}x${Math.round(r.height)}` };

    const P = 40; // patch side, in CSS px
    const spots = {
      'top left': [r.left + 6, r.top + 6],
      'top right': [r.right - P - 6, r.top + 6],
      'bottom left': [r.left + 6, r.bottom - P - 6],
      'bottom right': [r.right - P - 6, r.bottom - P - 6],
      centre: [r.left + r.width / 2 - P / 2, r.top + r.height / 2 - P / 2],
    };
    const out = {};
    for (const [name, [x, y]] of Object.entries(spots)) {
      const d = cx.getImageData(Math.round(x * scale), Math.round(y * scale), Math.round(P * scale), Math.round(P * scale)).data;
      const seen = new Set();
      for (let i = 0; i < d.length; i += 4) seen.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      out[name] = seen.size;
    }
    return { frame: [r.width, r.height].map(Math.round), spots: out };
  }, shot);
}

for (const [name, go] of [['minimum', () => zoomTo('out')], ['maximum', () => zoomTo('in')]]) {
  const z = await go();
  const cov = await gridCoverage(page);
  if (cov.error) { check(`${name} zoom: the canvas frame was found`, false, cov.error); continue; }
  check(`at ${name} zoom (${Math.round(z * 100)}%) the frame was measured`, true, `${cov.frame[0]}x${cov.frame[1]}`);
  for (const [spot, colors] of Object.entries(cov.spots)) {
    // A dotted patch has at least the ground, the dot and the antialiasing
    // between them. Bare frame is one color.
    check(`  ${name} zoom: the grid reaches the ${spot}`, colors >= 3, `${colors} distinct color(s) in a 40px patch`);
  }
}

await browser.close();
const failed = results.filter(r => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
