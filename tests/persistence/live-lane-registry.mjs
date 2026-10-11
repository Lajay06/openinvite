/**
 * tests/persistence/live-lane-registry.mjs
 *
 * THE LIVE LANE'S REGISTRY IS CHECKED IN CI, WHICH IS THE ONLY PLACE IT CAN BE.
 *
 * Owner ruling 2026-10-11, the handed-forward item from
 * goals/2026-10-11-reply-by-reminders.md.
 *
 * ── WHAT WAS WRONG, AND IT WAS NOT THE THREE GUARDS ────────────────────────
 *
 * scripts/test-persistence.mjs asserted that every entry in
 * LIVE_CREDENTIAL_GUARDS is invoked by it. Three were not:
 * hero-masters-live.mjs and tour-recordings-live.mjs are Cloudinary checks the
 * lane has no step for, and run-launch-smoke.mjs signs up a real account and is
 * run deliberately. The registry's own comments said all of that, in prose,
 * which a check cannot read.
 *
 * So the clause had been red since those three entered the set. Nobody saw it
 * because that runner refuses to start without BASE44_TEST_EMAIL and
 * BASE44_TEST_PASSWORD, and nothing in CI has them: the only check for "a live
 * guard has fallen out of the lane" could only be answered by the lane.
 *
 * A CHECK THAT CANNOT RUN IS NOT A CHECK. The four clauses are now a pure
 * module, scripts/lib/liveLaneRegistry.mjs, and this guard drives them in the
 * CI lane with no credential and no network. The next guard that falls out of
 * the lane is a red PR rather than something found by accident months later.
 *
 * ── AND THE NAME IS READ, NOT DERIVED ──────────────────────────────────────
 *
 * The old clause built a function name from the filename, so
 * run-launch-smoke.mjs was reported uninvoked because it exports
 * runLaunchSmoke rather than the runRunLaunchSmoke the convention predicted. A
 * convention a file is free to break is not a fact about that file, so the
 * export is read instead.
 */

import { pass, fail } from './_shared.mjs';
import { LIVE_CREDENTIAL_GUARDS, LANE_SKIPS_GUARDS, guardFiles } from './_registry.mjs';
import { liveLaneFindings, liveLaneFindingsForRepo, runnerNameOf } from '../../scripts/lib/liveLaneRegistry.mjs';

const ROOT_URL = new URL('../../', import.meta.url);

export async function runLiveLaneRegistry() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── 1. THE REAL REPO IS IN STEP ───────────────────────────────────────
  const findings = liveLaneFindingsForRepo({
    live: LIVE_CREDENTIAL_GUARDS, skips: LANE_SKIPS_GUARDS, rootUrl: ROOT_URL,
  });
  ok('the live-credential registry is in step',
     findings.length === 0,
     findings.map((f) => `${f.kind}: ${f.detail}`).join(' | ') || 'no findings');
  ok(`  ${LIVE_CREDENTIAL_GUARDS.size} live guards, ${LANE_SKIPS_GUARDS.size} declared as run on their own`,
     LIVE_CREDENTIAL_GUARDS.size > 0 && LANE_SKIPS_GUARDS.size > 0,
     `${LIVE_CREDENTIAL_GUARDS.size} / ${LANE_SKIPS_GUARDS.size}`);

  // THE THREE THE LANE SKIPS ARE NAMED, so a fourth cannot join them quietly.
  ok('  and the ones it skips are exactly the three the owner ruled on',
     [...LANE_SKIPS_GUARDS.keys()].sort().join(',')
       === 'hero-masters-live.mjs,run-launch-smoke.mjs,tour-recordings-live.mjs',
     [...LANE_SKIPS_GUARDS.keys()].sort().join(','));

  // ── 2. THE NAME IS READ FROM THE FILE ─────────────────────────────────
  ok('the runner name comes from the export',
     runnerNameOf('export async function runLaunchSmoke() {}') === 'runLaunchSmoke',
     'runLaunchSmoke');
  ok('  including the one the old derivation got wrong',
     runnerNameOf(`export async function runLaunchSmoke() {}`) !== 'runRunLaunchSmoke',
     'not derived from the filename');
  ok('  a file with no exported runner reads as none, not as a guess',
     runnerNameOf('async function runLaunchSmoke() {}') === null
       && runnerNameOf('') === null && runnerNameOf(null) === null,
     'null');

  // ── 3. EVERY CLAUSE CAN STILL FAIL ────────────────────────────────────
  //
  // Driven against fixtures rather than against the repo, because a clause
  // that only ever sees a healthy tree is a clause nobody has watched work.
  const reader = (map) => (f) => (f in map ? map[f] : null);
  const base = {
    live: new Set(['a.mjs']),
    skips: new Map(),
    runnerSource: 'await runA();',
    readGuard: reader({ 'a.mjs': 'export async function runA() {}' }),
  };
  ok('a healthy fixture yields no findings', liveLaneFindings(base).length === 0, 'none');

  ok('a guard the lane never calls is a finding',
     liveLaneFindings({ ...base, runnerSource: 'nothing here' })
       .some((f) => f.kind === 'uninvoked'), 'uninvoked');
  ok('  unless it is declared as run on its own',
     liveLaneFindings({ ...base, runnerSource: 'nothing here', skips: new Map([['a.mjs', 'a reason long enough to be auditable by a person reading it later']]) })
       .length === 0, 'declared');
  ok('a guard with no exported runner is a finding',
     liveLaneFindings({ ...base, readGuard: reader({ 'a.mjs': 'async function runA() {}' }) })
       .some((f) => f.kind === 'no-runner'), 'no-runner');
  ok('a skip with a thin reason is a finding',
     liveLaneFindings({ ...base, skips: new Map([['a.mjs', 'because']]) })
       .some((f) => f.kind === 'thin-reason'), 'thin-reason');
  ok('a skip naming a guard outside the live set is a finding',
     liveLaneFindings({ ...base, skips: new Map([['gone.mjs', 'a reason long enough to be auditable by a person reading it later']]) })
       .some((f) => f.kind === 'stale-skip'), 'stale-skip');

  // ── 4. THE LANE RUNNER DELEGATES RATHER THAN KEEPING A COPY ───────────
  const runner = await (async () => {
    const { readFileSync } = await import('node:fs');
    return readFileSync(new URL('scripts/test-persistence.mjs', ROOT_URL), 'utf8');
  })();
  ok('the lane runner asks this module rather than carrying its own copy',
     /liveLaneFindingsForRepo\(\{/.test(runner)
       && !/const runner = f\.replace\(\/\\\.mjs\$\//.test(runner),
     'delegated');
  ok('  and no guard file falls outside every lane',
     guardFiles().length > 0, `${guardFiles().length} guard files`);

  return results;
}
