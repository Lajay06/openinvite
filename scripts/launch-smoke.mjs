/* global document, window, localStorage */
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

// The couple the wizard is completed as. Two names, because the product asks
// for two and derives the address from both: slugRootFromNames joins them with
// the word "and", so these produce `smoke-and-alias` — NOT `smoke-alias`,
// which is what slugifying the display string "Smoke & Alias" would give and
// is not a path any code takes.
// VITE_BASE44_APP_ID, the name every server endpoint here reads.
const APP_ID = fromEnvFile('VITE_BASE44_APP_ID') || process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

const COUPLE1 = 'Smoke';
const COUPLE2 = 'Alias';

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

/**
 * An observation that is not a gate. Printed, never counted, never throws.
 *
 * Reserved for things the RUN could not cover rather than things the PRODUCT
 * got wrong — a distinction this file needs because a failed check stops the
 * journey, and stopping on "onboarding only happens once" would report seven
 * working steps as unreached.
 */
const notes = [];
const note = (name, ok, detail) => {
  notes.push({ name, ok, detail });
  console.log(`  ${ok ? 'NOTE' : 'GAP '}  ${name}  (${detail})`);
};

/**
 * THE RUN PUTS A SITE ON THE INTERNET, SO THE RUN TAKES IT DOWN AGAIN.
 *
 * Step 5 publishes smoke-and-alias to openinvite.com.au, and before this
 * existed it stayed published — between runs, indefinitely, a test fixture
 * live at a real address on the production domain.
 *
 * It unpublishes the way the couple would: smoke01's OWN token, read from the
 * browser it is already signed into, against its own record. Not the admin
 * key, which would let this reach records that are not the account's, and
 * which no normal action uses.
 *
 * It runs from the `finally`, not the happy path. A journey that stops at step
 * 7 has already published at step 5 — the run that leaves a site up is
 * precisely the run that went wrong.
 */
async function unpublish(page) {
  try {
    const r = await page.evaluate(async (appId) => {
      const token = localStorage.getItem('base44_access_token');
      if (!token) return { ok: false, why: 'no token in the browser' };
      const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      // ── OWNER-SCOPED, THROUGH THE PRODUCT'S OWN RESOLVER ────────────────
      //
      // This listed the WHOLE WeddingDetails collection and took the newest.
      // The caller's token can read rows it does not own, so on 2026-09-14 it
      // resolved a DIFFERENT COUPLE'S record — created minutes earlier by
      // another account — and sent it a PUT. Base44's RLS answered 403 and
      // nothing was written, but the refusal came from the platform, not from
      // this script, and a teardown must not be relying on that.
      //
      // It is the exact defect src/lib/resolveMyWedding.js was written to fix
      // ("previously this was resolved as WeddingDetails.list()[0] … Any other
      // account creating a newer record made it appear on every other user's
      // dashboard"), reproduced here by hand. /api/my-wedding-details filters
      // by created_by_id server-side and cannot return someone else's row.
      const mine = await fetch('/api/my-wedding-details', { headers: h })
        .then((x) => (x.ok ? x.json() : null)).catch(() => null);
      if (!mine?.id) return { ok: false, why: 'no record of my own to unpublish' };
      const res = await fetch(`https://base44.app/api/apps/${appId}/entities/WeddingDetails/${mine.id}`, {
        method: 'PUT', headers: h, body: JSON.stringify({ websiteEnabled: false }),
      });
      if (!res.ok) return { ok: false, why: `PUT ${res.status}`, id: mine.id };
      // READ BACK. A 200 on a write is not evidence the field holds the value.
      const after = await fetch(`https://base44.app/api/apps/${appId}/entities/WeddingDetails/${mine.id}`, { headers: h })
        .then((x) => x.json()).catch(() => null);
      return { ok: after?.websiteEnabled === false, why: `websiteEnabled=${JSON.stringify(after?.websiteEnabled)}`, id: mine.id, slug: after?.slug };
    }, APP_ID);
    console.log(`  teardown: ${r.ok ? 'unpublished' : 'DID NOT UNPUBLISH'} — ${r.why}${r.slug ? ` (/w/${r.slug})` : ''}${r.id ? ` on ${r.id}` : ''}`);
    return r.ok;
  } catch (e) {
    console.log(`  teardown: DID NOT UNPUBLISH — ${String(e.message || e).slice(0, 120)}`);
    return false;
  }
}

