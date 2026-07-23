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
 * git-tracked prerendered/ directory — this script just copies that
 * pre-generated output into dist/ after `vite build` runs.
 *
 * Usage: node scripts/apply-prerendered.mjs   (runs after `vite build`)
 */
import { cpSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

cpSync(PRERENDERED, DIST, { recursive: true });
console.log('[apply-prerendered] ✓ Copied prerendered/ into dist/.');
