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
 *   THE RECIPIENT IS THE REAL ADDRESS, for every shape that has reached a real
 *   guest. Three rows are seeded, each storing a form the old validator accepted
 *   and Resend refused — "mailto:grace@example.com" (live pass 2026-09-27),
 *   "nelly@example.com." (live pass 2026-09-28) and "<bracket@example.com>" —
 *   and the guard reads the body of the actual /api/send-guest-reply request the
 *   page makes for each. A source check could only assert that a function named
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
 *
 * ── AND THE EMAIL CARRIES THE COUPLE'S NAMES ───────────────────────────────
 *
 * Second owner live pass, 2026-09-28: the reply arrived, and every place it
 * should have named the couple said "The couple" instead. Messages.jsx sent
 * Invitation.couple_names — a DIFFERENT RECORD from the wedding — so a couple
 * with names on WeddingDetails and no Invitation row sent an empty string, and
 * one fallback reached a real guest four times over. The names are resolved
 * server-side now, from the wedding the caller was just authenticated against.
 *
 * The four places are asserted by RENDERING the template with the fixture
 * wedding's real names, plus a control that a nameless wedding still falls back
 * — without it, "no 'The couple' anywhere" would also pass on a build that
 * deleted the fallback and printed a gap where a name goes.
 */
import { readFileSync } from 'fs';
import { chromium } from 'playwright';
import { seededContext, SEED, PUBLISHED_WEDDING } from './lib/renderHarness.mjs';
import { coupleDisplayName } from '../api/_lib/coupleNames.js';
import { renderGuestReplyEmail } from '../src/lib/guestReplyEmailTemplate.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4220';
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/**
 * Every stored shape that has reached a real guest, and what it must become.
 * `stored` is read off the seed so the table cannot drift from the fixture.
 */
const storedFor = (id) => ((SEED.GuestMessage || []).find((m) => m.id === id) || {}).guest_email;
const SHAPES = [
  { id: 'gm1', name: 'Grace Hopper', expected: 'grace@example.com',   why: 'mailto:' },
  { id: 'gm3', name: 'Nelly',        expected: 'nelly@example.com',   why: 'trailing full stop' },
  { id: 'gm4', name: 'Bracket',      expected: 'bracket@example.com', why: 'angle brackets' },
].map((sh) => ({ ...sh, stored: storedFor(sh.id) }));
const STORED = SHAPES[0].stored;
const EXPECTED = SHAPES[0].expected;

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

  // THE ROWS PRINT ADDRESSES, NOT THE STORED JUNK. Read off the painted DOM.
  for (const sh of SHAPES) {
    check(`  the ${sh.why} row shows the real address`, text.includes(sh.expected), sh.expected);
    check(`    and never ${JSON.stringify(sh.stored)}`, !text.includes(sh.stored),
      text.includes(sh.stored) ? `still printing ${sh.stored}` : 'normalized on read');
  }
  check('  and no mailto: scheme anywhere on the page', !/mailto:/i.test(text),
    /mailto:/i.test(text) ? `still printing ${STORED}` : 'no scheme in any label');

  // ── one reply per stored shape ─────────────────────────────────────────────
  //
  // BY ROW, NOT BY INDEX. The rows are ordered newest-first by created_date, so
  // an index would silently re-target the moment a fixture date changed. Each
  // row is found by the guest's name and its own Reply button clicked.
  for (const shape of SHAPES) {
    const before = calls.length;
    const row = page.locator('div', { hasText: shape.name }).filter({ has: page.locator('button[title="Reply"]') }).last();
    await row.locator('button[title="Reply"]').click().catch(() => {});
    await page.waitForTimeout(800);
    await page.locator('textarea').first().fill(`Yes — ${shape.name}, there is parking behind the church.`).catch(() => {});
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Send reply/ }).click().catch(() => {});
    await page.waitForTimeout(4000);

    const fresh = calls.slice(before);
    const send = fresh.find((c) => c.path.includes('send-guest-reply'));
    const record = fresh.find((c) => c.path.includes('guest-note-update') && c.body?.action === 'reply');

    check(`  [${shape.why}] the reply email was requested`, !!send,
      send ? send.path : 'no request observed');
    if (send) {
      check(`  [${shape.why}] addressed to the real address, not ${JSON.stringify(shape.stored)}`,
        send.body?.guestEmail === shape.expected, JSON.stringify(send.body?.guestEmail));
      check(`  [${shape.why}] carrying the reply text`,
        /parking behind the church/.test(send.body?.replyText || ''), 'the couple\'s words');
      check(`  [${shape.why}] and the guest name`,
        send.body?.guestName === shape.name, JSON.stringify(send.body?.guestName));
    }
    check(`  [${shape.why}] the note was then marked replied`, !!record,
      record ? 'guest-note-update action=reply' : 'no record write');
    if (send && record) {
      // ORDER AS OBSERVED. reply_sent_at means the email went out; recording it
      // before a successful send would be a false record.
      check(`  [${shape.why}] the email went out BEFORE the record was written`,
        fresh.indexOf(send) < fresh.indexOf(record),
        `send@${fresh.indexOf(send)} record@${fresh.indexOf(record)}`);
      check(`  [${shape.why}] and the record names a note`,
        typeof record.body?.noteId === 'string' && record.body.noteId.length > 0,
        JSON.stringify(record.body?.noteId));
    }
  }

  await ctx.close();
}

