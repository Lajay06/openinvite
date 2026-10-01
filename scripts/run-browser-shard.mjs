/**
 * scripts/run-browser-shard.mjs
 *
 * ONE SHARD OF THE BROWSER LANE: one preview server, its half of the guards.
 *
 * Usage, locally or in CI, identically:
 *
 *   node scripts/run-browser-shard.mjs A
 *   node scripts/run-browser-shard.mjs B
 *   node scripts/run-browser-shard.mjs A --list
 *
 * WHY THIS IS NODE AND NOT BASH IN THE WORKFLOW. The lane used to be 38 copies
 * of the same twelve lines of shell, one per guard, each booting its own
 * server. A loop in YAML would have been a thirty-ninth copy of that shell with
 * no way to run it locally, and "run the shard the way CI runs it" is the
 * pre-PR check this split is supposed to make possible. The workflow now calls
 * this file and passes a letter.
 *
 * ONE SERVER FOR THE WHOLE SHARD. Every guard is a read-only browse of a static
 * preview build, so a server per guard bought nothing and cost 38 boots. The
 * exception is declared in the shard file rather than assumed: a guard marked
 * `ownStep` gets its own server and its own sequence, because it needs one.
 *
 * EVERY GUARD RUNS, EVEN AFTER ONE FAILS. The serial lane stopped at the first
 * red step, so a run told you about one broken guard and hid the rest, and the
 * next run told you about the second. A shard is a report: all of them run, all
 * of them are summarised, and the exit code is non-zero if any failed.
 *
 * Each guard's output is written to browser-shard-logs/<script>.log whether it
 * passes or fails, and browser-shard-logs/timings.json records how long each
 * one took. The workflow uploads that directory on EVERY run, not only on
 * failure, and the reason is a measurement that could not be taken:
 *
 *   The shard file says to rebalance from a green run's step times. That
 *   worked while each guard was its own CI step and the API could be asked.
 *   A shard is one step now, so the timings live in its stdout, and GitHub's
 *   downloadable log for a long job is TRUNCATED: on run 36719776024, shard
 *   B's 22 guard lines came back and shard A's came back not at all, the log
 *   stopping partway through an apt step. A green run that cannot be measured
 *   cannot be rebalanced from, and the instruction to do so would have read
 *   as possible until someone tried it.
 *
 *   timings.json is the answer: written every run, uploaded every run, and
 *   the numbers are the same ones this file prints.
 */
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const SHARD_FILE = '.github/browser-shards.json';
const LOG_DIR = 'browser-shard-logs';

const letter = (process.argv[2] || '').toUpperCase();
const listOnly = process.argv.includes('--list');
const doc = JSON.parse(readFileSync(SHARD_FILE, 'utf8'));
const shard = doc.shards[letter];
if (!shard) {
  console.error(`Usage: node scripts/run-browser-shard.mjs <${Object.keys(doc.shards).join('|')}> [--list]`);
  process.exit(2);
}

if (listOnly) {
  console.log(`${shard.job}, port ${shard.port}, ${shard.measuredSeconds}s measured:`);
  for (const g of shard.guards) {
    console.log(`  ${String(g.seconds).padStart(4)}s  ${g.script || `${g.scripts.length} guards, own server on ${g.port}`}`);
  }
  process.exit(0);
}

/** Start a preview server and wait for it to answer, or throw. */
async function startPreview(port, { warmups = 0 } = {}) {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
    stdio: 'ignore', detached: false,
  });
  for (let i = 0; i < 40; i += 1) {
    const r = spawnSync('curl', ['-sf', `http://localhost:${port}`], { stdio: 'ignore' });
    if (r.status === 0) break;
    await sleep(1000);
    if (i === 39) { proc.kill(); throw new Error(`No preview server on ${port} after 40s.`); }
  }
  // A 200 from curl is not a warmed-up server. The marketing guard's own note
  // records a first Playwright navigation timing out at 30s on a cold one while
  // every route after it took two seconds.
  for (let i = 0; i < warmups; i += 1) spawnSync('curl', ['-sf', `http://localhost:${port}/`], { stdio: 'ignore' });
  return proc;
}

/** Run one npm script against a server, logging everything it prints. */
function runGuard(script, port) {
  const started = Date.now();
  const r = spawnSync('npm', ['run', script], {
    encoding: 'utf8',
    env: { ...process.env, CAPTURE_BASE_URL: `http://localhost:${port}` },
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  writeFileSync(`${LOG_DIR}/${script.replace(/[:/]/g, '-')}.log`, out);
  const tally = (out.match(/(\d+)\/(\d+) checks passed/) || [])[0] || '';
  return { script, ok: r.status === 0, seconds: Math.round((Date.now() - started) / 1000), tally };
}

rmSync(LOG_DIR, { recursive: true, force: true });
mkdirSync(LOG_DIR, { recursive: true });

console.log(`\n═══════════════════════════════════════════════════════`);
console.log(`  ${shard.job}: ${shard.guards.length} entries, ${shard.measuredSeconds}s measured`);
console.log(`═══════════════════════════════════════════════════════\n`);

const results = [];
let shared = null;
const started = Date.now();
try {
  shared = await startPreview(shard.port);
  for (const g of shard.guards) {
    if (g.ownStep) {
      // Its own server, its own sequence, and a failure stops the rest of ITS
      // list rather than the shard. The reason it is separate is in the shard
      // file beside it.
      let own = null;
      try {
        own = await startPreview(g.port, { warmups: 5 });
        for (const script of g.scripts) {
          const r = runGuard(script, g.port);
          results.push(r);
          console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${String(r.seconds).padStart(4)}s  ${r.script}${r.tally ? `  (${r.tally})` : ''}`);
          if (!r.ok) {
            console.log(`        the rest of this group is skipped, as it was before the split`);
            break;
          }
        }
      } finally {
        if (own) own.kill();
      }
      continue;
    }
    const r = runGuard(g.script, shard.port);
    results.push(r);
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${String(r.seconds).padStart(4)}s  ${r.script}${r.tally ? `  (${r.tally})` : ''}`);
  }
} finally {
  if (shared) shared.kill();
}

const failed = results.filter((r) => !r.ok);
const total = Math.round((Date.now() - started) / 1000);

// THE NUMBERS A REBALANCE NEEDS, in a file rather than in a log that may be
// truncated before anyone reads it.
writeFileSync(`${LOG_DIR}/timings.json`, `${JSON.stringify({
  shard: letter,
  job: shard.job,
  port: shard.port,
  measuredSeconds: shard.measuredSeconds,
  ranSeconds: total,
  at: new Date().toISOString(),
  guards: results.map((r) => ({ script: r.script, seconds: r.seconds, ok: r.ok })),
}, null, 2)}\n`);
console.log(`\n───────────────────────────────────────────────────────`);
console.log(`  ${results.length - failed.length}/${results.length} guards passed in ${Math.floor(total / 60)}m${total % 60}s`);
if (failed.length) {
  console.log(`  ${failed.length} FAILED: ${failed.map((f) => f.script).join(', ')}`);
  console.log(`  Each guard's full output is in ${LOG_DIR}/`);
}
console.log(`───────────────────────────────────────────────────────\n`);
process.exit(failed.length ? 1 : 0);
