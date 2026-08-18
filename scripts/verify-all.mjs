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
const failed = [];
for (const step of steps) {
  process.stdout.write(`  ${step.padEnd(46)}`);
  try {
    execSync(step, { stdio: 'pipe' });
    console.log('PASS');
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
console.log(`${steps.length}/${steps.length} passed — this is what CI will run.`);
