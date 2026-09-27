/* global document */
/**
 * THE COUPLE'S REPLY ACTUALLY REACHES THE GUEST'S ADDRESS.
 *
 * Owner live pass, 2026-09-27, smoke account: the note arrived, the badge read
 * 1, mark-read worked — and **the reply failed** with "Something went wrong —
 * please try again.", while the Messages row displayed the address as
 * "mailto:la.jay06+notiftest01@gmail.com".
 *
 * ONE CAUSE, TWO SYMPTOMS. isValidEmail's regex was `[^\s@]+@[^\s@]+\.[^\s@]+`,
 * and ':' is neither whitespace nor an at-sign — so an address pasted out of a
 * mailto link passed validation, was encrypted, stored, printed to the row, and
 * finally handed to Resend as a recipient, which refused it. The endpoint's
 * catch returns exactly the sentence the owner saw.
 *
 * WHAT THIS DRIVES, END TO END, that no source check can:
 *
 *   THE RECIPIENT IS THE REAL ADDRESS. The fixture row deliberately stores
 *   "mailto:grace@example.com"; the guard reads the body of the actual
 *   /api/send-guest-reply request the page makes and asserts it carries
 *   "grace@example.com". A source check could only assert that a function named
 *   normalizeEmail is called somewhere.
 *
 *   THE EMAIL GOES BEFORE THE RECORD. reply_sent_at means "the email went out",
 *   so the send must precede the guest-note-update that writes it. Asserted on
 *   the observed request ORDER, not on the order of lines in a file.
 *
 *   AND THE ROW NEVER PRINTS A SCHEME. What the couple reads is what the page
 *   painted, so it is read off the DOM.
 *
 * The sender is stubbed — this is a test of the reply path, not of Resend.
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4220';
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** What the fixture stores, and what it must become. */
const STORED = (SEED.GuestMessage || [])[0].guest_email;
const EXPECTED = 'grace@example.com';

const browser = await chromium.launch();

for (const [w, h] of [[390, 844], [1440, 950]]) {
  console.log(`\n  ${w}px:`);
  const ctx = await seededContext(browser, { width: w, height: h });
  const page = await ctx.newPage();

  // EVERY REQUEST THE PAGE MAKES, in the order it makes them. The stubs answer
  // them; this only watches.
  const calls = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!/\/api\/(send-guest-reply|guest-note-update)/.test(u)) return;
    let body = null;
    try { body = JSON.parse(r.postData() || 'null'); } catch { body = null; }
    calls.push({ path: u.replace(/^https?:\/\/[^/]+/, ''), body });
  });

  await page.goto(`${BASE}/Messages`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);

  const text = await page.evaluate(() => document.body.innerText || '');
  check('  Messages rendered with the seeded note', /Grace Hopper/.test(text),
    text.length ? `${text.length} chars` : 'empty');

  // THE ROW PRINTS AN ADDRESS, NOT A LINK. Read off the painted DOM.
  check('  the row shows the real address', text.includes(EXPECTED), EXPECTED);
  check('  and never the mailto: scheme', !/mailto:/i.test(text),
    /mailto:/i.test(text) ? `still printing ${STORED}` : 'no scheme in the label');

  // Drive the reply.
  const replyBtn = page.locator('button[title="Reply"]').first();
  await replyBtn.click().catch(() => {});
  await page.waitForTimeout(800);
  const box = page.locator('textarea').first();
  await box.fill('Yes — there is parking behind the church.').catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Send reply/ }).click().catch(() => {});
  await page.waitForTimeout(4000);

  const send = calls.find((c) => c.path.includes('send-guest-reply'));
  const record = calls.find((c) => c.path.includes('guest-note-update') && c.body?.action === 'reply');

  check('  the reply email was requested', !!send, send ? send.path : 'no request observed');
  if (send) {
    check('  addressed to the real address, not the stored scheme',
      send.body?.guestEmail === EXPECTED, JSON.stringify(send.body?.guestEmail));
    check('  carrying the reply text', /parking behind the church/.test(send.body?.replyText || ''),
      'the couple\'s words');
    check('  and the guest name', send.body?.guestName === 'Grace Hopper', JSON.stringify(send.body?.guestName));
  }

  check('  the note was then marked replied', !!record, record ? 'guest-note-update action=reply' : 'no record write');
  if (send && record) {
    // ORDER AS OBSERVED. reply_sent_at means the email went out; recording it
    // before a successful send would be a false record.
    check('  the email went out BEFORE the record was written',
      calls.indexOf(send) < calls.indexOf(record),
      `send@${calls.indexOf(send)} record@${calls.indexOf(record)}`);
    check('  and the record names the same note',
      typeof record.body?.noteId === 'string' && record.body.noteId.length > 0,
      JSON.stringify(record.body?.noteId));
  }

  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
