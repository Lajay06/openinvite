/* global document */
/**
 * scripts/test-prerendered-freshness.mjs
 *
 * Structural guard, not a reminder. Incident, 2026-08-04: four consecutive
 * marketing PRs (a same-day About/Features/Ava/Pricing/Home/Universes
 * batch) all merged to main without anyone running `npm run
 * build:prerender`. vercel.json's buildCommand only APPLIES the committed
 * prerendered/ snapshots into dist/ (scripts/apply-prerendered.mjs) — it
 * never regenerates them from current source. Production kept serving
 * pre-batch, stale static HTML to crawlers and no-JS clients at every
 * touched marketing route (confirmed on production: /about's prerendered
 * snapshot still had the old hero, old headline, a since-removed photo,
 * and a since-removed feature) while a real browser looked completely
 * correct, because React re-renders over that stale server HTML on
 * mount — the exact kind of silent, JS-masked drift a human "remember to
 * run build:prerender" note keeps missing. See scripts/prerender.mjs's
 * own docstring, which already said this in words; this is that same rule
 * enforced in code instead of relied on as a habit.
 *
 * What this checks: diffs the current branch against its merge-base with
 * the PR's base branch (pull_request events) or against the immediately
 * prior commit (push events). If that diff touches any marketing-relevant
 * source file — a marketing page under src/pages/, a component under
 * src/components/marketing|home|public/, or one of the few shared
 * lib/hook files marketing copy is known to read from — the diff MUST
 * also touch something under prerendered/. If it doesn't, this fails and
 * tells you to run `npm run build:prerender` and commit the result.
 *
 * This is a coarse, path-based check, not real import-graph analysis (no
 * bundler available at this stage) — deliberately conservative: it will
 * occasionally ask for a prerender regeneration a change didn't strictly
 * need, but it can never silently miss one that a required page actually
 * imports, because MARKETING_SOURCE_PATTERNS below covers every directory
 * a marketing page is known to import shared pieces from, not just the
 * page files themselves.
 *
 * THAT DIFF IS NO LONGER THE VERDICT. It is printed as a note — when the render
 * below fails, the changed marketing sources are the first thing anyone wants
 * to see — and then it stops mattering.
 *
 * WHAT DECIDES IS THE RENDER, ON EVERY RUN. All fourteen marketing routes are
 * rendered from current source and each page's <div id="root"> compared to the
 * committed file; see fullCompare() at the bottom. ONE PATH, deliberately:
 *
 *   - A diff answers "did this change forget to regenerate". That is a
 *     different question from "is what is committed what the source produces",
 *     and only the second is what production serves. R35's third occurrence:
 *     the guard exited 0 on main with an empty range while two pages were
 *     stale, and #707's merge push passed a NON-empty diff while main was
 *     stale — because the staleness lived in the combination of #703 and
 *     #707, and no pairwise diff can see that.
 *
 *   - A guard that renders only on main is not gated before merge. The
 *     first version of this fallback ran on main only, so the PR that added it
 *     never executed it, and it reached main unable to launch a browser. Now a
 *     PR proves the same property main is held to, with the same code.
 *
 * Needs a browser, so in ci.yml this step runs AFTER the Playwright install.
 *
 * Usage: node scripts/test-prerendered-freshness.mjs
 * Exits 0 if every page body matches, 1 if any differs or cannot be rendered.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';

const MARKETING_SOURCE_PATTERNS = [
  // The marketing/auth pages themselves — exactly the set
  // scripts/marketingRoutes.mjs / prerender.mjs render. Deliberately does
  // NOT include CookiePolicy/RefundPolicy/DataDeletion — those pages exist
  // and are linked from the footer, but are not in MARKETING_ROUTES and
  // are not prerendered, so a change there has nothing to check here.
  /^src\/pages\/(Home|Features|Ava|FAQ|Universes|Gifting|Pricing|Contact|About|PrivacyPolicy|TermsOfService|Login|Register|ForgotPassword)\.jsx$/,
  // Shared building blocks those pages are known to import.
  /^src\/components\/marketing\//,
  /^src\/components\/home\//,
  /^src\/components\/public\//,
  /^src\/components\/motion\//,
  /^src\/components\/shared\/(ProductVideo|ProductMediaFrame)\.jsx$/,
  // Copy/data sources marketing pages read from directly.
  /^src\/lib\/planFeatures\.js$/,
  /^src\/lib\/marketingSeo\.js$/,
  /^src\/lib\/universeCatalog\.js$/,
  // RESTORED 2026-08-25 after being wrongly removed in #554.
  //
  // The removal was justified with "no marketing file imports it" — which was
  // only true of DIRECT imports. src/lib/universeCatalog.js imports
  // UNIVERSE_CONFIGS from it and derives the Universes page's display ORDER,
  // its Ultra TIER gating and its descriptions; Universes.jsx and
  // UniverseTeaserSection.jsx import universeCatalog. So websiteThemes is
  // reachable from a prerendered marketing page in two hops.
  //
  // Proven, not argued: flipping one universe's tier and re-running the
  // prerender changes the rendered #root of prerendered/universes/index.html,
  // not merely its asset hashes.
  //
  // Removing it created exactly the silent-stale-HTML hole this guard exists
  // to prevent — the 2026-08-04 incident class. The copy changes that motivated
  // the removal (rsvpIntro/rsvpSent live under UNIVERSE_CONFIGS[x].copy, which
  // universeCatalog never reads) really are harmless, but the ENTRY is not.
  // The right fix is to split guest copy into its own module so the two
  // concerns stop sharing a file; until then the conservative entry stands.
  /^src\/lib\/websiteThemes\.js$/,
  /^src\/hooks\/useMarketingSeo\.js$/,
  /^src\/hooks\/useOrganizationStructuredData\.js$/,
];

/**
 * The list above is a REMEMBERED dependency graph. A remembered graph rots:
 * an entry stops being true and nobody notices until it costs a CI round-trip,
 * or — far worse in the other direction — a real import appears and no entry
 * covers it, and the guard silently stops protecting the route.
 *
 * This asserts the one edge we deliberately removed. It runs unconditionally,
 * BEFORE the early exit for "nothing marketing-relevant changed", because a
 * new import is exactly the case where nothing marketing-relevant appears to
 * have changed.
 */
