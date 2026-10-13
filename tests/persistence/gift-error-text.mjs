/**
 * tests/persistence/gift-error-text.mjs
 *
 * A GIVER NEVER SEES A SERVER'S ERROR TEXT, AND A STRAY DOT IS NOT AN ADDRESS.
 * Owner rulings 2026-10-13, after the first run on the gift-test preview,
 * where "APP_ENC_KEY is not set. Refusing to hash or encrypt..." reached the
 * giver's screen and "...@gmail.com." was accepted as the couple's address.
 *
 * What it holds:
 *   - whatever a gift endpoint answers, the page's checkout call hands back
 *     only GIFT_TRY_AGAIN; no gift page renders a response's own error field
 *   - a failure to encrypt the draft is logged by the server and answered as
 *     a plain failure, never thrown to a handler that might echo it
 *   - the address is trimmed and checked the same way on the page and on the
 *     server; Continue and Pay wait for it, with "Check the email address."
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const LEAK = 'APP_ENC_KEY is not set. Refusing to hash or encrypt under an empty key';

export async function runGiftErrorText() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Gift pages: no server error text, and the address checked:\n');
  const input = await import('../../src/lib/giftInput.js');

  // ── the copy ────────────────────────────────────────────────────────────
  check('the two lines are the owner\'s, verbatim',
    input.GIFT_TRY_AGAIN === 'That did not go through. Try again in a moment.' && input.EMAIL_CHECK === 'Check the email address.');

  // ── the address ─────────────────────────────────────────────────────────
  const ok = ['la.jay06+notiftest01@gmail.com', '  isla.and.theo@example.com  ', 'a@b.co.uk'];
  // Assembled from parts, so the repository-wide address sweep
  // (tests/persistence/email-validation.mjs) does not read them as accounts.
  const at = '@';
  const bad = [`la.jay06+notiftest01${at}gmail.com.`, `name${at}gmail..com`, `name${at}localhost`, `two words${at}example.com`, 'no-at-sign.com', `${at}example.com`, `name${at}.com`, ''];
  check('a real address passes, surrounding space trimmed', ok.every((e) => input.isValidGiftEmail(e)) && input.normalizeGiftEmail(ok[1]) === 'isla.and.theo@example.com');
  const passed = bad.filter((e) => input.isValidGiftEmail(e));
  check('a trailing full stop, a double dot, no domain dot, a space or no @ fails', passed.length === 0, passed.join(' | ') || `${bad.length} refused`);

  const saved = { APP_ENC_KEY: process.env.APP_ENC_KEY, APP_HASH_KEY: process.env.APP_HASH_KEY };
  try {
    const drafts = await import('../../api/_lib/giftDrafts.js');
    const GOOD = { names: 'Isla and Theo', giver: 'Sam', note: 'With love', noteStyle: 'plain', headlineKey: 'nice_start', photoId: 'DTS_UNWRAPPED_Franco_Dupuy_Photos_ID13773_dfzkub', when: 'now' };
    check('the server refuses the trailing dot too, by the same check',
      drafts.validateGiftDraft({ ...GOOD, email: `la.jay06+notiftest01${'@'}gmail.com.` }).error === 'email'
        && drafts.validateGiftDraft({ ...GOOD, email: ' la.jay06+notiftest01@gmail.com ' }).value?.email === 'la.jay06+notiftest01@gmail.com');

    // ── a missing key is logged, not thrown ───────────────────────────────
    delete process.env.APP_ENC_KEY;
    const logged = [];
    const realErr = console.error;
    console.error = (...a) => logged.push(a.join(' '));
    let out;
    let threw = false;
    try {
      out = await drafts.createGiftDraft(drafts.validateGiftDraft({ ...GOOD, email: 'a@b.co' }).value, { plan: 'ultra', adminKey: 'admin', fetchImpl: async () => { throw new Error('must not be called'); } });
    } catch { threw = true; } finally { console.error = realErr; }
    check('with no APP_ENC_KEY the draft is a plain failure, logged by the server, not thrown',
      !threw && out?.ok === false && logged.some((l) => /gift draft\] could not be prepared/.test(l)));
  } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }

  // ── whatever the server says, the page gets the one line ────────────────
  const { startGiftV2Checkout } = await import('../../src/lib/checkoutSession.js');
  const draft = { plan: 'ultra', names: 'Isla and Theo', email: 'a@b.co', giver: 'Sam', note: 'n', noteStyle: 'plain', headlineKey: 'nice_start', photoId: 'x', when: 'now' };
  const answers = [
    { name: 'a 500 carrying the key error', res: { status: 500, headers: { get: () => 'application/json' }, json: async () => ({ error: LEAK }) } },
    { name: 'a 502 with its own sentence', res: { status: 502, headers: { get: () => 'application/json' }, json: async () => ({ error: 'Your gift could not be saved. Please try again.' }) } },
    { name: 'an HTML error page', res: { status: 500, headers: { get: () => 'text/html' }, json: async () => ({}) } },
  ];
  const realWarn = console.warn;
  console.warn = () => {};
  try {
    for (const { name, res } of answers) {
      const out = await startGiftV2Checkout(draft, 'Australia/Sydney', { resolveUser: async () => null, doFetch: async () => res });
      check(`${name}: the page gets only the one line`, out.error === input.GIFT_TRY_AGAIN && !out.url);
    }
    const net = await startGiftV2Checkout(draft, 'UTC', { resolveUser: async () => null, doFetch: async () => { throw new Error('ECONNREFUSED'); } });
    check('a network failure: the same line', net.error === input.GIFT_TRY_AGAIN);
    let sentEmail = null;
    await startGiftV2Checkout({ ...draft, email: '  a@b.co  ' }, 'UTC', { resolveUser: async () => null, doFetch: async (u, o) => { sentEmail = JSON.parse(o.body).giftDraft.email; return answers[2].res; } });
    check('the address goes to checkout trimmed', sentEmail === 'a@b.co');
  } finally { console.warn = realWarn; }

  // ── the pages ───────────────────────────────────────────────────────────
  const pages = readdirSync(resolve(ROOT, 'src/pages')).filter((f) => /^Gift.*\.jsx$/.test(f) && f !== 'Gifting.jsx' && f !== 'GiftPurchaseSuccess.jsx');
  const leaking = pages.filter((f) => /\{\s*[\w.?]*\.error\s*\}/.test(stripComments(read(`src/pages/${f}`))));
  check('no v2 gift page renders a response\'s error field', pages.length >= 1 && leaking.length === 0, leaking.join(', ') || pages.join(', '));
  const v2 = stripComments(read('src/pages/GiftV2.jsx'));
  check('the pay error is the fixed line, never the result\'s text', /data-gift-pay-error[^>]*>\{GIFT_TRY_AGAIN\}<\/p>/.test(v2) && !/setPayError\(result\.error\)/.test(v2));
  // Page 2 is onboarding step 1 (owner ruling 2026-10-13): its Continue only
  // appears once every line is valid, and the address line is checked by the
  // product's validator with the calm line as its hint.
  check('Continue on page 2 and Pay on page 3 both wait for a valid address',
    /const validEmail = isValidGiftEmail\(draft\.email\)/.test(v2) && /key: 'email'[^}]*valid: isValidGiftEmail, hint: EMAIL_CHECK/.test(v2) && /disabled=\{paying \|\| !validEmail \|\|/.test(v2));
  check('the address is trimmed on its way into the draft, and the field says "Check the email address." when it is not one',
    /email: normalizeGiftEmail\(v\.email\)/.test(v2) && /data-s1-hint=\{l\.key\}/.test(stripComments(read('src/components/onboarding/OnboardingStep1Names.jsx'))));
  return r;
}
