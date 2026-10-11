/* global document, sessionStorage */
/**
 * A STALE TAB HEALS ITSELF, ONCE, AND THEN STOPS.
 *
 * Item 6 of goals/2026-10-11-dashboard-fixes-batch-1.md. The owner's own
 * window held an index.html from before a deploy, so the chunk URLs in it were
 * gone and every route that needed one threw "Importing a module script
 * failed". src/lib/chunkReloadGuard.js exists to recover from exactly that,
 * and nothing had ever exercised it.
 *
 * ── WHY A BROWSER, AND WHY A PLANTED 404 ───────────────────────────────────
 *
 * tests/persistence/chunk-selfheal.mjs drives the guard's decision directly,
 * with a stubbed sessionStorage and a counted reload. What it cannot do is
 * prove the decision is ever REACHED: that needs a real dynamic import to
 * really fail, Vite's own preload wrapper to dispatch, and a real navigation
 * to land. So this plants the owner's incident: one chunk answers 404 while
 * everything else is served normally, which is a stale index.html in one
 * request rather than in a deploy.
 *
 * ── WHAT "ONCE" LOOKS LIKE FROM OUTSIDE ────────────────────────────────────
 *
 * The chunk is 404 on the reload too, because the plant does not go away. So
 * the healthy sequence is: load, fail, reload, fail again, HOLD. Exactly two
 * loads and then a settled page. A guard with no loop protection would show
 * three, then four, then keep going; one that never reloaded would show one.
 * Counting loads is therefore the whole assertion, and it is why the plant is
 * left in place rather than lifted after the first failure.
 *
 * AND THE PAGE MUST SETTLE INTO SOMETHING. After the hold, lazyWithReload
 * re-throws and the error boundary renders its own message with a refresh
 * button. A spinner that never resolves would be the worse failure, and it is
 * what the wrapper's ten second hang guard exists to prevent, so this asserts
 * the page is not still loading at the end.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4234';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();

for (const [w, h] of [[1440, 950], [390, 844]]) {
  console.log(`\n  ${w}px:`);
  const ctx = await seededContext(browser, { width: w, height: h });
  const page = await ctx.newPage();

  // THE PLANT. One route's chunk, 404 with a text body, which is exactly what
  // production returns for a hash that no longer exists: verified against
  // www.openinvite.com.au on 2026-10-11, x-vercel-error: NOT_FOUND and
  // content-type text/plain, NOT the SPA fallback. A fallback would hand the
  // import an HTML document and fail differently.
  //
  // A PREDICATE, NOT A GLOB, which tests/persistence/route-interception-guard
  // .mjs requires of every script here and was right to: a string pattern can
  // silently match nothing, and a plant that never fired would leave this
  // guard green against a page it never tested. `planted` is counted for the
  // same reason, so a predicate that stops matching is red rather than quiet.
  let planted = 0;
  await page.route(
    (u) => /\/assets\/Guests-[^/]*\.js$/.test(typeof u === 'string' ? u : u.href),
    async (route) => {
      planted += 1;
      await route.fulfill({ status: 404, contentType: 'text/plain; charset=utf-8', body: 'Not Found' });
    },
  );

  const loads = [];
  page.on('load', () => loads.push(Date.now()));
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));

  await page.goto(`${BASE}/Guests`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  // Long enough for the failure, the reload, the second failure and the hold.
  // The wrapper's own hang guard is ten seconds, so this must outlast it or a
  // page stuck on a spinner would read as settled.
  await page.waitForTimeout(16000);

  const state = await page.evaluate(() => ({
    stamped: (() => {
      try { return sessionStorage.getItem('oi_chunk_reload_at') !== null; } catch { return null; }
    })(),
    // THE PAGE SETTLED INTO SOMETHING A PERSON CAN ACT ON, rather than a
    // spinner. Read as text so it does not depend on the fallback's markup.
    bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
    stillSpinning: !!document.querySelector('.animate-spin'),
  }));

  check('  the plant was actually served', planted >= 1, `${planted} request(s) 404ed`);
  check('  the chunk failure was noticed and logged',
    consoleLines.some((l) => /stale build asset failed to load, reloading once/.test(l)),
    consoleLines.filter((l) => /chunk-reload/.test(l)).join(' | ') || 'no guard log');

  // ── ONCE ────────────────────────────────────────────────────────────────
  check('  the page reloaded itself exactly once', loads.length === 2,
    `${loads.length} load(s): ${loads.length === 1 ? 'never healed' : loads.length > 2 ? 'LOOPING' : 'one reload'}`);
  check('  the reload left its stamp, which is what stops the loop',
    state.stamped === true, `stamped=${state.stamped}`);

  // ── AND THEN STOPPED ────────────────────────────────────────────────────
  check('  the second failure held instead of reloading again',
    loads.length === 2 && planted >= 2, `${planted} chunk request(s) across ${loads.length} load(s)`);
  check('  and the page settled rather than spinning forever',
    !state.stillSpinning, state.stillSpinning ? 'still showing a spinner' : 'settled');
  check('    into something that says what to do',
    /went wrong|refresh|try again|reload/i.test(state.bodyText),
    state.bodyText.slice(0, 120) || '(empty)');

  await ctx.close();
}

// ── THE DOCUMENT IS NOT CACHED LIKE AN ASSET ────────────────────────────────
//
// Asserted against the SERVED RESPONSE rather than vercel.json, because the
// document's rule is the platform default and does not appear in that file at
// all. Reading the file would prove nothing about what a browser is told.
{
  const res = await fetch(`${BASE}/Guests`).catch(() => null);
  const cc = res ? (res.headers.get('cache-control') || '') : '';
  // THREE WORDINGS, ONE GUARANTEE: revalidate before reuse. Vite's preview
  // server says `no-cache`; production says `public, max-age=0,
  // must-revalidate` (measured against www.openinvite.com.au on 2026-10-11,
  // alongside `max-age=31536000, immutable` on the hashed assets); `no-store`
  // would also qualify. What must never appear is a document the browser may
  // reuse without asking, which is how a tab keeps a dead index.html.
  const revalidates = /no-store/.test(cc) || /no-cache/.test(cc)
    || (/max-age=0/.test(cc) && /must-revalidate/.test(cc));
  const reusable = /immutable/.test(cc) || /max-age=(?!0\b)\d+/.test(cc);
  check('the document is revalidated on every load, never reused blind',
    revalidates && !reusable, cc || '(no cache-control header at all)');
}

await browser.close();

const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