await browser.close();

// ── the email names the couple, in all four places ───────────────────────────
console.log('\n  the reply email, rendered with the fixture wedding\'s own names:');
{
  const NAMES = coupleDisplayName(PUBLISHED_WEDDING);
  check('  the fixture wedding has names to print', !!NAMES, JSON.stringify(NAMES));

  const mail = renderGuestReplyEmail({
    guestName: 'Grace Hopper',
    coupleNames: NAMES,
    originalMessage: 'Cannot wait!',
    replyText: 'Yes — there is parking behind the church.',
  });
  // The template escapes for HTML, so '&' arrives as '&amp;' in the body.
  const escaped = NAMES.replace(/&/g, '&amp;');

  check('  1/4 subject names the couple', mail.subject === `${NAMES} replied to your note`,
    JSON.stringify(mail.subject));
  check('  2/4 eyebrow names the couple', mail.html.includes(`A reply from ${escaped}`),
    `A reply from ${escaped}`);
  check('  3/4 footer names the couple',
    mail.html.includes(`This is a reply to the note you sent ${escaped} from their wedding site. Replying to this email goes straight to them.`),
    'verbatim');
  // 4/4 IS THE FROM NAME, AND IT IS BUILT IN THE ENDPOINT, not the template —
  // so it is asserted on the endpoint's own resolution rather than on this HTML.
  const EP = readFileSync(new URL('../api/send-guest-reply.js', import.meta.url), 'utf8');
  check('  4/4 the From name is the resolved names',
    /const fromName = cleanCoupleNames \|\| 'Openinvite';/.test(EP)
      && /const cleanCoupleNames = coupleDisplayName\(wedding\) \|\| '';/.test(EP),
    'same construction as send-invites.js');
  check('    resolved from the caller\'s own wedding, not the request body',
    /const wedding = await getMyWedding\(caller\.id\);/.test(EP)
      && !/sanitizeString\(coupleNames\)/.test(EP),
    'the body value is ignored');

  check('  the heading greets the guest and nothing else',
    mail.html.includes('Hi Grace,') && !/Hi Grace, .* replied/.test(mail.html), 'Hi {firstName},');
  check('  the quoted note is labelled "Your note"', mail.html.includes('>Your note<'), 'not "Your message"');

  // THE WHOLE POINT.
  check('  "The couple" never renders when the wedding has names',
    !mail.html.includes('The couple') && !mail.subject.includes('The couple'),
    'no fallback anywhere');

  // CONTROL. A build that deleted the fallback would pass the check above while
  // printing a gap — so the nameless case must still produce the fallback.
  const nameless = renderGuestReplyEmail({ guestName: 'Grace', coupleNames: '', originalMessage: 'x', replyText: 'y' });
  check('  control: a wedding with no names still falls back',
    nameless.subject === 'The couple replied to your note', JSON.stringify(nameless.subject));
}

const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
