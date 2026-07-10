/**
 * api/_lib/pollAuth.js
 *
 * Server-only helper for the PollVote/PollComment entities (fix/poll-
 * entities-migration) — hashing guest identifiers before they're ever
 * stored. Re-exports aggregateVotes from the isomorphic src/lib/
 * pollAggregation.js so every server endpoint can import both from one
 * place.
 */

import crypto from 'crypto';

const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

/**
 * One-way HMAC-SHA256 digest of a raw guest identifier (a Guest.id for the
 * RSVP-token-scoped flow, or a client-generated anonymous id for the fully-
 * anonymous flow), keyed with BASE44_ADMIN_KEY so it's never reversible
 * even against a known candidate list (e.g. the couple's own guest-id
 * list) — PollVote/PollComment have read: null (entity-level unrestricted,
 * matching GuestbookEntry's precedent), so nothing stored on them may ever
 * be reversible to a named guest.
 *
 * @param {string|null|undefined} rawValue
 * @returns {string|null}
 */
export function hashGuestIdentifier(rawValue) {
  if (!rawValue) return null;
  return crypto.createHmac('sha256', BASE44_ADMIN_KEY || '').update(String(rawValue)).digest('hex');
}

export { aggregateVotes } from '../../src/lib/pollAggregation.js';
