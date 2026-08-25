/**
 * scripts/test-guest-font-effect.mjs
 *
 * THE EFFECT-LEVEL HALF of guest typography. Run it against this build:
 *   CAPTURE_BASE_URL=http://localhost:4173 npm run test:guest-font-effect
 *
 * WHY A SECOND GUARD EXISTS. tests/persistence/guest-typography-parity.mjs
 * asserts that guest files DECLARE `typography.*` instead of font literals.
 * It passed while three routes rendered the wrong face, because
 * src/index.css locks every element to the product face with
 * `* { font-family: … !important }` — which beats any inline
 * `style={{ fontFamily }}`. A declaration something else can override is
 * INTENT. The computed value is EFFECT. A guard that checks intent is a
 * linter with an opinion.
 *
 * So this one renders the pages and reads getComputedStyle.
 *
 * PRE-MORTEM — what would make THIS pass while the defect exists:
 *   · The seed resolves to a universe whose faces happen to BE the product
 *     face. Guarded: the run asserts the expected families are not
 *     'Plus Jakarta Sans' before it trusts a single page result.
 *   · A page renders nothing, so there are no elements to be wrong.
 *     Guarded: presence-before-properties, by condition, per route.
 *   · A route is added and never checked. CLOSED — the list is derived from
 *     src/App.jsx and WEDDING_PAGES, and a derived route with no expected
 *     string fails the run rather than being skipped.
 */
/* eslint-env browser */
/* global document, getComputedStyle */
import { chromium, webkit } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seededContext, PUBLISHED_WEDDING, GUEST_ROUTE_EXPECT } from './lib/renderHarness.mjs';
import { WEDDING_PAGES } from '../src/lib/websiteThemes.js';

const HERE = dirname(fileURLToPath(import.meta.url));
import { resolveTypography } from '../src/lib/universeStyling.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';

// CI installs chromium only, so that is the default. The property under test —
// an `!important` stylesheet rule beating an inline style — is CSS cascade,
// identical in both engines, so this is not one of the cases that needs WebKit.
// RENDER_ENGINE=webkit runs it in the engine the guest audience actually uses,
// for WEBKIT-PASS.
const ENGINE = process.env.RENDER_ENGINE === 'webkit' ? webkit : chromium;
const SLUG = PUBLISHED_WEDDING.slug;

/**
 * THE ROUTE LIST IS DERIVED, NOT MAINTAINED.
 *
 * The first version of this guard carried a hand-written list of four routes
 * and declared, in its own pre-mortem, that a new guest route nobody added
 * would go unchecked. A list a human must remember to update is the same shape
 * as the five UI call sites that each minted their own token before #538
 * replaced them with one write boundary — so it is derived instead.
 *
 * Two sources, because guest routes come from two places:
 *   · src/App.jsx — the explicit /w/:weddingSlug/<literal> routes, which are
 *     standalone pages outside MultiPageWeddingWebsite's tree.
 *   · WEDDING_PAGES — the in-site pages, reached through /w/:slug/:page.
 *
 * Every derived route must have an entry in the harness's GUEST_ROUTE_EXPECT.
 * A route without one FAILS THE RUN rather than being skipped, so adding a
 * guest route forces adding the string that proves it rendered.
 */
function deriveRoutes() {
  const app = readFileSync(resolve(HERE, '../src/App.jsx'), 'utf8');
  const standalone = [...app.matchAll(/path="\/w\/:weddingSlug\/([a-z-]+)"/g)].map((m) => m[1]);
  const inSite = WEDDING_PAGES.map((p) => p.slug);
  const slugs = [...new Set(['', ...standalone, ...inSite])]
    // ':page' is the catch-all, not a route; 'collect' is a contact-capture
    // form with no universe typography of its own.
    .filter((sl) => sl !== 'page' && sl !== 'collect');
  return slugs.map((sl) => ({
    slug: sl,
    path: sl ? `/w/${SLUG}/${sl}` : `/w/${SLUG}`,
    expect: GUEST_ROUTE_EXPECT[sl],
  }));
}

const first = (stack) => (stack || '').split(',')[0].replace(/['"]/g, '').trim();

async function main() {
  const t = resolveTypography(PUBLISHED_WEDDING);
  const allowed = new Set([first(t.headingFont), first(t.bodyFont)]);

  console.log(`\n  Guest font EFFECT — computed styles, not declarations\n`);
  console.log(`  engine: ${process.env.RENDER_ENGINE === 'webkit' ? 'webkit' : 'chromium'}`);
  console.log(`  seed universe: ${PUBLISHED_WEDDING.activeUniverse}`);
  console.log(`  expected faces: ${[...allowed].join(' / ')}\n`);

  // The seed must be capable of failing. If the universe's faces ARE the
  // product face, every page "passes" while proving nothing.
  if (allowed.has('Plus Jakarta Sans') || allowed.size < 2) {
    console.error('  FATAL: the seed universe cannot distinguish a pass from a failure.');
    process.exit(1);
  }

  const browser = await ENGINE.launch();
  let failures = 0;

  const ROUTES = deriveRoutes();
  const unexpected = ROUTES.filter((r) => !r.expect).map((r) => r.path);
  if (unexpected.length) {
    console.error(`  FATAL: derived guest routes with no GUEST_ROUTE_EXPECT entry:\n    ${unexpected.join('\n    ')}`);
    console.error('  Add the string each must render to scripts/lib/renderHarness.mjs.');
    await browser.close();
    process.exit(1);
  }
  console.log(`  ${ROUTES.length} guest routes derived from the router\n`);

  for (const r of ROUTES) {
    const ctx = await seededContext(browser, { width: 1280, height: 900 });
    const page = await ctx.newPage();
    let rendered = true;
    try {
      await page.goto(BASE + r.path, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        (s) => (document.getElementById('root')?.innerText || '').includes(s),
        r.expect, { timeout: 30000 });
    } catch { rendered = false; }

    if (!rendered) {
      console.log(`  ❌ ${r.path} — PRESENCE FAILED (expected ${JSON.stringify(r.expect)}); not measured`);
      failures++;
      await ctx.close();
      continue;
    }

    const seen = await page.evaluate(() => {
      const counts = {};
      document.querySelectorAll('#root h1, #root h2, #root h3, #root p, #root span, #root a').forEach((el) => {
        if (!(el.textContent || '').trim()) return;
        const f = getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        counts[f] = (counts[f] || 0) + 1;
      });
      return counts;
    });

    const wrong = Object.entries(seen).filter(([fam]) => !allowed.has(fam));
    const total = Object.values(seen).reduce((a, b) => a + b, 0);
    if (total === 0) {
      console.log(`  ❌ ${r.path} — rendered but produced no measurable text`);
      failures++;
    } else if (wrong.length) {
      console.log(`  ❌ ${r.path} — ${wrong.map(([f, n]) => `${n}× ${f}`).join(', ')}  (of ${total})`);
      failures++;
    } else {
      console.log(`  ✅ ${r.path} — ${total} elements, all in the universe's faces`);
    }
    await ctx.close();
  }

  await browser.close();
  console.log(`\n  ${ROUTES.length - failures}/${ROUTES.length} guest routes render the faces they declare\n`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('  FATAL:', e.message); process.exit(1); });
