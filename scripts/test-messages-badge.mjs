/* global document */
/**
 * THE UNREAD COUNT IS VISIBLE, on both sidebars.
 *
 * Goal 2026-09-27 item 4: "Wire unreadMessagesCount (src/Layout.jsx:456) to a
 * badge on the sidebar Messages item, or delete it. Wire it."
 *
 * The source guard (tests/persistence/messages-honest.mjs) proves the prop
 * reaches both sidebars and that the badge is only painted above zero. This
 * proves the one thing only a browser can: that a couple actually SEES it.
 *
 * MEASURED AS PAINTED, NOT AS PRESENT — and that distinction is the whole
 * reason this file exists. The desktop sidebar is `hidden lg:flex`, so it stays
 * in the DOM at phone width: querySelectorAll finds its badge at 390px on a
 * build where the mobile sheet renders no badge at all. Every check below reads
 * a bounding box or Playwright visibility, never a node count.
 *
 * The fixture seeds two notes, one unread and one read, so the badge must say
 * exactly "1" — a guard against a count that renders the total, which would be
 * right for the wrong reason on a fixture where everything is unread.
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4218';
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** What the fixture's own rows say the badge should read. */
const EXPECTED = String((SEED.GuestMessage || []).filter((m) => !m.read).length);

const browser = await chromium.launch();

// ── desktop ──────────────────────────────────────────────────────────────────
{
  const ctx = await seededContext(browser, { width: 1440, height: 950 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);

  console.log('\n  1440px — the desktop sidebar:');
  check('  the dashboard rendered', /Messages/.test(await page.evaluate(() => document.body.innerText || '')),
    'sidebar present');

  const badge = page.locator('span[aria-label$="unread"]').first();
  const visible = await badge.isVisible().catch(() => false);
  check('  the badge is painted, not merely present', visible, visible ? 'visible' : 'in the DOM only');

  if (visible) {
    const text = (await badge.innerText()).trim();
    check(`  it reads the unread count, not the total`, text === EXPECTED,
      `"${text}" — ${EXPECTED} of ${(SEED.GuestMessage || []).length} notes are unread`);
    check('  and says so to a screen reader',
      (await badge.getAttribute('aria-label')) === `${EXPECTED} unread`, 'aria-label');

    // ON THE MESSAGES ROW, not floating somewhere in the nav. The row is the
    // element that carries the label, so containment is the assertion.
    const onRow = await page.locator('div[aria-label="Messages"] span[aria-label$="unread"]').count();
    check('  it sits on the Messages row', onRow === 1, `${onRow} found inside that row`);

    const box = await badge.boundingBox();
    check('  and it has real size', !!box && box.width > 0 && box.height > 0,
      box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'no box');
  }
  await ctx.close();
}

// ── mobile ───────────────────────────────────────────────────────────────────
{
  const ctx = await seededContext(browser, { width: 390, height: 844 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);

  console.log('\n  390px — the mobile nav sheet:');

  // BEFORE THE SHEET IS OPENED, NOTHING IS VISIBLE. This is the check that
  // would have caught the trap described in the header: the desktop badge is
  // still in the DOM here, and a node count would have passed on it.
  const leaked = await page.locator('span[aria-label$="unread"]').first().isVisible().catch(() => false);
  check('  nothing from the desktop sidebar shows through at phone width', !leaked,
    leaked ? 'the hidden sidebar is painting' : 'hidden');

  await page.getByRole('button', { name: 'Open menu' }).click().catch(() => {});
  await page.waitForTimeout(1500);

  const badge = page.locator('span[aria-label$="unread"]:visible').first();
  const visible = await badge.isVisible().catch(() => false);
  check('  the badge is painted in the sheet', visible, visible ? 'visible' : 'not painted');

  if (visible) {
    const text = (await badge.innerText()).trim();
    check('  reading the same count', text === EXPECTED, `"${text}"`);
    const box = await badge.boundingBox();
    check('  with real size', !!box && box.width > 0 && box.height > 0,
      box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'no box');
  }
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
