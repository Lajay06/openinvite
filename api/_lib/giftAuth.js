/**
 * api/_lib/giftAuth.js
 *
 * PlanGift has create:null/read:null/update:null/delete:null (PR G4, gifting
 * v2 bridge) — mirrors QuestionnaireResponse/RsvpResponse: the admin key has
 * no session identity, so it can never satisfy an owner-scoped {{user.id}}
 * RLS rule on any operation, confirmed empirically (see
 * BASE44_PLATFORM_NOTES.md). Because this table is listable unscoped by
 * anyone with any API token, identifying fields are HMAC digests and
 * readable content (emails, personal notes) is AES-256-GCM ciphertext —
 * same construction as api/_lib/questionnaireCrypto.js, reused verbatim
 * rather than reinvented.
 *
 * Key is derived from BASE44_ADMIN_KEY (server-only env var, never bundled
 * to the browser) via SHA-256 to get a fixed 32-byte AES-256-GCM key.
 */

import crypto from 'crypto';

const ADMIN_KEY = process.env.BASE44_ADMIN_KEY || '';
const ENC_KEY = crypto.createHash('sha256').update(ADMIN_KEY).digest();

/** One-way HMAC-SHA256 digest, same construction as questionnaireCrypto.js/pollAuth.js. */
export function hashId(rawValue) {
  if (!rawValue) return null;
  return crypto.createHmac('sha256', ADMIN_KEY).update(String(rawValue)).digest('hex');
}

/**
 * Encrypts a UTF-8 string with AES-256-GCM. Output is a single base64
 * string: iv (12 bytes) || authTag (16 bytes) || ciphertext.
 */
export function encryptString(plaintext) {
  if (plaintext == null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/**
 * Reverses encryptString. Throws if the blob is truncated or the auth tag
 * doesn't verify (tampered/corrupt) — callers should treat a throw here the
 * same as "unreadable," never surface partial/garbage plaintext.
 */
export function decryptString(blob) {
  if (!blob) return null;
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * A human-shareable one-time redemption code, e.g. "GIFT-9F2K-7QRT" —
 * generated server-side (not Stripe's own auto-generated Promotion Code
 * string) so it reads cleanly in an email rather than an arbitrary Stripe
 * id. 8 random uppercase-alphanumeric characters (Crockford-ish, no 0/O/1/I
 * to avoid transcription ambiguity if someone reads it aloud or retypes it),
 * ~40 bits of entropy — plenty for a max_redemptions:1 code that also
 * requires knowing/receiving the actual email.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export function generateGiftCode() {
  const bytes = crypto.randomBytes(8);
  let body = '';
  for (let i = 0; i < 8; i++) {
    body += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `GIFT-${body.slice(0, 4)}-${body.slice(4)}`;
}
