/**
 * src/lib/needsOnboarding.js — SHOULD THIS ACCOUNT BE BACK IN THE WIZARD?
 *
 * Its own file for the reason onboardingComplete.js has one: it used to live
 * inside ChoosePlan.jsx, which imports the authenticated Base44 client and a
 * page's worth of JSX, so the one predicate deciding whether a couple is sent
 * back to setup had no test that could run. It is pure — one object in, a
 * boolean out — and now it sits where a guard can reach it.
 *
 * ── WHAT IT IS FOR ──────────────────────────────────────────────────────────
 *
 * ChoosePlan's "Start free" writes `plan_step_completed` and THEN navigates to
 * /onboarding. So a couple who closes the tab on the first step is, from their
 * next login onward, past that gate forever — landing on the dashboard with a
 * record holding no names, no address, and (until this package) a builder that
 * published it on the next autosave. Nothing sent them back:
 * isOnboardingComplete is consulted only by the wizard's own skip-guard and by
 * PaymentSuccess. Measured on smoke01: /choose-plan redirects to /DailyUpdate,
 * and /onboarding works perfectly if you type it yourself.
 *
 * ── THE PRECONDITION IS THE IMPORTANT HALF ──────────────────────────────────
 *
 * A record with an ADDRESS is never sent back, whatever else is missing. An
 * address means the wizard already ran to the end — Onboarding.jsx:452 is the
 * only thing that claims one — and routing a couple with a live guest suite
 * into a setup wizard would be far worse than the problem being fixed. `slug`
 * is the first term for that reason, not for brevity.
 *
 * NO NAMES is asked through coupleNameParts, the same reader api/claim-slug.js
 * uses to decide `no-names`. Asking it any other way would let this gate and
 * the address derivation disagree about the same record.
 *
 * IT WRITES NOTHING. It reads a record and returns a boolean.
 *
 * @param {object|null} wedding  the couple's WeddingDetails, or null
 * @returns {boolean} true when the wizard should be offered again
 */
import { coupleNameParts } from '../../api/_lib/coupleNames.js';

export function needsOnboarding(wedding) {
  if (!wedding) return false;          // nothing to judge — the dashboard is safe
  if (wedding.slug) return false;      // has an address: never, whatever else is missing
  const [a, b] = coupleNameParts(wedding);
  return !a && !b;
}
