#!/usr/bin/env node
/* global localStorage */  // set inside page.addInitScript(), which runs in the browser
/**
 * scripts/test-gift-claim-auth.mjs
 *
 * EVERY WAY IN LANDS ON THE CLAIM, THEN ONBOARDING, NEVER THE PLAN PICKER.
 * Gifting v2. The owner's live run on gift-test (2026-10-13): a couple opened
 * their gift, chose Create one, signed up, entered the emailed code, and
 * landed on Choose your plan with the gift unclaimed. The cause was
 * src/pages/Login.jsx's "Create one" link, a bare /register that dropped
 * ?next=. This drives the real pages through the real UI, the email-code step
 * included, on every route in:
 *
 *   1. a new account by email and code
 *   2. a new account by Google (the provider round trip, stubbed)
 *   3. an existing account logging in
 *   4. an account already signed in when the link is opened
 *   5. the same link opened again after it was claimed: refused
 *
 * HOW IT RUNS WITH THE FLAG OFF. The CI build has gifting v2 off, and the flag
 * turns on only for a *.vercel.app host (src/lib/giftingV2.js). So the app is
 * opened as gift-claim-test.vercel.app, and every request to that host is
 * answered from the local preview server (CAPTURE_BASE_URL); no product code
 * changes for the test. Base44's auth and entity calls, /api/gift-link and the
 * Google provider page are stubs, keyed on the bearer each request carries.
 *
 *   CAPTURE_BASE_URL=http://localhost:4230 node scripts/test-gift-claim-auth.mjs
 *   SHOTS_DIR=/tmp/shots ... saves path 1's screenshots
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LOCAL = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
const HOST = 'https://gift-claim-test.vercel.app';
const SHOTS = process.env.SHOTS_DIR || '';
const SIG = 'A'.repeat(43);
const LANDING = 'A gift from Sam. Ultra, paid for, 24 months.';
const GIFT = {
  status: 'open', plan: 'ultra', giver: 'Sam', names: 'Isla and Theo', note: 'With love, Sam',
  noteStyle: 'hand', headlineKey: 'nice_start', photoId: 'DTS_UNWRAPPED_Franco_Dupuy_Photos_ID13773_dfzkub',
};

let failures = 0;
const ok = (name, pass, detail = '') => {
  console.log(`  ${pass ? '✅ PASS' : '❌ FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failures += 1;
};

/** One browser context: a fake backend whose state is this path's alone. */
async function harness(browser, { signedInAs = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const state = { claimed: new Set(), claimCalls: [], users: { 'tok-existing': { id: 'u-existing', email: 'existing@example.com', plan: 'free', onboardingCompleted: false } } };
  if (signedInAs) await ctx.addInitScript((t) => { localStorage.setItem('base44_access_token', t); }, signedInAs);
  const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  // NOTHING LEAVES THIS MACHINE. Any *.vercel.app host but the test's own is
  // refused: an earlier version answered the Google page with a 302, Playwright
  // does not route the target of a redirect it fulfilled, and the browser
  // followed it to the real gift-claim-test.vercel.app, a stranger's site.
  await ctx.route((u) => u.hostname.endsWith('.vercel.app') && u.origin !== HOST, (route) => route.abort());

  // The Google page: back to from_url with a token, as Base44 does. A page
  // that navigates on, not a 302, so the return is a fresh, routed request.
  await ctx.route((u) => u.hostname === 'base44.app' && /\/api\/apps\/auth(\/[a-z]+)?\/login/.test(u.pathname), (route) => {
    const from = new URL(route.request().url()).searchParams.get('from_url');
    const back = new URL(from);
    if (back.origin !== HOST) return route.abort();
    back.searchParams.set('access_token', 'tok-google');
    state.users['tok-google'] = { id: 'u-google', email: 'google@example.com', plan: 'free', onboardingCompleted: false };
    return route.fulfill({ status: 200, contentType: 'text/html', body: `<!doctype html><script>location.replace(${JSON.stringify(back.toString())})</script>` });
  });

  await ctx.route((u) => u.origin === HOST, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const bearer = (req.headers().authorization || '').replace(/^Bearer /, '');
    const p = url.pathname;

    if (p === '/api/gift-link') {
      const token = req.method() === 'GET' ? url.searchParams.get('token') : JSON.parse(req.postData() || '{}').token;
      if (req.method() === 'GET') return json(route, state.claimed.has(token) ? { status: 'used' } : GIFT);
      state.claimCalls.push({ token, bearer });
      if (!state.users[bearer]) return json(route, { reason: 'sign_in' }, 401);
      if (state.claimed.has(token)) return json(route, { reason: 'used' }, 410);
      state.claimed.add(token);
      return json(route, { ok: true, next: '/onboarding', giver: 'Sam', plan: 'ultra' });
    }
    if (/^\/api\/apps\/[^/]+\/auth\/register$/.test(p)) return json(route, {});
    if (/^\/api\/apps\/[^/]+\/auth\/verify-otp$/.test(p)) {
      state.users['tok-new'] = { id: 'u-new', email: 'new@example.com', plan: 'free', onboardingCompleted: false };
      return json(route, { access_token: 'tok-new' });
    }
    if (/^\/api\/apps\/[^/]+\/auth\/login$/.test(p)) return json(route, { access_token: 'tok-existing', user: state.users['tok-existing'] });
    if (/\/entities\/User\/me$/.test(p)) return state.users[bearer] ? json(route, state.users[bearer]) : json(route, { error: 'unauthorized' }, 401);
    if (p.startsWith('/api/apps/')) return json(route, req.method() === 'GET' ? [] : {});
    if (p.startsWith('/api/')) return json(route, p.includes('my-wedding-details') ? null : {});
    // The app itself, from the local preview server.
    const res = await route.fetch({ url: `${LOCAL}${p}${url.search}` });
    return route.fulfill({ response: res });
  });
  const page = await ctx.newPage();
  const visited = [];
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) visited.push(new URL(f.url()).pathname); });
  return { ctx, page, state, visited };
}

