/**
 * api/_lib/retentionTriggers.js
 *
 * WHICH RETENTION EMAIL, IF ANY, IS DUE FOR ONE ACCOUNT.
 *
 * Item 2 of goals/2026-10-08-retention-emails.md. Pure: everything it needs is
 * an argument, so the cron stays a thin loop and every rule below is testable
 * against synthetic dates. Base44 stamps created_date server-side and will not
 * accept one on write, so aged fixtures cannot exist and this is the only way
 * these boundaries can be exercised at all.
 *
 * ── THE SIGNAL FOR "NOT FINISHED SETTING UP" ───────────────────────────────
 *
 * The owner's ruling: the owner's most recent WeddingDetails has no `slug`.
 * NOT onboardingDraft, and not User.onboarding_completed. Item 0 established
 * why:
 *
 *   - User.onboarding_completed is declared live and nothing in the repo
 *     writes it. It is permanently false.
 *   - Onboarding.jsx writes `onboardingCompleted` in camelCase, which the live
 *     User schema does not declare, so the write is dropped.
 *   - onboardingDraft IS declared on WeddingDetails now, but
 *     src/lib/onboardingComplete.js records it as discarded when probed on
 *     2026-09-06, before it was declared. Persistence is expected, unverified,
 *     and the ruling says not to depend on it until it is proven.
 *
 * The slug is the marker the product itself trusts: a draft deliberately never
 * owns an address, and the address is claimed once, at the end. It also costs
 * no extra read, because the cron already holds the WeddingDetails row.
 *
 * ── WHAT THIS DOES NOT DECIDE ──────────────────────────────────────────────
 *
 * Exclusions (api/_lib/excludedAccounts.js) and is_test are the caller's, and
 * so is the send itself. This answers one question about one account.
 */

const HOUR = 3_600_000;

/**
 * THE SHIP DATE, HARDCODED, PER THE OWNER'S RULING ("hardcode it in the cron
 * with a comment; no field").
 *
 * WHAT IT IS FOR, and it is the only thing standing between this feature and
 * the entire back catalogue. User.lifecycleEmails defaults to TRUE, so every
 * account that already exists reads as eligible with no migration. Without a
 * cutoff, the first run after deploy would mail every couple who ever signed
 * up and never finished, including people who gave up two years ago.
 *
 * An account created BEFORE this date never receives either email. The goal's
 * wording is "accounts older than 30 days at the time this ships", and this is
 * that date minus thirty days, computed once rather than drifting with `now`:
 * a cutoff relative to the current time would slowly become "older than 30
 * days" forever, which is a different rule that never stops excluding people.
 *
 * Set to the day item 2 was written. If the merge slips, this stays put: an
 * account that signed up during the gap is a NEW account and should be
 * eligible, which is exactly what a fixed date gives.
 */
export const RETENTION_SHIP_DATE = '2026-10-08T00:00:00.000Z';
const BACKFILL_GRACE_DAYS = 30;

/** The earliest created_date eligible for either email, ever. */
export function retentionEligibleFrom(shipDate = RETENTION_SHIP_DATE) {
  return new Date(new Date(shipDate).getTime() - BACKFILL_GRACE_DAYS * 24 * HOUR);
}

/**
 * THE SECOND NUDGE WAITS FOR THE FIRST ONE TO HAVE LANDED, AND THEN SOME.
 *
 * Owner ruling, after item 2 reported the problem: "the second nudge of each
 * trigger requires both the age threshold and that the first nudge was sent at
 * least 72 hours earlier."
 *
 * WHAT IT FIXES. An account created, say, ten days before this ships passes
 * both age thresholds at once. On the age rule alone it would get the setup
 * email on one run and the same email again on the very next, a day apart,
 * because the second nudge's copy is the first nudge's copy unchanged. The
 * spacing makes the sequence read as a sequence however old the account was
 * when the feature arrived.
 *
 * WHAT IT IS NOT. It is not a substitute for the age threshold; both must
 * hold. A normal account reaches day 4 with setup24h sent on day 1, which is
 * 72 hours earlier, so nothing changes for anyone who signed up after ship.
 */
export const RETENTION_SPACING_HOURS = 72;

/**
 * The four sends, in the order they are offered.
 *
 * `after` is hours since signup. `flag` is the retentionEmails key that
 * records it. `trigger` is the account condition it belongs to, re-checked at
 * send time by the caller through this same function. `afterFlag`, where
 * present, is the send that must already have happened, at least
 * RETENTION_SPACING_HOURS ago.
 *
 * A SIDE EFFECT WORTH NAMING: because each second nudge names its predecessor,
 * it is now impossible to send setupDay4 before setup24h at all. The ordering
 * no longer rests on the iteration order of this array.
 */
export const RETENTION_SENDS = [
  { flag: 'setup24h',   after: 24,  trigger: 'setup',  email: 'setup' },
  { flag: 'setupDay4',  after: 96,  trigger: 'setup',  email: 'setup',  afterFlag: 'setup24h' },
  { flag: 'guests24h',  after: 24,  trigger: 'guests', email: 'guests' },
  { flag: 'guestsDay5', after: 120, trigger: 'guests', email: 'guests', afterFlag: 'guests24h' },
];

/** Hours between a created_date and now, or null when the date is unusable. */
export function ageHours(createdDate, now = Date.now()) {
  if (!createdDate) return null;
  const t = new Date(createdDate).getTime();
  if (Number.isNaN(t)) return null;
  return (now - t) / HOUR;
}