function assertNoStaleMarketingDeps() {
  // TRANSITIVE, not direct. The direct-only version of this shipped in #554 and
  // reported "no marketing file imports websiteThemes" while
  // Universes.jsx -> universeCatalog.js -> websiteThemes.js was live the whole
  // time. A direct-import check answers a different question from the one the
  // guard asks, which is: can a change to this file reach a prerendered page?
  const TREES = ['src/components/marketing', 'src/components/home', 'src/components/public'];
  const PAGES = ['Home', 'Features', 'Ava', 'FAQ', 'Universes', 'Gifting', 'Pricing',
                 'Contact', 'About', 'PrivacyPolicy', 'TermsOfService', 'Login',
                 'Register', 'ForgotPassword'].map((n) => `src/pages/${n}.jsx`);

  const walk = (dir, out = []) => {
    if (!existsSync(dir)) return out;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full, out);
      else if (/\.jsx?$/.test(e.name)) out.push(full);
    }
    return out;
  };

  /** Resolves an import specifier to a repo path, or null if it is external. */
  const resolveSpec = (spec, fromFile) => {
    let rel;
    if (spec.startsWith('@/')) rel = join('src', spec.slice(2));
    else if (spec.startsWith('.')) rel = join(dirname(fromFile), spec);
    else return null;
    for (const cand of [rel, `${rel}.js`, `${rel}.jsx`, join(rel, 'index.js'), join(rel, 'index.jsx')]) {
      if (existsSync(cand) && statSync(cand).isFile()) return cand;
    }
    return null;
  };

  // Breadth-first over the real import graph, from every marketing entry point.
  const seen = new Set();
  const queue = [...TREES.flatMap((t) => walk(t)), ...PAGES.filter((f) => existsSync(f))];
  const roots = queue.length;
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    let src;
    try { src = readFileSync(file, 'utf8'); } catch { continue; }
    for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const next = resolveSpec(m[1], file);
      if (next && !seen.has(next)) queue.push(next);
    }
  }

  // Every lib/hook entry in the pattern list must be REACHABLE. An unreachable
  // one is a stale entry costing CI round-trips; a reachable one that is NOT
  // listed is the dangerous direction — the guard silently stops protecting a
  // route. Both are reported.
  const WATCHED = [
    'src/lib/planFeatures.js', 'src/lib/marketingSeo.js', 'src/lib/universeCatalog.js',
    'src/lib/websiteThemes.js', 'src/hooks/useMarketingSeo.js',
    'src/hooks/useOrganizationStructuredData.js',
  ];
  const unreachable = WATCHED.filter((f) => existsSync(f) && !seen.has(f));
  if (unreachable.length > 0) {
    console.error('\n  ✗ Listed as a marketing source but NOT reachable from any prerendered page:\n');
    unreachable.forEach((f) => console.error(`      ${f}`));
    console.error('\n  Either the entry is stale, or an import was removed. Verify both');
    console.error('  directions before deleting it — #554 deleted one on a direct-import');
    console.error('  check and missed a two-hop path that was live.\n');
    process.exit(1);
  }
  console.log(`  ✓ All ${WATCHED.length} watched sources are reachable from marketing (${seen.size} modules from ${roots} entry points).`);
}

