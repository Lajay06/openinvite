#!/usr/bin/env node
/**
 * scripts/verify-all.mjs
 *
 * Runs every check the CI workflow runs, in the same order, locally.
 *
 * WHY THIS EXISTS. `npm run test:ci` is one step of fifteen. Reporting "CI
 * green" on the strength of it is reporting on a fraction — and on 2026-08-18
 * that is exactly what happened: test:ci passed 811/811 while
 * `npm run test:attendees` was failing on assertions that encoded the old
 * meal_choice enum, and the PR was merged with a red check.
 *
 * The step list is DERIVED FROM THE WORKFLOW FILE at runtime, not copied into
 * this script. A hand-maintained copy would drift the moment someone adds a CI
 * step, and the drift would be invisible — the local run would keep passing
 * while covering less.
 */
import { readFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const dir = '.github/workflows';
const files = readdirSync(dir).filter(f => /\.ya?ml$/.test(f));
const steps = [];
for (const f of files) {
  const yml = readFileSync(path.join(dir, f), 'utf8');
  for (const m of yml.matchAll(/run:\s*(npm run [a-z:@-]+)/g)) {
    if (!steps.includes(m[1])) steps.push(m[1]);
  }
}

if (steps.length === 0) {
  console.error('No `npm run` steps found in .github/workflows — refusing to report success.');
  process.exit(1);
}

console.log(`Running ${steps.length} step(s), derived from ${files.join(', ')}\n`);
// Substrings a step prints when it decides there is nothing to check. Matched
// against stdout rather than exit code, because a self-skip exits 0 exactly
// like a real pass.
const SKIP_MARKERS = [
  'No diff base available',
  'nothing to compare against',
  'nothing to check',
  '— skipping',
];
const failed = [];
const skipped = [];
for (const step of steps) {
  process.stdout.write(`  ${step.padEnd(46)}`);
  try {
    const out = execSync(step, { stdio: 'pipe' }).toString();
    // A step that self-skips has NOT been exercised, and must never be counted
    // as coverage. The diff-based guards (us-english spelling, prerendered
    // freshness) compare against a merge base that does not exist locally, so
    // they exit 0 after doing nothing — and a local run reported 13/13 while
    // one of them had never inspected a single file. CI, which has a real base,
    // then failed on it. Reporting SKIPPED is what makes that gap visible
    // instead of flattering.
    // The marker alone is not enough: test:ci runs 800+ assertions and one of
    // its sub-modules prints a skip line of its own, which would mis-report the
    // whole step. A step only counts as skipped if it ALSO reported no passing
    // assertion — i.e. it genuinely did nothing.
    const didWork = out.includes('✅') || /\bPASS\b/.test(out);
    if (!didWork && SKIP_MARKERS.some((m) => out.includes(m))) {
      console.log('SKIPPED');
      skipped.push(step);
    } else {
      console.log('PASS');
    }
  } catch {
    console.log('FAIL');
    failed.push(step);
  }
}

console.log();
if (failed.length) {
  console.log(`${steps.length - failed.length}/${steps.length} passed. FAILED: ${failed.join(', ')}`);
  process.exit(1);
}
const ran = steps.length - skipped.length;
if (skipped.length) {
  console.log(`${ran}/${steps.length} exercised, ${skipped.length} SKIPPED (no diff base locally):`);
  for (const s of skipped) console.log(`    ${s}`);
  console.log(`\n  A skipped step is NOT coverage. npm run pr:green is the only authority`);
  console.log(`  on diff-based steps — they only do real work in CI.`);
  process.exit(0);
}
console.log(`${steps.length}/${steps.length} passed — this is what CI will run.`);
