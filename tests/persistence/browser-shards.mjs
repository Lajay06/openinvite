/**
 * tests/persistence/browser-shards.mjs
 *
 * EVERY BROWSER GUARD RUNS SOMEWHERE, OR IS NAMED AS NOT RUNNING.
 *
 * The browser lane used to be 38 steps written out in ci.yml, so "is this
 * guard in CI" was answerable with grep, and one guard did answer it: the
 * guest-note render pass asserts its own CI lane. The lane is now two jobs
 * that read .github/browser-shards.json, and a guard that is in package.json
 * and in no shard would simply never run.
 *
 * THAT IS NOT HYPOTHETICAL. Writing this file found two: test:dashboard-no-
 * overflow and test:guest-essentials-reachable, both registered, both
 * substantial, neither ever run by CI on main or before it. They are declared
 * in `unassigned` with their reason rather than quietly added, because adding
 * a guard nobody has run changes what the lane checks. This guard exists so
 * the next one cannot go missing without saying so.
 *
 * WHAT COUNTS AS A BROWSER GUARD is measured, not listed: an npm script whose
 * file imports playwright AND reads CAPTURE_BASE_URL. A list here would be a
 * second place to forget.
 */
import { readFileSync, existsSync } from 'node:fs';
import { pass, fail } from './_shared.mjs';

const SHARD_FILE = '.github/browser-shards.json';

export function runBrowserShards() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  Browser shards, and every guard accounted for:\n');

  let doc = null;
  try { doc = JSON.parse(readFileSync(SHARD_FILE, 'utf8')); } catch (e) { /* reported next */ }
  check(`${SHARD_FILE} is committed and parses`, !!doc, doc ? `${Object.keys(doc.shards).length} shards` : 'missing or invalid');
  if (!doc) return r;

  const shards = Object.entries(doc.shards);
  const scriptsOf = (g) => (g.scripts ? g.scripts : [g.script]);

  // ── the shape ────────────────────────────────────────────────────────────
  const ports = shards.map(([, s]) => s.port);
  check('each shard has its own port', new Set(ports).size === ports.length, ports.join(', '));
  check('every shard names the job it is', shards.every(([, s]) => typeof s.job === 'string' && s.job),
    shards.map(([, s]) => s.job).join(', '));
  check('every guard carries the seconds it was measured at',
    shards.every(([, s]) => s.guards.every((g) => Number.isFinite(g.seconds) && g.seconds > 0)),
    `${shards.reduce((n, [, s]) => n + s.guards.length, 0)} entries`);

  // ── the balance, which is the whole reason the file holds seconds ────────
  const totals = shards.map(([letter, s]) => [letter, s.guards.reduce((n, g) => n + g.seconds, 0), s.measuredSeconds]);
  check('each shard\'s stated total matches its guards',
    totals.every(([, sum, stated]) => sum === stated),
    totals.map(([l, sum, stated]) => `${l}: ${sum} vs ${stated}`).join(', '));
  const spread = Math.max(...totals.map((t) => t[1])) - Math.min(...totals.map((t) => t[1]));
  const budget = doc.balance?.budgetSeconds ?? 120;
  check(`the shards are balanced to within ${budget}s`, spread <= budget, `${spread}s apart`);

  // ── no guard in two places, and none in none ─────────────────────────────
  const assigned = [];
  for (const [, s] of shards) for (const g of s.guards) assigned.push(...scriptsOf(g));
  const dupes = assigned.filter((x, i) => assigned.indexOf(x) !== i);
  check('no guard is in two shards', dupes.length === 0, dupes.join(', ') || `${assigned.length} assigned`);

  const pkg = JSON.parse(readFileSync('package.json', 'utf8')).scripts || {};
  const browserGuards = Object.entries(pkg)
    .filter(([, cmd]) => {
      const m = /(scripts\/[\w./-]+\.mjs)/.exec(cmd);
      if (!m || !existsSync(m[1])) return false;
      const src = readFileSync(m[1], 'utf8');
      return src.includes("from 'playwright'") && src.includes('CAPTURE_BASE_URL');
    })
    .map(([name]) => name);

  const declaredUnassigned = (doc.unassigned || []).map((u) => u.script);
  const accounted = new Set([...assigned, ...declaredUnassigned]);
  const orphans = browserGuards.filter((g) => !accounted.has(g));
  check('every browser guard is in a shard or declared unassigned',
    orphans.length === 0,
    orphans.length ? `NOT RUN AND NOT DECLARED: ${orphans.join(', ')}` : `${browserGuards.length} accounted for`);

  check('every unassigned guard says why',
    (doc.unassigned || []).every((u) => typeof u.reason === 'string' && u.reason.length > 40),
    (doc.unassigned || []).map((u) => u.script).join(', ') || 'none');

  const ghosts = assigned.filter((g) => !(g in pkg));
  check('every guard a shard names still exists in package.json',
    ghosts.length === 0, ghosts.join(', ') || `${assigned.length} of ${assigned.length}`);

  // ── the workflow reads this file rather than repeating it ────────────────
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  for (const [letter, s] of shards) {
    check(`ci.yml runs shard ${letter} through the runner`,
      ci.includes(`run-browser-shard.mjs ${letter}`), s.job);
    check(`  and declares it as "${s.job}"`, ci.includes(`name: ${s.job}`));
  }
  check('ci.yml starts no preview server of its own any more',
    !/vite preview --port/.test(ci),
    (ci.match(/vite preview --port/g) || []).length + ' left');

  return r;
}
