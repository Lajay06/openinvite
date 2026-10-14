/**
 * tests/persistence/trial-welcome.mjs
 *
 * THE FIRST EMAIL THE PRODUCT SENDS, AND THE THREE THINGS IT GOT WRONG.
 *
 * Owner ruling 2026-10-14, from lane B's section 3 write-up:
 *
 *   1. A gifted account got the trial welcome as well as the gift welcome, so
 *      it was told about a 14-day trial it was not on, twice over.
 *   2. The opening line announced a trial whatever the account was, including
 *      an account that had already paid.
 *   3. A full_name holding only the address's local part greeted the person
 *      with it: "Welcome, la.jay06." The field carries no @, so every check
 *      that looked for one passed it through.
 *   4. The route is not idempotent and its rate limit is per IP, so a retried
 *      onboarding sent two welcomes.
 *
 * ── WHERE EACH CHECK IS BEHAVIORAL AND WHERE IT IS NOT ───────────────────
 *
 * Three of the four run the real code. The gift refusal returns before Resend
 * is ever reached, so the whole handler is driven with a stubbed fetch and the
 * answer read off it. The opening line and the greeting are pure functions and
 * are called directly.
 *
 * The idempotency key cannot be reached the same way: the send path needs a
 * live Resend client, and this suite sends nothing. That one is asserted
 * against the source, and it says so rather than dressing a source read up as
 * a behavioral one.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('../../', import.meta.url).pathname);

/** A req/res pair the handler can be driven with. */
function harness({ ip, body }) {
  const res = {
    statusCode: 0, payload: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(p) { this.payload = p; return this; },
  };
  const req = { method: 'POST', headers: { 'x-forwarded-for': ip }, body };
  return { req, res };
}

/**
 * Stubs every fetch the handler could make and RECORDS THE URLS.
 *
 * Two calls can leave this handler: the identity read, and whatever the Resend
 * client does inside send(). Both are captured, which is what lets the gift
 * path assert it never reached Resend at all rather than inferring it from the
 * order of two lines in the source. It also means this suite cannot touch the
 * network even if a code path changes under it.
 */
function withUser(user, fn) {
  const real = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url) => {
    seen.push(String(url));
    return { ok: true, status: 200, json: async () => user, text: async () => '{}' };
  };
  return fn().then((v) => ({ v, seen })).finally(() => { globalThis.fetch = real; });
}

const hitResend = (seen) => seen.some((u) => /resend\.com/i.test(u));

