/* global document, getComputedStyle */
/**
 * THE NAMES SENTENCE UNDERLINES IN GREY, NEVER PINK. Owner ruling 2026-10-13,
 * on the review of gift page 2 beside onboarding step 1: the shared component
 * (src/components/onboarding/OnboardingStep1Names.jsx) drops #ec4899 in every
 * state. Empty keeps a 1px rgba(10,10,10,0.18) line; focused or filled is the
 * same 2px line at rgba(10,10,10,0.55), so focus stays visible. The gift page
 * inherits it with no override.
 *
 * Checked on onboarding step 1 and on gift page 2, each empty, with a field
 * focused, and filled, by the computed border of every field in the sentence.
 * Onboarding is reached through the seeded render harness; the gift page is
 * opened as a *.vercel.app host routed to the local server (the only way the
 * gifting v2 flag is on), with every other *.vercel.app host aborted.
 *
 *   CAPTURE_BASE_URL=http://localhost:4230 node scripts/test-names-underline.mjs
 */
import { chromium } from 'playwright';
import { seededContext, ONBOARDING_USER, ONBOARDING_SEED } from './lib/renderHarness.mjs';

const LOCAL = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
const HOST = 'https://gift-underline-test.vercel.app';
const PINK = 'rgb(236, 72, 153)';
const EMPTY = '1px solid rgba(10, 10, 10, 0.18)';
const ACTIVE = '2px solid rgba(10, 10, 10, 0.55)';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const borders = (page) => page.evaluate(() => [...document.querySelectorAll('input.s1-input')].map((i) => ({
  border: getComputedStyle(i).borderBottom, color: getComputedStyle(i).borderBottomColor, value: i.value,
})));

/** Empty, focused and filled, read off one page whose fields start filled. */
async function states(page, where) {
  const filled = await borders(page);
  // PRESENCE BEFORE PROPERTIES: no fields would pass every colour check.
  check(`${where}: the sentence renders`, filled.length >= 2, `${filled.length} fields`);
  if (filled.length < 2) return;
  check(`${where}, filled: every line is the 2px dark line, none pink`,
    filled.every((f) => f.value && f.border === ACTIVE && f.color !== PINK), filled.map((f) => f.border).join(' | '));
  const fields = page.locator('input.s1-input');
  for (let i = 0; i < filled.length; i += 1) await fields.nth(i).fill('');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  const empty = await borders(page);
  check(`${where}, empty: every line is the 1px faint line, none pink`,
    empty.every((f) => !f.value && f.border === EMPTY && f.color !== PINK), empty.map((f) => f.border).join(' | '));
  await fields.first().focus();
  const focused = await borders(page);
  check(`${where}, focused: the focused line darkens to 2px, the rest stay faint, none pink`,
    focused[0].border === ACTIVE && focused.slice(1).every((f) => f.border === EMPTY) && focused.every((f) => f.color !== PINK),
    focused.map((f) => f.border).join(' | '));
}

console.log('\n  The names sentence underlines in grey, never pink:\n');
const browser = await chromium.launch();
try {
  {
    const DRAFT = { id: 'draft-1', couple1Name: 'Isla', couple2Name: 'Theo', onboardingDraft: true, onboardingStepIndex: 1, created_by: 'fixture@example.com' };
    const ctx = await seededContext(browser, { width: 1440, height: 900, seed: { ...ONBOARDING_SEED, WeddingDetails: [DRAFT] }, user: ONBOARDING_USER });
    const page = await ctx.newPage();
    await page.goto(`${LOCAL}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(4000);
    await states(page, 'onboarding step 1');
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route((u) => u.hostname.endsWith('.vercel.app') && u.origin !== HOST, (route) => route.abort());
    await ctx.route((u) => u.origin === HOST, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      const res = await fetch(`${LOCAL}${url.pathname}${url.search}`);
      return route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
    });
    const page = await ctx.newPage();
    await page.goto(`${HOST}/gift?sample=1&step=2`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(800);
    await states(page, 'gift page 2');
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n  ${results.length - failed}/${results.length} passed\n`);
process.exit(failed ? 1 : 0);
