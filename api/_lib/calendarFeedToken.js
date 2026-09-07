/**
 * api/_lib/calendarFeedToken.js — THE SUBSCRIBE LINK'S TOKEN.
 *
 * A subscribed calendar is fetched by Google's servers, not the couple's
 * browser, so the URL carries its own authority: there is no session to check.
 * The token is what makes the URL unguessable, and it is DERIVED rather than
 * stored — HMAC-SHA256 of the wedding id under a server-only secret, hex,
 * truncated to 32 characters.
 *
 * WHY DERIVED. A stored token is a column that has to be created, migrated,
 * read on every request and kept out of every other response. A derived one is
 * a pure function of an id the server already has. Nothing to write, nothing
 * to leak from a record, and no schema change on a platform that silently
 * discards unknown fields.
 *
 * WHAT DERIVED COSTS, stated because it is the real trade: the token cannot be
 * rotated for one couple without rotating the secret for all of them. Rotation
 * needs a stored feed version to mix into the HMAC, and that is filed as an
 * open ticket rather than pretended away. Until it exists, a leaked link is
 * revoked only by changing CALENDAR_FEED_SECRET, which breaks every
 * subscription at once.
 *
 * THE SECRET IS NEVER HANDLED HERE BEYOND READING IT. Not logged, not echoed
 * in an error, not defaulted to a literal — an absent secret is a 404, the
 * same answer a wrong token gets, because "the server is misconfigured" is not
 * a fact a stranger is owed.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const TOKEN_LENGTH = 32;

/**
 * @param {string} weddingId
 * @param {string} secret  process.env.CALENDAR_FEED_SECRET
 * @returns {string|null} 32 hex characters, or null when either input is missing
 */
export function calendarFeedToken(weddingId, secret) {
  if (!weddingId || !secret) return null;
  return createHmac('sha256', secret).update(String(weddingId)).digest('hex').slice(0, TOKEN_LENGTH);
}

/**
 * Constant-time compare. A plain `===` on a hex string leaks its own answer
 * through how long it takes to say no, one character at a time, which is
 * enough to walk a token out of a public endpoint given patience.
 *
 * @returns {boolean}
 */
export function calendarFeedTokenMatches(weddingId, secret, candidate) {
  const expected = calendarFeedToken(weddingId, secret);
  if (!expected || typeof candidate !== 'string') return false;
  // timingSafeEqual throws on a length mismatch, which would itself be a
  // length oracle — so the lengths are checked first and the comparison is
  // still run, against the expected value, to keep the timing flat.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(candidate.length === expected.length ? candidate : expected, 'utf8');
  return timingSafeEqual(a, b) && candidate.length === expected.length;
}
