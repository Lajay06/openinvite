/* global document, getComputedStyle */
/**
 * THE EDGE OF A ROW SAYS WHETHER YOU HAVE ANSWERED IT.
 *
 * "Tell us about your celebration" is three accordion sections — Style,
 * Ceremony type & faith, Vibe — and every one of them drew the same
 * hardcoded `rgba(10,10,10,0.12)` in every state. Open, answered, untouched:
 * identical. A couple part-way through could not tell from the page which
 * rows were done.
 *
 *   untouched              the border token
 *   open                   #0A0A0A
 *   answered and collapsed borderStrong
 *
 * ── PAINTED, NOT DECLARED ──────────────────────────────────────────────────
 *
 * The colour is read with getComputedStyle off the element the browser
 * actually painted, and compared to tokens resolved from the same source the
 * component imports. A guard that re-typed the rgba strings would pass on a
 * component that had drifted from the tokens, which is the defect it exists
 * to catch — the three sections drifted because each held its own copy.
 *
 * ── ALL THREE, IN EVERY STATE THEY CAN REACH ───────────────────────────────
 *
 * The rule is "the same on all three", so the assertion is per section per
 * state rather than a spot check: a fix applied to Style and not to Vibe would
 * pass any single-section test.
 */
import { chromium } from 'playwright';
import { seededContext, ONBOARDING_SEED, ONBOARDING_USER } from './lib/renderHarness.mjs';
import { color } from '../src/styles/tokens.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4195';
const SECTIONS = ['Style', 'Ceremony type & faith', 'Vibe'];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** rgba(10, 10, 10, 0.12) and rgba(10,10,10,0.12) are the same colour. */
const norm = (c) => String(c).replace(/\s+/g, '').toLowerCase();
const EXPECT = {
  open: norm('rgb(10,10,10)'),
  answered: norm(color.borderStrong),
  untouched: norm(color.border),
};

const browser = await chromium.launch();

for (const width of [390, 1440]) {
  console.log(`\n  The celebration accordions at ${width}\n`);
  const ctx = await seededContext(browser, { width, height: 950, seed: ONBOARDING_SEED, user: ONBOARDING_USER });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'Get started', exact: true }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByPlaceholder('Your name').fill('Ada').catch(() => {});
  await page.getByPlaceholder("Partner's name").fill('Alan').catch(() => {});
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Continue/ }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^We haven't set a date yet/ }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^Not sure yet/ }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // A CARD SELECTS; CONTINUE ADVANCES. Clicking "Celebration" marks the choice
  // and reveals Continue — it does not move on by itself, which is what the
  // first version of this assumed and why it never reached the accordions.
  await page.getByRole('button', { name: 'Celebration', exact: false }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^Continue/ }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2200);

  const here = await page.getByRole('button', { name: /^Vibe$/ }).count() > 0;
  // PRESENCE BEFORE PROPERTIES: an absent accordion has no wrong border.
  check('the celebration step was reached', here, here ? 'three sections to read' : 'the wizard did not get here');
  if (!here) { await ctx.close(); continue; }

  /** The painted bottom border of each section, with the state it claims. */
  const read = () => page.evaluate((titles) => {
    const out = {};
    for (const t of titles) {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.innerText || '').trim() === t);
      const row = btn?.closest('[data-section-state]');
      if (!row) { out[t] = null; continue; }
      out[t] = {
        state: row.getAttribute('data-section-state'),
        colour: getComputedStyle(row).borderBottomColor,
        width: getComputedStyle(row).borderBottomWidth,
      };
    }
    return out;
  }, titles());

  function titles() { return SECTIONS; }

  // ── an empty section says so calmly ───────────────────────────────────────
  // "No info" is a status code, not a sentence. A couple reading it has done
  // nothing wrong and is being told they are missing something.
  const noInfo = await page.getByText('No info').count();
  const calm = await page.getByText('Nothing added yet').count();
  check('  an empty section reads "Nothing added yet"', noInfo === 0 && calm > 0,
    `"No info" x${noInfo}, "Nothing added yet" x${calm}`);

  // ── every section starts untouched ────────────────────────────────────────
  let seen = await read();
  for (const t of SECTIONS) {
    const s = seen[t];
    check(`  "${t}" untouched carries the border token`,
      !!s && s.state === 'untouched' && norm(s.colour) === EXPECT.untouched && s.width === '1px',
      s ? `${s.state}, ${s.colour}, ${s.width}` : 'section not found');
  }

  // ── the one you are answering is black ────────────────────────────────────
  for (const t of SECTIONS) {
    await page.getByRole('button', { name: t, exact: true }).first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
    seen = await read();
    const s = seen[t];
    check(`  "${t}" open is black`,
      !!s && s.state === 'open' && norm(s.colour) === EXPECT.open,
      s ? `${s.state}, ${s.colour}` : 'section not found');
    // and the other two are not black at the same time
    const others = SECTIONS.filter((x) => x !== t).map((x) => seen[x]);
    check(`    and the other two are not`, others.every((o) => o && norm(o.colour) !== EXPECT.open),
      others.map((o, i) => `${SECTIONS.filter((x) => x !== t)[i]} ${o?.colour}`).join(', '));
  }

  // ── answered and collapsed is the stronger grey ───────────────────────────
  // Vibe is open from the loop above; choose a pill in it, then collapse it.
  const pill = page.getByRole('button').filter({ hasNotText: /Style|Ceremony type|Vibe|Back|Continue/ });
  if (await pill.count() > 0) await pill.first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Vibe', exact: true }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  seen = await read();
  const v = seen.Vibe;
  check('  "Vibe" answered and collapsed is the stronger grey',
    !!v && v.state === 'answered' && norm(v.colour) === EXPECT.answered,
    v ? `${v.state}, ${v.colour}` : 'section not found');
  check('    and it is not the untouched token any more', !!v && norm(v.colour) !== EXPECT.untouched,
    `answered ${v?.colour} vs untouched ${color.border}`);

  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
