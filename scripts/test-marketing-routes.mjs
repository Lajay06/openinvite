/**
 * scripts/test-marketing-routes.mjs
 *
 * Marketing-routes smoke test. Loads every public marketing/auth route and
 * fails if any of them renders the root Sentry error boundary ("Something
 * went wrong.") or throws an uncaught exception during render.
 *
 * This exists because of a real production incident: Ava.jsx referenced
 * ProductMediaFrame/ProductVideo without importing them. `npm run build`
 * stayed green (Vite doesn't resolve JSX component names at build time,
 * only import statements), so the crash shipped straight to production and
 * was only caught by manually loading the page. This test would have
 * caught it — the same ReferenceError fires as a `pageerror` event the
 * instant the component tries to render.
 *
 * Also fails on horizontal page overflow (documentElement.scrollWidth >
 * clientWidth). Found repeatedly across Home/About/Features/Ava — usually
 * an off-screen entrance-animation element (translateX(±Npx) at rest,
 * before its scroll-reveal fires) whose containing section is missing
 * overflow:hidden, or a stray width:100vw section (wider than the true
 * viewport whenever a vertical scrollbar is present). A 1px tolerance
 * absorbs normal subpixel rounding.
 *
 * Reuses the product-visual capture pipeline's config (scripts/capture/
 * config.mjs) — same BASE_URL env var (CAPTURE_BASE_URL), same
 * no-new-dependency Playwright setup — so this can point at production, a
 * PR's preview deployment, or a local dev server without code changes:
 *
 *   npm run test:marketing-routes                                    # prod (default)
 *   CAPTURE_BASE_URL=http://localhost:5173 npm run test:marketing-routes
 *   CAPTURE_BASE_URL=https://openinvite-git-my-branch.vercel.app npm run test:marketing-routes
 *
 * Usage:  npm run test:marketing-routes
 * Exits 0 if every route renders clean, 1 if any route fails (CI-ready).
 */
import { chromium } from 'playwright';
import { BASE_URL } from './capture/config.mjs';
import { MARKETING_ROUTES as ROUTES } from './marketingRoutes.mjs';
import { blockRemoteImages } from './lib/blockRemoteImages.mjs';

const ERROR_BOUNDARY_TEXT = 'Something went wrong.';
// BOTH WIDTHS, ONE LOAD. Overflow was measured at 1440 only, so a page could
// scroll sideways on a phone and pass; the app goal (2026-10-10) asks for no
// horizontal scroll at 390 on every page it touches. The 390 check RESIZES the
// page it already loaded instead of navigating again: a second networkidle
// load per route doubled this guard's time and pushed Browser guards A past
// its 25-minute limit. Layout reflows on resize (media queries and the
// matchMedia listeners both fire), so the measurement is the same one.
const WIDE = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

async function overflow(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  return scrollWidth > clientWidth + 1 ? `scrollWidth ${scrollWidth}px > clientWidth ${clientWidth}px` : null;
}

async function checkRoute(browser, path) {
  // Fourteen marketing routes, each at networkidle — which by definition waits
  // for every photograph. This loop was the largest single source of the
  // Cloudinary bill. See scripts/lib/blockRemoteImages.mjs.
  const ctx = await browser.newContext({ viewport: WIDE });
  await blockRemoteImages(ctx);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const wide = { path: `${path} @ 1440`, ok: true, reason: '' };
  const phone = { path: `${path} @ 390`, ok: true, reason: '' };
  try {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800); // let any render-time throw surface
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes(ERROR_BOUNDARY_TEXT)) {
      wide.ok = phone.ok = false;
      wide.reason = phone.reason = `error boundary fallback rendered ("${ERROR_BOUNDARY_TEXT}")`;
    } else if (pageErrors.length > 0) {
      wide.ok = phone.ok = false;
      wide.reason = phone.reason = `uncaught exception: ${pageErrors[0]}`;
    } else {
      const o1 = await overflow(page);
      if (o1) { wide.ok = false; wide.reason = `horizontal overflow at 1440: ${o1}`; }
      await page.setViewportSize(PHONE);
      await page.waitForTimeout(600); // let the reflow and any resize listeners settle
      const o2 = await overflow(page);
      if (pageErrors.length > 0) { phone.ok = false; phone.reason = `uncaught exception at 390: ${pageErrors[0]}`; }
      else if (o2) { phone.ok = false; phone.reason = `horizontal overflow at 390: ${o2}`; }
    }
  } catch (err) {
    wide.ok = phone.ok = false;
    wide.reason = phone.reason = `navigation failed: ${err.message}`;
  }
  await page.close();
  await ctx.close();
  return [wide, phone];
}

console.log(`Marketing-routes smoke test against ${BASE_URL}\n`);

const browser = await chromium.launch();
const results = [];
for (const path of ROUTES) {
  for (const r of await checkRoute(browser, path)) {
    results.push(r);
    console.log(`${r.ok ? '✓' : '✗'} ${r.path}${r.ok ? '' : `  —  ${r.reason}`}`);
  }
}
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log('\n' + '='.repeat(60));
console.log(
  failed.length === 0
    ? `All ${results.length} marketing routes render clean.`
    : `${failed.length}/${results.length} marketing routes FAILED.`
);
process.exit(failed.length === 0 ? 0 : 1);
