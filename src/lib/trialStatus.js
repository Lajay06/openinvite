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
  return hasUltraAccess({ plan, trialActive });
}

/**
 * THE ONE EXPRESSION, so two callers cannot drift apart again.
 *
 * src/lib/journeySteps.js held a second copy of `plan === 'ultra' ||
 * trialActive`
 * and its own comment records why: the sidebar once handed an expired account
 * Ultra while the journey told a couple mid-trial their Ultra steps were
 * plan-locked, the same rule wrong in opposite directions. It takes the parts
 * rather than a user because getJourneyProgress is given primitives by its
 * caller, not a user object.
 *
 * AN EXPIRED 24-MONTH TERM DOES NOT CHANGE THIS, deliberately. The term makes
 * an account READ ONLY (see getPlanTerm); it does not take the tier away. If
 * expiry flipped this to false, the sidebar would mark the Guest Suite as an
 * upgrade and disable it, and a couple who paid could no longer LOOK at their
 * own guest suite. The ruling is the opposite: view and export always work.
 * Writes are governed by isReadOnly, and nothing else.
 */
export function hasUltraAccess({ plan, trialActive }) {
  return plan === 'ultra' || trialActive;
}

/** The term a paid plan runs for. Owner ruling 2026-10-13, enforced 2026-10-15. */
export const PLAN_TERM_MONTHS = 24;

/**
 * Calendar months after `date`, clamped to the last day of the target month.
 *
 * The same arithmetic as api/_lib/giftClaim.js's addMonths, and it has to be:
 * a gift writes planExpiresAt with that one, and this computes the FALLBACK
 * for an account that has none. Two different month maths would put the same
 * couple's expiry on two different days depending on which branch read it.
 */
function addMonths(date, months) {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

/**
 * THE 24-MONTH TERM. Owner rulings, 2026-10-15:
 *
 *   1. The end date is planExpiresAt when present. Otherwise it is
 *      planActivatedAt plus 24 months, AS A FALLBACK ONLY: this function is
 *      pure and writes nothing back, so an account keeps no date it did not
 *      already have. Gift claims go on writing planExpiresAt themselves
 *      (api/_lib/giftClaim.js); purchases do not write it yet, which is why
 *      the fallback exists and is load bearing rather than defensive.
 *   3. Missing both dates means NO EXPIRY. Never lock someone out on missing
 *      data, which is the same reading getTrialStatus already takes for a
 *      trial it cannot date.
 *
 * A free account has no term: `free` is the trial's business and
 * getTrialStatus already owns it. Asking this about a free account returns no
 * expiry rather than a second, contradictory answer about the same user.
 *
 * @param {object|null} user
 * @param {Date} [now]
 * @returns {{ end: Date|null, source: 'planExpiresAt'|'planActivatedAt'|null,
 *             expired: boolean, daysLeft: number }}
 */
export function getPlanTerm(user, now = new Date()) {
  const none = { end: null, source: null, expired: false, daysLeft: 0 };
  const plan = user?.plan || 'free';
  if (!user || (plan !== 'pro' && plan !== 'ultra')) return none;

  let end = null;
  let source = null;
  if (user.planExpiresAt) {
    end = parseBase44Date(user.planExpiresAt);
    source = 'planExpiresAt';
  }
  // An unparseable date is MISSING data, not a date in 1970. Ruling 3 covers
  // it: no expiry rather than an instant lockout.
  if (!end || Number.isNaN(end.getTime())) {
    const activated = user.planActivatedAt ? parseBase44Date(user.planActivatedAt) : null;
    if (!activated || Number.isNaN(activated.getTime())) return none;
    end = addMonths(activated, PLAN_TERM_MONTHS);
    source = 'planActivatedAt';
  }

  const msLeft = end.getTime() - now.getTime();
  return {
    end,
    source,
    expired: msLeft <= 0,
    daysLeft: Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24))),
  };
}

/**
 * Past the term, the couple may read and export and may not change anything.
 * Owner ruling 2: view and export always work, no edits and no new publish.
 * An already published guest site stays live, and nothing a GUEST does is
 * governed by this, which is why no guest-facing module imports it.
 */
export function isReadOnly(user) {
  return getPlanTerm(user).expired;
}
