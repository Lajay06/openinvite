/**
 * scripts/test-route-collisions.mjs
 *
 * Regression guard for the case-insensitive route-collision bug that left
 * Transport/Accommodation/Honeymoon silently blank (fix/dashboard-round5):
 * React Router v6 matches paths case-insensitively by default and resolves
 * ties in declaration order, so an auto-generated PascalCase route
 * ("/Transport") sitting earlier in the file than its own kebab-case
 * counterpart ("/transport") would win every visit to "/transport" — and
 * since that auto-route was a `<Navigate to="/transport">`, the result was
 * a no-op self-redirect to the page already being visited, rendering
 * nothing.
 *
 * Static source analysis (same approach as test-persistence.mjs's
 * schema-drift guard), not a live import — src/App.jsx pulls in the whole
 * lazy-loaded page tree and can't be imported by plain Node without a
 * JSX-aware bundler.
 *
 * Checks, computed from the real page-key list and the real route
 * declarations (not hardcoded), so a NEW page hitting this bug is caught
 * too, not just the six known ones:
 *
 *   1. No two declared routes (auto-generated ∪ explicit, within the
 *      authenticated route block) collide when compared case-insensitively.
 *   2. No route's element is a self-redirect (`<Navigate to="X">` on a
 *      route whose own path case-insensitively equals X).
 *   3. The six pages known to need exclusion are still excluded from
 *      auto-route generation AND still have a real (non-redirect) explicit
 *      route rendering them — so a future edit can't silently drop either
 *      half of the fix.
 *
 * Usage: node scripts/test-route-collisions.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const appJsxPath = resolve(__dir, '..', 'src', 'App.jsx');
const pagesConfigPath = resolve(__dir, '..', 'src', 'pages.config.js');
const appSrc = readFileSync(appJsxPath, 'utf8');
const pagesConfigSrc = readFileSync(pagesConfigPath, 'utf8');

let failures = 0;
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failures++;
}
function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('  Route collision guard — src/App.jsx');
console.log('═══════════════════════════════════════════════════════\n');

// ── 1. Extract every PAGES key from pages.config.js's auto-generated object ─
// Anchored at true line-start (multiline `^`) so this can only match the
// real top-level `export const PAGES = {...}` statement, not the two
// illustrative "export const PAGES = {" examples in this file's own header
// docstring (those are indented with " * ", never at column 0).
const pagesBlockMatch = pagesConfigSrc.match(/^export const PAGES = \{([\s\S]*?)^\}/m);
if (!pagesBlockMatch) {
  console.error('✗ Could not find "export const PAGES = { ... }" in pages.config.js — has its shape changed?');
  process.exit(1);
}
const pageKeys = [...pagesBlockMatch[1].matchAll(/"([A-Za-z0-9]+)":\s*[A-Za-z0-9_]+,?/g)].map(m => m[1]);
if (pageKeys.length === 0) {
  console.error('✗ Extracted zero page keys from pages.config.js — regex is broken, not the app.');
  process.exit(1);
}
console.log(`Found ${pageKeys.length} page keys in pages.config.js.\n`);

// ── 2. Extract AUTO_ROUTE_EXCLUDE from App.jsx ────────────────────────────
const excludeMatch = appSrc.match(/const AUTO_ROUTE_EXCLUDE = new Set\(\[([\s\S]*?)\]\)/);
if (!excludeMatch) {
  console.error('✗ Could not find "const AUTO_ROUTE_EXCLUDE = new Set([ ... ])" in App.jsx — has it been renamed/restructured?');
  process.exit(1);
}
const excludeSet = new Set([...excludeMatch[1].matchAll(/'([A-Za-z0-9]+)'/g)].map(m => m[1]));
console.log(`AUTO_ROUTE_EXCLUDE contains: ${[...excludeSet].join(', ')}\n`);

// ── 3. Extract the authenticated (protected) route block's explicit routes ─
const protectedStart = appSrc.indexOf('<Route element={<ProtectedRoute');
const protectedEnd = appSrc.indexOf('<Route path="*" element={<NotFound');
if (protectedStart === -1 || protectedEnd === -1 || protectedEnd < protectedStart) {
  console.error('✗ Could not locate the protected route block anchors in App.jsx — has the structure changed?');
  process.exit(1);
}
const protectedBlock = appSrc.slice(protectedStart, protectedEnd);

// Matches `<Route path="/foo-bar" ... />` up to the next `<Route` or block
// end, capturing the path and (if present) a same-tag `<Navigate to="...">`
// target — the exact shape every explicit route in this file uses. Routes
// with a computed path (the Pages.map auto-loop's `path={\`/${path}\`}`)
// use a template literal, not a quoted string, so they never match this and
// are correctly left to the pageKeys/excludeSet computation instead.
const routeRe = /<Route\s+(?:key=\{[^}]*\}\s+)?path="([^"]+)"[\s\S]*?(?=<Route\s|\n\s*<\/Route>|$)/g;
const explicitRoutes = [];
let m;
while ((m = routeRe.exec(protectedBlock))) {
  const path = m[1];
  const chunk = m[0];
  const navMatch = chunk.match(/<Navigate\s+to="([^"]+)"/);
  explicitRoutes.push({ path, navigateTo: navMatch ? navMatch[1] : null });
}
if (explicitRoutes.length === 0) {
  console.error('✗ Extracted zero explicit routes from the protected block — regex is broken, not the app.');
  process.exit(1);
}
console.log(`Found ${explicitRoutes.length} explicit <Route> declarations in the authenticated block.\n`);

// ── 4. Build the full declared-route list: auto-generated + explicit ──────
const autoGenerated = pageKeys
  .filter(key => !excludeSet.has(key))
  .map(key => ({ path: `/${key}`, navigateTo: null, source: 'auto-generated' }));
const explicit = explicitRoutes
  .filter(r => r.path !== '/') // the root MainPage route can't collide with anything
  .map(r => ({ ...r, source: 'explicit' }));
const allRoutes = [...autoGenerated, ...explicit];

// ── Check 1: case-insensitive collisions ───────────────────────────────────
console.log('Case-insensitive collision check:');
const byLowerPath = new Map();
for (const r of allRoutes) {
  const key = r.path.toLowerCase();
  if (!byLowerPath.has(key)) byLowerPath.set(key, []);
  byLowerPath.get(key).push(r);
}
let collisionsFound = 0;
for (const [lower, routes] of byLowerPath) {
  if (routes.length > 1) {
    collisionsFound++;
    fail(`"${lower}" is declared ${routes.length} times: ${routes.map(r => `${r.path} (${r.source})`).join(' vs ')}`);
  }
}
if (collisionsFound === 0) pass(`No case-insensitive collisions across ${allRoutes.length} declared routes.`);

// ── Check 2: self-redirects ─────────────────────────────────────────────────
console.log('\nSelf-redirect check:');
let selfRedirectsFound = 0;
for (const r of allRoutes) {
  if (r.navigateTo && r.navigateTo.toLowerCase() === r.path.toLowerCase()) {
    selfRedirectsFound++;
    fail(`"${r.path}" redirects to "${r.navigateTo}" — a no-op self-redirect that renders nothing.`);
  }
}
if (selfRedirectsFound === 0) pass('No route redirects to itself.');

// ── Check 3: the six known-fragile pages stay fixed ─────────────────────────
// Only Transport/Accommodation/Honeymoon are single-word PascalCase names
// that actually case-collide with their kebab-case route (no hyphen is
// inserted for a single word, so "Transport".toLowerCase() ===
// "transport"). CeremonyDetails/EmergencyContact/EventDetails are
// multi-word — their kebab-case form gains a hyphen ("ceremony-details")
// that the PascalCase form never had, so they were never actually
// collision-prone; all six are excluded anyway as a deliberate, harmless
// belt-and-braces measure (same fix, applied uniformly) rather than because
// all six were independently confirmed broken.
console.log('\nKnown-fragile-page safety net:');
const SIX_PAGES = {
  CeremonyDetails: '/ceremony-details',
  Transport: '/transport',
  Accommodation: '/accommodation',
  EmergencyContact: '/emergency-contact',
  Honeymoon: '/honeymoon',
  EventDetails: '/event-details',
};
for (const [pageKey, kebabPath] of Object.entries(SIX_PAGES)) {
  if (!excludeSet.has(pageKey)) {
    fail(`"${pageKey}" is no longer in AUTO_ROUTE_EXCLUDE — its auto-route would come back and could collide again.`);
    continue;
  }
  const renderRoute = explicitRoutes.find(r => r.path === kebabPath && !r.navigateTo);
  if (!renderRoute) {
    fail(`"${kebabPath}" no longer has a real (non-redirect) <Route> rendering it — the page would be unreachable.`);
    continue;
  }
  pass(`${pageKey} — excluded from auto-routes, "${kebabPath}" still renders it directly.`);
}

console.log('\n───────────────────────────────────────────────────────');
if (failures > 0) {
  console.error(`  FAILED — ${failures} issue(s) found`);
  console.log('───────────────────────────────────────────────────────\n');
  process.exit(1);
} else {
  console.log('  PASSED — no route collisions or self-redirects');
  console.log('───────────────────────────────────────────────────────\n');
}