export async function runTrialWelcome() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  console.log('\n  The trial welcome, and who should not get one:\n');

  const { default: handler } = await import('../../api/on-signup.js');
  const { onboardingDay1Email } = await import('../../api/emails/onboarding-day1.js');
  const { firstNameOrNull, greeting } = await import('../../src/lib/emailGreeting.js');

  // ── 1. A GIFTED ACCOUNT GETS NO TRIAL WELCOME ──────────────────────────
  //
  // Driven through the real handler. It returns before Resend is constructed,
  // so nothing is sent and nothing needs stubbing beyond the identity call.
  const gifted = {
    id: 'user_gift_1', email: 'isla@example.com', full_name: 'Isla Moreau',
    plan: 'ultra', planSource: 'gift',
  };
  const g = harness({ ip: '203.0.113.11', body: { email: gifted.email, token: 't' } });
  const gSeen = (await withUser(gifted, () => handler(g.req, g.res))).seen;
  ok('a gifted account is refused the trial welcome',
     g.res.statusCode === 200 && g.res.payload?.sent === false && g.res.payload?.code === 'GIFT_ACCOUNT',
     `${g.res.statusCode} ${JSON.stringify(g.res.payload)}`);

  // AND IT IS 200, NOT AN ERROR. Nothing went wrong; the account simply does
  // not get this email. A 4xx here would read as a failure in the caller's log
  // and invite a retry.
  ok('  and it answers 200, because nothing failed',
     g.res.statusCode === 200, String(g.res.statusCode));

  // THE CHECK MUST ACTUALLY BE THE PLAN SOURCE. An account that is merely paid
  // still gets a welcome, so the refusal cannot be reading `plan`.
  const paidNotGift = { ...gifted, id: 'user_paid_1', planSource: 'purchase' };
  const pn = harness({ ip: '203.0.113.12', body: { email: paidNotGift.email, token: 't' } });
  const pnSeen = (await withUser(paidNotGift, () => handler(pn.req, pn.res).catch(() => {}))).seen;
  ok('  a paid, non-gifted account is NOT refused',
     pn.res.payload?.code !== 'GIFT_ACCOUNT',
     `code ${pn.res.payload?.code ?? '(none)'}`);

  // ── 2. THE OPENING LINE FOLLOWS THE ACCOUNT ────────────────────────────
  const line = (opts) => (onboardingDay1Email({ email: 'isla@example.com', name: 'Isla Moreau', ...opts })
    .match(/You're in\.[^<]*/) || [''])[0].replace(/\s+/g, ' ').trim();

  const TRIAL_LINE = "You're in. Your 14-day free trial has started, no credit card required.";
  const PAID_PRO = "You're in. Openinvite Pro is switched on for the next 24 months.";
  const PAID_ULTRA = "You're in. Openinvite Ultra is switched on for the next 24 months.";

  ok('on trial, the line is the trial line', line({ onTrial: true }).startsWith(TRIAL_LINE), line({ onTrial: true }).slice(0, 60));
  ok('  paid Pro gets the owner\'s exact sentence', line({ onTrial: false, plan: 'pro' }).startsWith(PAID_PRO), line({ onTrial: false, plan: 'pro' }).slice(0, 70));
  ok('  paid Ultra says Ultra', line({ onTrial: false, plan: 'ultra' }).startsWith(PAID_ULTRA), line({ onTrial: false, plan: 'ultra' }).slice(0, 70));
  ok('  and a paid account is never told about a trial',
     !/free trial/i.test(onboardingDay1Email({ email: 'isla@example.com', name: 'Isla', onTrial: false, plan: 'pro' })),
     'no trial wording');

  // THE TRIAL LENGTH IS ONE NUMBER, held in src/lib/trialStatus.js and quoted
  // in the headline of TRIAL_FEATURES. A line claiming a different one would
  // be wrong wherever it disagreed.
  const { TRIAL_DAYS } = await import('../../src/lib/trialStatus.js');
  const { TRIAL_FEATURES } = await import('../../src/lib/planFeatures.js');
  ok('  the trial length agrees with trialStatus and planFeatures',
     TRIAL_DAYS === 14 && /14-day/.test(TRIAL_FEATURES[0]) && line({ onTrial: true }).includes('14-day'),
     `TRIAL_DAYS ${TRIAL_DAYS}`);

  // ── 3. NEVER PRINT AN ADDRESS WHERE A NAME GOES ────────────────────────
  ok('a full_name that is only the local part is not a name',
     firstNameOrNull('la.jay06', 'la.jay06@gmail.com') === null,
     String(firstNameOrNull('la.jay06', 'la.jay06@gmail.com')));

  // AND THE RULE DOES NOT EAT A REAL NAME. Owner's own example: someone called
  // Isla at isla@ matches the local part exactly and keeps her name. The shape
  // is what separates them, not the equality.
  ok('  but a real first name matching the local part is kept',
     firstNameOrNull('Isla', 'isla@example.com') === 'Isla',
     String(firstNameOrNull('Isla', 'isla@example.com')));
  ok('  case does not rescue it either',
     firstNameOrNull('LA.JAY06', 'la.jay06@gmail.com') === null, 'null');
  ok('  an address anywhere in the field disqualifies it',
     firstNameOrNull('Smith la.jay06@gmail.com') === null
       && firstNameOrNull('la.jay06@gmail.com Smith') === null,
     'both null');
  ok('  and the nameless greeting is a whole sentence, not a placeholder',
     greeting('Welcome, {name}.', 'Welcome.', 'la.jay06', 'la.jay06@gmail.com') === 'Welcome.',
     greeting('Welcome, {name}.', 'Welcome.', 'la.jay06', 'la.jay06@gmail.com'));

  // THE OLD CALLERS PASS ONE ARGUMENT AND MUST BE UNDISTURBED.
  ok('  callers that pass no address behave as before',
     firstNameOrNull('Lachlan Jay') === 'Lachlan' && firstNameOrNull('la.jay06@gmail.com') === null,
     'unchanged');

  // ── 4. ONE WELCOME PER ACCOUNT ─────────────────────────────────────────
  //
  // SOURCE, NOT BEHAVIOR, and deliberately labeled: reaching the send needs
  // a live Resend client and this suite sends nothing.
  const src = stripComments(readFileSync(resolve(ROOT, 'api/on-signup.js'), 'utf8'));
  ok('the send carries an idempotency key keyed on the account (source)',
     /idempotencyKey:\s*`welcome-\$\{user\.id\}`/.test(src),
     'welcome-${user.id}');

  // AND THE REFUSAL REALLY DOES COME BEFORE THE SEND. Measured, not read: the
  // gifted run must never have asked Resend for anything, while the ordinary
  // run must have. Asserting both ways is what makes the first one mean
  // something, since a handler that sent nothing at all would also pass it.
  ok('  the gifted run never reached Resend, the ordinary one did',
     !hitResend(gSeen) && hitResend(pnSeen),
     `gift ${gSeen.length} call(s), ordinary ${pnSeen.length} call(s)`);

  return results;
}
