/**
 * No script rolls its own route interception, and none of them use an api glob.
 *
 * `page.route('**\/api\/**')` also matches Vite's own `/src/api/base44Client.js`.
 * The interceptor then answers the app's JavaScript with JSON, the browser
 * refuses it ("Expected a JavaScript-or-Wasm module script but the server
 * responded with a MIME type of application/json"), and EVERY PAGE RENDERS
 * ZERO CHARACTERS — while a sweep happily reports measurements taken on
 * nothing.
 *
 * It was found, diagnosed and fixed once, in scripts/lib/renderHarness.mjs,
 * by replacing the glob with a URL predicate requiring
 * pathname.startsWith('/api/'). IT CAME BACK on 2026-08-25 in a new one-off
 * render script, because the fix lived in one file rather than in something
 * new scripts inherit.
 *
 * So this is not a guard against a typo. It is the fix moved to where the next
 * author inherits it: a bug that can recur in new code is not fixed by
 * cleaning up the one site you were looking at.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../');

/**
 * Files the scan must skip, each for a stated reason. Same idiom as the meal
 * contract's DEFINITION_FILE: a guard has to be allowed to contain the thing
 * it forbids, or it cannot test for it.
 */
const EXEMPT = new Map([
  ['scripts/lib/renderHarness.mjs', 'the one sanctioned interceptor — it IS the shared implementation'],
  ['tests/persistence/route-interception-guard.mjs', 'this guard: its controls must contain the forbidden patterns'],
]);
const SANCTIONED = 'scripts/lib/renderHarness.mjs';

/** A glob argument to page/context.route whose pattern mentions `api`. */
const API_GLOB = /\.route\(\s*(['"`])[^'"`]*api[^'"`]*\1/;
/** Any route() call taking a string literal — i.e. a glob, not a predicate. */
const STRING_ROUTE = /\.route\(\s*['"`]/;

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== 'node_modules') walk(p, out); }
    else if (/\.(mjs|js)$/.test(e)) out.push(p);
  }
  return out;
}

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export async function runRouteInterceptionGuard() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Route interception — the harness, or nothing:\n');

  const files = [...walk(resolve(ROOT, 'scripts')), ...walk(resolve(ROOT, 'tests'))]
    .map((f) => relative(ROOT, f));
  check('the guard scans scripts/ and tests/', files.length > 20, `${files.length} files`);
  // An exemption without a reason is an exemption nobody can audit later.
  check('  and every exemption states why',
    [...EXEMPT.values()].every((r) => r && r.length > 20), `${EXEMPT.size} exempt`);

  const apiGlobs = [];
  const stringRoutes = [];
  for (const rel of files) {
    if (EXEMPT.has(rel)) continue;
    const code = strip(readFileSync(resolve(ROOT, rel), 'utf8'));
    if (API_GLOB.test(code)) apiGlobs.push(rel);
    else if (STRING_ROUTE.test(code)) stringRoutes.push(rel);
  }

  check('no script intercepts with a glob mentioning "api"',
    apiGlobs.length === 0,
    apiGlobs.join(', ') || 'clean — the harness is the only interceptor');

  // Broader than the literal instruction, and deliberately so: ANY string
  // pattern is a glob, and the next one to bite will not necessarily contain
  // "api". A predicate is cheap; a silent blank sweep is not.
  check('  and none passes a string pattern at all — predicates only',
    stringRoutes.length === 0,
    stringRoutes.join(', ') || 'no glob interception anywhere');

  // The sanctioned implementation must remain the thing it claims to be, or
  // the exemption above is protecting a file that no longer does the job.
  const harness = readFileSync(resolve(ROOT, SANCTIONED), 'utf8');
  check('the harness still uses a pathname predicate',
    /pathname\.startsWith\('\/api\/'\)/.test(harness) && /ctx\.route\(\(url\)/.test(harness),
    'the one sanctioned implementation');
  check('  and still carries the reason it exists',
    /URL PREDICATE, not a glob/.test(harness), 'the comment is the handover');

  // CONTROLS: both detectors must be able to see the thing they forbid.
  check('  control: an api glob IS detected',
    API_GLOB.test(`await page.route('**/api/**', h);`), 'detector works');
  check('  control: a non-api string glob IS detected',
    STRING_ROUTE.test(`await page.route('**/*.png', h);`) && !API_GLOB.test(`await page.route('**/*.png', h);`),
    'and is classified separately');
  check('  control: a predicate is NOT flagged',
    !STRING_ROUTE.test(`await ctx.route((url) => isBackend(url), handler);`), 'predicates pass');

  return results;
}
