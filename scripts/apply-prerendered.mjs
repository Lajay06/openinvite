/**
 * scripts/apply-prerendered.mjs
 *
 * The half of the AEO/SEO prerendering pipeline that actually runs as
 * part of Vercel's buildCommand (see vercel.json). Deliberately has NO
 * dependency on Playwright or any browser — just node:fs — because
 * Vercel's build container has no apt-get and can't install Chromium's
 * system shared libraries (confirmed empirically: `playwright install
 * --with-deps` fails with "apt-get: command not found", and even a plain
 * browser download fails to launch with "libnspr4.so: cannot open shared
 * object file"). scripts/prerender.mjs (the part that DOES use Playwright)
 * is run locally or in CI instead, and its output is committed to the
 * git-tracked prerendered/ directory — this script applies that
 * pre-generated output into dist/ after `vite build` runs.
 *
 * Production incident, root cause + fix: this used to be a blind
 * `cpSync(PRERENDERED, DIST)`. SENTRY_AUTH_TOKEN is set on Vercel, so
 * @sentry/vite-plugin injects a fresh debug ID into every `vite build`
 * invocation, changing built chunks' content hashes even from identical
 * source — so a prerendered snapshot committed after one build already
 * references filenames that don't exist in the very next build's
 * dist/assets. Confirmed live: a stale-referenced /assets/index-*.js
 * request returned the SPA-fallback index.html (text/html), so the bundle
 * never loaded and the app never booted. Fix: rewrite each snapshot's main
 * entry script/stylesheet tags to match THIS build's actual dist/index.html
 * (read fresh, right here, before it gets overwritten below), strip
 * modulepreload hints (pure perf hints, safe to drop — see
 * scripts/lib/rewritePrerenderedAssets.mjs's header for why they can't be
 * reliably rewritten instead), and fail the build loudly if anything
 * referenced still doesn't exist after rewriting.
 *
 * Usage: node scripts/apply-prerendered.mjs   (runs after `vite build`)
 */
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCurrentEntryTags, rewriteAndVerify } from './lib/rewritePrerenderedAssets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const PRERENDERED = resolve(ROOT, 'prerendered');

if (!existsSync(PRERENDERED)) {
  console.log('[apply-prerendered] No prerendered/ directory found — nothing to apply. Run `npm run build:prerender` locally first to generate it.');
  process.exit(0);
}

if (!existsSync(DIST)) {
  console.error('[apply-prerendered] dist/ not found — run `vite build` first.');
  process.exit(1);
}

const freshIndexPath = resolve(DIST, 'index.html');
if (!existsSync(freshIndexPath)) {
  console.error('[apply-prerendered] dist/index.html not found — run `vite build` first.');
  process.exit(1);
}
const currentEntryTags = extractCurrentEntryTags(readFileSync(freshIndexPath, 'utf8'));
console.log(`[apply-prerendered] Current build entry: ${currentEntryTags.scriptSrc} + ${currentEntryTags.styleHref}`);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

let applied = 0;
let failures = 0;
for (const sourcePath of walk(PRERENDERED)) {
  const relPath = relative(PRERENDERED, sourcePath);
  const destPath = resolve(DIST, relPath);
  mkdirSync(dirname(destPath), { recursive: true });

  if (relPath.endsWith('.html')) {
    try {
      const rewritten = rewriteAndVerify(sourcePath, currentEntryTags, DIST);
      writeFileSync(destPath, rewritten);
      applied++;
    } catch (err) {
      console.error(`[apply-prerendered] ✗ ${relPath}: ${err.message}`);
      failures++;
    }
  } else {
    copyFileSync(sourcePath, destPath);
    applied++;
  }
}

if (failures > 0) {
  console.error(`\n[apply-prerendered] ${failures} snapshot(s) referenced a missing asset after rewriting — failing the build rather than shipping broken HTML.`);
  process.exit(1);
}

console.log(`[apply-prerendered] ✓ Applied ${applied} file(s) from prerendered/ into dist/, with entry asset references rewritten to the current build.`);