const token = (n) => `gift${n}0000.1.${SIG}`;
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };

async function landedOnClaim(t, { page, state, visited }, name) {
  await page.waitForURL(/\/onboarding/, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const landing = await page.locator('[data-gift-landing]').textContent({ timeout: 10000 }).catch(() => null);
  const claimedWith = state.claimCalls.find((c) => c.token === t && state.claimed.has(t));
  const pickerShown = await page.getByText(/Get Pro|Choose your plan/i).count().catch(() => 0);
  ok(`${name}: the gift is claimed with the signed-in account`, !!claimedWith, claimedWith ? claimedWith.bearer : 'no claim');
  ok(`${name}: lands on onboarding with "${LANDING}"`, new URL(page.url()).pathname === '/onboarding' && landing === LANDING, `${new URL(page.url()).pathname} | ${landing}`);
  ok(`${name}: never shown the plan picker`, pickerShown === 0, visited.join(' > '));
}

/** One path: a failure inside it is a failed check, and the next path still runs. */
async function path(name, fn) {
  try { await fn(); } catch (err) { ok(`${name}: ran to the end`, false, String(err.message || err).split('\n')[0].slice(0, 120)); }
}

async function main() {
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  console.log('\n  Gift claim, every way in:\n');

  // ── 1. a new account, email and code ─────────────────────────────────
  await path('path 1', async () => {
    const h = await harness(browser);
    const t = token(1);
    await h.page.goto(`${HOST}/gift/claim/${t}`, { waitUntil: 'networkidle' });
    await shot(h.page, '1-claim-page');
    await h.page.locator('[data-gift-claim-button]').click();
    await h.page.waitForURL(/\/register/);
    await h.page.waitForTimeout(800);
    const heading = await h.page.getByText('Your gift is waiting.').count();
    const line = (await h.page.locator('[data-gift-waiting]').textContent().catch(() => '')) || '';
    ok('path 1: Open your gift opens Create account, saying the gift is waiting', heading === 1 && line.trim() === 'Create your account to open it. Already have one? Log in instead.', line.trim());
    await shot(h.page, '2-create-account');
    await h.page.locator('input[type="email"]').fill('new@example.com');
    const pw = h.page.locator('input[type="password"]');
    await pw.nth(0).fill('a-strong-password-1');
    if (await pw.count() > 1) await pw.nth(1).fill('a-strong-password-1');
    await h.page.getByRole('button', { name: /create account|sign up/i }).click();
    await h.page.getByText('Verify your email').waitFor({ timeout: 15000 });
    await shot(h.page, '3-email-code');
    await h.page.locator('input[autocomplete="one-time-code"]').fill('123456');
    await h.page.getByRole('button', { name: /verify/i }).click();
    await landedOnClaim(t, h, 'path 1, new account by email code');
    await shot(h.page, '4-onboarding');
    await h.ctx.close();
  });

  // ── 1b. the owner's exact path: the log-in page, then "Create one" ─────
  // An email or bookmark from before this fix opens /login?next=<claim>; the
  // "Create one" link there was the line that dropped the gift.
  await path('path 1b', async () => {
    const h = await harness(browser);
    const t = token(5);
    await h.page.goto(`${HOST}/login?next=${encodeURIComponent(`/gift/claim/${t}?go=1`)}`, { waitUntil: 'networkidle' });
    await h.page.getByRole('link', { name: 'Create one' }).click();
    await h.page.waitForURL(/\/register/);
    ok('path 1b: "Create one" on the log-in page keeps the gift', decodeURIComponent(new URL(h.page.url()).searchParams.get('next') || '') === `/gift/claim/${t}?go=1`, new URL(h.page.url()).search.slice(0, 40));
    await h.page.locator('input[type="email"]').fill('new@example.com');
    const pw = h.page.locator('input[type="password"]');
    await pw.nth(0).fill('a-strong-password-1');
    if (await pw.count() > 1) await pw.nth(1).fill('a-strong-password-1');
    await h.page.getByRole('button', { name: /create account|sign up/i }).click();
    await h.page.getByText('Verify your email').waitFor({ timeout: 15000 });
    await h.page.locator('input[autocomplete="one-time-code"]').fill('123456');
    await h.page.getByRole('button', { name: /verify/i }).click();
    await landedOnClaim(t, h, 'path 1b, log-in page, Create one, email code');
    await h.ctx.close();
  });

  // ── 2. a new account, Google ─────────────────────────────────────────
  await path('path 2', async () => {
    const h = await harness(browser);
    const t = token(2);
    await h.page.goto(`${HOST}/gift/claim/${t}`, { waitUntil: 'networkidle' });
    await h.page.locator('[data-gift-claim-button]').click();
    await h.page.waitForURL(/\/register/);
    await h.page.getByRole('button', { name: /continue with google/i }).click();
    await landedOnClaim(t, h, 'path 2, new account by Google');
    await h.ctx.close();
  });

  // ── 3. an existing account, log in ───────────────────────────────────
  await path('path 3', async () => {
    const h = await harness(browser);
    const t = token(3);
    await h.page.goto(`${HOST}/gift/claim/${t}`, { waitUntil: 'networkidle' });
    await h.page.locator('[data-gift-claim-button]').click();
    await h.page.waitForURL(/\/register/);
    await h.page.locator('[data-gift-waiting]').getByRole('link', { name: 'Log in' }).click();
    await h.page.waitForURL(/\/login\?next=/);
    ok('path 3: "Log in" switches to the log-in form and keeps the gift', decodeURIComponent(new URL(h.page.url()).searchParams.get('next') || '') === `/gift/claim/${t}?go=1`);
    await h.page.locator('input[type="email"]').fill('existing@example.com');
    await h.page.locator('input[type="password"]').first().fill('their-password-1');
    await h.page.locator('form button[type="submit"]').first().click();
    await landedOnClaim(t, h, 'path 3, existing account logging in');
    await h.ctx.close();
  });

  // ── 4. already signed in ─────────────────────────────────────────────
  await path('paths 4 and 5', async () => {
    const h = await harness(browser, { signedInAs: 'tok-existing' });
    const t = token(4);
    await h.page.goto(`${HOST}/gift/claim/${t}`, { waitUntil: 'networkidle' });
    await h.page.locator('[data-gift-claim-button]').click();
    await landedOnClaim(t, h, 'path 4, already signed in');

    // ── 5. the same link again ──────────────────────────────────────────
    await h.page.goto(`${HOST}/gift/claim/${t}`, { waitUntil: 'networkidle' });
    await h.page.waitForTimeout(800);
    const used = await h.page.getByText('This gift has already been opened.', { exact: false }).count();
    const login = await h.page.locator('[data-gift-claim-login]').getAttribute('href').catch(() => null);
    ok('path 5: the same link opened again is refused, with Log in to the dashboard', used >= 1 && login === '/login' && (await h.page.locator('[data-gift-claim-button]').count()) === 0);
    await h.ctx.close();
  });

  await browser.close();
  console.log(failures ? `\n  ${failures} check(s) FAILED\n` : '\n  All checks passed.\n');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
