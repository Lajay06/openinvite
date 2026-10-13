/**
 * tests/persistence/gift-claim-return.mjs
 *
 * A COUPLE WHO SIGNS UP OR LOGS IN TO OPEN A GIFT COMES BACK TO THE GIFT.
 * Gifting v2. On gift-test (2026-10-13) a new account opened the gift,
 * chose Create one, entered the emailed code and landed on Choose your plan
 * with the gift unclaimed: src/pages/Login.jsx's "Create one" was a bare
 * /register that dropped ?next=. The browser test
 * (scripts/test-gift-claim-auth.mjs) drives every route in; this guard pins the
 * pieces each route depends on, so a later edit to the auth pages cannot drop
 * the gift again without failing here first.
 *
 * Lane C is replacing the email-code step with Openinvite's own send. This
 * holds for both: the gift travels in ?next= and in this browser's pending
 * claim, not in the code step, and the one thing any code step must keep is
 * ending at /choose-plan, which is checked last.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => stripComments(readFileSync(resolve(ROOT, p), 'utf8'));

export async function runGiftClaimReturn() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Gift claim: back to the gift after sign up or log in:\n');
  const lib = await import('../../src/lib/giftClaimReturn.js');

  // ── the helper ──────────────────────────────────────────────────────────
  const t = `gift12345.1.${'A'.repeat(43)}`;
  check('a claim path, with or without ?go=1, is recognized; anything else is not',
    lib.isGiftClaimPath(`/gift/claim/${t}?go=1`) && lib.isGiftClaimPath(`/gift/claim/${t}`)
      && !lib.isGiftClaimPath('/DailyUpdate') && !lib.isGiftClaimPath(`/gift/claim/${t}?go=1&next=https://evil.example`) && !lib.isGiftClaimPath('https://example.com/gift/claim/x'));
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  try {
    const t0 = 1_800_000_000_000;
    lib.rememberPendingClaim(lib.claimReturnPath(t), t0);
    check('a pending claim is remembered and read back within the hour', lib.pendingClaimPath(t0 + 59 * 60e3) === `/gift/claim/${t}?go=1`);
    check('  and forgotten after it', lib.pendingClaimPath(t0 + 61 * 60e3) === null && !store.has(lib.PENDING_GIFT_CLAIM_KEY));
    lib.rememberPendingClaim('/DailyUpdate', t0);
    check('  and only a claim path is ever remembered', lib.pendingClaimPath(t0) === null);
    lib.rememberPendingClaim(lib.claimReturnPath(t), t0);
    lib.clearPendingClaim();
    check('  and cleared on request', lib.pendingClaimPath(t0) === null);
  } finally {
    delete globalThis.localStorage;
  }
  check('the gift copy is the owner\'s, verbatim',
    lib.GIFT_AUTH.heading === 'Your gift is waiting.'
      && `${lib.GIFT_AUTH.lineBefore}${lib.GIFT_AUTH.linkText}${lib.GIFT_AUTH.lineAfter}` === 'Create your account to open it. Already have one? Log in instead.');

  // ── the pages ───────────────────────────────────────────────────────────
  const login = read('src/pages/Login.jsx');
  const register = read('src/pages/Register.jsx');
  const claim = read('src/pages/GiftClaim.jsx');
  const choose = read('src/pages/ChoosePlan.jsx');
  check('Log in\'s "Create one" carries ?next= to Create account (the line that lost the gift)',
    /const registerUrl = rawNext \? `\/register\?next=\$\{encodeURIComponent\(rawNext\)\}` : '\/register';/.test(login) && /<Link to=\{registerUrl\}/.test(login) && !/<Link to="\/register"/.test(login));
  check('Create account\'s "Log in" links carry ?next= back', /const loginUrl = next \? `\/login\?next=\$\{encodeURIComponent\(next\)\}` : '\/login';/.test(register) && !/<Link to="\/login"/.test(register) && (register.match(/<Link to=\{loginUrl\}/g) || []).length === 2);
  check('with a gift waiting, Create account says so, with Log in to switch', /title=\{giftWaiting \? GIFT_AUTH\.heading : "Create your account"\}/.test(register) && /data-gift-waiting/.test(register));
  check('the social buttons return through the same next', /loginWithProvider\(provider, choosePlanUrl\(\)\)/.test(register) && /loginWithProvider\(provider, choosePlanUrl\)/.test(login));
  check('Open your gift sends a signed-out couple to Create account, the gift in ?next= and remembered',
    /rememberPendingClaim\(back\);\s*navigate\(`\/register\?next=\$\{encodeURIComponent\(back\)\}`\);/.test(claim));
  check('a claimed or used gift clears the remembered claim', /if \(out\.ok \|\| out\.reason === 'used'\) clearPendingClaim\(\);/.test(claim));
  check('ChoosePlan returns to the gift from ?next= or the remembered claim', /pendingClaimPath\(\)/.test(choose) && /isGiftClaimPath\(next\)/.test(choose));
  check('ANY code step must end at /choose-plan, where the gift is picked up (holds for lane C\'s own send too)',
    /window\.location\.href = choosePlanUrl\(\);/.test(register.slice(register.indexOf('handleVerify'))));
  return r;
}
