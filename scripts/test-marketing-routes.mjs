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

// ONE SCREEN, THE RED SECTION'S RULE (site fixes batch 3). The home red
// section ([data-value-prop]) is height 100vh with overflow hidden, and every
// app section built as its twin ([data-app-twin]) follows the same rule: at
// 1440 and at 390 each is exactly the viewport's height, and nothing inside
// it is cut off. Measured on the page already loaded, at both widths.
// Sections on the one-screen rule: the twin ([data-app-twin]) and the home
// photograph ([data-one-screen], batch 3 amendment A).
const TWIN_ROUTES = { '/': 1 };

// THE FEATURES APP ROW KEEPS ITS NEIGHBOURS' LAYOUT (batch 3 amendment B).
// Measured on the page already loaded: at 1440 every feature row is a
// screen tall, the app row's text half has the gutters of the row before
// it, and its picture is on the other side from that row's; at 390 it
// stacks picture first, as they do.
async function featureRowLayout(page, path, wide) {
  if (path !== '/features') return null;
  const rows = await page.evaluate(() => [...document.querySelectorAll('section.lg\\:flex-row')].map((s) => {
    const r = s.getBoundingClientRect();
    const kids = [...s.children].filter((k) => k.getBoundingClientRect().height > 0);
    const pic = kids.find((k) => k.querySelector('img')), txt = kids.find((k) => k !== pic);
    const pr = pic.getBoundingClientRect(), tr = txt.getBoundingClientRect();
    return { app: s.hasAttribute('data-app-phones'), h: Math.round(r.height), vh: window.innerHeight,
      pad: getComputedStyle(txt).padding, side: Math.round(pr.top) < Math.round(tr.top) ? 'top' : pr.left < tr.left ? 'left' : 'right' };
  }));
  const at = rows.findIndex((r) => r.app);
  if (at < 1) return `the app row is ${at < 0 ? 'missing' : 'the first row'}; it needs a neighbour before it`;
  const app = rows[at], prev = rows[at - 1];
  if (app.pad !== prev.pad) return `text gutters ${app.pad} against the row before's ${prev.pad}`;
  if (wide) {
    if (Math.abs(app.h - app.vh) > 1 || Math.abs(prev.h - prev.vh) > 1) return `row heights ${app.h} and ${prev.h} against a ${app.vh}px screen`;
    if (app.side === prev.side || app.side === 'top') return `picture ${app.side}, the row before has it ${prev.side}: the alternation breaks`;
  } else if (app.side !== 'top' || prev.side !== 'top') return `at 390 the picture comes first in every row; app ${app.side}, before it ${prev.side}`;
  return null;
}
async function oneScreen(page, path) {
  const m = await page.evaluate(() => [...document.querySelectorAll('[data-app-twin], [data-one-screen], [data-value-prop]')].map((e) => ({
    twin: e.hasAttribute('data-app-twin') || e.hasAttribute('data-one-screen'), h: e.getBoundingClientRect().height, sh: e.scrollHeight, ch: e.clientHeight,
    clipped: [...e.querySelectorAll('[data-app-twin-heading], [data-app-heading], [data-app-body], [data-app-store-line], [data-app-line], [data-app-phone-frame]')]
      .some((c) => { const r = c.getBoundingClientRect(), b = e.getBoundingClientRect(); return r.top < b.top - 1 || r.bottom > b.bottom + 1; }),
  })).concat([{ vh: window.innerHeight }]));
  const vh = m.pop().vh;
  const twins = m.filter((x) => x.twin).length;
  if ((TWIN_ROUTES[path] || 0) !== twins) return `expected ${TWIN_ROUTES[path] || 0} app section(s) on the red section's rule, found ${twins}`;
  const bad = m.find((x) => Math.abs(x.h - vh) > 1 || x.sh > x.ch + 1 || x.clipped);
  return bad ? `${bad.twin ? 'app section' : 'red section'} is ${bad.h}px against a ${vh}px screen${bad.clipped ? ', with content cut off' : ''}` : null;
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
      const s1 = await oneScreen(page, path);
      if (s1 && wide.ok) { wide.ok = false; wide.reason = `one screen at 1440: ${s1}`; }
      const r1 = await featureRowLayout(page, path, true);
      if (r1 && wide.ok) { wide.ok = false; wide.reason = `feature rows at 1440: ${r1}`; }
      await page.setViewportSize(PHONE);
      await page.waitForTimeout(600); // let the reflow and any resize listeners settle
      const o2 = await overflow(page);
      if (pageErrors.length > 0) { phone.ok = false; phone.reason = `uncaught exception at 390: ${pageErrors[0]}`; }
      else if (o2) { phone.ok = false; phone.reason = `horizontal overflow at 390: ${o2}`; }
      else {
        const s2 = await oneScreen(page, path); if (s2) { phone.ok = false; phone.reason = `one screen at 390: ${s2}`; }
        const r2 = await featureRowLayout(page, path, false); if (r2 && phone.ok) { phone.ok = false; phone.reason = `feature rows at 390: ${r2}`; }
      }
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
