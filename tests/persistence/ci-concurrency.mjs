/**
 * tests/persistence/ci-concurrency.mjs
 *
 * MAIN'S CI RUN CANNOT BE DISPLACED BY THE NEXT MERGE.
 *
 * On 2026-09-08, 7870358 shipped to production with ZERO jobs ever started.
 * Not a failure — a cancellation, before the run began. Three merges landed on
 * main inside eleven minutes, and GitHub's concurrency rule did the rest: a
 * group holds exactly ONE pending run, and a third arrival does not queue
 * behind the second, it takes the pending slot and cancels whatever was
 * waiting in it. `cancel-in-progress: false` does not prevent that; it only
 * stops a RUNNING job being killed.
 *
 * The block's own comment claimed the opposite — "two main runs can now
 * overlap when merges land close together" — which is what the config was
 * meant to do and never did. That gap is the reason this file exists: a
 * config's stated intent and its behaviour drifted apart silently, and the
 * only thing that noticed was a watchdog firing after production had already
 * been served.
 *
 * THE FIX IS A KEY, NOT A FLAG: main is grouped per COMMIT, so every SHA has a
 * group of its own with nothing to queue behind and nothing to displace it.
 *
 * ── WHY THIS IS A SOURCE CHECK, AND WHY THAT IS ENOUGH HERE ─────────────────
 *
 * A workflow expression is evaluated by GitHub, not by us, so there is no
 * rendered state to measure locally — the YAML IS the artifact. What can be
 * checked is that the key varies per commit on main and per ref elsewhere, and
 * that the two branches of that expression are the right way round, which is
 * the mistake a hand-edit would actually make.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CI = join(ROOT, '.github/workflows/ci.yml');

/**
 * Evaluates the group expression the way GitHub would, for one event. Only the
 * two operators the expression uses are implemented — `&&`/`||` returning
 * operands rather than booleans — because a general evaluator here would be a
 * second thing to get wrong.
 */
function groupFor(expr, { ref, sha }) {
  return expr.replace(/\$\{\{([^}]*)\}\}/g, (_, inner) => {
    const src = inner.trim();
    if (src === 'github.workflow') return 'CI';
    if (src === 'github.ref') return ref;
    if (src === 'github.sha') return sha;
    const m = src.match(/^github\.ref\s*==\s*'([^']+)'\s*&&\s*github\.sha\s*\|\|\s*github\.ref$/);
    if (m) return ref === m[1] ? sha : ref;
    return `<unevaluated:${src}>`;
  });
}

export async function runCiConcurrency() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const src = readFileSync(CI, 'utf8');
  const m = src.match(/^concurrency:\n\s+group:\s*(.+)\n\s+cancel-in-progress:\s*(.+)$/m);

  // PRESENCE BEFORE PROPERTIES: a renamed or reshaped block would otherwise
  // make every assertion below vacuously true.
  check('ci.yml declares a concurrency group', !!m,
    m ? m[1].trim() : 'no concurrency block matched — this guard is measuring nothing');
  if (!m) return results;

  const expr = m[1].trim();
  const cancel = m[2].trim();

  const MAIN = 'refs/heads/main';
  const a = groupFor(expr, { ref: MAIN, sha: 'a'.repeat(40) });
  const b = groupFor(expr, { ref: MAIN, sha: 'b'.repeat(40) });
  const pr1 = groupFor(expr, { ref: 'refs/pull/1/merge', sha: 'c'.repeat(40) });
  const pr1again = groupFor(expr, { ref: 'refs/pull/1/merge', sha: 'd'.repeat(40) });

  check('nothing in the group is left unevaluated',
    ![a, b, pr1].some((g) => g.includes('<unevaluated:')),
    [a, b, pr1].find((g) => g.includes('<unevaluated:')) || 'every expression resolved');

  // The defect, stated directly: two main commits must not share a group.
  check('two main commits get different groups, so neither can displace the other',
    a !== b, `${a} vs ${b}`);

  // And the other way round, because a group keyed per SHA everywhere would
  // leave stale PR runs burning minutes on every force-push.
  check('two pushes to one PR branch still share a group, so the stale run is cancelled',
    pr1 === pr1again, `${pr1} vs ${pr1again}`);

  check('a main group is keyed by the commit, not by the branch',
    a.includes('a'.repeat(40)) && !a.includes(MAIN), a);

  check('cancellation is still off for main and on for PR branches',
    /github\.ref\s*!=\s*'refs\/heads\/main'/.test(cancel), cancel);

  return results;
}
