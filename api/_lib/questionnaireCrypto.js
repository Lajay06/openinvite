/**
 * api/_lib/questionnaireCrypto.js
 *
 * QuestionnaireResponse has create:null/read:null (fix/questionnaire-response-rls
 * — mirrors RsvpResponse/PollVote/SongRequest: the admin key has no session
 * identity, so it can never satisfy an owner-scoped {{user.id}} RLS rule on
 * either read or write, confirmed empirically against the live schema).
 * Unlike polls/RSVP, the product promise here is stronger — a guest's game
 * answers are visible ONLY to the couple who sent it, not "anyone with app
 * code discipline not to list it unscoped." Since Base44 RLS can't scope by
 * anything other than a flat {{user.id}} equality (no per-token condition,
 * no OR), read:null is unavoidable if the admin key must ever find these
 * rows again — so confidentiality is enforced by encrypting the answer
 * payload itself, not by access control on the row. A direct, unscoped
 * `.list()` against this entity (by anyone with any API token) yields only
 * ciphertext and HMAC digests, never plaintext answers or reversible ids.
 *
 * Keys come from api/_lib/appKeys.js: APP_HASH_KEY for the digests and
 * APP_ENC_KEY for the cipher, read per call and separate from each other. They
 * used to be one value derived from BASE44_ADMIN_KEY, which meant the 2026-10-11
 * credential rotation orphaned every digest here and made every payload
 * unreadable. See that module's header.
 */

import crypto from 'crypto';
import { hmacHex, encKey } from './appKeys.js';

/** One-way HMAC-SHA256 digest, same construction as pollAuth.js's hashGuestIdentifier. */
export function hashId(rawValue) {
  return hmacHex(rawValue);
}

/**
 * Encrypts a JSON-serializable payload with AES-256-GCM. Output is a single
 * base64 string: iv (12 bytes) || authTag (16 bytes) || ciphertext — so
 * nothing about the key or nonce needs a second column on the entity.
 */
export function encryptPayload(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/**
 * Reverses encryptPayload. Throws if the blob is truncated or the auth tag
 * doesn't verify (tampered/corrupt) — callers should treat a throw here the
 * same as "unreadable," never surface partial/garbage plaintext.
 */
export function decryptPayload(blob) {
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}
