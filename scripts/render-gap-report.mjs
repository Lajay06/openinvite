#!/usr/bin/env node
/**
 * scripts/render-gap-report.mjs
 *
 * HOW MANY DASHBOARD SURFACES CAN BE LOADED IN A NODE RENDER TEST, AND WHICH
 * CANNOT — BY NAME, WITH THE REASON.
 *
 * WHY THIS SHAPE. The first attempt to size this gap grepped the import graph
 * for one known offender (react-hot-toast), reported 56% of pages blocked, and
 * looked like a count. Removing that cause exposed a second one within a minute
 * and the figure moved to 63%. Nothing about the first measurement announced its
 * own incompleteness.
 *
 *   AN INSTRUMENT THAT LOOKS FOR ONE CAUSE REPORTS A LOWER BOUND, NOT A COUNT.
 *
 * So this one does not look for causes at all. It ATTEMPTS THE THING — bundles
 * each surface and requires it — and reports whatever actually happened. It can
 * therefore find a cause nobody has thought of, which a grep for known names can
 * never do. "None remaining" is only acceptable from an instrument that could
 * have found something.
 *
 * Loading, not rendering, is the bar: every blocker found so far throws at
 * module load, before a component is ever called.
 *
 * Usage:  node scripts/render-gap-report.mjs [--verbose]
 */
import { readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'node_modules', '.render-gap');
const STUB = join(ROOT, 'tests', 'render', 'stubs', 'react-hot-toast.mjs');
const VERBOSE = process.argv.includes('--verbose');
// --bare disables the harness entirely, so the value of the harness itself can
// be MEASURED rather than asserted. A tool that only reports the after number
// is asking to be believed about the before one.
const BARE = process.argv.includes('--bare');

const pages = readdirSync(join(SRC, 'pages'))
  .filter(f => /\.jsx?$/.test(f))
  .map(f => join(SRC, 'pages', f))
  .sort();

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

try {
  execFileSync('npx', [
    'esbuild', ...pages,
    '--bundle', '--platform=node', '--format=cjs',
    `--outdir=${OUT}`,
    `--alias:@=${SRC}`,
    ...(BARE ? [] : [`--alias:react-hot-toast=${STUB}`]),
    // Assets a bundler would normally emit as files. A render test asserts on
    // markup, so they are dropped rather than resolved — this is not a
    // workaround, it is the correct treatment of a font in a text assertion.
    // Vite replaces import.meta.env at build time; Node has no such thing, so
    // every module reading a VITE_* value at load throws. This was the LARGEST
    // cause and neither the grep nor anyone's guess had named it — it is not a
    // DOM problem at all. Values are placeholders: a render test asserts on
    // layout and copy, never on a real key.
    ...(BARE ? [] : [`--define:import.meta.env=${JSON.stringify({
      VITE_BASE44_APP_ID: 'render-test-app-id',
      VITE_TURNSTILE_SITE_KEY: 'render-test-site-key',
      VITE_APP_URL: 'https://example.test',
      MODE: 'test', DEV: false, PROD: true, SSR: true, BASE_URL: '/',
    })}`]),
    '--loader:.css=empty', '--loader:.woff=empty', '--loader:.woff2=empty',
    '--loader:.ttf=empty', '--loader:.eot=empty', '--loader:.svg=empty',
    '--loader:.png=empty', '--loader:.jpg=empty', '--loader:.jpeg=empty',
    '--loader:.gif=empty', '--loader:.webp=empty', '--loader:.mp4=empty',
    '--log-level=error',
  ], { cwd: ROOT, stdio: VERBOSE ? 'inherit' : 'pipe' });
} catch (err) {
  console.error('  esbuild failed to bundle the page set:', err.message.split('\n')[0]);
  process.exit(1);
}

const require_ = createRequire(import.meta.url);
const ok = [];
const failed = [];
for (const p of pages) {
  const out = join(OUT, basename(p).replace(/\.jsx$/, '.js'));
  try {
    require_(out);
    ok.push(basename(p));
  } catch (err) {
    const first = String(err && err.message || err).split('\n')[0];
    // Attribute to the module that actually threw, not to the page.
    const frame = (err.stack || '').split('\n').find(l => l.includes('src/'));
    const blame = frame ? (frame.match(/src\/[^\s:)]+/) || [])[0] : null;
    failed.push({ page: basename(p), reason: first, blame });
  }
}

const total = pages.length;
console.log('\n═══════════════════════════════════════════════════════');
console.log('  Render gap — dashboard pages that can be loaded in a test');
console.log('═══════════════════════════════════════════════════════\n');
console.log(`  loadable     : ${ok.length}/${total}  (${Math.round(ok.length / total * 100)}%)`);
console.log(`  NOT loadable : ${failed.length}/${total}  (${Math.round(failed.length / total * 100)}%)\n`);

if (failed.length) {
  const byCause = new Map();
  for (const f of failed) {
    const key = `${f.blame || 'unknown'} — ${f.reason}`;
    if (!byCause.has(key)) byCause.set(key, []);
    byCause.get(key).push(f.page);
  }
  console.log('  REMAINING CAUSES, enumerated (never a bare count):\n');
  for (const [cause, ps] of [...byCause.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`    ${ps.length} page(s)  ${cause}`);
    if (VERBOSE) ps.forEach(p => console.log(`        ${p}`));
  }
  console.log('');
} else {
  console.log('  No remaining causes — and this instrument attempts the load rather\n  than grepping for known offenders, so an empty list is evidence.\n');
}
rmSync(OUT, { recursive: true, force: true });