/**
 * ── THE CHECK: RENDER IT AND COMPARE IT ────────────────────────────────────
 *
 * R35, third occurrence, 2026-09-08. Everything above is diff-based: it asks
 * "did this change touch a marketing source without touching prerendered/".
 * That question has no answer when there is no diff — standing on main, or on
 * a branch with no commits yet, `origin/main...HEAD` is empty and the guard
 * printed `✓ … nothing to check` and exited 0.
 *
 * It did exactly that on main at 93ef159, immediately after #707 merged, while
 * prerendered/login and prerendered/register were genuinely stale: #703 had
 * removed `tracking-tight` from AuthLayout.jsx, and #707's snapshot had been
 * generated before #703 landed. Two PRs, each fresh against its own base,
 * combining into a stale main — the one shape a diff can never see, because
 * neither diff contained the staleness.
 *
 * So the guard stopped asking about a diff and asks the only question that
 * means anything: RENDER EVERY PAGE FROM CURRENT SOURCE AND COMPARE IT TO WHAT
 * IS COMMITTED. It is slower — it needs a build and a browser — and it is the
 * only form of this check that can be trusted, so it is what runs, every time.
 *
 * ── WHAT IS COMPARED, AND WHAT IS NORMALISED ──────────────────────────────
 *
 * Only `<div id="root">`: the rendered page. Everything outside it is <head>,
 * and <head> changes on every single build — Vite content-hashes the bundle
 * filenames, so `index-CqpPR-m5.js` becomes `index-BBzHMgkF.js` with no source
 * change at all. Comparing whole files would fail on every run and teach
 * people to ignore it.
 *
 * Both sides are serialised the same way, which is what makes them
 * comparable: the committed files were produced by Playwright's
 * `page.content()`, and so is the live side here.
 *
 * Inside the body, two things are normalised, each because it varies without
 * the page varying:
 *   - `/assets/<name>-<hash>.<ext>` → `/assets/<name>.<ext>`. An <img> or
 *     <source> inside the body carries the same per-build hash as <head>.
 *   - runs of whitespace between tags → a single space. React's output is
 *     stable, but the serialiser's line breaking is not worth a false red.
 * Nothing else. Class names, attributes, text and element order are compared
 * exactly, because those are the things a stale snapshot gets wrong — the
 * incident this guard exists for was a stale hero, and the drift found on
 * 2026-09-08 was a single class name.
 */
function sliceRootBody(html) {
  const start = html.indexOf('<div id="root">');
  if (start === -1) return null;
  // Walk to the matching close by counting divs. A regex cannot do this: the
  // document is minified onto a handful of lines, so `.*` runs past </div>
  // and swallows the trailing <script> tags — which carry the asset hashes,
  // which is how a first attempt at this reported three pages as differing
  // when only two did.
  let depth = 0;
  const tag = /<(\/?)div\b[^>]*>/g;
  tag.lastIndex = start;
  let m;
  while ((m = tag.exec(html)) !== null) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index + m[0].length);
  }
  return null;
}

function normaliseBody(body) {
  return body
    .replace(/\/assets\/([A-Za-z0-9_]+)-[A-Za-z0-9_-]{6,}\.(js|css|png|jpg|jpeg|svg|webp|woff2?)/g, '/assets/$1.$2')
    // A TRANSITION CAUGHT MID-FLIGHT IS NOT A DIFFERENCE.
    //
    // The reveal animations write their current opacity into the inline style
    // as they run: `opacity: 0.5; transition: opacity 0.4s`. Whatever value is
    // there at capture time is an accident of when the screenshot happened,
    // and the committed snapshots hold arbitrary mid-flight values for the
    // same reason — prerender.mjs captures on the same 500ms beat.
    //
    // Measured before this line existed: three consecutive runs of the same
    // unchanged source gave `features` failing, then `index` failing, then a
    // clean pass. A guard that flaps is worse than no guard, because the first
    // red is investigated and the second is ignored.
    //
    // NARROW ON PURPOSE: only an `opacity` that sits in the same style
    // attribute as a `transition` is blanked. A static `opacity: 0` — an
    // element deliberately hidden — carries no transition and is still
    // compared exactly.
    .replace(/style="([^"]*)"/g, (whole, decls) => (
      /transition\s*:/.test(decls)
        ? `style="${decls.replace(/opacity\s*:\s*[\d.]+/g, 'opacity: <animating>')}"`
        : whole
    ))
    .replace(/>\s+</g, '> <')
    .trim();
}

