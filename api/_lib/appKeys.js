/**
 * api/_lib/appKeys.js
 *
 * THE APPLICATION'S OWN HASH AND CIPHER KEYS, SEPARATE FROM ANY CREDENTIAL.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * On 2026-10-11 BASE44_ADMIN_KEY was rotated, and because four modules under
 * api/_lib derived their HMAC and AES keys from that one value, the rotation
 * orphaned every hash and killed every ciphertext made under the old value.
 * Measured on the owner's own rows that day: 0 of 18 stored guest_id_hash
 * values matched a new-key hash of the owner's 207 guests, and 6 of 6 encrypted
 * rows failed to decrypt. Across production: 1134 PollVote identifiers, 555
 * RsvpResponse hashes, 216 encrypted guest-level payloads, 2 questionnaire
 * responses and 1 gift row.
 *
 * A credential exists to be rotated. A hash key exists to stay still. Deriving
 * one from the other means every credential rotation is also a silent data
 * migration, and nothing in the system says so out loud. Two dedicated keys
 * already existed for exactly this reason (RSVP_TOKEN_KEY, CALENDAR_FEED_SECRET),
 * so this is consistency rather than invention.
 *
 * ── THE TWO KEYS ARE SEPARATE, AND THAT IS THE POINT ───────────────────────
 *
 * APP_HASH_KEY signs. APP_ENC_KEY encrypts. Before this, one value did both,
 * so rotating to fix a hash problem would also have destroyed every payload.
 * Split, a hash rotation is survivable (recompute from the plaintext id), and a
 * cipher rotation is a deliberate act with a migration attached.
 *
 * ── READ PER CALL, NEVER AT MODULE SCOPE ───────────────────────────────────
 *
 * Five of the seven modules captured the key at import. That is how a guard
 * which set the key and then exercised an endpoint got a module instance
 * holding an empty secret, and it is also how a serverless instance that starts
 * before its environment is populated keeps the wrong value for its whole life.
 * The symptom in production is every hash silently wrong. Reading per call costs
 * nothing and cannot go stale. api/_lib/stopEmailsToken.js had already learned
 * this the hard way; this module makes it the only option.
 *
 * ── FAIL CLOSED ON AN EMPTY KEY ────────────────────────────────────────────
 *
 * An HMAC under '' is still a perfectly computable HMAC. That is the whole
 * hazard: with no key set, hashing SUCCEEDS and writes a stable, worthless
 * digest, and signing SUCCEEDS and mints a token nothing can verify. Both
 * failures are invisible until someone reads the data back months later. So an
 * absent key throws here, at the moment of use, naming the variable.
 *
 * Preview deployments hold neither key by decision (2026-10-11), so paths that
 * hash or encrypt are expected to fail loudly there rather than write digests
 * that production could never reproduce. Lanes supply both through .env.local,
 * and guards set their own fixtures.
 */

import crypto from 'crypto';

/**
 * @param {string} name the env var to read
 * @returns {string} its non-empty value
 * @throws if it is unset or empty, naming the variable
 */
function required(name) {
  const value = process.env[name] || '';
  if (!value) {
    throw new Error(
      `${name} is not set. Refusing to hash or encrypt under an empty key: ` +
      'the result would be computable, stable and worthless.',
    );
  }
  return value;
}

/** The HMAC key, read fresh on every call. */
export function hashKey() {
  return required('APP_HASH_KEY');
}

/**
 * The AES-256-GCM key: a fixed 32 bytes derived from APP_ENC_KEY, read fresh on
 * every call. Derived rather than used raw so the env var may be any length.
 */
export function encKey() {
  return crypto.createHash('sha256').update(required('APP_ENC_KEY')).digest();
}

/**
 * One-way HMAC-SHA256 digest, hex. The single construction every non-
 * collaborator hash in api/ now shares.
 *
 * @param {string|null|undefined} rawValue
 * @returns {string|null} null for an absent value, so callers keep their
 *   existing "nothing to hash" branch. An absent KEY throws instead: no value
 *   is a fact about the data, no key is a broken deployment.
 */
export function hmacHex(rawValue) {
  if (!rawValue) return null;
  return crypto.createHmac('sha256', hashKey()).update(String(rawValue)).digest('hex');
}

/**
 * HMAC-SHA256, base64url, for link signatures rather than stored digests.
 *
 * @param {string} body the already-encoded token body
 * @returns {string}
 */
export function hmacB64Url(body) {
  return crypto.createHmac('sha256', hashKey()).update(body).digest('base64url');
}

/**
 * @returns {boolean} whether the hash key is present, for a verifier that must
 *   answer "not found" rather than throw. Verification refusing an absent key
 *   is itself fail-closed: every token would otherwise verify against ''.
 */
export function hasHashKey() {
  return !!(process.env.APP_HASH_KEY || '');
}
