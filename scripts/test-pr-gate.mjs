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

function expect(label, rows, wantOk, wantMode, maySkip = {}) {
  const v = evaluate(rows, maySkip, ['Build & test']);
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

console.log(failed ? `\n  ${failed} failure(s)` : '\n  the gate refuses everything it should');
process.exit(failed ? 1 : 0);
