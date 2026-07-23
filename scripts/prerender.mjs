/**
 * scripts/prerender.mjs
 *
 * AEO/SEO batch, item 1. Runs after `vite build` (see package.json's
 * "build" script) and turns the marketing routes from a client-rendered
 * SPA shell into real static HTML — confirmed via direct curl against
 * production that every route (including robots.txt/sitemap.xml, which
 * didn't exist as real files) was serving the identical ~2KB shell with a
 * generic title, no body text, and no route-specific metadata. A crawler
 * with no JS (most of them, including the ones that matter for AEO) sees
 * nothing on that shell.
 *
 * Approach: serve the built dist/ locally (`vite preview`, already a
 * project dependency — no new tooling), visit each marketing route with
 * Playwright (already a devDependency, used by test-marketing-routes.mjs),
 * wait for useMarketingSeo() to finish setting the per-route <title>/meta/
 * canonical/OG tags and for the page's own content to render, then capture
 * the fully-rendered DOM and write it to dist/<route>/index.html.
 *
 * This is prerendering, not SSR/hydration — the static HTML is a snapshot
 * for crawlers; a real browser still does a normal client-side React
 * mount over it (a brief content swap, not a hydration-mismatch risk,
 * since nothing here calls hydrateRoot). App/dashboard routes are
 * completely untouched — they still fall through to dist/index.html via
 * vercel.json's SPA rewrite, exactly as before.
 *
 * Usage: node scripts/prerender.mjs   (called automatically by `npm run build`)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKETING_ROUTES } from './marketingRoutes.mjs';

const SITE_URL = 'https://www.openinvite.com.au';

/** Generated from the same MARKETING_ROUTES list the prerender pass itself
 *  uses — one list, no separate hand-maintained copy to drift out of sync. */
function writeSitemap() {
  const urls = MARKETING_ROUTES.map(route => {
    const loc = route === '/' ? SITE_URL : `${SITE_URL}${route}`;
    return `  <url><loc>${loc}</loc></url>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  writeFileSync(resolve(DIST, 'sitemap.xml'), xml);
  console.log(`[prerender] ✓ sitemap.xml written (${MARKETING_ROUTES.length} URLs)`);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const PORT = 4790; // fixed, unlikely-to-collide port for this one-shot local preview
const BASE = `http://localhost:${PORT}`;

if (!existsSync(resolve(DIST, 'index.html'))) {
  console.error('[prerender] dist/index.html not found — run `vite build` first.');
  process.exit(1);
}

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolvePromise, rejectPromise) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status === 404) { resolvePromise(); return; }
      } catch { /* not up yet */ }
      if (Date.now() - start > timeoutMs) { rejectPromise(new Error(`Timed out waiting for ${url}`)); return; }
      setTimeout(tick, 300);
    };
    tick();
  });
}

async function main() {
  console.log(`[prerender] Starting local preview server on port ${PORT}…`);
  const previewProcess = spawn(
    'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'pipe' }
  );
  let previewOutput = '';
  previewProcess.stdout.on('data', d => { previewOutput += d.toString(); });
  previewProcess.stderr.on('data', d => { previewOutput += d.toString(); });

  try {
    await waitForServer(BASE);
  } catch (err) {
    console.error('[prerender] Preview server never came up:\n' + previewOutput);
    previewProcess.kill();
    process.exit(1);
  }

  const browser = await chromium.launch();
  let failures = 0;

  for (const route of MARKETING_ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      // useMarketingSeo() and page content both run inside React's mount —
      // networkidle alone can resolve before that effect flushes on a slow
      // CI runner, so give it one more explicit beat.
      await page.waitForTimeout(500);

      if (pageErrors.length > 0) {
        console.error(`[prerender] ✗ ${route} — uncaught exception: ${pageErrors[0]}`);
        failures++;
        await page.close();
        continue;
      }

      const html = await page.content();
      const bodyTextLength = await page.evaluate(() => document.body.innerText.trim().length);
      if (bodyTextLength < 50) {
        console.error(`[prerender] ✗ ${route} — suspiciously little visible text (${bodyTextLength} chars), refusing to write an empty-looking snapshot`);
        failures++;
        await page.close();
        continue;
      }

      const outDir = route === '/' ? DIST : resolve(DIST, route.replace(/^\//, ''));
      mkdirSync(outDir, { recursive: true });
      writeFileSync(resolve(outDir, 'index.html'), html);
      console.log(`[prerender] ✓ ${route} — ${bodyTextLength} chars of body text, written to ${outDir.replace(ROOT + '/', '')}/index.html`);
    } catch (err) {
      console.error(`[prerender] ✗ ${route} — ${err.message}`);
      failures++;
    }
    await page.close();
  }

  await browser.close();
  previewProcess.kill();

  writeSitemap();

  if (failures > 0) {
    console.error(`\n[prerender] ${failures}/${MARKETING_ROUTES.length} routes failed to prerender.`);
    process.exit(1);
  }
  console.log(`\n[prerender] All ${MARKETING_ROUTES.length} marketing routes prerendered successfully.`);
}

main();
