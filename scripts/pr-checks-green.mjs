#!/usr/bin/env node
/**
 * scripts/pr-checks-green.mjs <pr-number>
 *
 * Exits 0 only when EVERY check on the PR concluded SUCCESS.
 *
 * Written after PR #481 was merged with a failing check: the wait-loop in use
 * polled until the output no longer contained "PENDING", and
 * `"FAILURE SUCCESS"` contains no PENDING. Waiting for "not pending" is not the
 * same as waiting for "passing", and the difference is invisible in the output
 * you are staring at.
 */
import { execSync } from 'child_process';

const pr = process.argv[2];
if (!pr) { console.error('usage: node scripts/pr-checks-green.mjs <pr-number>'); process.exit(2); }

const raw = execSync(
  `gh pr view ${pr} --json statusCheckRollup -q '.statusCheckRollup[] | "\(.conclusion // .state)\t\(.name // .context)"'`,
  { encoding: 'utf8' },
).trim();

if (!raw) { console.error(`PR ${pr}: no checks reported yet`); process.exit(1); }

const rows = raw.split('\n').map(l => { const [state, name] = l.split('\t'); return { state, name }; });
for (const r of rows) console.log(`  ${r.state.padEnd(10)} ${r.name}`);

const pending = rows.filter(r => !['SUCCESS', 'FAILURE', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'NEUTRAL', 'SKIPPED'].includes(r.state));
const bad = rows.filter(r => !['SUCCESS', 'SKIPPED', 'NEUTRAL'].includes(r.state));

if (pending.length) { console.log(`\nSTILL RUNNING: ${pending.map(r => r.name).join(', ')}`); process.exit(1); }
if (bad.length)     { console.log(`\nNOT GREEN: ${bad.map(r => `${r.name}=${r.state}`).join(', ')}`); process.exit(1); }
console.log(`\nall ${rows.length} checks SUCCESS`);
