#!/usr/bin/env node
/**
 * scripts/pr-merge.mjs — `npm run pr:merge <number>`
 *
 * THE GATE AND THE MERGE MUST NOT BE SEPARABLE.
 *
 * On 2026-08-25 PR #557 was merged while CI was failing. `npm run pr:green`
 * returned NOT GREEN and `gh pr merge` ran anyway, because the two were chained
 * in one shell command with no check of the exit status between them. Main went
 * red. Every merge in the programme up to that point had the same shape and
 * survived only because the gate happened to be green — luck wearing the
 * costume of a guard.
 *
 * A rule that depends on remembering is the thing this programme keeps
 * replacing with a mechanism, so: this runs the gate, READS ITS EXIT STATUS,
 * and refuses to merge on anything other than 0. The shell cannot defeat it,
 * because there is no second command to chain.
 *
 * It also enforces RULE 13e: the verdict must belong to the SHA being merged.
 * A run whose headSha is not the branch head is NO VERDICT — not a pass — so
 * this waits for the matching run rather than quoting a stale conclusion.
 *
 * Usage:  npm run pr:merge 559
 *         npm run pr:merge 559 -- --no-delete-branch
 */
import { execSync, spawnSync } from 'node:child_process';

const num = process.argv[2];
if (!/^\d+$/.test(num || '')) {
  console.error('Usage: npm run pr:merge <pr-number>');
  process.exit(2);
}
const keepBranch = process.argv.includes('--no-delete-branch');

const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();
const line = () => console.log('─'.repeat(60));

console.log('\n══════════════════════════════════════════════════════════');
console.log(`  pr:merge #${num} — gate, then merge. Never one without the other.`);
console.log('══════════════════════════════════════════════════════════\n');

// ── 1. the PR's head SHA, from the PR itself ───────────────────────────────
let head, branch;
try {
  const meta = JSON.parse(sh(`gh pr view ${num} --json headRefOid,headRefName,state`));
  if (meta.state !== 'OPEN') {
    console.error(`  ✗ PR #${num} is ${meta.state}, not OPEN.`);
    process.exit(1);
  }
  head = meta.headRefOid;
  branch = meta.headRefName;
} catch (err) {
  console.error(`  ✗ Could not read PR #${num}: ${err.message.split('\n')[0]}`);
  process.exit(1);
}
console.log(`  branch : ${branch}`);
console.log(`  head   : ${head.slice(0, 7)}`);

// ── 2. RULE 13e — the verdict must belong to THIS sha ──────────────────────
const runFor = () => {
  const rows = JSON.parse(sh(
    `gh run list --branch ${branch} --limit 8 --json status,conclusion,headSha`));
  return rows.find((r) => r.headSha === head) || null;
};

let run = runFor();
const DEADLINE = Date.now() + 20 * 60 * 1000;
while ((!run || run.status !== 'completed') && Date.now() < DEADLINE) {
  console.log(`  waiting for the run on ${head.slice(0, 7)} — ${run ? run.status : 'not started'}`);
  await new Promise((r) => setTimeout(r, 25000));
  run = runFor();
}
if (!run || run.status !== 'completed') {
  console.error(`\n  ✗ No completed run for ${head.slice(0, 7)} within the wait window.`);
  console.error('    RULE 13e: a verdict whose SHA does not match is NO VERDICT.\n');
  process.exit(1);
}
console.log(`  run    : ${run.conclusion} (matched to ${head.slice(0, 7)})`);
line();

// ── 3. the gate. Its exit status is the whole point. ───────────────────────
const gate = spawnSync('npm', ['run', 'pr:green', num], { encoding: 'utf8' });
process.stdout.write(gate.stdout || '');
if (gate.stderr) process.stderr.write(gate.stderr);
line();
console.log(`  pr:green exit status = ${gate.status}`);

if (gate.status !== 0) {
  console.error('\n  ✗ NOT MERGING. The authorization line is conditional on');
  console.error('    pr:green exiting 0 at merge time, and it did not.\n');
  process.exit(1);
}

// ── 4. only now ────────────────────────────────────────────────────────────
// ── WHAT IS IN THE SHA BEING MERGED ──────────────────────────────────────────
// An authorization line names a PR and binds a SHA. That proves WHICH commit
// merges; it proves nothing about what is IN it. On 2026-08-30 a bound SHA
// carried five files nobody reviewing the line had ever seen.
//
// So the file list prints here, at the last moment before the merge, where the
// line's description can still be compared against it. Printing only — the
// comparison is the operator's, but it cannot be made at all if the list is
// never shown.
try {
  const files = JSON.parse(sh(`gh pr view ${num} --json files`)).files || [];
  console.log('  ── files in this PR ────────────────────────────────────────');
  for (const f of files) {
    console.log(`    ${String(f.additions).padStart(5)}+ ${String(f.deletions).padStart(5)}-  ${f.path}`);
  }
  console.log('  ────────────────────────────────────────────────────────────');
  console.log(`    ${files.length} file(s). Does this match what the authorization describes?\n`);
} catch (err) {
  // A diagnostic must never be the thing that blocks a merge.
  console.log(`  (could not list PR files: ${err.message.split('\n')[0]})\n`);
}

console.log('\n  ✓ Gate green on the merge SHA. Merging.\n');
const args = ['pr', 'merge', num, '--squash'];
if (!keepBranch) args.push('--delete-branch');
const merge = spawnSync('gh', args, { encoding: 'utf8', stdio: 'inherit' });
process.exit(merge.status ?? 1);
