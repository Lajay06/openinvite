/* global document */
/**
 * THE PLANNER'S AMOUNTS GROUP, AND STILL STORE A PLAIN NUMBER.
 *
 * Owner walkthrough 2026-10-08, item 10, and the ruling that followed it:
 * "a text-input variant for the planner's amount fields only. Shows thousands
 * separators when not focused, accepts '50,000', '50000' or '50 000' while
 * typing, stores exactly the number it stores today, empty stays as today.
 * AmountInput's type='number' behaviour is untouched everywhere else."
 *
 * ── WHY THIS IS A BROWSER GUARD AND NOT A SOURCE READ ───────────────────────
 *
 * Two of the three clauses are only true in a browser.
 *
 * "Shows separators" is a rendered value. An `<input type="number">` does not
 * refuse a comma politely — the browser DISCARDS it, and the field's value
 * comes back '' with no error anywhere. A source read can confirm the prop is
 * passed; only a real input can confirm the character survived.
 *
 * "Stores exactly the number it stores today" is a round trip through React
 * state, and the guard reads it the way a couple would: by typing a separated
 * figure into the total and then reading the ALLOCATION SUMMARY underneath,
 * which is computed from `parseFloat(plan.total)`. If "50,000" reached state
 * as "50" — the parseFloat of a comma-bearing string, which is what a naive
 * version of this change would store — the summary says $50 and this guard
 * goes red. That number is the evidence; the field's own display is not,
 * because the field could show anything.
 *
 * ── AND WHY IT TYPES INSTEAD OF SEEDING ─────────────────────────────────────
 *
 * `Budget: []` in the shared seed, and the plan itself lives in
 * WeddingDetails.budget as AES ciphertext the harness does not mint. So the
 * planner renders empty and the guard fills it — which is the stronger test
 * anyway: every clause in the ruling is about what happens when a couple
 * types, and a seeded value would prove only the formatter.
 *
 * Usage: npm run test:budget-separators  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 900, seed: SEED });
const page = await ctx.newPage();

/** An amount field by the aria-label AmountInput builds: "<label> in <symbol>". */
const amount = (label) => page.locator(`input[aria-label^="${label} in "]`).first();

/** type, step and the value currently on screen, read off the real element. */
const fieldState = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  return { type: el.getAttribute('type'), step: el.getAttribute('step'), value: el.value, inputMode: el.inputMode };
}, sel);

/** The allocation summary line, which is computed from the STORED plan. */
const summary = () => page.evaluate(() => {
  const box = document.querySelector('[data-ava-focus="budget"]');
  return box ? box.innerText.replace(/\s+/g, ' ').trim() : '';
});

await page.goto(`${BASE}/Budget`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});

// ── PRESENCE BEFORE PROPERTIES ───────────────────────────────────────────────
// A separator asserted over a planner that never rendered is an empty read
// wearing a pass, and this page waits on an authenticated read before it draws
// anything at all.
await page.getByRole('button', { name: 'Save plan', exact: true }).first()
  .waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
const plannerText = await summary();
const present = plannerText.includes('Total wedding budget') && plannerText.includes('Venue');
check('the planner rendered', present, present ? 'total and the category grid are on screen' : `read "${plannerText.slice(0, 80)}"`);
if (!present) {
  await browser.close();
  console.log('\n  0/1 checks passed\n  1 FAILED');
  process.exit(1);
}

const TOTAL = 'input[aria-label^="Total wedding budget in "]';
const VENUE = 'input[aria-label^="Venue in "]';

// ── THE FIELD IS TEXT, WHICH IS THE ONLY WAY A COMMA SURVIVES ────────────────
const before = await fieldState(TOTAL);
check('the plan total is a text field', before?.type === 'text', `type="${before?.type}"`);
check('  and still offers a numeric keypad', before?.inputMode === 'decimal', `inputMode="${before?.inputMode}"`);
const venueBefore = await fieldState(VENUE);
check('a category field is text too', venueBefore?.type === 'text', `type="${venueBefore?.type}"`);

