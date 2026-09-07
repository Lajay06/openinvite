/* global document */
/**
 * The daily update paints before Ava speaks.
 *
 * OWNER: "/DailyUpdate takes ~10 seconds; every other page is fast; this one
 * shows nothing while loading."
 *
 * THE CAUSE, AND WHY IT LOOKED LIKE A SLOW PAGE. `setLoading(false)` lived in
 * the `finally` of one loader that also awaited the model call for Column B.
 * Everything the page could have drawn from local stores — the headline, the
 * countdown, the numbers, the priorities, the day state — sat behind an LLM
 * round trip that has nothing to do with any of it. The page was not slow to
 * LOAD; it was slow to be ALLOWED to render.
 *
 * WHAT THIS MEASURES. The briefing endpoint is held open deliberately, and the
 * check is whether the headline is in the DOM before it answers. That is the
 * property, stated as the owner stated it: the page paints, then Ava speaks.
 *
 * Usage: npm run test:daily-update-paint  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

/** How long the model is made to take. Real ones took about this long. */
const LLM_DELAY_MS = Number(process.env.LLM_DELAY_MS || 6000);

/** First paint must beat this, with the model still thinking. */
const PAINT_BUDGET_MS = Number(process.env.PAINT_BUDGET_MS || 1000);

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

console.log('\n  The daily update paints before Ava speaks:\n');

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 1100, seed: SEED });

// THE BRIEFING, HELD OPEN. Routed BEFORE the harness's own handler would
// answer it, so this wins: Playwright runs the most recently added route
// first. Everything else still answers instantly, so a slow first paint can
// only be this one request.
let llmAsked = 0;
let llmAnsweredAt = 0;
await ctx.route(/InvokeLLM|integrations/i, async (route) => {
  llmAsked += 1;
  await new Promise((r) => setTimeout(r, LLM_DELAY_MS));
  llmAnsweredAt = Date.now();
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: 'Ava speaks at last. The guest list is moving and nothing is overdue.' }),
  });
});

const page = await ctx.newPage();
const t0 = Date.now();
await page.goto(`${BASE}/DailyUpdate`, { waitUntil: 'commit', timeout: 45000 }).catch(() => {});

// TIME TO FIRST PAINT — the page's OWN content, not the shell around it.
//
// The first version of this measured `body.innerText` for "Daily update" and
// reported 311ms on a page that took ten seconds, because the SIDEBAR carries
// those words. A paint metric that the chrome can satisfy measures the chrome.
// The signals here are the page's: the <h1> the day-state headline renders
// into (Briefing shows a grey block instead while it waits) and the "This
// week" column head.
let paintedAt = 0;
try {
  await page.waitForFunction(() => {
    const h = document.querySelector('main h1, h1');
    const t = document.body.innerText || '';
    return !!(h && h.innerText.trim().length > 10) && t.includes('This week');
  }, null, { timeout: 30000 });
  paintedAt = Date.now();
} catch { paintedAt = 0; }

const paintMs = paintedAt ? paintedAt - t0 : Infinity;
const llmStillThinking = !llmAnsweredAt || paintedAt < llmAnsweredAt;

console.log(`  time-to-first-paint : ${Number.isFinite(paintMs) ? `${paintMs}ms` : 'never'}`);

check('the page paints while the briefing is still in flight',
  llmStillThinking && Number.isFinite(paintMs),
  llmAnsweredAt ? `painted ${paintedAt - t0}ms, model answered ${llmAnsweredAt - t0}ms` : 'model had not answered yet');
check(`first paint is under ${PAINT_BUDGET_MS}ms`,
  paintMs < PAINT_BUDGET_MS, `${Number.isFinite(paintMs) ? `${paintMs}ms` : 'never'} — the budget is the owner's "every other page is fast"`);

// COLUMN B SAYS IT IS WAITING, rather than showing an empty column.
const waitingText = await page.locator('body').innerText();
check('Column B shows the briefing is coming, not a blank',
  /Ava’s briefing|Ava's briefing/.test(waitingText), 'the column is titled and reserved');
const skeletons = await page.locator('[data-skeleton], .animate-pulse').count().catch(() => 0);
check('  and it holds skeleton rows while it waits',
  skeletons > 0, `${skeletons} skeleton element(s)`);

// THE REST OF THE PAGE IS REAL, not a spinner: the numbers came from stores.
check('the stat row is already populated from local stores',
  /\d/.test(waitingText), 'numbers before the model, not after');

// AND THE SKELETON GIVES WAY when the model answers.
//
// Not "the stub's words appear": a reply that fails validateTracking is
// replaced by the authored paragraph on purpose (spec 5.2), so asserting the
// stub's text would fail on correct behaviour. What must hold is that Column B
// stops waiting.
let briefingMs = Infinity;
try {
  await page.waitForFunction(() => !document.querySelector('[data-skeleton="briefing"]'),
    null, { timeout: 30000 });
  briefingMs = Date.now() - t0;
} catch { /* reported below */ }
console.log(`  time-to-briefing    : ${Number.isFinite(briefingMs) ? `${briefingMs}ms` : 'never'}`);
check('the skeleton gives way once the briefing resolves',
  Number.isFinite(briefingMs), Number.isFinite(briefingMs) ? `${briefingMs}ms` : 'never arrived');
check('  and it was asked for once, on mount',
  llmAsked === 1, `${llmAsked} request(s)`);

await ctx.close();
await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