/**
 * The dashboard's own counts, read as numbers rather than matched as a string.
 *
 * The check used to be /\b1\b …(invitation|invited)/ — a literal ONE. That is
 * true only of an account with exactly one guest, which the smoke account
 * stopped being several runs ago, and it is the "measuring the fixture" shape
 * again: an assertion about the state a run happens to start in rather than
 * about what the run did. Counts are captured before the guest is added and
 * again at the end, and the step asserts they MOVED.
 */
const countsOn = async (page) => page.evaluate(() => {
  const t = (document.body.innerText || '').replace(/\s+/g, ' ');
  const near = (words) => {
    const m = t.match(new RegExp(`(\\d+)\\s*(?:[a-z ]{0,12})?(?:${words})`, 'i'))
      || t.match(new RegExp(`(?:${words})[^0-9]{0,20}(\\d+)`, 'i'));
    return m ? Number(m[1]) : null;
  };
  // THE DASHBOARD'S OWN LABELS, not words that sound like them. The loose
  // pattern matched "6 invitations still to reply" from the headline — which
  // is invitations PENDING and legitimately need not change when a guest who
  // was already invited replies — and reported "invited 6 -> 6" on a run that
  // had worked. "Your numbers" is where the figures live: People invited,
  // Guests coming.
  return { invited: near('People invited'), replied: near('Guests coming') };
});

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
  '9 · the dashboard counts the invitation this run sent',
  '  and the reply this run made',
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
  let body = null, text = null;
  try { body = await r.json(); } catch { text = await r.text().catch(() => null); }
  sends.push({ status: r.status(), body, text: text ? text.slice(0, 300) : null });
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
  //
  // ── THE LOOP NEVER RAN, AND THE STEP PASSED ANYWAY ────────────────────────
  //
  // Two faults, compounding. The advance button reads "Continue →" and the
  // pattern was anchored `/^(next|continue|…)$/` — the arrow is part of the
  // accessible name, so nothing ever matched. And step 1 hides its Continue
  // until BOTH names are typed, which this never did, so there was no button
  // to match in the first place. `count() === 0` then `break`, on the first
  // iteration, every run.
  //
  // Step 2 still passed, because its assertion is about the URL and a
  // returning account lands on /DailyUpdate regardless. So the record came out
  // of "onboarding" with no couple on it — which is precisely the shape that
  // made a wedding publish to an address that did not exist, and the reason
  // claim-slug answers {slug: null, reason: 'no-names'}.
  //
  // The wizard is now actually driven: the names are typed, the advance
  // matches the button that exists, optional steps take their own skip, and
  // the number of screens crossed is reported so a loop that does nothing
  // cannot look like a loop that finished.
  // GO WHERE THE WIZARD IS. Login lands on the dashboard for an account that
  // is past the plan step, and the loop below was reading whatever screen that
  // happened to be. The wizard is at /onboarding; an account that has already
  // finished it is redirected away, and that redirect is a RESULT — it says
  // this alias cannot be used to test a first run — not something to paper
  // over with a wait.
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3500);
  const atWizard = /\/onboarding\b/.test(new URL(page.url()).pathname);
  await shot(page, 'onboarding-entry');

  // ── THE WIZARD, MODELLED BY ITS SCREENS ───────────────────────────────────
  //
  // A generic "click the first plausible button" loop was tried and abandoned.
  // It stalled on four different screens in four runs, and each stall was a
  // real shape it could not know about: welcome has no fields, names hides
  // Continue until both are filled, guest count has no Continue at all because
  // choosing IS continuing, and wedding type is an accordion whose Continue
  // appears only after a selection — so the first non-Back button there is a
  // section toggle that advances nothing.
  //
  // Worse, a loop that clicks something and checks nothing is the instrument
  // that produced the vacuous pass this step is being fixed for. Guessing
  // harder does not make it honest.
  //
  // So the eight screens are named, from src/pages/Onboarding.jsx's own STEPS
  // and the components it renders. Each says how to RECOGNISE it and what a
  // couple DOES on it. A screen that does not appear is skipped and recorded;
  // a screen nobody modelled stops the run and prints what was on it, which is
  // the only honest thing to do with a wizard that has grown a step.
  let named = false;

  /**
   * The wizard animates each screen in (framer-motion), and a click landing
   * mid-transition hits where the control WAS. This waits for the animations
   * to finish rather than for a number of milliseconds — raced against a
   * ceiling so a spinner elsewhere on the page cannot hang the run.
   */
  const stillMoving = () => Promise.race([
    page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))).then(() => true)),
    new Promise((r) => setTimeout(() => r(false), 5000)),
  ]).catch(() => false);

  const SCREENS = [
    { name: 'welcome',
      at: () => page.getByRole('button', { name: 'Get started', exact: true }),
      act: async (l) => l.click() },

    { name: 'names',
      at: () => page.getByPlaceholder('Your name'),
      act: async () => {
        await page.getByPlaceholder('Your name').fill(COUPLE1);
        await page.getByPlaceholder("Partner's name").fill(COUPLE2);
        named = (await page.getByPlaceholder('Your name').inputValue()) === COUPLE1
          && (await page.getByPlaceholder("Partner's name").inputValue()) === COUPLE2;
        // Continue only renders once both hold a value — that is the screen's
        // own rule, and waiting for it is how this step proves it obeyed it.
        await page.getByRole('button', { name: /^Continue/ }).first().click();
      } },

    // Date and location are genuinely optional and each offers its own way
    // past, worded for its own question rather than a generic Skip. The smoke
    // takes those: a wedding with no date is a real thing a couple has.
    { name: 'date',
      at: () => page.getByRole('button', { name: /^We haven't set a date yet/ }),
      act: async (l) => l.click() },

    { name: 'location',
      at: () => page.getByRole('button', { name: /^Not sure yet/ }),
      act: async (l) => l.click() },

    { name: 'guestCount',
      at: () => page.getByText('How many guests are you expecting?'),
      act: async () => page.getByRole('button', { name: 'Celebration', exact: false }).first().click() },

    { name: 'weddingType',
      // Five sections now, not three — round two item 7 replaced Style /
      // Ceremony type & faith / Vibe with the five Event details asks.
      at: () => page.getByRole('button', { name: /^Atmosphere$/ }),
      act: async (l) => {
        // Open a section, choose one pill, and only then does Continue exist.
        await l.click();
        await page.waitForTimeout(500);
        const pills = page.getByRole('button').filter({ hasNotText: /aesthetic|Atmosphere|Setting|Cultures and traditions|Faith or religion|Back|Continue/ });
        if (await pills.count() > 0) await pills.first().click();
        await page.waitForTimeout(400);
        await page.getByRole('button', { name: /^Continue/ }).first().click();
      } },

    { name: 'ava',
      at: () => page.getByRole('button', { name: /^Got it, let's go/ }),
      act: async (l) => l.click() },

    { name: 'universe',
      at: () => page.getByRole('button', { name: /^Skip for now/ }),
      act: async (l) => l.click() },

    // TWO BUTTONS BOTH READ "Select", and picking the wrong one takes the
    // five-screen path instead of finishing. Scoped to the card that carries
    // the heading, never .first() — the same lesson as the login form, where
    // an ambiguous query clicked the header icon and photographed an empty
    // page that looked exactly like a rejected password.
    { name: 'fork',
      at: () => page.getByText('Get started now', { exact: true }),
      act: async () => {
        const card = page.locator('div').filter({ hasText: /^Get started now/ }).last();
        await card.getByRole('button', { name: 'Select', exact: true }).click();
      } },

    // The last screen arrives after the fork's own save, so it is slower than
    // the rest and gets its own budget.
    { name: 'completion',
      at: () => page.getByRole('button', { name: /^Let's go/ }),
      wait: 20000,
      act: async (l) => l.click() },
  ];

  const crossedNames = [];
  let unknownScreen = null;
  for (const screen of SCREENS) {
    if (!/\/onboarding\b/.test(new URL(page.url()).pathname)) break;
    const l = screen.at().first();
    // A short wait, not a long one: this asks "is this screen up", and the
    // answer is usually no for the screens that are not this one.
    const here = await l.waitFor({ state: 'visible', timeout: screen.wait || 6000 }).then(() => true, () => false);
    if (!here) continue;
    await screen.act(l).catch((e) => { unknownScreen = `${screen.name}: ${String(e.message).slice(0, 80)}`; });
    crossedNames.push(screen.name);
    await page.waitForTimeout(1600);
    await stillMoving();
  }
  const crossed = crossedNames.length;
  await shot(page, 'onboarding-crossed');

  // WAIT FOR THE DESTINATION, NOT FOR A NUMBER OF SECONDS. Login lands on
  // /choose-plan, which is "the single, account-state-gated landing point for
  // every successful auth" — and for an account past the plan step it
  // immediately redirects on. Sampling the URL during that hop read
  // `/choose-plan?next=%2FDailyUpdate` and failed step 2 on a product that was
  // working; the run before it, on the same account and the same build,
  // passed. A fixed wait that is usually long enough is the worst kind, and
  // this is the second place in this file to learn it.
  await page.waitForURL((u) => !/\/(choose-plan|login|register)\b/.test(u.pathname), { timeout: 30000 })
    .catch(() => {});
  // AND WAIT FOR THE WIZARD'S OWN EXIT, which is a second navigation. The
  // completion screen sends the couple on by itself, and the first version of
  // this asked "are we still in the wizard" BEFORE that had happened — so a
  // run that finished onboarding correctly reported "STALLED on an unmodelled
  // screen: You're all set, Smoke." The screen it named was the last one,
  // doing exactly what it is for. Asking a question before the answer can be
  // true is the same defect as asserting one that was already true.
  await page.waitForURL((u) => !/\/onboarding\b/.test(u.pathname), { timeout: 30000 }).catch(() => {});
  await shot(page, 'onboarding-end');

  // A SCREEN NOBODY MODELLED IS A RESULT, NOT A SHRUG. If the run is STILL in
  // the wizard once it has had its chance to leave, the wizard has a step this
  // file does not know about, and the report has to say which.
  let stalledAt = unknownScreen;
  if (!stalledAt && /\/onboarding\b/.test(new URL(page.url()).pathname)) {
    const heading = await page.evaluate(() => {
      const h = document.querySelector('h1, h2, h3');
      const step = (document.body.innerText.match(/Step\s+\d+\s+of\s+\d+/i) || [''])[0];
      return `${step} "${(h?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60)}"`;
    });
    stalledAt = `an unmodelled screen — ${heading}`;
  }
  // ARRIVAL, not absence. "the url is not /onboarding" is true of a browser
  // that never got past the register page.
  const onboarded = /\/(DailyUpdate|dashboard|studio)/i.test(page.url())
    || (await page.getByText(/daily update|your wedding planning briefing/i).count()) > 0;
  // PRESENCE BEFORE PROPERTIES. "Arrived at the dashboard" is true of an
  // account that was already past onboarding and never filled anything in, so
  // the names and the screens crossed are part of the verdict, not decoration.
  // WHAT THE STEP CAUSED, WHICH IS NOT THE SAME AS WHAT IT TYPED.
  //
  // The wizard RESUMES. A run that reaches the names screen types them; the
  // next run resumes past it, and demanding "typed here" would fail forever on
  // an account that has ever been part-way through — which is every account
  // after the first run, because the OTP gate means there is only one account.
  //
  // So the step asserts the outcome it is actually for: it started inside the
  // wizard, it left the wizard, and the couple is on the record afterwards.
  // All three are false before the step and true after, which is the test.
  const onRecord = await page.evaluate(async () => {
    const token = localStorage.getItem('base44_access_token');
    if (!token) return null;
    // OWNER-SCOPED. The unfiltered list here read another couple's record and
    // reported their names as this account's — see the teardown's own note.
    const mine = await fetch('/api/my-wedding-details', { headers: { Authorization: `Bearer ${token}` } })
      .then((x) => (x.ok ? x.json() : null)).catch(() => null);
    return mine?.id ? { id: mine.id, names: [mine.couple1Name, mine.couple2Name].filter(Boolean), draft: mine.onboardingDraft } : null;
  });
  const couple = (onRecord?.names || []).join(' & ');
  // ── TWO QUESTIONS, BECAUSE ONBOARDING HAPPENS ONCE ────────────────────────
  //
  // "Has this couple completed onboarding" and "does the wizard work" are not
  // the same question, and conflating them made this step unanswerable.
  //
  // Onboarding is a once-per-account journey. Once the smoke account finished
  // it — which it did, crossing five screens and claiming smoke-and-alias —
  // /onboarding correctly redirects it away forever, and a step demanding
  // "screens were crossed" can never pass again. The OTP gate means there is
  // one account, so there is no fresh one to use.
  //
  // Collapsing that into a pass would be the vacuous assertion this file was
  // just fixed for: "the account is onboarded" is true before the step runs.
  // Collapsing it into a failure is worse — it stops the journey at step 2 and
  // reports steps 3-9 as unreached on a product where they work.
  //
  // So: the OUTCOME is step 2, and it is a real precondition for everything
  // after it. Whether the wizard was exercised is its own line, and it is a
  // pass only when this run actually drove it.
  const outcome = onboarded && couple === `${COUPLE1} & ${COUPLE2}`;
  check('2 · reaches the end of onboarding', outcome,
    `${page.url()} — record ${onRecord?.id || 'none'} holds ${couple ? `"${couple}"` : 'NO NAMES'}`
    + `, draft ${onRecord?.draft === false ? 'cleared' : JSON.stringify(onRecord?.draft)}`);
  // A NOTE, NOT A CHECK, AND THE DIFFERENCE MATTERS.
  //
  // A failed check THROWS and stops the journey — deliberately, so that "not
  // reached" means not executed. That is right for a broken product and wrong
  // here: the wizard not being re-runnable is the product working correctly,
  // and halting on it reports steps 3-9 as unreached on a build where they are
  // fine. It is a limit on what this run could COVER, not a defect it found.
  //
  // It is still printed, and still says plainly that nothing here exercised
  // the wizard, because a coverage gap that is invisible is how a suite ends
  // up green over code nobody has run.
  note('the wizard itself was exercised by this run', atWizard && crossed > 0 && !stalledAt,
    atWizard
      ? `${crossed} screen(s) crossed: ${crossedNames.join(' -> ') || 'none'}${stalledAt ? `, STALLED on ${stalledAt}` : ''}`
      : 'redirected away — this account finished onboarding on an earlier run, and it only happens once');
  note('the names were typed by this run', named, named ? `${COUPLE1} & ${COUPLE2}` : 'they were already on the record');

  // The baseline, read before this run adds a guest or sends anything, so
  // step 9 can assert movement rather than a number.
  //
  // AND IT WAITS FOR THE NUMBERS. The first version read immediately after the
  // wizard's redirect and got `invited=null, replied=null` — the dashboard had
  // not rendered its counts yet — so step 9 compared null to 6 and failed on a
  // product that was working. A baseline that is not there is not a baseline;
  // reading it too early is the same "asked before the answer could be true"
  // mistake as the unmodelled-screen verdict, one step along.
  await page.goto(`${BASE}/DailyUpdate`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  let dashBefore = { invited: null, replied: null };
  for (let i = 0; i < 15; i++) {
    dashBefore = await countsOn(page);
    if (dashBefore.invited !== null && dashBefore.replied !== null) break;
    await page.waitForTimeout(2000);
  }
  console.log(`  dashboard before: invited=${dashBefore.invited}, replied=${dashBefore.replied}`);

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
  // VISITED, NOT FETCHED, AND FROM A BROWSER THAT IS NOT SIGNED IN.
  //
  // The in-page fetch read HTTP 0 on a site that was live. Login lands on
  // www.openinvite.com.au and BASE is the apex, so the couple's tab was asking
  // a different origin and CORS refused it — the probe's own failure, reported
  // in the shape of a dead address.
  //
  // Navigating is both immune to that and closer to the truth: a guest does
  // not fetch the page, they open it, and they open it as a stranger. A fresh
  // context with no token is what proves the address works for someone who is
  // not the couple — an authenticated read could pass on a site no guest can
  // see.
  let live = 0;
  if (slug) {
    const strangerCtx = await browser.newContext();
    const stranger = await strangerCtx.newPage();
    const resp = await stranger.goto(`${BASE}/w/${slug}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      .catch(() => null);
    live = resp ? resp.status() : 0;
    await shot(stranger, 'published-as-a-stranger');
    await strangerCtx.close();
  }
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
  // A BARE STATUS IS NOT A DIAGNOSIS. This reported "500" and nothing else,
  // which names the floor the failure happened on and not the room. The
  // endpoint's own error body is what says why, so it is printed — and when
  // the body is not JSON, the raw text is, because "not json" was the other
  // thing this could silently swallow.
  const ok = sends.find((x) => x.status === 200);
  const failed = sends.filter((x) => x.status !== 200);
  check('7 · the send API accepts the invitation', !!ok,
    ok ? `HTTP 200 ${JSON.stringify(ok.body).slice(0, 90)}`
      : failed.length
        ? failed.map((x) => `HTTP ${x.status} ${JSON.stringify(x.body ?? x.text ?? null).slice(0, 220)}`).join(' | ')
        : 'no /api/send-invites call was made at all');
  await shot(page, 'sent');

  // The token URL, read from the guest's own row rather than from an inbox.
  let linkWhy = null;
  rsvpUrl = await page.evaluate(() => {
    const m = (document.body.innerText || '').match(/https?:\/\/[^\s]*[?&]rsvp=[A-Za-z0-9_-]+/);
    return m ? m[0] : '';
  });
  // ── THE FALLBACK WAS WRONG IN FOUR WAYS, AND ALL FOUR WERE SHAPE ─────────
  //
  // It GET'd a POST-only endpoint, sent no Authorization header, indexed the
  // response with `[0]` when `links` is an OBJECT KEYED BY GUEST ID, and then
  // built `/w/<slug>?rsvp=<token>` when the product's own link is
  // `<origin>/rsvp/<token>` (SendInvitesModal's RSVP_BASE).
  //
  // That is the same class as the defect this run was verifying — reading a
  // shape that is not there — and it reported "no token found", which names
  // the symptom and blames the product. The endpoint already returns the
  // finished URL, so the smoke stops constructing one at all: constructing it
  // was how the shape got a chance to be wrong.
  if (!rsvpUrl) {
    const found = await page.evaluate(async () => {
      const token = localStorage.getItem('base44_access_token');
      // The guest this run just added, by its own row, so the link belongs to
      // the guest the rest of the journey is about.
      const mine = await fetch('/api/my-guests', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const rows = mine?.guests || mine?.data || (Array.isArray(mine) ? mine : []);
      const guest = rows.find((g) => /notiftest01/.test(g.email || '')) || rows[0];
      if (!guest?.id) return { why: `no guest row (${rows.length} read)` };
      const r = await fetch('/api/my-guest-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ guestIds: [guest.id] }),
      }).catch(() => null);
      if (!r || !r.ok) return { why: `my-guest-links HTTP ${r ? r.status : 'no response'}` };
      const j = await r.json().catch(() => ({}));
      const entry = j.links?.[guest.id];
      return entry?.rsvpUrl ? { url: entry.rsvpUrl } : { why: `no link for ${guest.id} in ${JSON.stringify(Object.keys(j.links || {}))}` };
    });
    if (found.url) rsvpUrl = found.url;
    else linkWhy = found.why;
  }
  check('  and an invitation link exists to open', !!rsvpUrl,
    rsvpUrl ? rsvpUrl.replace(/\/rsvp\/.*/, '/rsvp/<token>') : (linkWhy || 'no token found'));

  // ── 8. the guest, in a context that shares nothing ────────────────────────
  if (rsvpUrl) {
    const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const gp = await guestCtx.newPage();
    await gp.goto(rsvpUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await gp.waitForTimeout(7000);
    await shot(gp, 'guest-arrives');
    const knowsThem = (await gp.getByText(new RegExp(GUEST_NAME.split(' ')[0], 'i')).count()) > 0;
    check('8 · the invitation link opens as that guest', knowsThem, knowsThem ? 'the site knows who they are' : 'the guest was not recognised');
    // ── THE PAGE COMMITS ON THE TAP, AND SAYS SO IN ITS OWN WORDS ─────────
    //
    // This was three guessed labels behind .catch(() => {}) — rsvp|reply|
    // respond, then yes|attending|accept|joyfully, then a submit button — and
    // it reported "no confirmation", which blames the product for the guess.
    //
    // RSVPPage has no submit button by design: "nothing here is waiting to be
    // submitted". It has three phases and three sentences (RSVPPage:920-925):
    //
    //   ask       "… would love to know if you can join them to celebrate."
    //   declined  "Thank you for letting us know."
    //   accepted  "You are counted in. …"
    //
    // AND THE OLD PATTERN WOULD HAVE PASSED ON A DECLINE. It matched
    // /thank you/, which is the DECLINED sentence — so a guest who said no
    // would have been reported as having replied yes. A wrong pass, not a
    // missing one.
    //
    // The phase is read before and after, because "you are counted in" can
    // already be true when the page opens: a guest who replied on an earlier
    // run is still counted in, and asserting it on arrival would be measuring
    // the fixture.
    const phaseOf = async () => {
      if (await gp.getByText('You are counted in').count() > 0) return 'accepted';
      if (await gp.getByText('Thank you for letting us know').count() > 0) return 'declined';
      if (await gp.getByText(/would love to know if you can join/).count() > 0) return 'ask';
      return 'unknown';
    };
    const before = await phaseOf();
    // THE PRIMARY QUESTION COMES FIRST, AND THE EVENT CARDS DO NOT EXIST YET.
    //
    // In the `ask` phase the page shows two large buttons and nothing else —
    // "Yes, I will be there" / "Sorry, I can't make it" (RSVPPage:939-940) —
    // and it commits on the tap. The per-event Attending / Can't make it cards
    // are the REFINEMENT that appears afterwards, which is why looking for
    // them first found "0 event card(s), phase ask -> ask": the page was
    // waiting to be asked the only question it exists to ask.
    const yes = gp.getByRole('button', { name: 'Yes, I will be there', exact: true });
    const asked = await yes.count() > 0;
    if (asked) {
      await yes.first().click({ timeout: 10000 }).catch(() => {});
      await gp.waitForTimeout(4000);
    }
    // Then the refinement, if the couple's events are itemised at all.
    const attending = gp.getByRole('button', { name: 'Attending', exact: true });
    const cards = await attending.count();
    for (let i = 0; i < cards; i++) {
      await attending.nth(i).click({ timeout: 8000 }).catch(() => {});
      await gp.waitForTimeout(700);
    }
    await gp.waitForTimeout(4000);
    await shot(gp, 'guest-replied');
    const after = await phaseOf();
    check('  and replies', after === 'accepted',
      `phase ${before} -> ${after}; primary question ${asked ? 'answered' : 'not shown'}, ${cards} event card(s) refined`
      + (before === 'accepted' ? ' (already counted in when the link opened)' : ''));
    await guestCtx.close();
  } else {
    check('8 · the invitation link opens as that guest', false, 'no link');
    check('  and replies', false, 'no link');
  }

  // ── 9. the couple sees it ─────────────────────────────────────────────────
  await page.goto(`${BASE}/DailyUpdate`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  const after = await countsOn(page);
  await shot(page, 'dashboard');
  const moved = (a, b) => a !== null && b !== null && b > a;
  check('9 · the dashboard counts the invitation this run sent',
    moved(dashBefore.invited, after.invited),
    `invited ${dashBefore.invited} -> ${after.invited}`);
  check('  and the reply this run made',
    moved(dashBefore.replied, after.replied),
    `replied ${dashBefore.replied} -> ${after.replied}`);
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
} finally {
  // NOT A STEP, AND STILL A RESULT. Teardown is not part of the journey being
  // measured, but a run that leaves a site published on the production domain
  // has not finished, so it is recorded and it can fail the run.
  const down = await unpublish(page);
  results.push({ name: 'teardown · the site is not left live', ok: down, detail: down ? 'websiteEnabled=false, read back' : 'still published — unpublish by hand' });
}

await couple.close();
await browser.close();

const passed = results.filter((r) => r.ok).length;
const gaps = notes.filter((n) => !n.ok);
if (gaps.length) {
  console.log(`\n  ${gaps.length} coverage gap(s) — not product failures:`);
  for (const g of gaps) console.log(`    ${g.name} — ${g.detail}`);
}
console.log(`\n  screenshots: ${SHOTS}`);
console.log(`  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
if (passed !== results.length) {
  console.log('  first failure:', results.find((r) => !r.ok)?.name);
}
process.exit(passed === results.length ? 0 : 1);
