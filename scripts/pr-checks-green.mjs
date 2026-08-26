#!/usr/bin/env node
/**
 * scripts/pr-checks-green.mjs <pr-number>
 *
 * Exits 0 only when every check on the PR is genuinely PASSING.
 *
 * ── WHY THIS FILE HAS BEEN WRONG TWICE ─────────────────────────────────────
 *
 * Written after PR #481 was merged with a failing check: the wait-loop in use
 * polled until the output no longer contained "PENDING", and
 * `"FAILURE SUCCESS"` contains no PENDING. Waiting for "not pending" is not the
 * same as waiting for "passing", and the difference is invisible in the output
 * you are staring at.
 *
 * Parses JSON in Node rather than shelling a jq expression. The first version
 * did use --jq, and its interpolation was silently eaten by the escaping layers
 * between here and the shell: it printed the jq source as data and reported
 * STILL RUNNING forever. No jq means no escaping layer to get wrong.
 *
 * AND THEN, THE THIRD TIME: this script counted SKIPPED and NEUTRAL as green.
 * Roughly fifteen merge authorizations were issued that day carrying the words
 * "SKIPPED is not PASS" as their condition. The words said one thing and the
 * mechanism did another for every one of them. A documented rule is evidence of
 * intent, never of compliance — the ceremony was correct and the instrument was
 * never checked.
 *
 * MEASURED BEFORE FIXING: PRs #560–#592, 32 merged, 3 checks each, 96 checks
 * total — every one SUCCESS. Not one SKIPPED, not one NEUTRAL. The gate was
 * weaker than advertised but nothing had slipped through it.
 *
 * ── THE SHAPE OF THE FIX ───────────────────────────────────────────────────
 *
 * NOT "delete SKIPPED from the OK list". Some checks legitimately skip — a
 * path-filtered workflow with nothing to do — and a blanket refusal blocks
 * every merge and gets switched off within a day. That is how a guard dies.
 *
 * Instead, the shape already used for the seating and photography exceptions
 * on the overflow probe: AN ALLOWANCE WITH A NAME AND A REASON, never a
 * category-wide pass. A skipped check must be NAMED AND EXPECTED, or it fails.
 * NEUTRAL is held to exactly the same standard and asked the same question.
 *
 * MAY_SKIP STARTS EMPTY, and that is a measurement, not an oversight: across
 * 96 observed checks nothing has ever skipped, and .github/workflows/ci.yml
 * carries no `paths:` filter, so "Build & test" has no legitimate way to skip.
 * An empty allowance therefore blocks nothing today. When a check does start
 * skipping for a real reason, add it here WITH that reason — the cost of the
 * allowance is one line and the reason is the point of it.
 */
import { execSync } from 'child_process';

const pr = process.argv[2];
const IS_CLI = process.argv[1] && process.argv[1].endsWith('pr-checks-green.mjs');
if (IS_CLI && !pr) { console.error('usage: node scripts/pr-checks-green.mjs <pr-number>'); process.exit(2); }

/**
 * Checks permitted to report SKIPPED or NEUTRAL, each with the reason it may.
 * A name here is a claim that this check skipping is EXPECTED and harmless.
 * Anything not named fails the gate.
 */
const MAY_SKIP = {
  // (empty by measurement — see the header. Add entries as:
  //   'Check name': 'why this check legitimately reports SKIPPED/NEUTRAL',
  // )
};

/**
 * Checks that MUST be present. A workflow that never triggers reports nothing
 * at all, and a gate that only inspects the rows it was handed will call that
 * green — the same defect as counting SKIPPED, one layer earlier. Absence is
 * not success.
 */
const MUST_BE_PRESENT = ['Build & test'];

const TERMINAL = ['SUCCESS', 'FAILURE', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'NEUTRAL', 'SKIPPED', 'STALE', 'STARTUP_FAILURE'];
const NOT_RUN  = ['SKIPPED', 'NEUTRAL'];

/**
 * The decision, as a pure function so it can be tested without GitHub.
 * A gate whose logic can only be exercised by opening a pull request is a
 * gate whose logic never gets exercised.
 *
 * @returns {{ok: boolean, mode: string, lines: string[]}}
 */
export function evaluate(rows, maySkip = MAY_SKIP, mustBePresent = MUST_BE_PRESENT) {
  if (rows.length === 0) return { ok: false, mode: 'no-checks', lines: ['no checks reported yet'] };

  const running = rows.filter(r => !TERMINAL.includes(r.state));
  if (running.length) {
    return { ok: false, mode: 'running', lines: [`STILL RUNNING: ${running.map(r => r.name).join(', ')}`] };
  }

  const missing = mustBePresent.filter(n => !rows.some(r => r.name === n));
  if (missing.length) {
    return { ok: false, mode: 'missing', lines: [
      `CHECK MISSING ENTIRELY: ${missing.join(', ')}`,
      'A workflow that never ran reports nothing. Absence is not success.'] };
  }

  const failing = rows.filter(r => !NOT_RUN.includes(r.state) && r.state !== 'SUCCESS');
  if (failing.length) {
    return { ok: false, mode: 'failing', lines: [`NOT GREEN: ${failing.map(r => `${r.name}=${r.state}`).join(', ')}`] };
  }

  const skipped = rows.filter(r => NOT_RUN.includes(r.state));
  const unexpected = skipped.filter(r => !(r.name in maySkip));
  if (unexpected.length) {
    return { ok: false, mode: 'unexpected-skip', lines: [
      `SKIPPED IS NOT PASS: ${unexpected.map(r => `${r.name}=${r.state}`).join(', ')}`,
      'A check that did not run has verified nothing. If this skip is',
      'legitimate, name it in MAY_SKIP with the reason it may skip.'] };
  }

  return { ok: true, mode: 'green', lines: [
    ...skipped.map(r => `  (expected skip: ${r.name} — ${maySkip[r.name]})`),
    `all ${rows.length} checks SUCCESS${skipped.length ? ` (${skipped.length} expected skip)` : ''}`] };
}


// Imported by the test; only the CLI path talks to GitHub.
if (process.argv[1] && process.argv[1].endsWith('pr-checks-green.mjs')) {
  let payload;
  try {
    payload = JSON.parse(execSync(`gh pr view ${pr} --json statusCheckRollup`, { encoding: 'utf8' }));
  } catch (err) {
    console.error(`could not read checks for PR ${pr}: ${err.message.split('\n')[0]}`);
    process.exit(2);
  }
  const rows = (payload.statusCheckRollup || []).map(c => ({
    name: c.name || c.context || '(unnamed)',
    state: c.conclusion || c.state || 'UNKNOWN',
  }));
  for (const r of rows) console.log(`  ${String(r.state).padEnd(12)} ${r.name}`);
  const v = evaluate(rows);
  console.log('');
  for (const l of v.lines) console.log(l);
  process.exit(v.ok ? 0 : 1);
}
