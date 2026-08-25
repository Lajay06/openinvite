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
 * Usage: node scripts/test-prerendered-freshness.mjs
 * Exits 0 if fresh (or nothing marketing-relevant changed, or no diff base
 * is available — e.g. a shallow/orphan local checkout), 1 if stale.
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
if (base === null) {
  console.log('[prerender-freshness] No diff base available — skipping (nothing to compare against).');
  process.exit(0);
}

let changed;
try {
  const range = process.env.GITHUB_EVENT_NAME === 'push' ? `${base}..HEAD` : `${base}...HEAD`;
  changed = git(`diff --name-only ${range}`).split('\n').filter(Boolean);
} catch (err) {
  console.warn(`[prerender-freshness] Diff against ${base} failed: ${err.message.split('\n')[0]} — skipping.`);
  process.exit(0);
}

const marketingSourceChanged = changed.filter((f) => MARKETING_SOURCE_PATTERNS.some((re) => re.test(f)));
const prerenderedChanged = changed.some((f) => f.startsWith('prerendered/'));

console.log('\n═══════════════════════════════════════════════════════');
console.log('  Prerendered freshness guard');
console.log('═══════════════════════════════════════════════════════\n');

assertNoStaleMarketingDeps();

if (marketingSourceChanged.length === 0) {
  console.log('  ✓ No marketing-relevant source files changed in this diff — nothing to check.');
  console.log('───────────────────────────────────────────────────────\n');
  process.exit(0);
}

if (prerenderedChanged) {
  console.log(`  ✓ ${marketingSourceChanged.length} marketing source file(s) changed, and prerendered/ was updated in the same diff.`);
  console.log('───────────────────────────────────────────────────────\n');
  process.exit(0);
}

console.error('  ✗ Marketing source changed but prerendered/ was not updated:\n');
marketingSourceChanged.forEach((f) => console.error(`      ${f}`));
console.error('');
console.error('  Production serves prerendered/ snapshots as static HTML to crawlers');
console.error("  and no-JS clients — vercel.json's buildCommand only APPLIES those");
console.error('  committed snapshots (scripts/apply-prerendered.mjs), it never');
console.error('  regenerates them. A real browser still looks correct (React');
console.error('  re-renders over the stale HTML on mount), which is exactly why this');
console.error('  class of bug ships unnoticed without a check like this one.\n');
console.error('  Run `npm run build:prerender` locally and commit the updated');
console.error('  prerendered/ files in this same PR.\n');
console.log('───────────────────────────────────────────────────────\n');
process.exit(1);
