/* global document, getComputedStyle */
/**
 * THE CHEVRON IS THE TABLE'S, NOT ONE PAGE'S.
 *
 * The guest list stopped using a detail popup a while ago: a chevron in the
 * first cell, and the detail as a ROW OF THE SAME TABLE. A popup covers the
 * list you were reading; a row pushes it down and stays anchored to the thing
 * it describes. That is the standard now, so it lives in the shared shell —
 * one chevron, one aria-label convention, one detail row — and Vendors is the
 * first page to take it.
 *
 * ── WHY THE DETAIL ROW IS ASSERTED TO BE A ROW ──────────────────────────────
 *
 * "Clicking the chevron shows more" is true of a popup too. So this checks the
 * SHAPE: the detail appears inside the same <table> as the row that opened it,
 * as a <tr>, and NO dialog is on the page afterwards. Those three together are
 * what "inline, not a popup" means, and each one alone can be satisfied by the
 * thing the ruling replaced.
 *
 * ── AND MANAGE SURVIVES ─────────────────────────────────────────────────────
 *
 * The package keeps "Manage" in the row menu: the chevron is how a couple
 * READS a vendor, Manage is how they WORK on one. A migration that quietly
 * dropped it would look like a success in every other check here.
 *
 * ── R37 ─────────────────────────────────────────────────────────────────────
 *
 * VendorList had its own <Table>, its own SortableHead — with a comment
 * arguing the copy was worth keeping — and its own row markup. It now goes
 * through DataTable, and the guard asserts the shell is what renders it, by
 * looking for the shell's own `data-row-id` on every row.
 *
 * Usage: npm run test:table-row-expand  (needs a server; CAPTURE_BASE_URL)
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

console.log('\n  The row that opens\n');

// ── Vendors ─────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/Vendors`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
await page.waitForTimeout(6000);

const before = await page.evaluate(() => ({
  rows: document.querySelectorAll('table tbody tr[data-row-id]').length,
  // BY LABEL, NOT BY aria-expanded. Radix's row-menu trigger carries
  // aria-expanded too, so counting that read 8 chevrons in 4 rows and
  // called a correct table broken.
  chevrons: [...document.querySelectorAll('table tbody tr[data-row-id] button')]
    .filter(b => /^Show .+ details$/.test(b.getAttribute('aria-label') || '')).length,
  bodyRows: document.querySelectorAll('table tbody tr').length,
  names: [...document.querySelectorAll('table tbody tr[data-row-id]')]
    .map(r => (r.innerText || '').split('\n').map(t => t.trim()).find(Boolean) || '?').slice(0, 4),
}));
// PRESENCE BEFORE PROPERTIES: an empty table has no rows without a chevron.
check('the vendor list renders through the shared shell', before.rows >= 3,
  `${before.rows} row(s) carrying the shell's data-row-id — ${before.names.join(', ')}`);
check('  and every row has a chevron', before.chevrons === before.rows,
  `${before.chevrons} of ${before.rows}`);

// PRESENCE BEFORE PROPERTIES, IN THE GUARD ITSELF. With the chevron removed
// this threw on `getAttribute` of nothing and the run died mid-report — a
// guard that crashes tells you less than one that fails.
const first = page.locator('table tbody tr[data-row-id]').first()
  .getByRole('button', { name: /^Show .+ details$/ });
const labelClosed = await first.count() ? await first.getAttribute('aria-label') : null;
check('  whose label says what it will do', /^Show .+ details$/.test(labelClosed || ''), labelClosed || 'no chevron to read');

if (labelClosed) {
  await first.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
}

const after = await page.evaluate(() => {
  const opener = [...document.querySelectorAll('table tbody tr[data-row-id] button[aria-expanded="true"]')]
    .find(b => /details$/.test(b.getAttribute('aria-label') || ''));
  const row = opener && opener.closest('tr');
  const next = row && row.nextElementSibling;
  return {
    opened: !!opener,
    label: opener ? opener.getAttribute('aria-label') : null,
    // THE DETAIL ROW, NOT MERELY THE NEXT ROW. Plant B removed the detail
    // from the shell entirely and this still passed: the next sibling was the
    // next VENDOR, which is also a <tr> in the same table. A detail row is
    // identified by what makes it one — it carries no data-row-id, because it
    // is not a record, and its single cell spans the table.
    detailIsRow: !!(next && next.tagName === 'TR'
      && !next.hasAttribute('data-row-id')
      && next.children.length === 1
      && Number(next.children[0].getAttribute('colspan') || 1) > 1),
    sameTable: !!(next && row.closest('table') === next.closest('table')),
    detailText: next ? next.innerText.replace(/\s+/g, ' ').trim().slice(0, 60) : '',
    dialogs: document.querySelectorAll('[role="dialog"]').length,
    bodyRows: document.querySelectorAll('table tbody tr').length,
  };
});
check('the chevron opens', after.opened, after.label || 'aria-expanded never became true');
check('  its label flips to the way back', /^Hide .+ details$/.test(after.label || ''), after.label || 'none');
check('  the detail is a row', after.detailIsRow,
  after.detailIsRow ? after.detailText : 'the row after the vendor is another record, not a detail');
check('  in the same table as the vendor', after.sameTable, after.sameTable ? 'same <table>' : 'a different table');
check('  and it is NOT a popup', after.dialogs === 0, `${after.dialogs} dialog(s) on the page`);
check('  the table grew by exactly one row', after.bodyRows === before.bodyRows + 1,
  `${before.bodyRows} -> ${after.bodyRows}`);

// It closes again. A one-way chevron is a worse popup.
await page.getByRole('button', { name: /^Hide .+ details$/ }).first().click({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(700);
const closed = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
check('  and closes again', closed === before.bodyRows, `${closed} rows`);

// ── Manage survives ─────────────────────────────────────────────────────────
await page.locator('table tbody tr[data-row-id]').first().locator('button').last().click({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(800);
const menu = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].map(i => i.innerText.trim()));
check('the row menu still offers Manage', menu.includes('Manage'), menu.join(', ') || 'no menu opened');
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

// ── the guest list, which had this first, still has it ──────────────────────
await page.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
await page.waitForTimeout(6000);
const guests = await page.evaluate(() => {
  const rows = document.querySelectorAll('table tbody tr');
  const chev = [...document.querySelectorAll('table tbody tr button')]
    .filter(b => /show|hide/i.test(b.getAttribute('aria-label') || ''));
  return { rows: rows.length, chev: chev.length };
});
check('the guest list still opens its own rows', guests.chev > 0,
  `${guests.chev} chevron(s) across ${guests.rows} row(s)`);

await browser.close();
const failed = results.filter(r => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
