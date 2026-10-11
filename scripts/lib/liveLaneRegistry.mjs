/**
 * scripts/lib/liveLaneRegistry.mjs
 *
 * IS EVERY LIVE-CREDENTIAL GUARD ACCOUNTED FOR? ASKED WHERE IT CAN BE ANSWERED.
 *
 * ── WHY THIS IS ITS OWN MODULE ─────────────────────────────────────────────
 *
 * These four clauses lived inside scripts/test-persistence.mjs, which refuses
 * to run without BASE44_TEST_EMAIL and BASE44_TEST_PASSWORD. So the only check
 * that asks "has a live guard fallen out of the lane" could only be answered by
 * the lane, and the lane needs credentials, and nothing in CI has them. One of
 * its clauses was therefore RED from the day three guards entered the set until
 * 2026-10-11, when registering a twenty-first guard made someone look.
 *
 * A check that cannot run is not a check. Pulling it out here lets
 * tests/persistence/live-lane-registry.mjs drive it in the CI lane, with no
 * credential and no network, so the next guard that falls out of the lane is a
 * red PR rather than a thing discovered by accident months later.
 *
 * ── WHAT IT READS ──────────────────────────────────────────────────────────
 *
 * The registry's two sets, the runner's source, and each guard's own exported
 * function name. The name is READ, not derived: deriving it from the filename
 * is what reported run-launch-smoke.mjs as uninvoked, because it exports
 * runLaunchSmoke and the derivation asked for runRunLaunchSmoke. A convention
 * that a file is free to break is not a fact about that file.
 */

import { readFileSync } from 'node:fs';

/** The `run*` function a guard exports, or null. Read, never derived. */
export function runnerNameOf(source) {
  const m = String(source || '').match(/export\s+async\s+function\s+(run[A-Za-z0-9_]*)/);
  return m ? m[1] : null;
}

/**
 * Every way the live lane's registry can be out of step, as a list of
 * findings. Empty means it is in step.
 *
 * Pure: the caller supplies the sets and a reader, so a guard can drive it
 * against the real repo and a test can drive it against anything.
 *
 * @param {object} opts
 * @param {Set<string>} opts.live LIVE_CREDENTIAL_GUARDS
 * @param {Map<string,string>} opts.skips LANE_SKIPS_GUARDS
 * @param {string} opts.runnerSource the text of the lane runner
 * @param {(file: string) => string|null} opts.readGuard guard text, or null
 * @returns {Array<{kind: string, detail: string}>}
 */
export function liveLaneFindings({ live, skips, runnerSource, readGuard }) {
  const findings = [];
  const names = new Map();
  for (const f of live) names.set(f, runnerNameOf(readGuard(f)));

  const noRunner = [...live].filter((f) => !names.get(f));
  if (noRunner.length) {
    findings.push({ kind: 'no-runner', detail: noRunner.join(', ') });
  }

  // INVOKED BY THE LANE, OR DECLARED AS RUN ON ITS OWN. Three guards need a
  // credential and are run individually; that was true in the registry's prose
  // and invisible to a check, which is the whole reason the skip set exists.
  const uninvoked = [...live].filter((f) => {
    if (skips.has(f)) return false;
    const name = names.get(f);
    return !name || !String(runnerSource).includes(`${name}(`);
  });
  if (uninvoked.length) {
    findings.push({ kind: 'uninvoked', detail: uninvoked.join(', ') });
  }

  // A skip without a reason is one nobody can audit later.
  const thin = [...skips].filter(([, why]) => !why || String(why).length < 30).map(([f]) => f);
  if (thin.length) findings.push({ kind: 'thin-reason', detail: thin.join(', ') });

  // A skip for a guard that is not in the live set points at nothing.
  const stale = [...skips.keys()].filter((f) => !live.has(f));
  if (stale.length) findings.push({ kind: 'stale-skip', detail: stale.join(', ') });

  return findings;
}

/** The findings for this repo, read off disk. */
export function liveLaneFindingsForRepo({ live, skips, rootUrl }) {
  return liveLaneFindings({
    live,
    skips,
    runnerSource: readFileSync(new URL('scripts/test-persistence.mjs', rootUrl), 'utf8'),
    readGuard: (f) => {
      try { return readFileSync(new URL(`tests/persistence/${f}`, rootUrl), 'utf8'); } catch { return null; }
    },
  });
}
