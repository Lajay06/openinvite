/**
 * scripts/capture/auth.mjs
 *
 * Logs in as the adminopeninvite test account exactly once, then saves
 * Playwright's storageState (cookies + localStorage, which is where the
 * Base44 access token lives — see src/api/base44Client.js) to disk. Every
 * other capture script reuses that saved state instead of logging in again,
 * which is both faster and avoids hammering the login endpoint on every run.
 *
 * Usage: node scripts/capture/auth.mjs   (run once, or whenever the saved
 * session expires — the stills/videos scripts will tell you if it has).
 */
import { chromium } from 'playwright';
import { BASE_URL, TEST_EMAIL, TEST_PASSWORD, STATE_FILE, VIEWPORT_DESKTOP, requireCredentials } from './config.mjs';

export async function login(browser) {
  requireCredentials();
  const context = await browser.newContext({ viewport: VIEWPORT_DESKTOP });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder(/you@example\.com/i).fill(TEST_EMAIL);
  await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /log in/i }).click();

  // Successful login redirects to /Dashboard (or /onboarding for a fresh
  // account, which adminopeninvite should never be) — wait for the
  // dashboard shell rather than a fixed timeout.
  await page.waitForURL(/\/(Dashboard|onboarding)/, { timeout: 20_000 });
  if (page.url().includes('/onboarding')) {
    throw new Error(
      'Logged in but landed on /onboarding — adminopeninvite has no wedding data yet. ' +
      'This suite expects an existing wedding (John & Suzanne) to already exist on this account.'
    );
  }

  await context.storageState({ path: STATE_FILE });
  console.log(`✓ Logged in as ${TEST_EMAIL}, session saved to ${STATE_FILE}`);
  await context.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const browser = await chromium.launch();
  try {
    await login(browser);
  } finally {
    await browser.close();
  }
}
