#!/usr/bin/env node
/**
 * THE GATE MUST REFUSE. Every failure mode, asserted by name.
 *
 * This exists because pr-checks-green.mjs counted SKIPPED and NEUTRAL as green
 * while ~15 merge authorizations carried "SKIPPED is not PASS" as their stated
 * condition. Nothing slipped through — measured, PRs #560-#592, 96 checks, all
 * SUCCESS — but the condition had never once been enforced.
 *
 * A gate that has only ever been seen green has not been tested.
 */
import { evaluate } from './pr-checks-green.mjs';

const R = (name, state) => ({ name, state });
const BUILD = R('Build & test', 'SUCCESS');
let failed = 0;

function expect(label, rows, wantOk, wantMode, maySkip = {}, mergeable = null) {
  const v = evaluate(rows, maySkip, ['Build & test'], mergeable);
  const ok = v.ok === wantOk && v.mode === wantMode;
  if (ok) console.log(`  pass  ${label}  -> ${v.mode}`);
  else { console.error(`  FAIL  ${label}  -> ok=${v.ok} mode=${v.mode}, expected ok=${wantOk} mode=${wantMode}`); failed++; }
}

// green
expect('all SUCCESS', [BUILD, R('Vercel', 'SUCCESS')], true, 'green');

// THE DEFECT THIS FILE EXISTS FOR
expect('an unexpected SKIPPED refuses', [BUILD, R('Vercel', 'SKIPPED')], false, 'unexpected-skip');
expect('an unexpected NEUTRAL refuses', [BUILD, R('Vercel', 'NEUTRAL')], false, 'unexpected-skip');
expect('a SKIPPED required check refuses',
  [R('Build & test', 'SKIPPED'), R('Vercel', 'SUCCESS')], false, 'unexpected-skip');

// the allowance works, and only for the name it was granted to
expect('a NAMED skip is allowed', [BUILD, R('Vercel', 'SKIPPED')], true, 'green',
  { 'Vercel': 'the reason it may skip' });
expect('the allowance does not generalise to another check',
  [BUILD, R('Vercel', 'SKIPPED'), R('Other', 'SKIPPED')], false, 'unexpected-skip',
  { 'Vercel': 'named' });

// absence is not success — the layer under SKIPPED
expect('a missing required check refuses', [R('Vercel', 'SUCCESS')], false, 'missing');
expect('no checks at all refuses', [], false, 'no-checks');

// the modes that already worked, still working
expect('FAILURE refuses', [BUILD, R('Vercel', 'FAILURE')], false, 'failing');
expect('CANCELLED refuses', [BUILD, R('Vercel', 'CANCELLED')], false, 'failing');
expect('TIMED_OUT refuses', [BUILD, R('Vercel', 'TIMED_OUT')], false, 'failing');
expect('STARTUP_FAILURE refuses', [BUILD, R('Vercel', 'STARTUP_FAILURE')], false, 'failing');
expect('a PENDING check is not terminal', [BUILD, R('Vercel', 'PENDING')], false, 'running');
expect('"FAILURE SUCCESS" — the #481 defect', [BUILD, R('a', 'FAILURE'), R('b', 'SUCCESS')], false, 'failing');

// ── A CONFLICTING PR IS ITS OWN ANSWER, NOT AN ABSENT CHECK ─────────────────
//
// This is the case that cost most of an hour. A pull_request run is built on
// refs/pull/<n>/merge, and a PR that does not merge cleanly has no such ref,
// so GitHub creates NO RUN — which arrives here as a missing check. The old
// message said "wait and re-run before hunting for a broken workflow", so the
// first theory was a timing race, and the second was a broken workflow, and
// the answer was a rebase all along.
//
// The mode has to be `conflicting` and not `missing`: both refuse, and a test
// that only asserted `ok === false` would have passed on the version that sent
// people to the clock.
expect('a conflicting PR names the conflict, not the missing check',
  [BUILD, R('Vercel', 'SUCCESS')], false, 'conflicting', {}, 'CONFLICTING');
expect('  and it refuses even when every check is green',
  [BUILD, R('Vercel', 'SUCCESS'), R('Vercel Preview Comments', 'SUCCESS')], false, 'conflicting', {}, 'CONFLICTING');
expect('  while a mergeable PR with the same rows is green',
  [BUILD, R('Vercel', 'SUCCESS')], true, 'green', {}, 'MERGEABLE');
// UNKNOWN is what GitHub returns while it is still computing mergeability.
// Treating it as conflicting would refuse every freshly-pushed PR for a few
// seconds, which is how a guard gets switched off.
expect('  and an UNKNOWN mergeable state does not refuse on its own',
  [BUILD, R('Vercel', 'SUCCESS')], true, 'green', {}, 'UNKNOWN');
expect('  a conflicting PR with a genuinely absent check still says conflicting',
  [R('Vercel', 'SUCCESS')], false, 'conflicting', {}, 'CONFLICTING');

console.log(failed ? `\n  ${failed} failure(s)` : '\n  the gate refuses everything it should');
process.exit(failed ? 1 : 0);
