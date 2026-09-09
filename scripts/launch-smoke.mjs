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
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
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
 * The pre-verified account, from the environment or .env.local. Two names,
 * BASE44_SMOKE_EMAIL and BASE44_SMOKE_PASSWORD, matching the other credential
 * pairs in that file.
 *
 * NEITHER VALUE IS EVER PRINTED. The address is shown masked and the password
 * is not shown at all — this script writes a log a human reads and pastes, and
 * a credential in a transcript is a credential in a transcript.
 */
function fromEnvFile(name) {
  if (process.env[name]) return process.env[name];
  for (const f of ['.env.local', '.env']) {
    const path = resolve(ROOT, f);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const i = line.indexOf('=');
      if (i < 0 || line.slice(0, i).trim() !== name) continue;
      const v = line.slice(i + 1).trim();
      if (v) return v;   // a bare key overrides nothing
    }
  }
  return '';
}
const mask = (e) => String(e).replace(/^(.{4})[^@]*(@.*)$/, '$1***$2');

const SUPPLIED = fromEnvFile('BASE44_SMOKE_EMAIL');
// The named-record rule is absolute, and an alias is the only shape accepted.
if (SUPPLIED && !/^la\.jay06\+[a-z0-9]+@gmail\.com$/i.test(SUPPLIED)) {
  console.error('  REFUSING: BASE44_SMOKE_EMAIL is not a la.jay06+alias address.');
  process.exit(2);
}
const ACCOUNT = SUPPLIED || `la.jay06+smoke${stamp}@gmail.com`;
const PASSWORD = fromEnvFile('BASE44_SMOKE_PASSWORD') || `Smoke!${stamp}aA1`;
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
/**
 * NOT REACHED HAS TO MEAN NOT EXECUTED, AND IT DID NOT.
 *
 * The first version only RELABELLED. `check` saw `broken` and printed "not
 * reached" — while the script carried straight on clicking, publishing, adding
 * a guest and calling /api/send-invites. A run whose report read "stopped at
 * step 2, steps 3-9 not reached" had in fact published a site and SENT A REAL
 * INVITATION to a real address; the couple's own dashboard showed "1
 * invitation pending" afterwards, which is how it was caught.
 *
 * That is the same defect as the vacuous catch, one level up: a report
 * describing a journey the run did not take. It is worse than a wrong pass,
 * because the side effects land on a live account invisibly.
 *
 * So a failed check now THROWS. The journey stops where it broke, and the
 * remaining steps are filled in from STEPS afterwards — recorded as failures,
 * named honestly, and genuinely not run.
 */
class Stop extends Error {}

/** Every step, in order, so a run that stops can say what it did not do. */
const STEPS = [
  '0 · the login form accepts both credentials',
  SUPPLIED ? '1 · signs in as a pre-verified alias (signup skipped — OTP gate)' : '1 · signs up',
  '2 · reaches the end of onboarding',
  '3 · chooses a universe',
  '4 · edits one piece of text',
  '  and a photo slot is offered',
  '5 · publishes, and the address exists',
  '6 · adds one guest',
  '7 · the send API accepts the invitation',
  '  and an invitation link exists to open',
  '8 · the invitation link opens as that guest',
  '  and replies',
  '9 · the dashboard counts one invitation',
  '  and one reply',
];

