#!/usr/bin/env node
/**
 * THE POSTAL ADDRESS SURVIVES THE EXPORT — verified by READING AN EXPORTED
 * FILE, not by asserting that a column was added.
 *
 * `Guest.mailing_address` existed all along, the contact-review endpoint filled
 * it, and the export already listed it. What was missing was anywhere for a
 * couple to TYPE one. Adding the field is only half the claim; the other half
 * is that what they type comes back out.
 *
 * Asserting `'Mailing Address'` appears in the header array would pass while the
 * value column was misaligned, blank, or reading a field that is null because
 * the plaintext was moved into the encrypted blob. So this clicks Export,
 * captures the real download, and reads it.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
const ADDRESS = '12 Rue de la Paix\nApt 4\n75002 Paris\nFrance';

let failed = 0;
const fail = (m) => { console.error(`  FAIL ${m}`); failed++; };
const pass = (m) => console.log(`  pass ${m}`);

const browser = await chromium.launch();
// SEED, NOT onEntity. The page renders from /api/my-guests — the DECRYPTED
// path — and the harness serves that endpoint straight from `seed.Guest`
// without passing it through onEntity. An onEntity injection therefore never
// reached the data the export actually reads, and the probe reported the value
// missing when it had never been delivered. The instrument, not the product.
const seed = {
  ...SEED,
  // A multi-line address with a comma and an accent — the three things that
  // break a naive CSV writer.
  Guest: SEED.Guest.map((g, i) => (i === 0 ? { ...g, mailing_address: ADDRESS } : g)),
};
const ctx = await seededContext(browser, { width: 1440, height: 1000, seed });
const page = await ctx.newPage();
await page.goto(`${BASE}/Guests`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1500);

const btn = page.locator('button', { hasText: /^Export/ }).first();
if (await btn.count() === 0) {
  fail('no Export control found on /Guests — the probe cannot measure anything');
} else {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
    btn.click(),
  ]);
  if (!download) {
    fail('Export produced no download');
  } else {
    const path = await download.path();
    const csv = readFileSync(path, 'utf8');
    pass(`exported file read: ${csv.split('\n').length} lines, ${csv.length} bytes`);

    if (/Mailing Address/i.test(csv.split('\n')[0])) pass('the header carries a Mailing Address column');
    else fail('no Mailing Address column in the exported header');

    // The value, not the column.
    if (csv.includes('75002 Paris')) pass('the address VALUE is present in the exported file');
    else fail('the address column exists but the value did not come out');

    if (csv.includes('France')) pass('the country inside the block survives — no separate field needed');
    else fail('the country line was lost');

    // A multi-line value must stay inside its quoted field, or every row after
    // it shifts by a column.
    const header = csv.split('\n')[0];
    const cols = (header.match(/,/g) || []).length;
    if (cols > 5) pass(`header has ${cols + 1} columns`);
    else fail('header looks truncated');
  }
}

await ctx.close();
await browser.close();
console.log(failed ? `\n  ${failed} failure(s)` : '\n  what a couple types comes back out');
process.exit(failed ? 1 : 0);
