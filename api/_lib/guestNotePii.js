/**
 * api/_lib/guestNotePii.js
 *
 * A guest note's email and message text, encrypted at rest.
 *
 * WHY. GuestMessage.read RLS is null — it has to be, because the row is
 * written by the admin key on behalf of an anonymous guest and Base44 stamps
 * every such row `created_by_id: "anonymous"`, which no real session can ever
 * match (BASE44_PLATFORM_NOTES.md, "the admin key is not a superuser bypass").
 * So any authenticated account can list this entity. What a guest writes in a
 * note is the most personal text the product handles — a question about a
 * dietary need, an apology for not coming — and their address comes with it.
 * Confidentiality is therefore enforced on the VALUE, not on the row: an
 * unscoped `.list()` yields a base64 blob and a first name, never an address
 * and never a sentence.
 *
 * SAME CONSTRUCTION AS THE GUEST PII BLOB, deliberately the same code rather
 * than a second copy of it: questionnaireCrypto's AES-256-GCM
 * encryptPayload/decryptPayload, keyed off BASE44_ADMIN_KEY. See
 * api/_lib/guestPii.js's header for why the admin key and not a dedicated
 * secret — this data is never distributed to a guest, so a rotation is a
 * re-runnable re-encrypt rather than an unrecoverable break.
 *
 * THE PLAINTEXT COLUMNS ARE NEVER WRITTEN. guest_email and message stay
 * declared on the entity (undeclaring a field drops its stored data — gotcha
 * #5) and stay empty on every row this app creates. They are still READ, as a
 * fallback, because rows predating this feature carry their text there and a
 * couple should not lose a note to a migration they never asked for.
 */

import { encryptPayload, decryptPayload } from './questionnaireCrypto.js';

/**
 * @param {{email?: string, message?: string}} fields
 * @returns {string} base64 ciphertext
 */
export function buildGuestNoteBlob({ email = '', message = '' } = {}) {
  // BOTH KEYS ALWAYS PRESENT, null when absent rather than omitted — the same
  // shape rule guestPii.js uses, so "did both survive the round trip" is a
  // question you can answer without knowing which the guest supplied.
  return encryptPayload({ email: email || null, message: message || null });
}

/**
 * Reads a blob back, or null if there isn't one or it cannot be read.
 *
 * Never throws. decryptPayload throws on a truncated or tampered value, and
 * one bad row must not fail the couple's whole Messages page — the caller
 * falls back to the row's plaintext columns instead.
 */
export function readGuestNoteBlob(blob) {
  if (!blob || typeof blob !== 'string') return null;
  try {
    const out = decryptPayload(blob);
    return out && typeof out === 'object' ? out : null;
  } catch {
    return null;
  }
}

/**
 * One row, as the couple's dashboard should see it: the blob's values merged
 * onto the plaintext field names the page already reads, and the ciphertext
 * dropped.
 *
 * DROPPING encrypted_guest IS THE POINT, not tidiness. A response that carried
 * both would ship the ciphertext to the browser for no reason, and a later
 * "just send the row" refactor would have nothing to push back on.
 */
export function decorateGuestNote(row) {
  const blob = readGuestNoteBlob(row?.encrypted_guest);
  const { encrypted_guest: _dropped, ...rest } = row || {};
  return {
    ...rest,
    // BLOB FIRST, PLAINTEXT SECOND. Every row this app writes has the blob and
    // an empty column; a pre-feature row has the column and no blob.
    guest_email: blob?.email ?? rest.guest_email ?? '',
    message: blob?.message ?? rest.message ?? '',
  };
}
