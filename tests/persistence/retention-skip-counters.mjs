/**
 * tests/persistence/retention-skip-counters.mjs
 *
 * THE CRON SAYS WHY IT SKIPPED, AND THE TWO COUNTS DO NOT OVERLAP.
 *
 * dueRetentionEmail returns a bare null for every reason it declines, so the
 * first real run reported 75 accounts scanned and 2 emails sent and said
 * nothing about the other 73. Two counters name the reasons an operator asks
 * about. This guards them.
 *
 * ── WHAT WOULD GO WRONG WITHOUT IT ────────────────────────────────────────
 *
 * A counter that silently stops incrementing reports zero, and zero is
 * indistinguishable from "nobody was skipped for that reason". That is the
 * exact failure the counters exist to end, so an unguarded counter would
 * reinstate it one refactor later.
 *
 * DOUBLE COUNTING IS THE OTHER HALF. An account that is both switched off and
 * older than the feature must be counted ONCE, as switched off, because that
 * is the reason dueRetentionEmail actually acted on. A tally whose parts sum
 * to more than the accounts scanned is worse than no tally.
 *
 * ── AND THE COUNTERS ARE NOT THE DECISION ─────────────────────────────────
 *
 * retentionSkipReason only explains; dueRetentionEmail decides. Each skipped
 * case below is checked against BOTH, so a future change that made the
 * explanation disagree with the decision fails here rather than in a log
 * nobody reads.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';
import { dueRetentionEmail, retentionEligibleFrom, RETENTION_SHIP_DATE } from '../../api/_lib/retentionTriggers.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (p) => stripComments(read(p));

const CRON = 'api/cron/send-onboarding-emails.js';

export async function runRetentionSkipCounters() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const eq = (label, got, want) => {
    const a = JSON.stringify(got), b = JSON.stringify(want);
    results.push(a === b ? pass(label, a) : fail(label, b, a));
  };

  // The cron builds a Resend client at module scope, so the key is set before
  // the import. _registry.mjs hoists placeholders for the suite; this keeps
  // the module importable when the file is run on its own too.
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_guard_only_not_a_real_key';
  process.env.BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY || 'guard-only-not-a-real-key';
  const { retentionSkipReason } = await import('../../api/cron/send-onboarding-emails.js');

  ok('the cron exports the one classifier', typeof retentionSkipReason === 'function', 'exported');

  // Dates either side of the no-backfill cutoff, derived from the shipped
  // constant rather than hardcoded, so moving the ship date cannot leave this
  // guard asserting a window that no longer exists.
  const cutoff = retentionEligibleFrom();
  const before = new Date(cutoff.getTime() - 86400000).toISOString();
  const after = new Date(cutoff.getTime() + 86400000).toISOString();

  /** Counts one account exactly as the cron does, through the same helper. */
  const countOne = (user) => {
    const t = { skipped_lifecycle_off: 0, skipped_before_ship: 0 };
    const r = retentionSkipReason(user);
    if (r === 'lifecycle_off') t.skipped_lifecycle_off++;
    else if (r === 'before_ship') t.skipped_before_ship++;
    return t;
  };

  // ── 1. SWITCHED OFF: ONE COUNTER, AND NOTHING ELSE ──────────────────────
  const off = { lifecycleEmails: false, created_date: after };
  eq('an account with lifecycleEmails false counts as switched off, and nothing else',
     countOne(off), { skipped_lifecycle_off: 1, skipped_before_ship: 0 });

  // ── 2. BEFORE THE SHIP DATE: THE OTHER COUNTER, AND NOTHING ELSE ────────
  const old = { created_date: before };
  eq('an account created before the ship date counts as before-ship, and nothing else',
     countOne(old), { skipped_lifecycle_off: 0, skipped_before_ship: 1 });

  // ── 3. ELIGIBLE: NEITHER ────────────────────────────────────────────────
  const fine = { created_date: after };
  eq('an eligible account counts as neither',
     countOne(fine), { skipped_lifecycle_off: 0, skipped_before_ship: 0 });
  ok('  and lifecycleEmails absent reads as eligible, matching the schema default',
     retentionSkipReason({ created_date: after }) === null, 'null');
  ok('  as does lifecycleEmails true',
     retentionSkipReason({ lifecycleEmails: true, created_date: after }) === null, 'null');

  // ── 4. BOTH AT ONCE IS COUNTED ONCE ─────────────────────────────────────
  const both = { lifecycleEmails: false, created_date: before };
  eq('an account that is both is counted once, as switched off',
     countOne(both), { skipped_lifecycle_off: 1, skipped_before_ship: 0 });
  ok('  which is the order dueRetentionEmail itself applies',
     read('api/_lib/retentionTriggers.js').indexOf('user.lifecycleEmails === false')
       < read('api/_lib/retentionTriggers.js').indexOf('retentionEligibleFrom(shipDate)'),
     'lifecycle check precedes the ship-date check');

  // ── 5. THE EXPLANATION AGREES WITH THE DECISION ─────────────────────────
  for (const [user, why] of [[off, 'switched off'], [old, 'before the ship date'], [both, 'both']]) {
    ok(`a skipped account is also declined by dueRetentionEmail: ${why}`,
       dueRetentionEmail({ user, wedding: {}, guestCount: 0 }) === null, 'declined');
  }
  ok('  and a malformed created_date is not counted as before-ship',
     retentionSkipReason({ created_date: 'not a date' }) === null, 'null');
  ok('  nor is a missing one', retentionSkipReason({}) === null, 'null');
  ok('  and no user at all does not throw', retentionSkipReason(null) === null, 'null');

  // ── 6. BOTH APPEAR IN THE PRINTED TALLY ─────────────────────────────────
  //
  // A counter incremented into an object the log never prints is a counter
  // nobody can read, which is the same failure in a different place.
  const cron = code(CRON);
  ok('both counters are initialised in the retention tally',
     /skipped_lifecycle_off: 0/.test(cron) && /skipped_before_ship: 0/.test(cron), 'both at zero');
  ok('  both are incremented from the one classifier',
     /retentionSkipReason\(user\)/.test(cron)
       && /tally\.retention\.skipped_lifecycle_off\+\+/.test(cron)
       && /tally\.retention\.skipped_before_ship\+\+/.test(cron),
     'incremented');
  // THE TALLY IS WHAT THE LOG PRINTS. The success line serializes `tally`, so
  // membership of that object is what makes a counter visible.
  ok('  and the tally itself is what the success line prints',
     /SUCCESS[^\n]*JSON\.stringify\(\{[^}]*tally/.test(cron) || /tally\b/.test(cron.slice(cron.indexOf('SUCCESS'), cron.indexOf('SUCCESS') + 400)),
     'tally is serialized');
  ok('the ship-date constant is still the one both sides read',
     RETENTION_SHIP_DATE === '2026-10-08T00:00:00.000Z', RETENTION_SHIP_DATE);

  return results;
}