/**
 * Which of the two conditions this account is in, if either.
 *
 * @param {object} p
 * @param {object|null} p.wedding    the owner's most recent WeddingDetails row
 * @param {number} p.guestCount      real (non-test) guests this account owns
 * @returns {'setup'|'guests'|null}
 */
export function retentionCondition({ wedding, guestCount }) {
  // NO WEDDING ROW AT ALL IS NOT A CONDITION THIS CAN SEE. The cron finds
  // accounts BY listing WeddingDetails, so an account with no row never
  // reaches here. Accepted by the owner as out of reach; stated so the next
  // reader does not take the null branch for a decision.
  if (!wedding) return null;
  if (!wedding.slug) return 'setup';
  if (!guestCount) return 'guests';
  return null;
}

/**
 * The one retention email due for this account on this run, or null.
 *
 * ── ONE PER RUN, AND THE EARLIEST UNSENT ONE ───────────────────────────────
 *
 * The owner's ruling: never two emails to one account on the same run. So this
 * returns a single send and the caller sends at most that.
 *
 * Among several due, the EARLIEST unsent one wins, because the sequence is
 * meant to be walked in order. The consequence, named rather than hidden: an
 * account that is already past both thresholds when this ships (created, say,
 * five days before deploy) receives the setup email on one run and the same
 * email again on the next, a day apart, because the copy of the second nudge
 * is the first nudge unchanged. The alternative would be to stamp the skipped
 * earlier flag as though it had been sent, which puts a timestamp in the
 * record for an email nobody received. Reported in the PR body for a ruling.
 *
 * @param {object} p
 * @param {object} p.user            the User record
 * @param {object|null} p.wedding    their most recent WeddingDetails
 * @param {number} p.guestCount      real guests they own
 * @param {number} [p.now]
 * @param {string} [p.shipDate]
 * @returns {{flag: string, email: 'setup'|'guests'}|null}
 */
export function dueRetentionEmail({ user, wedding, guestCount, now = Date.now(), shipDate = RETENTION_SHIP_DATE }) {
  if (!user) return null;

  // ── THE SWITCH, AND THE TWO WAYS AN ACCOUNT IS GONE ──────────────────────
  // Absent reads as eligible, matching the schema default, so no existing
  // account changes behavior on deploy.
  if (user.lifecycleEmails === false) return null;
  if (user.deletionRequestedAt) return null;
  // `is_deleted` is not a field this app declares, but Base44 built-ins have
  // carried soft-delete markers before and a truthy one here must stop a send.
  if (user.is_deleted) return null;

  // ── NO BACKFILL ──────────────────────────────────────────────────────────
  const created = user.created_date ? new Date(user.created_date) : null;
  if (!created || Number.isNaN(created.getTime())) return null;
  if (created < retentionEligibleFrom(shipDate)) return null;

  const age = ageHours(user.created_date, now);
  if (age === null || age < 0) return null;

  const condition = retentionCondition({ wedding, guestCount });
  if (!condition) return null;

  const sent = user.retentionEmails || {};
  for (const send of RETENTION_SENDS) {
    if (send.trigger !== condition) continue;
    if (sent[send.flag]) continue;
    if (age < send.after) continue;
    // ── THE SPACING RULE ──────────────────────────────────────────────────
    //
    // A second nudge needs its predecessor to have been SENT, and to have been
    // sent at least RETENTION_SPACING_HOURS ago. A missing predecessor stamp
    // means the first nudge never went out, and nothing here ever writes a
    // stamp for an email that was not sent, so "missing" is unambiguous.
    if (send.afterFlag) {
      const firstAt = sent[send.afterFlag];
      if (!firstAt) continue;
      const t = new Date(firstAt).getTime();
      // AN UNREADABLE STAMP IS NOT A PASS. It says the first nudge happened at
      // an unknown time, and the only safe reading of unknown is "not yet long
      // enough", which holds the second nudge rather than sending it blind.
      if (Number.isNaN(t)) continue;
      if ((now - t) / HOUR < RETENTION_SPACING_HOURS) continue;
    }
    return { flag: send.flag, email: send.email };
  }
  return null;
}

/**
 * MERGE, NEVER REPLACE.
 *
 * A PUT replaces the whole object, so writing { setupDay4 } alone would erase
 * setup24h and the account would be eligible for the first nudge all over
 * again. The cron already holds the User record, so it has the current value;
 * this is the one place that merge is expressed.
 *
 * @returns {object} the full retentionEmails object to PUT
 */
export function mergeRetentionFlag(existing, flag, at) {
  const base = existing && typeof existing === 'object' ? existing : {};
  return { ...base, [flag]: at };
}

/**
 * Whether the existing onboarding trial emails should be offered to this
 * account at all.
 *
 * ── THE CADENCE RULING ───────────────────────────────────────────────────
 *
 * "An account with no slug does not receive the day-3 'Have you tried Ava'
 * email (it cannot try Ava before setup); it gets trigger 1 at 24h and day 4,
 * then day 7 as today."
 *
 * So day 3 is suppressed for an account with no slug, and day 7 is not. Day 7
 * is about the trial clock, which runs whether or not setup finished.
 */
export function suppressesDay3({ wedding }) {
  return !wedding || !wedding.slug;
}
