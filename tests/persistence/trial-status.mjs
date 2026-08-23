/**
 * Trial status and Ultra access (TT-1).
 *
 * The bug: access was gated on the plan string alone, and `'free'` covers both
 * an ACTIVE trial and a long-expired one. Nothing revoked Ultra at expiry, so
 * a lapsed free account kept every Ultra feature while a PAYING PRO customer
 * had less. Meanwhile journeySteps read `plan === 'ultra'` strictly, telling a
 * couple mid-trial their Ultra steps were plan-locked -- the same bug pointing
 * the other way.
 *
 * Both now read one expression. These fixtures set their own dates so they
 * prove the rule rather than the current state of any account.
 */
import { pass, fail } from './_shared.mjs';
import { getTrialStatus, canAccessUltra, TRIAL_DAYS } from '../../src/lib/trialStatus.js';
import { getJourneyProgress } from '../../src/lib/journeySteps.js';

const DAY = 86400000;
const ago = (d) => new Date(Date.now() - d * DAY).toISOString();

export async function runTrialStatus() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Trial status — a paying customer is never below a lapsed one:\n');

  const ultra   = { plan: 'ultra', created_date: ago(400) };
  const pro     = { plan: 'pro',   created_date: ago(400) };
  const active  = { plan: 'free',  trialStartedAt: ago(3) };
  const expired = { plan: 'free',  trialStartedAt: ago(30) };

  check('an ACTIVE trial has Ultra (the trial\'s published promise)', canAccessUltra(active), 'true');
  check('an EXPIRED trial does NOT', !canAccessUltra(expired), 'false');
  check('  expiry actually revokes -- the whole bug',
    canAccessUltra(active) && !canAccessUltra(expired), 'active yes, expired no');
  check('paid Ultra has Ultra', canAccessUltra(ultra), 'true');
  check('paid Pro does not (Pro is a lower tier, correctly)', !canAccessUltra(pro), 'false');

  // THE inversion, stated directly
  check('a paying PRO customer is never below an EXPIRED free account',
    canAccessUltra(pro) >= canAccessUltra(expired), 'pro >= expired');
  check('  and "free" alone never grants Ultra',
    !canAccessUltra({ plan: 'free', trialStartedAt: ago(TRIAL_DAYS + 1) }), 'expired free = no');

  // day counting
  check('daysLeft counts down during the trial', getTrialStatus(active).daysLeft === TRIAL_DAYS - 3,
    String(getTrialStatus(active).daysLeft));
  check('  reaches 0 at expiry, never negative', getTrialStatus(expired).daysLeft === 0, '0');
  check('  a paid account reports no trial', !getTrialStatus(ultra).trialActive && !getTrialStatus(ultra).trialExpired, 'neither');

  // fail-open on missing data: never lock someone out because a date is absent
  const undated = getTrialStatus({ plan: 'free' });
  check('an account with no trial dates is treated as ACTIVE, not expired',
    undated.trialActive && !undated.trialExpired, `daysLeft ${undated.daysLeft}`);

  // journeySteps must agree with the sidebar
  const locked = (opts) => getJourneyProgress({}, {}, opts).steps.filter(s => s.planLocked).length;
  check('journeySteps agrees: an active trial is NOT plan-locked',
    locked({ plan: 'free', trialActive: true }) === 0, `${locked({ plan: 'free', trialActive: true })} locked steps`);
  check('  and an expired trial IS',
    locked({ plan: 'free', trialActive: false }) > 0, `${locked({ plan: 'free', trialActive: false })} locked steps`);
  check('  paid Ultra is never plan-locked', locked({ plan: 'ultra' }) === 0, '0 locked steps');

  return results;
}
