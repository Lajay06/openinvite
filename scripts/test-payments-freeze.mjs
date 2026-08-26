/**
 * scripts/test-payments-freeze.mjs — every freeze case, one command.
 *
 * WHY THIS EXISTS, and it is not "for tidiness". The freeze shipped with a live
 * hole because RE-RUNNING WAS A SUBSET-SHAPED ACTIVITY: twelve cases run by
 * hand can be run eleven-at-a-time and nobody notices. The rename case was
 * silently not re-run after a rebuild, and its earlier PASS was carried
 * forward into a report about a build where the fix no longer existed.
 *
 * So the failure to prevent is not "a case failed" — it is "a case did not
 * run". This exits non-zero if the number of cases EXECUTED is not the number
 * DECLARED, independently of whether they passed. A silent omission is a
 * failure here, which is the whole point.
 *
 * Every case pins an absolute SHA and restores to it, never to HEAD~n.
 */
import { execSync } from 'node:child_process';
import { writeFileSync, rmSync, appendFileSync } from 'node:fs';

const sh = (c, opts = {}) => execSync(c, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
const run = (c) => { try { execSync(c, { stdio: 'pipe' }); return 0; } catch (e) { return e.status ?? 1; } };

const PIN = sh('git rev-parse HEAD');
const restore = () => sh(`git reset --hard ${PIN}`);

if (sh('git status --porcelain')) {
  console.error('\n  REFUSING TO RUN: the tree is dirty. This test commits and resets;\n' +
                '  uncommitted work would be destroyed. Commit or stash it first.\n');
  process.exit(1);
}

const edit = (f) => () => { appendFileSync(f, '\n// freeze probe\n'); };
const CASES = [
  { name: 'stripe.js edited',                 want: 1, act: edit('api/webhooks/stripe.js') },
  { name: 'create-checkout-session.js edited',want: 1, act: edit('api/create-checkout-session.js') },
  { name: 'planPricing.js edited',            want: 1, act: edit('api/_lib/planPricing.js') },
  { name: 'planGift.js edited',               want: 1, act: edit('api/_lib/planGift.js') },
  { name: 'giftAuth.js edited',               want: 1, act: edit('api/_lib/giftAuth.js') },
  { name: 'frozen file RENAMED',              want: 1, act: () => sh('git mv api/create-checkout-session.js api/cco-renamed.js') },
  { name: 'new file under api/webhooks/',     want: 1, act: () => writeFileSync('api/webhooks/probe.js', 'export default function h(){}\n') },
  { name: 'security.js edited (allowed)',     want: 0, act: edit('api/_lib/security.js') },
  { name: 'base44Admin.js edited (allowed)',  want: 0, act: edit('api/_lib/base44Admin.js') },
  { name: 'clean tree',                       want: 0, act: () => {} },
  { name: 'CI + Payments-Change trailer',     want: 0, act: edit('api/_lib/planPricing.js'),
    msg: 'probe\n\nPayments-Change: deliberate test of the trailer override' },
  { name: 'CI + env var, no trailer',         want: 1, act: edit('api/_lib/planPricing.js'),
    env: { PAYMENTS_UNFREEZE: 'I am deliberately changing payments' } },
];

console.log(`\n  Payments freeze — ${CASES.length} declared cases, pinned at ${PIN.slice(0, 8)}\n`);

let executed = 0, failed = 0;
for (const c of CASES) {
  try {
    c.act();
    run('git add -A');
    // TWO -m FLAGS, not one with an escaped newline. Git joins successive -m
    // values with a blank line, which is what makes a trailer a TRAILER. A
    // "\n" inside a shell-quoted -m is a literal backslash-n, so the trailer
    // never became its own line and the override was not found — caught by
    // this runner on its first execution.
    const msgs = (c.msg || 'freeze probe').split('\n\n')
      .map(m => `-m ${JSON.stringify(m)}`).join(' ');
    run(`git commit -q ${msgs} --allow-empty`);
    const rc = run(`${c.env ? Object.entries(c.env).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ') + ' ' : ''}node scripts/check-payments-freeze.mjs --ci ${PIN}`);
    executed++;
    const ok = rc === c.want;
    if (!ok) failed++;
    console.log(`  ${ok ? '✅' : '❌'} ${c.name.padEnd(34)} exit ${rc}, wanted ${c.want}`);
  } catch (e) {
    console.log(`  ❌ ${c.name.padEnd(34)} CASE DID NOT RUN — ${String(e.message).split('\n')[0].slice(0, 60)}`);
  } finally {
    restore();
    rmSync('api/webhooks/probe.js', { force: true });
    rmSync('api/cco-renamed.js', { force: true });
  }
}

console.log(`\n  ${executed}/${CASES.length} cases executed, ${failed} failed\n`);
if (executed !== CASES.length) {
  console.error('  A CASE DID NOT RUN. That is the exact shape that shipped a live hole:\n' +
                '  eleven of twelve, and nobody notices. Failing on that alone.\n');
  process.exit(1);
}
process.exit(failed ? 1 : 0);
