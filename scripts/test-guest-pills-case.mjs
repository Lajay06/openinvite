/* global document, getComputedStyle */
/**
 * A PILL SAYS THE WORDS, NOT THE VALUE.
 *
 * Owner, Run 4 S2: the guest list's category pills read "family" while the
 * tags beside them read "Family".
 *
 * ── IT WAS NOT A CASING BUG ────────────────────────────────────────────────
 *
 * The guest list was the only pill in the DataTable family rendering the
 * STORED VALUE — `guest.category.replace(/_/g, ' ')`, twice. Every sibling
 * renders a declared label: the schedule's Type pill takes WHEN_LABEL[e.when]
 * (ScheduleTable.jsx:105), and the guest list's own CATEGORY_OPTIONS declares
 * "Family", "Partner's family" and the rest FOUR LINES ABOVE the render that
 * ignored them.
 *
 * That distinction is the whole reason this guard asserts the exact declared
 * strings rather than "starts with a capital". A sentence-case helper alone
 * turns `partners_family` into "Partners family"; the apostrophe exists only
 * in the label, and a guard that checked the capital would have passed the
 * wrong words.
 *
 * ── PAINTED TEXT, NOT innerText ────────────────────────────────────────────
 *
 * The words are read from a Range over the pill's own text node and the
 * capital confirmed against what is actually laid out, because a
 * `text-transform: capitalize` would make innerText lie: the DOM would still
 * say "family" while the screen said "Family", and the opposite mistake —
 * a transform hiding a raw value — is exactly the shape being fixed.
 *
 * TAGS ARE OUT OF SCOPE. They are whatever the couple typed.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4204';

// The seed's four guests, and the label each one's category declares.
// Written out rather than imported from the page: a guard that derives its
// expectation from the file under test agrees with any mistake in it.
const EXPECTED = ['Family', "Partner's family", 'Friends', 'Colleagues'];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 950 });
const page = await ctx.newPage();
await page.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(8000);

/**
 * Every category pill, as painted: the text under a Range over the leaf text
 * node, plus the transform that would change what the eye sees.
 */
const pills = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('span')) {
    const cs = getComputedStyle(el);
    if (cs.borderRadius !== '999px') continue;
    if (el.children.length) continue;
    const node = el.firstChild;
    if (!node || node.nodeType !== 3) continue;
    const r = document.createRange();
    r.selectNodeContents(el);
    const rect = r.getBoundingClientRect();
    if (!rect.width) continue;
    out.push({ text: node.nodeValue, transform: cs.textTransform, width: Math.round(rect.width) });
  }
  return out;
});

// PRESENCE BEFORE PROPERTIES: without rows there is nothing to be right about.
const found = EXPECTED.filter((l) => pills.some((p) => p.text === l));
check('the guest list painted its category pills', pills.length > 0, `${pills.length} pill(s) laid out`);
check(`  and all four categories are among them`, found.length === EXPECTED.length,
  found.length === EXPECTED.length ? found.join(' · ') : `only ${found.length}/4: ${found.join(' · ') || 'none'}`);

for (const label of EXPECTED) {
  const hit = pills.find((p) => p.text === label);
  check(`  "${label}" is painted exactly as declared`, !!hit,
    hit ? `${hit.width}px wide` : `not painted; pills read: ${pills.map((p) => p.text).slice(0, 6).join(' · ')}`);
}

// A RAW VALUE CANNOT HIDE BEHIND A TRANSFORM. `text-transform: capitalize`
// would paint "Partners Family" over a stored "partners_family" and read as
// fixed from a screenshot; the DOM text is what must already be right.
const raw = pills.filter((p) => /_/.test(p.text) || /^[a-z]/.test(p.text));
check('  and no pill is painting a stored value', raw.length === 0,
  raw.length ? raw.map((p) => `"${p.text}"`).join(', ') : 'every pill carries words');
const transformed = pills.filter((p) => p.transform !== 'none');
check('  and none of them leans on text-transform', transformed.length === 0,
  transformed.length ? transformed.map((p) => `"${p.text}" ${p.transform}`).join(', ') : 'no transform on any pill');

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