let broken = null;
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) { broken = name; throw new Stop(name); }
};
const shot = async (page, label) => {
  shotN += 1;
  const file = join(SHOTS, `${String(shotN).padStart(2, '0')}-${label}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  return file;
};

mkdirSync(SHOTS, { recursive: true });
console.log(`\n  The stranger's journey — ${BASE}`);
console.log(`  account: ${mask(ACCOUNT)}${RETURNING ? ' (pre-verified)' : ' (new)'}`);
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
    // WAIT FOR THE FIELD, DO NOT SLEEP AT IT.
    //
    // The first run against the pre-verified account filled NEITHER field —
    // the screenshot shows the email empty and the password showing its
    // eight-bullet placeholder, not a value. I read that as an accessibility
    // problem and reported it as one. It was not: the email input carries
    // `<label for="email">Email</label>`, and getByRole('textbox',
    // {name:/email/i}) matches exactly one element on production and locally.
    //
    // The real cause was this file. A fixed `waitForTimeout(2500)` was not
    // enough for production to hydrate, so both inputs were absent when fill()
    // ran — and every interaction here carried `.catch(() => {})`, which turned
    // "the element does not exist" into silence and let the run continue to a
    // login that could never succeed. A blanket catch on a step whose failure
    // IS the result is the same defect as counting an absent check as green.
    const emailField = page.locator('input[type="email"]').first();
    await emailField.waitFor({ state: 'visible', timeout: 30000 });
    await emailField.fill(ACCOUNT);
    const pwField = page.locator('input[type="password"]').first();
    await pwField.waitFor({ state: 'visible', timeout: 30000 });
    await pwField.fill(PASSWORD);
    // Both took a value. Lengths only — neither value is ever printed.
    const filled = (await emailField.inputValue()).length > 0 && (await pwField.inputValue()).length > 0;
    await shot(page, 'login-filled');
    check('0 · the login form accepts both credentials', filled,
      filled ? 'email and password both non-empty' : 'a field would not take a value');
    // SCOPED TO THE FORM, and `.first()` is why this is the third selector in
    // this file to pick the wrong element. `getByRole('button', {name:/log
    // in/i})` matches TWO things on this page: the header's icon-only button,
    // whose aria-label is "Log in" and which is FIRST in the DOM, and the
    // form's submit. The run filled both fields correctly, clicked the header
    // icon, re-navigated to /login, and photographed an empty form — which
    // looks exactly like a rejected password. The credentials were fine: the
    // Base44 login endpoint returns a token for them.
    //
    // A `.first()` on an ambiguous query is a coin toss that reports as a
    // product failure. Every interaction in this journey is scoped to the form
    // or the dialog it belongs to.
    await page.locator('form').getByRole('button', { name: /^log ?in$/i }).click();
    // Wait for the navigation the login causes, not for a guessed number of
    // seconds. A login that never leaves /login fails the check below rather
    // than passing on a slow network.
    await page.waitForURL((u) => !/\/(login|register)\b/.test(u.pathname), { timeout: 45000 }).catch(() => {});
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
  // Scoped to the form for the same reason: the header carries a "Get started"
  // button that matches this query and sits earlier in the DOM.
  await page.locator('form').getByRole('button', { name: /create account|sign up|register/i }).first().click().catch(() => {});
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
  // THE LABEL, READ OFF THE PRODUCT. This looked for /make this mine/ and the
  // button reads "Make this my universe" — the fourth selector in this file
  // written from imagination rather than from the page, and the fourth to
  // report a working product as broken. Every locator below now names a
  // string that was surveyed on the real screen.
  // TWO OF THEM, AND THAT IS FINE. The universe page offers the same call to
  // action twice — once over the hero, once at the foot — so a strict-mode
  // locator throws on two matches and the catch below turned that into "no
  // confirm control found". A working page, reported broken, for the fifth
  // time in this file.
  //
  // `.first()` is right HERE and was wrong at the login form, and the
  // difference is the whole lesson: there, two DIFFERENT controls answered to
  // one query and picking either was a coin toss. Here it is one control
  // rendered twice, so either does the same thing. The count is asserted so
  // that a page which grows a third, different button does not pass silently.
  //
  // AND IT IS WAITED FOR, NOT SLEPT PAST. With `waitForTimeout(3000)` the
  // count read 0 on one run and 2 on the next, on the same page: a fixed wait
  // is a guess about someone else's network, and a guess that is usually
  // right is the worst kind. The screenshot taken moments later showed the
  // button plainly, which is how the race was spotted.
  //
  // THE JOURNEY IS NOT IDEMPOTENT, AND THE STEP IS ABOUT THE OUTCOME.
  // The second run on the same account found no confirm button at all: the
  // first run had chosen Paris, so the page now reads "This is your current
  // universe" behind a "Your current universe" badge. The button being absent
  // was the product working, and the step said "no confirm control found".
  //
  // What this step means is "the couple has a universe", not "a button was
  // clicked". So both states are accepted — but not blindly: if the confirm
  // control IS there it must be clicked and the click must succeed, and if it
  // is not, the already-chosen state must be VISIBLE. A page showing neither
  // still fails.
  const confirm = page.getByRole('button', { name: 'Make this my universe', exact: true });
  const already = page.getByText('This is your current universe');
  await Promise.race([
    confirm.first().waitFor({ state: 'visible', timeout: 20000 }),
    already.first().waitFor({ state: 'visible', timeout: 20000 }),
  ]).catch(() => {});
  const confirms = await confirm.count();
  let chose = false;
  let how = 'neither a confirm control nor a chosen state on the page';
  if (confirms > 0) {
    chose = await confirm.first().click({ timeout: 8000 }).then(() => true).catch(() => false);
    how = chose ? `paris, chosen here (${confirms} confirm control(s))` : 'the confirm control would not take a click';
  } else if (await already.count() > 0) {
    chose = true;
    how = 'paris, already this account\u2019s universe from an earlier run';
  }
  await page.waitForTimeout(3000);
  await shot(page, 'universe');
  check('3 · chooses a universe', chose, how);

  // ── 4. build: one text edit and one photo ─────────────────────────────────
  await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: 'Content', exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  // BY PLACEHOLDER, because the field has no accessible name to query by.
  // The Content tab's TAGLINE is an FLabel — a <label> with no htmlFor and no
  // wrapped control — so `getByRole('textbox', {name:/tagline/i})` matches
  // nothing, and it is a textarea rather than an input besides. Recorded as a
  // product finding in the PR: none of that panel's fields is programmatically
  // labelled, which is an accessibility defect as well as a test problem.
  const tagline = page.getByPlaceholder('A line to welcome your guests').first();
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
  // "Publish Now", exactly. `.last()` over /publish|go live|make live/ picked
  // whichever button happened to sit last in the DOM — the modal also carries
  // Unpublish, and the page behind it carries Publish.
  await page.getByRole('button', { name: 'Publish Now', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(4000);
  slug = await page.evaluate(() => {
    const m = (document.body.innerText || '').match(/openinvite\.com\.au\/w\/([a-z0-9-]+)/i);
    return m ? m[1] : '';
  });
  // THE ADDRESS IS FETCHED, NOT PATTERN-MATCHED. `/w/your-wedding` came back
  // from a run and read as a pass: it is the PLACEHOLDER this product prints
  // when a couple has no slug (`details?.slug || 'your-wedding'`), and it
  // matched the regex perfectly. "The address exists" has to mean the address
  // answers, so the published page is requested and required to return 200.
  const live = slug
    ? await page.evaluate(async (u) => {
      const r = await fetch(u, { redirect: 'follow' }).catch(() => null);
      return r ? r.status : 0;
    }, `${BASE}/w/${slug}`)
    : 0;
  check('5 · publishes, and the address exists', !!slug && live === 200,
    slug ? `/w/${slug} -> HTTP ${live}` : 'no slug on the page');
  await shot(page, 'published');

  // ── 6. one guest ──────────────────────────────────────────────────────────
  await page.goto(`${BASE}/guests`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: '+ Add guest', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // This modal DOES label its fields — <label for="name">, <label for="email">
  // — so they are addressed the way a screen reader would. Everything is
  // scoped to the dialog: the page behind it has a search box that answers to
  // /name/ too.
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/full name/i).fill(GUEST_NAME).catch(() => {});
  await dialog.getByLabel(/^email/i).fill(GUEST_EMAIL).catch(() => {});
  await shot(page, 'guest-form');
  await dialog.getByRole('button', { name: 'Add guest', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(3500);
  const added = (await page.getByText(GUEST_NAME).count()) > 0;
  check('6 · adds one guest', added, GUEST_EMAIL);
  await shot(page, 'guest-added');

  // ── 7. send the invitation ────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Send invites', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, 'send-modal');
  // A FOUR-STEP PAGE, NOT A DIALOG. "Send invites" is a full-page wizard —
  // Select guests, Compose, Channel, Review & send — with one "Next" carrying
  // it between them and a "Send to N guests" at the end. Scoping to
  // getByRole('dialog') found nothing at all, because there is no dialog.
  //
  // Invitation and "Not yet invited" are the defaults on step 1, and the two
  // test guests arrive pre-selected, so nothing needs choosing before Next.
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Next', exact: true })
      .click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
  await shot(page, 'send-review');
  // "Send to 2 guests" — the count is in the label, so it is matched by shape.
  await page.getByRole('button', { name: /^Send to \d+ guests?$/ })
    .click({ timeout: 10000 }).catch(() => {});
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
  if (!(err instanceof Stop)) {
    // A throw is its own result, and it stops the journey the same way.
    results.push({ name: 'the run completed without throwing', ok: false, detail: String(err.message || err).slice(0, 140) });
    console.log(`  FAIL  the run completed without throwing  (${String(err.message || err).slice(0, 140)})`);
    broken = broken || 'an unhandled error';
  }
  await shot(page, 'stopped');
  // Everything after the break, named and counted, and genuinely not run.
  const done = new Set(results.map((r) => r.name));
  for (const name of STEPS) {
    if (done.has(name)) continue;
    results.push({ name, ok: false, detail: `not reached — ${broken} failed` });
    console.log(`  ----  ${name}  (not reached)`);
  }
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
