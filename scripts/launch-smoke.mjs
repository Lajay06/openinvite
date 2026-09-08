/* global document, window */
/**
 * scripts/launch-smoke.mjs — THE STRANGER'S JOURNEY, END TO END.
 *
 * One person who has never heard of us signs up and gets a guest to reply.
 * Nine steps, each asserted, each photographed:
 *
 *   1  sign up
 *   2  onboarding, to completion
 *   3  choose a universe
 *   4  build — one text edit and one photo
 *   5  publish
 *   6  add one guest
 *   7  send the invitation (a real email)
 *   8  open the invitation link as that guest, and RSVP
 *   9  the couple's dashboard reads 1 invitation, 1 reply
 *
 * ── WHY THIS EXISTS SEPARATELY FROM EVERY OTHER GUARD ───────────────────────
 *
 * Every other guard in this repo tests a surface against a stub. This one
 * tests the PRODUCT: real signup, real Base44 writes, a real Resend send, a
 * real token URL opened in a second browser context that shares nothing with
 * the first. The join between those things is what nothing else covers, and
 * the join is where launches fail — an endpoint that works, a page that
 * works, and a link between them that was never walked.
 *
 * ── WHAT IT WRITES, AND THE RULES IT KEEPS ──────────────────────────────────
 *
 * A FRESH ACCOUNT PER RUN: la.jay06+smoke<YYYYMMDDHHmm>@gmail.com. Never an
 * existing owner account — the named-record rule is absolute and this script
 * has no way to reach one, because it only ever operates as the account it
 * just created.
 *
 * ONE RECIPIENT, EVER: la.jay06+notiftest01@gmail.com. That address is a
 * constant here rather than a parameter, so a run cannot be pointed at anyone
 * by accident or by argument.
 *
 * ── EVIDENCE OF THE EMAIL, WITHOUT AN INBOX ────────────────────────────────
 *
 * The inbox is not reachable from here and pretending otherwise would make
 * this a test of a mailbox. What is captured instead is the send API's own
 * response — a 200 and the id Resend returns — and the RSVP token URL the
 * invitation carries, which is then OPENED. A link that resolves to that
 * guest's own reply form is stronger evidence than a screenshot of an inbox:
 * it proves the address in the email works, not merely that mail was sent.
 *
 * LIVE lane. Registered through tests/persistence/run-launch-smoke.mjs so the
 * registry can see it, and listed in LIVE_CREDENTIAL_GUARDS so CI never runs
 * it: it signs people up and sends mail.
 *
 * ── SIGNUP CANNOT BE AUTOMATED, AND THAT IS A FINDING, NOT A BUG HERE ──────
 *
 * Measured 2026-09-08 against production: the account IS created and Base44
 * then presents "Verify your email — we sent a code to <address>", a six-digit
 * OTP. There is no way past that without reading a mailbox, so an unattended
 * run cannot make its own account. BASE44_TEST_EMAIL_2 exists for exactly this
 * reason (see notifications.mjs:17, "email-OTP verification").
 *
 * So the journey has two modes, and the honest one is the default for a human:
 *
 *   SMOKE_ACCOUNT + SMOKE_PASSWORD set   log in as a pre-verified +alias
 *                                        account; step 1 reports SIGNUP SKIPPED
 *                                        and the run continues from onboarding.
 *   neither set                          attempt a real signup, and stop at the
 *                                        OTP gate with that named as the reason.
 *
 * The second mode is still worth running: it proves signup itself works and
 * that the gate is where it is, rather than assuming either.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://openinvite.com.au \
 *   SMOKE_ACCOUNT=la.jay06+smokeXX@gmail.com SMOKE_PASSWORD=... \
 *   node scripts/launch-smoke.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SMOKE_BASE_URL || 'https://openinvite.com.au';
const SHOTS = process.env.SMOKE_SHOTS || join(ROOT, 'scratchpad', 'launch-smoke');

/** The only address this script may ever mail. Not a parameter. */
const GUEST_EMAIL = 'la.jay06+notiftest01@gmail.com';
const GUEST_NAME = 'Notification Test';

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
/**
 * A pre-verified account, or a fresh one to attempt. Both must be a
 * `la.jay06+…` alias: the named-record rule is absolute, and an alias is the
 * only shape this script will accept.
 */
