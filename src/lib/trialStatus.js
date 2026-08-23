/**
 * Trial state, computed once.
 *
 * THE BUG THIS FIXES. Access was gated on the plan string alone:
 *
 *   canAccessUltra = plan === 'ultra' || plan === 'free'
 *
 * `'free'` covers both an ACTIVE trial (which is promised "Full Ultra access
 * for 14 days") and an EXPIRED one -- nothing ever revoked it. So an account
 * whose trial ended months ago kept every Ultra feature, while a customer who
 * paid for PRO had LESS access than that expired free account. A paying
 * customer ranking below a lapsed one is a correctness bug on its own, quite
 * apart from any enforcement question.
 *
 * The expiry maths lived inline in Layout.jsx and drove only the banner. It is
 * here now so the banner and the gates read the same number: a banner saying
 * "your trial has ended" beside features that still work is the same defect
 * wearing different clothes.
 */
// Relative, not the @/ alias: this module is imported by the plain-Node
// persistence harness, which has no Vite path resolution.
import { parseBase44Date } from './base44Date.js';

export const TRIAL_DAYS = 14;

/**
 * @param {object|null} user
 * @returns {{ plan: string, isPaid: boolean, trialActive: boolean,
 *             trialExpired: boolean, daysLeft: number }}
 */
export function getTrialStatus(user) {
  const plan = user?.plan || 'free';
  const isPaid = plan === 'pro' || plan === 'ultra';
  if (!user || isPaid) {
    return { plan, isPaid, trialActive: false, trialExpired: false, daysLeft: 0 };
  }

  // trialStartedAt is authoritative; created_date is the fallback for accounts
  // that predate the field. Both absent means we cannot date the trial, and
  // the safe reading is "not expired" -- never lock someone out on missing data.
  const started = user.trialStartedAt ? parseBase44Date(user.trialStartedAt) : null;
  const fallback = user.created_date ? parseBase44Date(user.created_date) : null;
  const start = started || fallback;
  if (!start) return { plan, isPaid, trialActive: true, trialExpired: false, daysLeft: TRIAL_DAYS };

  const end = new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const daysLeft = Math.max(0, Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24)));
  const trialExpired = daysLeft === 0;
  return { plan, isPaid, trialActive: !trialExpired, trialExpired, daysLeft };
}

/**
 * Ultra-tier access. An ACTIVE trial gets it (that is the trial's published
 * promise); expiry revokes it; `plan === 'free'` alone never grants it; and
 * Pro is never below a free account.
 */
export function canAccessUltra(user) {
  const { plan, trialActive } = getTrialStatus(user);
  return plan === 'ultra' || trialActive;
}
