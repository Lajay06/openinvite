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

const ERROR_BOUNDARY_TEXT = 'Something went wrong.';
const VIEWPORT = { width: 1440, height: 900 };

async function checkRoute(browser, path) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  let ok = true;
  let reason = '';
  try {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800); // let any render-time throw surface
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes(ERROR_BOUNDARY_TEXT)) {
      ok = false;
      reason = `error boundary fallback rendered ("${ERROR_BOUNDARY_TEXT}")`;
    } else if (pageErrors.length > 0) {
      ok = false;
      reason = `uncaught exception: ${pageErrors[0]}`;
    }
  } catch (err) {
    ok = false;
    reason = `navigation failed: ${err.message}`;
  }
  await page.close();
  return { path, ok, reason };
}

console.log(`Marketing-routes smoke test against ${BASE_URL}\n`);

const browser = await chromium.launch();
const results = [];
for (const path of ROUTES) {
  const r = await checkRoute(browser, path);
  results.push(r);
  console.log(`${r.ok ? '✓' : '✗'} ${path}${r.ok ? '' : `  —  ${r.reason}`}`);
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
