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
 *
 * AND A DERIVED LIST THAT SILENTLY DROPS WHAT ITS PATTERN CANNOT MATCH IS A
 * HAND-MAINTAINED LIST WEARING A DERIVATION'S CLOTHES. The pattern used to be
 * /run:\s*(npm run ...)/, which cannot express a step invoked as `node`, so
 * three of ci.yml's steps were invisible to it — apply-prerendered,
 * check-canon-branch --ci and check-payments-freeze --ci. Nothing reported
 * their absence: the header said "Running 20 step(s)" and 20 was simply the
 * number the regex happened to find. Derivation protected the list from going
 * stale and did nothing about the list being incomplete on the day it was
 * written.
 *
 * So this file now ACCOUNTS FOR EVERY `run:` IN THE WORKFLOW. Each command is
 * either run, or excluded for a stated reason, and anything that is neither
 * makes the whole verify REFUSE TO REPORT SUCCESS. Adding a CI step in a shape
 * this script cannot execute is then a loud failure at the next local verify,
 * rather than a quiet reduction in what "verify passed" means.
 */
import { readFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const dir = '.github/workflows';
const files = readdirSync(dir).filter(f => /\.ya?ml$/.test(f));

// Read each `run:` as a STEP, not as a line. A block scalar (`run: |`) is one
// step however many commands it contains: exploding it into lines would ask
// this script to classify `done`, `fi` and `SERVER_PID=$!` as checks.
function stepsIn(yml) {
  const out = [];
  const lines = yml.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)(?:- )?run:[ \t]*(.*)$/.exec(lines[i]);
    if (!m) continue;
    const indent = m[1].length;
    const rest = m[2].trim();
    if (/^[|>][-+]?$/.test(rest)) {
      const body = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '') continue;
        if (lines[j].match(/^\s*/)[0].length <= indent) break;
        body.push(lines[j].trim());
      }
      out.push({ block: true, cmd: body[0] || '(empty)', body });
    } else if (rest) {
      out.push({ block: false, cmd: rest });
    }
  }
  return out;
}

// Commands deliberately NOT run locally, each with the reason printed. This is
// the only list that is hand-maintained, and it is the one that must be —
// "why we skip this" is a judgement, not something a pattern can derive.
const EXCLUDED = [
  [/^npm ci$/, 'dependency install; the local tree is already installed'],
  [/^npx playwright install/, 'CI-only browser provisioning'],
  [/^npm run audit:ci$/, 'hits the npm registry; slow and network-dependent, so CI-only'],
];

// GitHub expression substitution. An unresolved ${{ }} must never be handed to
// a shell — it would run against a literal that means nothing locally.
const substitute = (c) => c.replace(/\$\{\{\s*github\.base_ref\s*\|\|\s*'main'\s*\}\}/g, 'main');

const steps = [];
const excluded = [];
const unaccounted = [];
for (const f of files) {
  for (const st of stepsIn(readFileSync(path.join(dir, f), 'utf8'))) {
    if (st.block) {
      // The reason is READ FROM THE BLOCK, not assumed. A first draft printed
      // "starts a preview server" for every multi-command step, which was true
      // of one of them and false of the main-CI watchdog's error reporter --
      // a fabricated explanation in the output of the very tool whose job is
      // to stop the report from outrunning the evidence.
      const text = st.body.join(' ');
      const why = /vite preview/.test(text)
        ? 'starts a preview server and runs browser tests against it; needs a live server'
        : 'a multi-command shell step that depends on the CI environment';
      excluded.push([`${st.cmd} …(+${st.body.length - 1} more)`, why]);
      continue;
    }
    const cmd = substitute(st.cmd);
    const skip = EXCLUDED.find(([re]) => re.test(cmd));
    if (skip) { excluded.push([cmd, skip[1]]); continue; }
    if (/\$\{\{/.test(cmd)) { unaccounted.push(`${cmd}   (unresolved GitHub expression)`); continue; }
    if (/^npm run [a-z:@-]+$/.test(cmd) || /^node scripts\/[\w./-]+\.mjs(\s|$)/.test(cmd)) {
      if (!steps.includes(cmd)) steps.push(cmd);
      continue;
    }
    unaccounted.push(cmd);
  }
}

if (steps.length === 0) {
  console.error('No runnable steps found in .github/workflows — refusing to report success.');
  process.exit(1);
}

// REFUSE, do not warn. A command this script cannot classify is a command it
// cannot promise anything about, and "verify passed" would then be a claim
// about a subset nobody chose.
if (unaccounted.length) {
  console.error(`\n  ✗ ${unaccounted.length} workflow command(s) this script cannot account for:\n`);
  for (const c of unaccounted) console.error(`      ${c}`);
  console.error(`\n  Every \`run:\` in ${files.join(', ')} must either be executed here or`);
  console.error('  listed in EXCLUDED with a reason. Refusing to report success.\n');
  process.exit(1);
}

console.log(`Running ${steps.length} step(s), derived from ${files.join(', ')}`);
if (excluded.length) {
  const seen = new Set();
  const uniq = excluded.filter(([c]) => !seen.has(c) && seen.add(c));
  console.log(`Not run here (${uniq.length}), by decision:`);
  for (const [c, why] of uniq) console.log(`    ${c}\n        ${why}`);
}
console.log();
// Substrings a step prints when it decides there is nothing to check. Matched
// against stdout rather than exit code, because a self-skip exits 0 exactly
// like a real pass.
const SKIP_MARKERS = [
  'No diff base available',
  'nothing to compare against',
  'nothing to check',
  '— skipping',
];
// Width from the LONGEST step, not a constant. The `node scripts/...` steps
// are longer than any `npm run` and a hardcoded 46 printed `origin/mainPASS`.
const width = Math.max(46, ...steps.map((s) => s.length)) + 2;
const failed = [];
const skipped = [];
for (const step of steps) {
  process.stdout.write(`  ${step.padEnd(width)}`);
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
