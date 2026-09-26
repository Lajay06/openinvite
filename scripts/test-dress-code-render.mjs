/* global document, getComputedStyle */
/**
 * DRESS CODE, AS A GUEST ACTUALLY SEES IT — at 390 and 1440.
 *
 * Goal 2026-09-25 item 3: "Guard at 390 and 1440." The source-level guard
 * (tests/persistence/dress-code-pills.mjs) proves the precedence and the
 * plumbing; this proves the two things only a browser can:
 *
 *   PILLS RENDER, one per pill, on the event that has them.
 *   THE LEGACY STRING STILL RENDERS, unchanged, on the event that has only it.
 *
 * The fixture is seeded to carry both at once — the ceremony has pills plus a
 * note, the reception has the old single string — so one page proves both
 * halves. A guard that seeded only pills would pass on a build that had
 * silently dropped the fallback, which is the regression that would cost a
 * real couple their page.
 *
 * MEASURED, NOT DECLARED. The text is read off the elements the browser
 * painted, and the pill count comes from the rendered nodes.
 */
import { chromium } from 'playwright';
import { seededContext, PUBLISHED_WEDDING } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4187';
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const PILLS = PUBLISHED_WEDDING.mainCeremony.dressCodePills;
const NOTE = PUBLISHED_WEDDING.mainCeremony.dressCodeNotes;
const LEGACY = PUBLISHED_WEDDING.reception.dressCode;

const browser = await chromium.launch();

for (const [w, h] of [[390, 844], [1440, 950]]) {
  const ctx = await seededContext(browser, { width: w, height: h });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/w/${PUBLISHED_WEDDING.slug}/celebration`,
    { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const seen = await page.evaluate(() => {
    const text = (document.body.innerText || '');
    // Every pill-shaped span the page painted, by its computed radius.
    const pills = [...document.querySelectorAll('span')]
      .filter((el) => {
        const cs = getComputedStyle(el);
        return parseFloat(cs.borderTopLeftRadius) >= 999 && (el.innerText || '').trim();
      })
      .map((el) => (el.innerText || '').trim());
    return { text, pills };
  });

  console.log(`\n  ${w}px:`);
  check('  the celebration page rendered', /Observatory|Long Room/.test(seen.text),
    seen.text.length ? `${seen.text.length} chars` : 'empty');

  for (const pill of PILLS) {
    check(`  the pill "${pill}" is painted`, seen.pills.includes(pill),
      seen.pills.includes(pill) ? 'present' : `pills seen: ${seen.pills.slice(0, 8).join(' · ')}`);
  }
  check('  both ceremony pills render, not just the first',
    PILLS.every((p) => seen.pills.includes(p)), `${PILLS.length} expected`);
  check('  the note renders beneath them', seen.text.includes(NOTE), NOTE);
  check('  and the legacy string still renders on the event that has only it',
    seen.pills.includes(LEGACY), seen.pills.includes(LEGACY) ? LEGACY : 'MISSING — the fallback broke');
  check('  the placeholder never reaches a guest',
    !/Anything guests should know/.test(seen.text), 'editor-only');

  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
