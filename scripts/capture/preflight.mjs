/**
 * scripts/capture/preflight.mjs
 *
 * Must pass before any capture runs, per the standing rule for this suite:
 * this drives the REAL production account and the REAL John & Suzanne
 * wedding. This script only logs in and looks — it never clicks anything
 * that creates, edits, sends, or deletes.
 *
 * Checks, in order:
 *   1. Email/password login succeeds. If the account turns out to require
 *      Google SSO (no password form reachable, or login silently fails),
 *      this STOPS and reports rather than attempting to automate OAuth.
 *   2. Lands on /Dashboard (not /onboarding — an empty/fresh account).
 *   3. Dashboard shows "John" and "Suzanne" — the expected wedding, not an
 *      empty or stray record.
 *   4. No trial/upgrade banner on the dashboard, AND /account's plan badge
 *      reads exactly "Ultra" (not "Free trial" or "Pro").
 *
 * Usage: node scripts/capture/preflight.mjs
 * Exit code 0 = clear to capture. Non-zero = stop, read the report.
 */
import { chromium } from 'playwright';
import { BASE_URL, TEST_EMAIL, TEST_PASSWORD, STATE_FILE, VIEWPORT_DESKTOP, requireCredentials, OUT_DIR } from './config.mjs';
import path from 'node:path';

requireCredentials();

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT_DESKTOP, deviceScaleFactor: 2 });
const page = await context.newPage();

const report = { steps: [], ok: true };
function fail(step, detail) {
  report.ok = false;
  report.steps.push({ step, ok: false, detail });
  console.error(`✗ ${step}: ${detail}`);
}
function pass(step, detail) {
  report.steps.push({ step, ok: true, detail });
  console.log(`✓ ${step}${detail ? ` — ${detail}` : ''}`);
}

try {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

  const emailField = page.getByPlaceholder(/you@example\.com/i);
  const passwordField = page.getByPlaceholder('••••••••');
  const hasPasswordForm = await emailField.count() > 0 && await passwordField.count() > 0;

  if (!hasPasswordForm) {
    fail('Email/password login form', 'No email/password fields found on /login — this account may be SSO-only. Stopping without attempting OAuth automation, per standing instruction.');
    throw new Error('preflight-stop');
  }

  await emailField.fill(TEST_EMAIL);
  await passwordField.fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /log in/i }).click();

  const landed = await Promise.race([
    page.waitForURL(/\/Dashboard/, { timeout: 15_000 }).then(() => 'dashboard'),
    page.waitForURL(/\/onboarding/, { timeout: 15_000 }).then(() => 'onboarding'),
    page.waitForSelector('text=/invalid|incorrect|error/i', { timeout: 15_000 }).then(() => 'error'),
  ]).catch(() => 'timeout');

  if (landed === 'error') {
    const msg = await page.locator('text=/invalid|incorrect|error/i').first().textContent().catch(() => '(could not read error text)');
    fail('Login', `Login rejected the credentials: "${msg}". Stopping — do not retry with guessed variations.`);
    throw new Error('preflight-stop');
  }
  if (landed === 'onboarding') {
    fail('Login lands on real wedding', 'Logged in, but redirected to /onboarding — this account has no wedding data. Expected John & Suzanne already set up.');
    throw new Error('preflight-stop');
  }
  if (landed === 'timeout') {
    fail('Login', `Did not land on /Dashboard or /onboarding within 15s. Current URL: ${page.url()}`);
    throw new Error('preflight-stop');
  }
  pass('Email/password login', `landed on ${page.url()}`);

  await page.waitForLoadState('networkidle');
  const bodyText = await page.locator('body').innerText();

  if (!/John/i.test(bodyText) || !/Suzanne/i.test(bodyText)) {
    fail('Correct wedding loaded', `Dashboard body text does not contain both "John" and "Suzanne". First 200 chars: ${bodyText.slice(0, 200).replace(/\n/g, ' ')}`);
  } else {
    pass('Correct wedding loaded', 'Dashboard mentions John and Suzanne');
  }

  if (/free trial|trial expired|upgrade your plan/i.test(bodyText)) {
    fail('No trial/upgrade banner on dashboard', 'Dashboard body text matches a trial/upgrade banner pattern.');
  } else {
    pass('No trial/upgrade banner on dashboard');
  }

  await context.storageState({ path: STATE_FILE });

  // Plan check via /account — separate navigation, still look-only. The
  // plan badge lives under the "Billing" tab, not the default "Settings"
  // tab; clicking a tab is a pure view-state change, not a mutation.
  await page.goto(`${BASE_URL}/account`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Billing', exact: true }).first().click();
  await page.waitForTimeout(500);
  const ultraBadgeCount = await page.getByText('Ultra', { exact: true }).count();
  const freeBadgeCount = await page.getByText('Free trial', { exact: true }).count();
  if (ultraBadgeCount >= 1 && freeBadgeCount === 0) {
    pass('Plan is Ultra', `/account shows "Ultra" badge (${ultraBadgeCount} match(es)), no "Free trial" badge`);
  } else {
    fail('Plan is Ultra', `/account plan badge check failed — Ultra matches: ${ultraBadgeCount}, Free trial matches: ${freeBadgeCount}. Real plan may not be Ultra.`);
  }

  const screenshotPath = path.join(OUT_DIR, 'preflight-account.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`\nEvidence screenshot: ${screenshotPath}`);
} catch (err) {
  if (err.message !== 'preflight-stop') {
    fail('Unexpected error', err.message);
  }
} finally {
  await browser.close();
}

console.log('\n' + '='.repeat(60));
console.log(report.ok ? '✓ PRE-FLIGHT PASSED — clear to capture.' : '✗ PRE-FLIGHT FAILED — do not proceed. See failures above.');
console.log('='.repeat(60));
process.exit(report.ok ? 0 : 1);