async function fullCompare() {
  const { chromium } = await import('playwright');
  const { spawn } = await import('node:child_process');
  const { MARKETING_ROUTES } = await import('./marketingRoutes.mjs');
  const { blockRemoteImages } = await import('./lib/blockRemoteImages.mjs');
  const { resolve } = await import('node:path');

  const ROOT = process.cwd();
  const PORT = 4791; // distinct from prerender.mjs's 4790 — both may run in one job
  const BASE = `http://localhost:${PORT}`;

  if (!existsSync(resolve(ROOT, 'dist/index.html'))) {
    console.error('  ✗ dist/index.html not found — the full compare needs a build.');
    console.error('    Run `npm run build` first (CI builds before this step).\n');
    process.exit(1);
  }

  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore' });

  const up = async () => {
    for (let i = 0; i < 60; i++) {
      try { const r = await fetch(BASE); if (r.ok) return true; } catch { /* not yet */ }
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  };
  if (!(await up())) {
    preview.kill();
    console.error('  ✗ preview server never came up.\n');
    process.exit(1);
  }

  // A MISSING BROWSER IS A CONFIGURATION FAULT, AND IT MUST SAY SO.
  //
  // The first CI run of this fallback died on `browserType.launch: Executable
  // doesn't exist` with a raw stack trace, because the step sat 170 lines
  // before `npx playwright install` in the same job. The failure was correct —
  // the guard genuinely could not check anything — but it read like the guard
  // itself was broken rather than like a step in the wrong place.
  //
  // It still FAILS (a check that cannot run must never report a pass; that is
  // this whole file's subject), it just explains itself.
  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    preview.kill();
    console.error('  ✗ The full compare needs a browser and none is installed.\n');
    console.error(`      ${String(err.message).split('\n')[0]}\n`);
    console.error('    This guard renders every marketing route whenever a diff cannot');
    console.error('    answer the question (an empty range, or any run on main). In CI it');
    console.error('    must therefore run AFTER the Playwright install step, not before.');
    console.error('    Locally: npx playwright install chromium\n');
    console.log('───────────────────────────────────────────────────────\n');
    process.exit(1);
  }
  const stale = [];
  const missing = [];
  let compared = 0;

  for (const route of MARKETING_ROUTES) {
    const file = route === '/' ? 'prerendered/index.html'
      : `prerendered/${route.replace(/^\//, '')}/index.html`;
    if (!existsSync(file)) { missing.push(file); continue; }

    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await blockRemoteImages(ctx);
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      // Same explicit beat prerender.mjs waits: useMarketingSeo() and the
      // page's own content both land inside React's mount.
      await page.waitForTimeout(500);
      // Then let the entrance animations finish where they will. This narrows
      // the window the normaliser has to cover rather than replacing it — some
      // reveals are driven by IntersectionObserver and never start off-screen,
      // so waiting alone can never be sufficient. Bounded and best-effort: a
      // page that keeps something running forever must not hang the guard.
      await page.waitForFunction(
        () => !document.getAnimations || document.getAnimations()
          .every((a) => a.playState === 'finished' || a.playState === 'idle'),
        { timeout: 3000 },
      ).catch(() => {});
      const liveBody = sliceRootBody(await page.content());
      const fileBody = sliceRootBody(readFileSync(file, 'utf8'));
      if (liveBody === null || fileBody === null) {
        stale.push(`${file} — could not locate <div id="root">`);
      } else if (normaliseBody(liveBody) !== normaliseBody(fileBody)) {
        const a = normaliseBody(fileBody), b = normaliseBody(liveBody);
        let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
        stale.push(`${file}\n          committed:  …${a.slice(Math.max(0, i - 40), i + 60)}…\n          rendered:   …${b.slice(Math.max(0, i - 40), i + 60)}…`);
      }
      compared++;
    } catch (err) {
      stale.push(`${file} — render failed: ${err.message.split('\n')[0]}`);
    }
    await ctx.close();
  }

  await browser.close();
  preview.kill();

  if (missing.length > 0) {
    console.error(`\n  ✗ ${missing.length} marketing route(s) have no committed snapshot:\n`);
    missing.forEach((f) => console.error(`      ${f}`));
  }
  if (stale.length > 0) {
    console.error(`\n  ✗ ${stale.length} of ${compared} prerendered page(s) do NOT match current source:\n`);
    stale.forEach((s) => console.error(`      ${s}`));
    console.error('\n  Production serves these snapshots as static HTML to crawlers and');
    console.error('  no-JS clients. Run `npm run build:prerender` and commit the files');
    console.error('  that actually changed body content (asset-hash-only churn in the');
    console.error('  <head> is not a change and should not be committed).\n');
    console.log('───────────────────────────────────────────────────────\n');
    process.exit(1);
  }
  if (missing.length > 0) {
    console.log('───────────────────────────────────────────────────────\n');
    process.exit(1);
  }

  console.log(`  ✓ Full compare: all ${compared} prerendered page bodies match current source.`);
  console.log('───────────────────────────────────────────────────────\n');
  process.exit(0);
}

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function resolveDiffBase() {
  const eventName = process.env.GITHUB_EVENT_NAME;

  if (eventName === 'pull_request') {
    const baseRef = process.env.GITHUB_BASE_REF;
    if (!baseRef) return null;
    try {
      git(`fetch origin ${baseRef} --depth=100`);
      return `origin/${baseRef}`;
    } catch (err) {
      console.warn(`[prerender-freshness] Could not fetch origin/${baseRef}: ${err.message.split('\n')[0]}`);
      return null;
    }
  }

  if (eventName === 'push') {
    const before = process.env.GH_EVENT_BEFORE;
    if (before && !/^0+$/.test(before)) return before;
    return null; // new branch with no prior commit — nothing to diff against
  }

  // Local/manual run (not in CI) — best-effort diff against main.
  try {
    git('fetch origin main --depth=100');
    return 'origin/main';
  } catch {
    return null;
  }
}

