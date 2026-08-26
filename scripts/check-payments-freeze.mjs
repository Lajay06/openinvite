/**
 * scripts/check-payments-freeze.mjs
 *
 * REFUSES any change to the payments path. Not a warning — exit 1, naming the
 * file.
 *
 * WHY A MECHANISM AND NOT A SENTENCE. The freeze has been a line in CLAUDE.md
 * for months. Our own canon says a documented rule is evidence of intent, never
 * compliance — and on 2026-08-26 a careless `git stash pop` put eight
 * conflicted paths into the working tree including
 * api/create-checkout-session.js and api/_lib/planPricing.js. Nothing was
 * committed, but what stopped it was noticing, not the freeze. These are the
 * only files in this repo where a mistake costs the owner money.
 *
 * ── PRE-MORTEM: what gets a payments change past this? ────────────────────
 *
 * CAUGHT:
 *   · Any edit to the three named files.
 *   · Any NEW file under api/webhooks/ — that directory holds stripe.js and
 *     nothing else, so a new file there is a new webhook.
 *   · DELETION or RENAME of a named file: a rename shows as a delete of the
 *     old path, which is a diff against a frozen path.
 *
 * NOT CAUGHT, stated plainly rather than implied away:
 *   · A CHANGE REACHING PAYMENTS THROUGH A HELPER. The three import
 *     _lib/planGift.js, _lib/giftAuth.js, _lib/security.js,
 *     _lib/base44Admin.js and three emails/*.js modules. Editing planGift.js
 *     changes payment behaviour without touching a frozen path. THIS IS THE
 *     BIGGEST HOLE. Widening the freeze to the transitive closure would drag
 *     in base44Admin.js and security.js, which most of the API depends on, and
 *     a freeze that blocks ordinary work gets overridden habitually — which is
 *     worse than a narrow one.
 *   · Stripe configuration outside the repo: keys, webhook endpoints, product
 *     and price objects in the Stripe dashboard.
 *   · A PUSH THAT NEVER RUNS THIS. A pre-push hook is LOCAL. It does not run
 *     for a merge performed in the GitHub UI, a push from another clone, or
 *     `--no-verify`. To be airtight this same script must also run in CI,
 *     where it cannot be skipped. That half is proposed, not assumed.
 *
 * ── THE OVERRIDE ──────────────────────────────────────────────────────────
 * Deliberately awkward: an env var on the single command, whose value must be
 * an exact sentence. It cannot be typed by accident, cannot be committed, and
 * cannot be left switched on — it lives for one process and dies with it.
 *
 *   PAYMENTS_UNFREEZE="I am deliberately changing payments" git push
 */
import { execSync } from 'node:child_process';

const FROZEN = [
  'api/webhooks/stripe.js',
  'api/create-checkout-session.js',
  'api/_lib/planPricing.js',
  // PAYMENT-DOMAIN HELPERS. Frozen because they change payment behaviour, and
  // affordable to freeze because almost nothing else imports them: 2 api files
  // each. NOT frozen, deliberately: _lib/security.js (47 api files import it)
  // and _lib/base44Admin.js (7) — load-bearing infrastructure, not payment
  // logic. Freezing those would refuse ordinary work daily and make the
  // override a reflex, which trains the very habit the guard exists to stop.
  'api/_lib/planGift.js',
  'api/_lib/giftAuth.js',
];
const FROZEN_DIRS = ['api/webhooks/'];
const PASSPHRASE = 'I am deliberately changing payments';

const CI = process.argv.includes('--ci');
const base = process.argv.slice(2).find(a => !a.startsWith('-')) || 'origin/main';
let changed = [];
try {
  const range = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' });
  changed = range.split('\n').map(s => s.trim()).filter(Boolean);
} catch {
  // No upstream to compare against (a first push, a detached head). Fall back
  // to the working tree rather than silently passing.
  changed = execSync('git diff --name-only HEAD', { encoding: 'utf8' })
    .split('\n').map(s => s.trim()).filter(Boolean);
}

const hits = changed.filter(f => FROZEN.includes(f) || FROZEN_DIRS.some(d => f.startsWith(d)));

if (!hits.length) process.exit(0);

// IN CI THE OVERRIDE IS A COMMIT TRAILER, not an env var. A value typed in
// someone's shell has no existence in a runner, and a payments change should
// be visible a year later to whoever reads the log — not a flag that
// evaporated with a process.
if (CI) {
  let log = '';
  try { log = execSync(`git log ${base}..HEAD --format=%B`, { encoding: 'utf8' }); } catch { /* no range */ }
  const trailer = log.split('\n').map(l => l.trim()).find(l => /^Payments-Change:\s*\S/.test(l));
  if (trailer) {
    console.log('\n  PAYMENTS FREEZE OVERRIDDEN by a commit trailer:');
    console.log(`    ${trailer}`);
    hits.forEach(f => console.log(`    touched: ${f}`));
    console.log('');
    process.exit(0);
  }
  console.error('\n  PAYMENTS FREEZE — REFUSING THIS CHANGE.\n');
  console.error('  These files are frozen. A mistake in them costs the owner money:');
  hits.forEach(f => console.error(`    ${f}`));
  console.error('\n  If this payments change is deliberate, say so where it stays said —');
  console.error('  a trailer on a commit in this branch, which survives in the log:');
  console.error('\n    Payments-Change: <why, in a sentence>\n');
  process.exit(1);
}

if (process.env.PAYMENTS_UNFREEZE === PASSPHRASE) {
  console.log(`\n  PAYMENTS FREEZE OVERRIDDEN for ${hits.length} file(s):`);
  hits.forEach(f => console.log(`    ${f}`));
  console.log('  The passphrase was given, so this push proceeds.\n');
  process.exit(0);
}

console.error('\n  PAYMENTS FREEZE — REFUSING THIS PUSH.\n');
console.error('  These files are frozen. A mistake in them costs the owner money:');
hits.forEach(f => console.error(`    ${f}`));
console.error('\n  If you did not mean to touch them, you probably want:');
hits.forEach(f => console.error(`    git checkout origin/main -- ${f}`));
console.error('\n  If you genuinely mean to change payments, say so explicitly:');
console.error(`    PAYMENTS_UNFREEZE="${PASSPHRASE}" git push\n`);
process.exit(1);
