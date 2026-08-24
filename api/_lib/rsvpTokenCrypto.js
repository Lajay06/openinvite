/**
 * api/_lib/rsvpTokenCrypto.js
 *
 * Hash and ciphertext for RSVP link tokens. Track E, step 2.
 *
 * WHY THIS IS A SEPARATE MODULE FROM questionnaireCrypto.js
 *
 * Not style — a different key, on purpose. questionnaireCrypto derives
 * everything from BASE44_ADMIN_KEY. RSVP tokens are the one secret in this app
 * that is EXTERNALLY DISTRIBUTED: printed in invitations, sitting in guests'
 * inboxes, entirely beyond our control. Sharing a failure domain with the
 * admin key would mean an admin-key rotation — done for any unrelated reason,
 * by someone with no idea this coupling existed — silently killed every
 * outstanding invitation. Same principle as websitePasswordHash.js (#450),
 * amplified: the blast radius there was one couple's own site, here it is
 * hundreds of other people's mailboxes.
 *
 * So: RSVP_TOKEN_KEY, its own env var, documented in BASE44_PLATFORM_NOTES.md
 * along with the rotation hazard that both halves of this module share —
 * rotate without a decrypt-old/re-encrypt-new migration and the hashes stop
 * matching AND the ciphertext stops decrypting, so the raw tokens cannot be
 * recovered to re-hash them. There is no repair path after the fact.
 *
 * TWO TRANSFORMS, TWO JOBS:
 *   hashToken    — lookup. Deterministic, so resolveGuestByToken can find a
 *                  guest by hashing what they present. One-way, so listing
 *                  Guest unscoped yields nothing usable.
 *   encryptToken — recovery. The couple genuinely needs the raw token back
 *                  (bulk copy-links, resends, WhatsApp, "email me my link"),
 *                  so a hash alone would permanently orphan every existing
 *                  invitation. Reversible, server-side, owner-gated.
 *
 * NO SHAPE ASSUMPTIONS. Tokens are opaque strings. 201 of the 202 live tokens
 * are uuidv4 and one is a 27-character legacy value; anything here that
 * validated a uuid shape would silently skip that row and leave one guest's
 * link permanently unresolvable once the plaintext column is nulled.
 */

import crypto from 'crypto';

const RSVP_TOKEN_KEY = process.env.RSVP_TOKEN_KEY || '';

/**
 * Fails loudly rather than falling back to a default or to the admin key.
 * A silent fallback would produce hashes that look fine, are stored happily,
 * and match nothing — the whole class of failure this programme keeps meeting.
 */
function requireKey(fn) {
  if (!RSVP_TOKEN_KEY) {
    throw new Error(`[rsvpTokenCrypto] RSVP_TOKEN_KEY is not set — ${fn} cannot run. Set it in every Vercel environment; a missing key here produces tokens that can never be resolved.`);
  }
}

/** Lazily derived so an unset key throws at call time, not at import time. */
function encKey() {
  return crypto.createHash('sha256').update(RSVP_TOKEN_KEY).digest();
}

/**
 * Deterministic HMAC-SHA256 of a token, hex. The lookup key.
 *
 * @param {string} token — opaque; never shape-validated.
 * @returns {string|null} null for an empty/absent token, so callers can pass
 *   a possibly-missing value straight through without a guard.
 */
export function hashToken(token) {
  if (!token) return null;
  requireKey('hashToken');
  return crypto.createHmac('sha256', RSVP_TOKEN_KEY).update(String(token)).digest('hex');
}

/**
 * AES-256-GCM. Output is one base64 string: iv (12) || authTag (16) ||
 * ciphertext — same envelope as questionnaireCrypto.js so the shape is
 * familiar in review, but keyed differently and carrying a raw string rather
 * than a JSON payload.
 *
 * @param {string} token
 * @returns {string|null}
 */
export function encryptToken(token) {
  if (!token) return null;
  requireKey('encryptToken');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(token), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

/**
 * Reverses encryptToken.
 *
 * Returns null rather than throwing on a corrupt or unreadable blob. Callers
 * are recovery surfaces that already fall back to the plaintext column during
 * the mixed window, and a throw there would turn one bad row into a failed
 * bulk copy-links for an entire guest list.
 *
 * @param {string} blob
 * @returns {string|null}
 */
export function decryptToken(blob) {
  if (!blob) return null;
  try {
    requireKey('decryptToken');
    const buf = Buffer.from(blob, 'base64');
    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', encKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (err) {
    console.error('[rsvpTokenCrypto] decryptToken failed:', err.message);
    return null;
  }
}

/**
 * The write patch for a newly minted (or newly migrated) token.
 *
 * HASH AND CIPHERTEXT ONLY. The plaintext column is never written.
 *
 * It used to be. The line read `[prefix]: token` with the comment "legacy
 * plaintext — E3 nulls this", and that comment was read by a later author as
 * "plaintext is no longer written". It never said that.
 * scripts/null-rsvp-plaintext.mjs was a ONE-TIME MIGRATION that nulled existing
 * rows; it did not touch this writer. So E3 cleaned the data and left the pen
 * on the desk, and every mint after it re-created a plaintext bearer
 * capability beside its own ciphertext — which defeats RSVP_TOKEN_KEY for that
 * row entirely, since a reader of the row does not need the key.
 *
 * A comment describing a past migration is a statement about data that once
 * was. It is never a statement about what this function does now.
 *
 * Nothing needs the plaintext. Lookups resolve through `_hash`
 * (api/_lib/rsvpAuth.js) and recovery through `_enc`; api/my-guest-links.js
 * keeps `decryptToken(enc) || guest.rsvp_link_id` as a legacy recovery path,
 * which is inert for every row E3 nulled and stays inert for every row minted
 * from here.
 *
 * @param {string} token
 * @param {boolean} isPlusOne
 * @returns {object} field patch to merge into a Guest write
 */
export function tokenPatch(token, isPlusOne = false) {
  const prefix = isPlusOne ? 'plus_one_rsvp_link_id' : 'rsvp_link_id';
  return {
    [`${prefix}_hash`]: hashToken(token),
    [`${prefix}_enc`]: encryptToken(token),
  };
}

/**
 * Every field that stores an RSVP token in any form. A passthrough writer must
 * never set these: a token written without its hash and ciphertext resolves
 * only through the legacy fallback, looks healthy, and dies at E3.
 */
export const TOKEN_FIELDS = [
  'rsvp_link_id', 'rsvp_link_id_hash', 'rsvp_link_id_enc',
  'plus_one_rsvp_link_id', 'plus_one_rsvp_link_id_hash', 'plus_one_rsvp_link_id_enc',
];

/**
 * Removes token fields from a caller-supplied update, leaving EVERY other
 * field untouched.
 *
 * Exported and unit-tested rather than inlined, because a guard that also
 * blocks lawful edits is worse than no guard — it is a lock that bricks the
 * door. The test asserts both halves: token fields gone, ordinary fields
 * (dietary_restrictions, table_assignment, notes, …) preserved exactly.
 *
 * @param {object} updates
 * @returns {object} a new object; the input is not mutated
 */
export function stripTokenFields(updates) {
  const out = { ...(updates || {}) };
  for (const f of TOKEN_FIELDS) delete out[f];
  return out;
}
