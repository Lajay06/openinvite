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
import { UNIVERSE_CONFIGS } from '../src/lib/websiteThemes.js';
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
  let contrastFailures = 0;

  const ROUTES = deriveRoutes();
  const unexpected = ROUTES.filter((r) => !r.expect).map((r) => r.path);
  if (unexpected.length) {
    console.error(`  FATAL: derived guest routes with no GUEST_ROUTE_EXPECT entry:\n    ${unexpected.join('\n    ')}`);
    console.error('  Add the string each must render to scripts/lib/renderHarness.mjs.');
    await browser.close();
    process.exit(1);
  }
  // EVERY LAYOUT BRANCH, NOT EVERY ROUTE ONCE.
  //
  // This guard enumerated 15 routes against ONE universe, and WeddingHomePage
  // alone branches ELEVEN ways on `universeConfig.layout`. So ten of eleven
  // hero branches were unreachable by it, and a page that threw React #31 in
  // any of them passed 15/15 in silence. Measured: injecting the same crash
  // into london's branch failed the run; injecting it into any other branch
  // did not fail anything at all.
  //
  // The home route is the one that branches, so it is swept across every
  // universe. The rest keep one pass each — they do not branch on layout, and
  // a full cross-product would be 300 renders to catch nothing extra.
  const HOME = ROUTES.filter((r) => r.path.endsWith(`/w/${PUBLISHED_WEDDING.slug}`) || r.path.endsWith('/home'));
  // The sweep expects the COUPLE'S NAMES, not london's kicker. Each universe
  // writes its own kicker ("A quiet gathering", "You are invited"), so reusing
  // one universe's string made 19 of 20 wait out the full timeout — a ten
  // minute run that proved nothing. The names are what every hero renders.
  const layoutSweep = Object.keys(UNIVERSE_CONFIGS).map((uni) => ({
    ...HOME[0], universe: uni, expect: PUBLISHED_WEDDING.coupleNames,
    label: `${HOME[0].path} [${uni}]`, timeout: 9000,
  }));
  const PASSES = [...ROUTES.map((r) => ({ ...r, label: r.path })), ...layoutSweep];

  console.log(`  ${ROUTES.length} guest routes derived from the router`);
  console.log(`  + ${layoutSweep.length} home renders, one per universe — the hero branches ${Object.keys(UNIVERSE_CONFIGS).length} ways\n`);

  for (const r of PASSES) {
    const ctx = await seededContext(browser, { width: 1280, height: 900 });
    if (r.universe) {
      await ctx.route(
        (u) => { try { return new URL(typeof u === 'string' ? u : u.href).pathname.startsWith('/api/wedding-by-slug'); } catch { return false; } },
        (route) => route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ ...PUBLISHED_WEDDING, activeUniverse: r.universe }) }));
    }
    const page = await ctx.newPage();
    let rendered = true;
    try {
      await page.goto(BASE + r.path, { waitUntil: 'domcontentloaded' });
      // CASE-INSENSITIVE, deliberately. `innerText` APPLIES text-transform, so a
      // title rendered through a uppercase-styled section mark reads back as
      // "WHERE TO STAY" no matter how the source spells it. This gate asks
      // whether the CONTENT rendered; casing is enforced by
      // tests/persistence/sentence-case-chrome.mjs, and guest artwork is exempt
      // from that anyway. Compared case-sensitively, three pages that rendered
      // perfectly reported PRESENCE FAILED.
      await page.waitForFunction(
        (s) => (document.getElementById('root')?.innerText || '')
          .toUpperCase().includes(s.toUpperCase()),
        r.expect, { timeout: r.timeout || 30000 });
    } catch { rendered = false; }

    // Ask the page whether it threw, rather than inferring it from absence.
    const crashed = !rendered && await page.evaluate(() =>
      /Something went wrong|unexpected error occurred/i.test(document.body.innerText || ''));

    if (!rendered) {
      // DISTINGUISH A CRASH FROM MISSING CONTENT. Both fail presence, but they
      // are different defects and the diagnosis costs real time: "expected X"
      // reads as a copy problem when the page actually threw and rendered the
      // error boundary.
      console.log(crashed
        ? `  ❌ ${r.label} — THE PAGE THREW and rendered the error boundary; not measured`
        : `  ❌ ${r.label} — PRESENCE FAILED (expected ${JSON.stringify(r.expect)}); not measured`);
      failures++;
      await ctx.close();
      continue;
    }

    // THE LAYOUT SWEEP IS PRESENCE-AND-CRASH ONLY. Each universe legitimately
    // renders its OWN faces, so asserting london's pair against all twenty
    // would fail nineteen of them for being correct. Fonts are already checked
    // per-route on the seeded universe; what was missing was any render at all
    // of the other ten hero branches.
    if (r.universe) {
      console.log(`  ✅ ${r.label} — rendered`);
      await ctx.close();
      continue;
    }

    const contrast = await page.evaluate(() => {
      // EFFECT-LEVEL CONTRAST. Not "what colour does the source say" — what
      // does the browser actually paint, over whatever ancestor supplies the
      // background. A card styled theme.darkBg containing text styled
      // theme.lightText is dark-on-dark, and grepping a file for both tokens
      // cannot tell you whether they meet on screen.
      const lum = (c) => {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const [r, g, b, a] = m[1].split(',').map(Number);
        if (a === 0) return null;
        const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      // A TRANSLUCENT BACKGROUND IS NOT AN OPAQUE ONE. The first version of
      // this took the first backgroundColor with alpha > 0 and treated it as
      // the ground — so `rgba(255,255,255,0.04)` over a near-black page read as
      // WHITE, and white text on it scored 1:1. It reported a real page as
      // unreadable when it is fine. Composite instead: blend each translucent
      // layer over what is behind it, exactly as the browser paints.
      const rgb = (c) => {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(',').map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      };
      const bgOf = (el) => {
        const layers = [];
        for (let n = el; n; n = n.parentElement) {
          const c = rgb(getComputedStyle(n).backgroundColor);
          if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; }
        }
        let out = { r: 255, g: 255, b: 255 };       // page ground
        for (let i = layers.length - 1; i >= 0; i--) {
          const l = layers[i];
          out = { r: l.r * l.a + out.r * (1 - l.a),
                  g: l.g * l.a + out.g * (1 - l.a),
                  b: l.b * l.a + out.b * (1 - l.a) };
        }
        const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(out.r) + 0.7152 * f(out.g) + 0.0722 * f(out.b);
      };
      const out = [];
      document.querySelectorAll('#root h1,#root h2,#root h3,#root h4,#root p,#root span,#root a,#root li').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (!txt || el.children.length) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        const fg = lum(cs.color);
        if (fg === null) return;
        const bg = bgOf(el);
        const op = parseFloat(cs.opacity);
        const hi = Math.max(fg, bg), lo = Math.min(fg, bg);
        const ratio = (hi + 0.05) / (lo + 0.05);
        if (ratio < 4.5) out.push({ txt: txt.slice(0, 34), ratio: +ratio.toFixed(2), color: cs.color, op });
      });
      return out;
    });
    if (contrast.length) {
      console.log(`  ⚠ ${r.label} — ${contrast.length} text element(s) below 4.5:1`);
      contrast.slice(0, 4).forEach((c) => console.log(`      ${c.ratio}:1  "${c.txt}"  ${c.color}`));
      contrastFailures += contrast.length;
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
      console.log(`  ❌ ${r.label} — rendered but produced no measurable text`);
      failures++;
    } else if (wrong.length) {
      console.log(`  ❌ ${r.label} — ${wrong.map(([f, n]) => `${n}× ${f}`).join(', ')}  (of ${total})`);
      failures++;
    } else {
      console.log(`  ✅ ${r.label} — ${total} elements, all in the universe's faces`);
    }
    await ctx.close();
  }

  await browser.close();
  console.log(`\n  ${ROUTES.length - failures}/${ROUTES.length} guest routes render the faces they declare`);
  console.log(`  ${contrastFailures} text element(s) below the 4.5:1 contrast floor\n`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error('  FATAL:', e.message); process.exit(1); });
