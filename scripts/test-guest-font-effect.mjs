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
 *   · A route is added and never listed here. NOT guarded — this checks the
 *     routes it knows about. Add new guest routes to ROUTES.
 */
/* eslint-env browser */
/* global document, getComputedStyle */
import { webkit } from 'playwright';
import { seededContext, PUBLISHED_WEDDING } from './lib/renderHarness.mjs';
import { resolveTypography } from '../src/lib/universeStyling.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
const SLUG = PUBLISHED_WEDDING.slug;

/** Guest surfaces and a string each must render before anything is measured. */
const ROUTES = [
  { path: `/w/${SLUG}`,               expect: 'Ada & Alan' },
  { path: `/w/${SLUG}/stay`,          expect: 'Ada & Alan' },
  { path: `/w/${SLUG}/accommodation`, expect: 'Where to Stay' },
  { path: `/w/${SLUG}/music`,         expect: 'Request a song' },
];

const first = (stack) => (stack || '').split(',')[0].replace(/['"]/g, '').trim();

async function main() {
  const t = resolveTypography(PUBLISHED_WEDDING);
  const allowed = new Set([first(t.headingFont), first(t.bodyFont)]);

  console.log(`\n  Guest font EFFECT — computed styles, not declarations\n`);
  console.log(`  seed universe: ${PUBLISHED_WEDDING.activeUniverse}`);
  console.log(`  expected faces: ${[...allowed].join(' / ')}\n`);

  // The seed must be capable of failing. If the universe's faces ARE the
  // product face, every page "passes" while proving nothing.
  if (allowed.has('Plus Jakarta Sans') || allowed.size < 2) {
    console.error('  FATAL: the seed universe cannot distinguish a pass from a failure.');
    process.exit(1);
  }

  const browser = await webkit.launch();
  let failures = 0;

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