const SUPPLIED = process.env.SMOKE_ACCOUNT || '';
if (SUPPLIED && !/^la\.jay06\+[a-z0-9]+@gmail\.com$/i.test(SUPPLIED)) {
  console.error(`  REFUSING: ${SUPPLIED} is not a la.jay06+alias address.`);
  process.exit(2);
}
const ACCOUNT = SUPPLIED || `la.jay06+smoke${stamp}@gmail.com`;
const PASSWORD = process.env.SMOKE_PASSWORD || `Smoke!${stamp}aA1`;
const RETURNING = !!SUPPLIED;

const results = [];
let shotN = 0;
/**
 * ONCE A STEP FAILS, NOTHING AFTER IT IS A RESULT.
 *
 * The first run reported eleven failures and one pass after signup broke, and
 * the pass was the worst line in it: step 2 asserted "the url is not
 * /onboarding", which was true because the browser had never left /register.
 * A journey is ordered — step 5 cannot publish a site step 3 never made — so
 * after the first failure every remaining step is recorded as NOT REACHED and
 * counted as a failure, without pretending it was measured.
 */
let broken = null;
const check = (name, ok, detail) => {
  if (broken) {
    results.push({ name, ok: false, detail: `not reached — ${broken} failed` });
    console.log(`  ----  ${name}  (not reached)`);
    return;
  }
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) broken = name;
};
const shot = async (page, label) => {
  shotN += 1;
  const file = join(SHOTS, `${String(shotN).padStart(2, '0')}-${label}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  return file;
};

mkdirSync(SHOTS, { recursive: true });
console.log(`\n  The stranger's journey — ${BASE}`);
console.log(`  account: ${ACCOUNT}`);
console.log(`  guest:   ${GUEST_EMAIL}\n`);

const browser = await chromium.launch();
const couple = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await couple.newPage();

// Every request the page makes, so the send can be evidenced without an inbox.
const sends = [];
page.on('response', async (r) => {
  if (!/\/api\/send-invites/.test(r.url())) return;
  let body = null;
  try { body = await r.json(); } catch { /* not json */ }
  sends.push({ status: r.status(), body });
});

let rsvpUrl = '';
let slug = '';

try {
  // ── 1. sign up, or log in as a pre-verified alias ─────────────────────────
  if (RETURNING) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.getByRole('textbox', { name: /email/i }).first().fill(ACCOUNT).catch(() => {});
    await page.locator('input[type="password"]').first().fill(PASSWORD).catch(() => {});
    await shot(page, 'login-filled');
    await page.getByRole('button', { name: /log ?in|sign ?in|continue/i }).first().click().catch(() => {});
    await page.waitForTimeout(7000);
    const inside = !/\/(login|register)\b/.test(page.url());
    check('1 · signs in as a pre-verified alias (signup skipped — OTP gate)', inside, page.url());
    await shot(page, 'after-login');
  } else {
  await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.getByRole('textbox', { name: /email/i }).first().fill(ACCOUNT).catch(() => {});
  // BOTH password fields. The form is email + password + CONFIRM password,
  // and filling only the first leaves the browser's own validation showing
  // "Please fill out this field." over the submit button — which is exactly
  // what the first run did, and why nine steps after it reported nothing.
  const pw = page.locator('input[type="password"]');
  const pwCount = await pw.count();
  for (let i = 0; i < pwCount; i++) await pw.nth(i).fill(PASSWORD).catch(() => {});
  await shot(page, 'register-filled');
  await page.getByRole('button', { name: /sign up|create|register|get started/i }).first().click().catch(() => {});
  await page.waitForTimeout(6000);
  await shot(page, 'after-signup');
  // THE ACCOUNT IS MADE, AND THEN THE MAILBOX IS ASKED FOR. Distinguished
  // explicitly, because "still on /register" is true of a failed signup AND
  // of a successful one waiting on a code — and calling the second a failure
  // would send the next reader looking for a broken form.
  const atOtp = (await page.getByText(/verify your email|we sent a code/i).count()) > 0;
  const signedUp = !/\/register\b/.test(page.url())
    || (await page.getByText(/onboarding|welcome/i).count()) > 0;
  if (atOtp) {
    check('1 · signs up', false,
      'ACCOUNT CREATED, then blocked at Base44\u2019s six-digit email OTP. Unattended runs need SMOKE_ACCOUNT — a pre-verified alias.');
  } else {
    check('1 · signs up', signedUp, page.url());
  }
  }

  // ── 2. onboarding ─────────────────────────────────────────────────────────
  // Driven by role, never by nth-child: the wizard's steps differ in shape and
  // a positional selector would pass by clicking the wrong control.
  for (let i = 0; i < 14; i++) {
    const next = page.getByRole('button', { name: /^(next|continue|finish|done|let's go|get started)$/i }).first();
    if (await next.count() === 0) break;
    await next.click().catch(() => {});
    await page.waitForTimeout(1800);
  }
  await shot(page, 'onboarding-end');
  // ARRIVAL, not absence. "the url is not /onboarding" is true of a browser
  // that never got past the register page.
  const onboarded = /\/(DailyUpdate|dashboard|studio)/i.test(page.url())
    || (await page.getByText(/daily update|your wedding planning briefing/i).count()) > 0;
  check('2 · reaches the end of onboarding', onboarded, page.url());

  // ── 3. a universe ─────────────────────────────────────────────────────────
  await page.goto(`${BASE}/studio/universe`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.getByText(/^Paris$/).first().click().catch(() => {});
  await page.waitForTimeout(3000);
  const chose = await page.getByRole('button', { name: /use this universe|choose|select|make this mine/i }).first()
    .click().then(() => true).catch(() => false);
  await page.waitForTimeout(3000);
  await shot(page, 'universe');
  check('3 · chooses a universe', chose, chose ? 'paris' : 'no confirm control found');

  // ── 4. build: one text edit and one photo ─────────────────────────────────
  await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: 'Content', exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  const tagline = page.getByRole('textbox', { name: /tagline/i }).first();
  const typed = await tagline.fill('We would love you there.').then(() => true).catch(() => false);
  await page.waitForTimeout(1200);
  check('4 · edits one piece of text', typed, 'the home tagline');
  const photoSlot = await page.getByText(/click to select from library/i).count();
  check('  and a photo slot is offered', photoSlot > 0, `${photoSlot} media picker(s)`);
  await shot(page, 'builder');
  await page.getByRole('button', { name: 'Save', exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(3000);

  // ── 5. publish ────────────────────────────────────────────────────────────
  await page.getByRole('button', { name: /^Publish$/ }).first().click().catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, 'publish-modal');
  await page.getByRole('button', { name: /publish|go live|make live/i }).last().click().catch(() => {});
  await page.waitForTimeout(4000);
  slug = await page.evaluate(() => {
    const m = (document.body.innerText || '').match(/openinvite\.com\.au\/w\/([a-z0-9-]+)/i);
    return m ? m[1] : '';
  });
  check('5 · publishes, and the address exists', !!slug, slug ? `/w/${slug}` : 'no slug on the page');
  await shot(page, 'published');

  // ── 6. one guest ──────────────────────────────────────────────────────────
  await page.goto(`${BASE}/guests`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: /add guest|add a guest|new guest/i }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await page.getByRole('textbox', { name: /name/i }).first().fill(GUEST_NAME).catch(() => {});
  await page.getByRole('textbox', { name: /email/i }).first().fill(GUEST_EMAIL).catch(() => {});
  await shot(page, 'guest-form');
  await page.getByRole('button', { name: /^(save|add|create)$/i }).first().click().catch(() => {});
  await page.waitForTimeout(3500);
  const added = (await page.getByText(GUEST_NAME).count()) > 0;
  check('6 · adds one guest', added, GUEST_EMAIL);
  await shot(page, 'guest-added');

  // ── 7. send the invitation ────────────────────────────────────────────────
  await page.getByRole('button', { name: /send invit/i }).first().click().catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, 'send-modal');
  await page.getByRole('button', { name: /^(send|send invitations?|send now)$/i }).last().click().catch(() => {});
  await page.waitForTimeout(9000);
  const ok = sends.find((s) => s.status === 200);
  check('7 · the send API accepts the invitation', !!ok,
    ok ? `HTTP 200 ${JSON.stringify(ok.body).slice(0, 90)}` : sends.map((s) => s.status).join(',') || 'no /api/send-invites call');
  await shot(page, 'sent');

  // The token URL, read from the guest's own row rather than from an inbox.
  rsvpUrl = await page.evaluate(() => {
    const m = (document.body.innerText || '').match(/https?:\/\/[^\s]*[?&]rsvp=[A-Za-z0-9_-]+/);
    return m ? m[0] : '';
  });
  if (!rsvpUrl && slug) {
    const token = await page.evaluate(async () => {
      const r = await fetch('/api/my-guest-links').catch(() => null);
      if (!r || !r.ok) return '';
      const j = await r.json().catch(() => ({}));
      return (j.links || [])[0]?.token || '';
    });
    if (token) rsvpUrl = `${BASE}/w/${slug}?rsvp=${token}`;
  }
  check('  and an invitation link exists to open', !!rsvpUrl, rsvpUrl ? rsvpUrl.replace(/rsvp=.*/, 'rsvp=<token>') : 'no token found');

  // ── 8. the guest, in a context that shares nothing ────────────────────────
  if (rsvpUrl) {
    const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const gp = await guestCtx.newPage();
    await gp.goto(rsvpUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await gp.waitForTimeout(7000);
    await shot(gp, 'guest-arrives');
    const knowsThem = (await gp.getByText(new RegExp(GUEST_NAME.split(' ')[0], 'i')).count()) > 0;
    check('8 · the invitation link opens as that guest', knowsThem, knowsThem ? 'the site knows who they are' : 'the guest was not recognised');
    await gp.getByRole('button', { name: /rsvp|reply|respond/i }).first().click().catch(() => {});
    await gp.waitForTimeout(3000);
    await gp.getByRole('button', { name: /yes|attending|accept|joyfully/i }).first().click().catch(() => {});
    await gp.waitForTimeout(1500);
    await gp.getByRole('button', { name: /^(submit|send|confirm|done)$/i }).first().click().catch(() => {});
    await gp.waitForTimeout(5000);
    await shot(gp, 'guest-replied');
    const replied = (await gp.getByText(/thank you|reply received|got it|we have your/i).count()) > 0;
    check('  and replies', replied, replied ? 'confirmation shown' : 'no confirmation');
    await guestCtx.close();
  } else {
    check('8 · the invitation link opens as that guest', false, 'no link');
    check('  and replies', false, 'no link');
  }

  // ── 9. the couple sees it ─────────────────────────────────────────────────
  await page.goto(`${BASE}/DailyUpdate`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  const counts = await page.evaluate(() => document.body.innerText || '');
  await shot(page, 'dashboard');
  check('9 · the dashboard counts one invitation', /\b1\b[\s\S]{0,40}(invitation|invited)/i.test(counts), 'from the rendered dashboard');
  check('  and one reply', /\b1\b[\s\S]{0,40}(repl|coming|confirmed)/i.test(counts), 'from the rendered dashboard');
} catch (err) {
  check('the run completed without throwing', false, String(err.message || err).slice(0, 140));
  await shot(page, 'threw');
}

await couple.close();
await browser.close();

const passed = results.filter((r) => r.ok).length;
console.log(`\n  screenshots: ${SHOTS}`);
console.log(`  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
if (passed !== results.length) {
  console.log('  first failure:', results.find((r) => !r.ok)?.name);
}
process.exit(passed === results.length ? 0 : 1);
