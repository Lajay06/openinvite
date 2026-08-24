/**
 * CountUp is instant (feel-pass 5).
 *
 * The component animated 0 -> value over 1200ms on every dashboard stat. That
 * cost three things and bought decoration:
 *
 *   1. CORRECTNESS. The surrounding effects re-render these pages several
 *      times within ~1s of data landing, and each re-fire restarted the
 *      animation from zero, so a number could stick near 0 and never arrive.
 *      Two guards were added to defend it: a "has `to` actually changed" check,
 *      then a setTimeout net for throttled tabs where requestAnimationFrame
 *      stalls outright.
 *   2. VERIFIABILITY. Any DOM read or screenshot inside the window showed a
 *      number that was not the real one, so every numeric check had to sleep
 *      past it or be quietly untrustworthy. "Screenshots lie for 1.2 seconds"
 *      shadowed numeric verification since the budget work.
 *   3. ACCESSIBILITY. There was no prefers-reduced-motion branch at all, so a
 *      visitor who asked the OS for less motion got the animation anyway, on
 *      every stat, on every dashboard page.
 *
 * This module pins the source-level property. The behavioural property -- every
 * enumerated stat surface equal to its source at FIRST PAINT, both widths -- is
 * asserted in the browser by `npm run test:stat-surfaces`, which CI cannot run
 * (no dev server, no browser) and which is therefore a local pre-merge gate.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const SRC = root('src');
const CU = readFileSync(root('src/components/shared/CountUp.jsx'), 'utf8');
const code = CU.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e)) out.push(p);
  }
  return out;
}

export async function runCountUpInstant() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  CountUp is instant — a stat equals its source at first paint:\n');

  check('no animation loop', !/requestAnimationFrame/.test(code), 'rAF gone');
  check('  no timing state', !/useEffect|useState|useRef/.test(code), 'no hooks at all');
  check('  no settle timer', !/setTimeout/.test(code), 'safety net no longer needed');
  check('  no duration prop', !/duration/.test(code), 'dead prop removed');
  check('the value is rendered directly', /Number\.isFinite\(to\)\s*\?\s*to\s*:\s*0/.test(code), 'to, guarded');

  // The prop surface the 16 call sites depend on must survive.
  check('  format/prefix/suffix still supported',
    /format/.test(code) && /prefix/.test(code) && /suffix/.test(code), 'API unchanged');

  // Exactly one definition: the 17 local copies were consolidated once already
  // and must not regrow.
  const defs = walk(SRC).filter((f) => /function CountUp\b/.test(readFileSync(f, 'utf8')));
  check('exactly one CountUp definition', defs.length === 1,
    `${defs.length}: ${defs.map((d) => d.replace(SRC + '/', '')).join(', ')}`);

  // Every consumer still imports the shared one rather than hand-rolling.
  const consumers = walk(SRC).filter((f) => /<CountUp/.test(readFileSync(f, 'utf8')));
  const bad = consumers.filter((f) => !/from ['"]@\/components\/shared\/CountUp['"]/.test(readFileSync(f, 'utf8')));
  check('  every consumer imports the shared component', bad.length === 0,
    `${consumers.length} consumers, ${bad.length} rogue`);

  // The harness the behavioural pass depends on must not be able to swallow
  // the application. `'*'+'*/api/*'+'*'` as a route glob matched Vite's own
  // module URLs, the harness answered JS with JSON, and every page rendered
  // blank -- a failure that looks like "nothing found" in any pass that does
  // not check presence first.
  const harness = readFileSync(root('scripts/lib/renderHarness.mjs'), 'utf8');
  // Assert the CALL SHAPE, not just that a predicate exists somewhere: a
  // control that swapped the route back to a glob left the (now unused)
  // predicate in the file and this check passed. The route must be a function.
  check('the render harness routes on a URL predicate, not an api-segment glob',
    /ctx\.route\(\(url\)/.test(harness)
      && /pathname\.startsWith\('\/api\/'\)/.test(harness)
      && !/ctx\.route\(\s*['\"]/.test(harness),
    'route() takes a function');
  check('  and self-checks that it serves real JS modules',
    /assertHarnessServesModules/.test(harness), 'pre-flight guard exists');
  check('  presence-before-properties is enforced structurally',
    /skipped: true/.test(harness), 'property assertion skipped when content absent');

  return results;
}
