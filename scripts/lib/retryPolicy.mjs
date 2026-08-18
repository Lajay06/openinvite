/**
 * scripts/lib/retryPolicy.mjs
 *
 * One decision, isolated so it can be tested: should this failed write be
 * retried?
 *
 * A retry loop that catches everything is a loop that MASKS REAL REJECTIONS.
 * A 403 from an RLS rule, a 404 from a deleted row, a 400 from a malformed
 * patch would each be retried to exhaustion and then reported as a transient
 * failure — the operator reads "rate limited, try again later" and never
 * learns the write was refused on the merits. That misdiagnosis is the exact
 * class of silent failure this codebase keeps turning up, so the policy is a
 * pure function with its own tests rather than an `if` buried in a loop.
 *
 * ONLY 429 is transient. Everything else is a verdict.
 */

/** The only status worth trying again. */
export const RETRYABLE_STATUSES = [429];

/**
 * @param {{status?: number}} err — error carrying an HTTP status
 * @param {number} attempt — retries already used
 * @param {number} maxRetries
 * @returns {boolean}
 */
export function shouldRetry(err, attempt, maxRetries) {
  if (!err || typeof err.status !== 'number') return false;   // no status = not a transport verdict
  if (attempt >= maxRetries) return false;
  return RETRYABLE_STATUSES.includes(err.status);
}

/** Exponential backoff in ms for a given retry attempt (1-based). */
export function backoffMs(attempt, baseMs) {
  return baseMs * Math.pow(2, attempt);
}
