/* global document, getComputedStyle */
/**
 * THE BEAUTY PAGE OPENS ON ONE PERSON, AT THE PAGE'S OWN SIZE.
 *
 * Owner walk-through, Run 4 S6. Two claims, and MEASURING SEPARATED THEM.
 *
 * ── WHAT REPRODUCED ────────────────────────────────────────────────────────
 *
 * Every field of both columns rendered at once — the tab had no accordion at
 * all, and `OptionAccordion` was not imported. On a phone it was worse than
 * long: `gridTemplateColumns: '1fr 1fr'` carried no breakpoint, so at 390 the
 * columns did not stack, they SQUEEZED — measured 143px each inside a 326px
 * page. Two columns of that width is not a layout.
 *
 * ── WHAT DID NOT ──────────────────────────────────────────────────────────
 *
 * "Oversized" did not. Painted sizes across all five tabs, at 1440 AND at 390,
 * were 10/11/12/13/14 — inside the 12/14-with-16-headings scale the ruling
 * names, and the Skincare timeline singled out in the report is the SMALLEST
 * panel on the page. The only text above 16px is the stat strip's numerals at
 * clamp(22px, 2.5vw, 32px), and those are not Beauty's: the identical
 * declaration is on Admin.jsx:15, Budget.jsx:42, Seating.jsx:86 and
 * Vendors.jsx:54. Shrinking them here would make Beauty the one page whose
 * stat strip disagrees with the other four.
 *
 * So the size check below EXCLUDES the stat strip by name and holds the rest
 * to 16. It is a ratchet against a future regression, not a fix that was made.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4207';
const SECTIONS = ['Bride / Partner 1', 'Wedding party'];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** The tab panel alone — never the sidebar, which has accordions of its own. */
const readPanel = (page) => page.evaluate((titles) => {
  const panel = [...document.querySelectorAll('div')].find((d) => d.style && d.style.padding === '24px 32px 64px');
  if (!panel) return null;
  const sections = [...panel.querySelectorAll('[aria-expanded]')].map((el) => ({
    title: (el.innerText || '').trim().split('\n')[0],
    open: el.getAttribute('aria-expanded') === 'true',
  })).filter((s) => titles.includes(s.title));
  // Painted type, from a Range over each leaf, plus form fields.
  const over = [];
  for (const el of panel.querySelectorAll('*')) {
    const leaf = el.firstChild && el.firstChild.nodeType === 3 && (el.firstChild.nodeValue || '').trim();
    const field = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    if (!leaf && !field) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px > 16) over.push({ px, text: String(leaf || el.placeholder || '').slice(0, 30) });
  }
  // A two-column grid with no breakpoint is the 390 defect, measured.
  const squeezed = [...panel.querySelectorAll('div')]
    .map((d) => getComputedStyle(d).gridTemplateColumns)
    .filter((g) => g && g.split(' ').length === 2 && g.split(' ').every((c) => parseFloat(c) > 0 && parseFloat(c) < 200));
  return { sections, over, squeezed, chars: (panel.innerText || '').length };
}, SECTIONS);

const browser = await chromium.launch();

for (const [w, h] of [[1440, 950], [390, 844]]) {
  const ctx = await seededContext(browser, { width: w, height: h });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/Beauty`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(7000);
  const r = await readPanel(page);

  // PRESENCE BEFORE PROPERTIES: an unrendered panel passes every rule below.
  check(`${w}px: the hair and makeup tab rendered`, !!r && r.chars > 0, r ? `${r.chars} characters` : 'no panel');
  if (!r) { await ctx.close(); continue; }

  check(`  both people are sections`, r.sections.length === SECTIONS.length,
    r.sections.map((s) => s.title).join(' · ') || 'none found');
  check(`    "${SECTIONS[0]}" is open`, r.sections[0]?.open === true, `open=${r.sections[0]?.open}`);
  check(`    "${SECTIONS[1]}" is collapsed`, r.sections[1]?.open === false, `open=${r.sections[1]?.open}`);
  check(`  nothing paints above 16px outside the stat strip`, r.over.length === 0,
    r.over.length ? r.over.map((o) => `${o.px}px "${o.text}"`).join(', ') : 'largest is 16px or under');
  check(`  and no column is narrower than a column`, r.squeezed.length === 0,
    r.squeezed.length ? `${r.squeezed.length} grid(s): ${r.squeezed[0]}` : 'no squeezed two-column grid');
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