// ── THE THREE SPELLINGS THE RULING NAMES ─────────────────────────────────────
// Each one is typed, blurred, and then read twice: once off the field, which
// proves the separators are rendered, and once off the summary, which proves
// what actually reached state.
for (const typed of ['50,000', '50000', '50 000']) {
  const field = amount('Total wedding budget');
  await field.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await field.type(typed, { delay: 15 });

  const whileTyping = await fieldState(TOTAL);
  check(`"${typed}" survives on screen as it is typed`, whileTyping?.value === typed, `field reads "${whileTyping?.value}"`);

  await page.keyboard.press('Tab');
  const atRest = await fieldState(TOTAL);
  check('  and reads back grouped once focus leaves', atRest?.value === '50,000', `field reads "${atRest?.value}"`);

  const text = await summary();
  const stored = /Unallocated:\s*\$?([\d,]+)/.exec(text);
  check('  and the number that reached the plan is 50,000', stored?.[1] === '50,000',
    stored ? `summary says Unallocated ${stored[1]}` : `no Unallocated line in "${text.slice(-90)}"`);
}

// ── A CATEGORY, AND THE SUM THAT PROVES IT PARSED ────────────────────────────
// The total is 50,000 from the loop above. 12,500 into Venue must leave 37,500
// unallocated: a figure that can only be reached if BOTH fields stored the
// number and not the string.
const venue = amount('Venue');
await venue.click();
await venue.type('12,500', { delay: 15 });
await page.keyboard.press('Tab');
const venueRest = await fieldState(VENUE);
check('a category field groups the same way', venueRest?.value === '12,500', `field reads "${venueRest?.value}"`);
const afterVenue = await summary();
check('  and the plan allocated 12,500 of 50,000', /Allocated:\s*\$?12,500/.test(afterVenue),
  /Allocated:\s*\$?([\d,]+)/.exec(afterVenue)?.[1] ?? 'no Allocated line');
check('  leaving 37,500 unallocated', /Unallocated:\s*\$?37,500/.test(afterVenue),
  /Unallocated:\s*\$?([\d,]+)/.exec(afterVenue)?.[1] ?? 'no Unallocated line');

// ── EMPTY STAYS AS TODAY ─────────────────────────────────────────────────────
// Not "0". A planner field the couple has not filled shows its placeholder,
// and the summary disappears entirely because the page hides it at total 0.
await venue.click();
await page.keyboard.press('ControlOrMeta+a');
await page.keyboard.press('Backspace');
await page.keyboard.press('Tab');
const venueEmpty = await fieldState(VENUE);
check('cleared to nothing, a category field is empty and not zero', venueEmpty?.value === '', `field reads "${venueEmpty?.value}"`);

// ── AND EVERY OTHER MONEY FIELD IS UNTOUCHED ─────────────────────────────────
// The ruling's third clause. Both of these are AmountInput call sites that did
// NOT ask for the variant, so they must still be the numeric input they were:
// a text field here would mean the default had flipped.
const UNCHANGED = [
  { page: '/Budget',  open: '+ Add expense', sel: '#budgeted_amount', what: 'the expense form\'s budgeted amount' },
  { page: '/Budget',  open: '+ Add expense', sel: '#actual_amount',   what: 'the expense form\'s actual amount' },
  { page: '/Vendors', open: '+ Add vendor',  sel: '#quoted_price',    what: 'the vendor form\'s quoted price' },
];
let at = '/Budget';
for (const u of UNCHANGED) {
  if (at !== u.page) {
    await page.goto(`${BASE}${u.page}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    at = u.page;
  }
  if (!(await page.locator(u.sel).count())) {
    const opener = page.getByRole('button', { name: u.open, exact: true }).first();
    await opener.waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
    await opener.click({ timeout: 8000 }).catch(() => {});
    await page.locator(u.sel).waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }
  const s = await fieldState(u.sel);
  check(`${u.what} is still type="number"`, s?.type === 'number', s ? `type="${s.type}" step="${s.step}"` : 'field not found');
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
