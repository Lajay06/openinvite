/**
 * api/_lib/giftCrypto.js
 *
 * THE CIPHER FOR A VERSION 2 PlanGift ROW'S PERSONAL FIELDS.
 * Owner ruling 2026-10-12 (gifting v2, item 7): v2 rows are encrypted under
 * APP_ENC_KEY. That ruling was written while giftAuth.js still derived its key
 * from the admin credential, so this said "never the frozen cipher". #1054
 * moved giftAuth.js onto APP_ENC_KEY too, and a production count found zero v1
 * rows, so there is no second cipher left to be separate from.
 *
 * The shared AES-256-GCM construction (questionnaireCrypto's encryptPayload,
 * keyed by api/_lib/appKeys.js): iv || authTag || ciphertext, base64, one
 * column. A field is a string; null stays null.
 *
 * STANDING RULE (BASE44_PLATFORM_NOTES.md, 2026-10-12): these fields are the
 * only copy of the couple's address, names and note, so APP_ENC_KEY may not be
 * rotated without re-encrypting every v2 row first, counted row by row.
 */
import { encryptPayload, decryptPayload } from './questionnaireCrypto.js';

/** A v2 field's ciphertext, or null for an absent value. */
export function encryptGiftField(value) {
  if (value == null || value === '') return null;
  return encryptPayload(String(value));
}

/** The plaintext of a v2 field, or null. Throws on a tampered or foreign blob. */
export function decryptGiftField(blob) {
  if (!blob) return null;
  const out = decryptPayload(blob);
  return typeof out === 'string' ? out : null;
}
