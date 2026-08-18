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
 *
 * Parses JSON in Node rather than shelling a jq expression. The first version
 * of this script did use --jq, and its interpolation was silently eaten by the
 * escaping layers between here and the shell: it printed the jq source text as
 * data and reported STILL RUNNING forever. It failed closed, which is the right
 * direction to fail, but a gate that can never say "green" is not a gate. No jq
 * means no escaping layer to get wrong.
 */
import { execSync } from 'child_process';

const pr = process.argv[2];
if (!pr) { console.error('usage: node scripts/pr-checks-green.mjs <pr-number>'); process.exit(2); }

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

if (rows.length === 0) { console.error(`PR ${pr}: no checks reported yet`); process.exit(1); }

for (const r of rows) console.log(`  ${String(r.state).padEnd(12)} ${r.name}`);

const TERMINAL = ['SUCCESS', 'FAILURE', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'NEUTRAL', 'SKIPPED', 'STALE', 'STARTUP_FAILURE'];
const OK = ['SUCCESS', 'SKIPPED', 'NEUTRAL'];

const running = rows.filter(r => !TERMINAL.includes(r.state));
const bad = rows.filter(r => TERMINAL.includes(r.state) && !OK.includes(r.state));

if (running.length) { console.log(`\nSTILL RUNNING: ${running.map(r => r.name).join(', ')}`); process.exit(1); }
if (bad.length) { console.log(`\nNOT GREEN: ${bad.map(r => `${r.name}=${r.state}`).join(', ')}`); process.exit(1); }
console.log(`\nall ${rows.length} checks SUCCESS`);