const base = resolveDiffBase();

let changed = null;
// COVERAGE REPORTING (2026-08-30): keep the resolved range so every success
// line can state what was compared. A pass that names no input is
// indistinguishable from a pass that had none.
let resolvedRange = null;
if (base !== null) {
  try {
    const range = process.env.GITHUB_EVENT_NAME === 'push' ? `${base}..HEAD` : `${base}...HEAD`;
    resolvedRange = range;
    changed = git(`diff --name-only ${range}`).split('\n').filter(Boolean);
  } catch (err) {
    console.warn(`[prerender-freshness] Diff against ${base} failed: ${err.message.split('\n')[0]}.`);
    changed = null;
  }
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('  Prerendered freshness guard');
console.log('═══════════════════════════════════════════════════════\n');

assertNoStaleMarketingDeps();

// ── THE DIFF IS NOW A NOTE, NOT A VERDICT ─────────────────────────────────
//
// It used to decide pass/fail, and that is the defect: a diff answers "did
// this change forget to regenerate", which is a different question from "is
// what is committed what the source produces". Only the second one is what
// production serves, and only the second one survives two PRs combining.
//
// Kept because it is genuinely useful to READ — when the render below fails,
// the first thing anyone wants is the list of marketing sources that moved.
// It is printed and then it stops mattering.
if (changed === null) {
  console.log('  ℹ No diff base available — no changed-file list to report.');
} else {
  const marketingSourceChanged = changed.filter((f) => MARKETING_SOURCE_PATTERNS.some((re) => re.test(f)));
  const prerenderedChanged = changed.some((f) => f.startsWith('prerendered/'));
  if (changed.length === 0) {
    console.log(`  ℹ ${resolvedRange} is empty — nothing changed to report.`);
  } else if (marketingSourceChanged.length === 0) {
    console.log(`  ℹ ${resolvedRange}: ${changed.length} file(s) changed, none of them a marketing source.`);
  } else {
    console.log(`  ℹ ${resolvedRange}: ${marketingSourceChanged.length} marketing source file(s) changed${prerenderedChanged ? ', and prerendered/ was updated too' : ', and prerendered/ was NOT updated'}:`);
    marketingSourceChanged.forEach((f) => console.log(`      ${f}`));
  }
}
console.log('');

// ── AND THE RENDER IS THE VERDICT, ON EVERY RUN ───────────────────────────
//
// One path, always. Not "diff on a PR, render on main" — that shape meant the
// code main depends on was never exercised by the PR that changed it, which
// is exactly how a fallback shipped that could not launch a browser. A guard
// whose important half only runs after merge has no pre-merge gate at all.
//
// So every run renders all fourteen routes and compares bodies. A PR now
// proves the same property main will be held to, using the same code.
await fullCompare();
