/**
 * api/_lib/guestPii.js
 *
 * The Guest PII blob: build it, read it back, merge it onto a row.
 *
 * Guest.read RLS is null, so any authenticated account can list every Guest
 * row in the app — 206 rows carrying name, email and phone, verified from an
 * unrelated account. Scoping that read is not available (six server readers
 * use the admin key, and the anonymous ones have no caller session to switch
 * to), so the ten PII fields are encrypted at rest instead.
 *
 * Uses questionnaireCrypto's encryptPayload/decryptPayload directly rather
 * than a new module: the declared field contract says "same construction as
 * api/_lib/questionnaireCrypto.js", and the surest way to keep that true is to
 * be the same code. Key is derived from BASE44_ADMIN_KEY — deliberately the
 * admin key and not a dedicated secret, because unlike RSVP tokens this data
 * is never externally distributed, so a rotation is a re-runnable re-encrypt
 * migration rather than an unrecoverable break.
 *
 * THE DISCRIMINATOR IS DERIVED, NOT STORED: a row is migrated iff
 * encrypted_guest_pii != null. A separate boolean would be a second source of
 * truth for the same fact, and the two could disagree — blob set with the flag
 * false silently serves stale plaintext, flag true with a null blob decrypts
 * nothing. There is one question here, and null answers it by construction.
 */

import { encryptPayload, decryptPayload } from './questionnaireCrypto.js';
import { PII_FIELDS, BLOB_FIELD, NAME_PLACEHOLDER, NULLABLE_PII_FIELDS } from './guestProtectedFields.js';

/**
 * Builds the blob from a complete set of PII values.
 *
 * Every one of the ten keys is always present, `null` when the guest has no
 * value, rather than omitted. That makes a round-trip check a list comparison
 * instead of a set comparison — "did all ten survive" is answerable without
 * knowing which the guest happened to have.
 *
 * @param {object} pii — may contain extra keys; only the ten are taken
 * @returns {string} base64 ciphertext
 */
export function buildGuestPiiBlob(pii) {
  const payload = {};
  for (const f of PII_FIELDS) {
    payload[f] = pii?.[f] ?? null;
  }
  return encryptPayload(payload);
}

/**
 * Reads a blob back.
 *
 * Returns null on a corrupt or unreadable blob rather than throwing.
 * decryptPayload throws on a truncated or tampered value, and a single bad row
 * must not fail the couple's entire guest list — the caller falls back to that
 * row's plaintext columns, which through Track D still exist.
 *
 * @param {string|null} blob
 * @returns {object|null}
 */
export function readGuestPiiBlob(blob) {
  if (!blob) return null;
  try {
    const out = decryptPayload(blob);
    return out && typeof out === 'object' ? out : null;
  } catch (err) {
    console.error('[guestPii] blob failed to decrypt:', err.message);
    return null;
  }
}

/**
 * The read path. Returns the row with its ten PII fields resolved.
 *
 * Blob preferred, plaintext fallback. During the mixed window a row may have
 * either; after the migration every row has the blob; after Track D only the
 * blob. Preferring it here means this function needs no change at D.
 *
 * A row whose blob will not decrypt falls back to plaintext AND is logged —
 * silently serving stale plaintext for a row that believes itself migrated is
 * exactly the drift the derived discriminator exists to avoid, so when it
 * happens anyway we say so.
 *
 * @param {object} row
 * @returns {object} a new row object; the input is not mutated
 */
export function mergeGuestPii(row) {
  if (!row) return row;
  const blob = row[BLOB_FIELD];
  if (!blob) return row;                       // unmigrated: plaintext is authoritative

  const pii = readGuestPiiBlob(blob);
  if (!pii) {
    console.error(`[guestPii] guest ${row.id} has a blob that will not decrypt — falling back to plaintext columns.`);
    return row;
  }

  const out = { ...row };
  for (const f of PII_FIELDS) {
    // null inside the blob means "this guest has no value", which is the same
    // thing the plaintext column would say. Copy it rather than falling back,
    // or clearing a field would silently resurrect its old plaintext.
    out[f] = pii[f] ?? null;
  }
  return out;
}

/**
 * The write path. Given a row's CURRENT resolved PII and an incoming partial
 * patch, returns the fields to persist: the changed plaintext columns plus a
 * rebuilt blob.
 *
 * Rebuilding from current-plus-patch rather than from the patch alone is the
 * whole correctness argument for partial updates. A PUT that sets only
 * dietary_restrictions must not produce a blob containing only that field —
 * the other nine would come back null on the next read, and the couple would
 * watch a guest's name and email disappear because they edited a meal
 * preference. This is the Track B obligation discharged: dietary edits rewrite
 * the blob rather than being refused.
 *
 * @param {object} currentPii — the row's resolved PII (post-mergeGuestPii)
 * @param {object} patch — caller-supplied fields, may contain non-PII keys
 * @returns {object} fields to write, including BLOB_FIELD
 */
export function buildGuestWriteFields(currentPii, patch) {
  const fields = { ...patch };

  const touchesPii = PII_FIELDS.some(f => f in (patch || {}));
  if (!touchesPii) return fields;              // nothing to re-encrypt

  const merged = {};
  for (const f of PII_FIELDS) {
    merged[f] = f in patch ? patch[f] : (currentPii?.[f] ?? null);
  }

  // TRACK D: the plaintext half is NOT written. The blob is the only store.
  //
  // This was the dual-write through Track C and the migration, and leaving it
  // in place after the nulling run was a real defect — every edit through this
  // endpoint silently RESURRECTED the plaintext columns Track D had just
  // cleared, re-exposing that guest's email and phone to any authenticated
  // account. Found by the closing probe, whose own two edits caused it.
  //
  // The nine are written as explicit nulls rather than simply omitted. Omitting
  // them would leave whatever is already in the column, so a row that somehow
  // regained plaintext would keep it forever; writing null makes every edit
  // self-healing. `name` cannot be null (required on the entity), so it takes
  // the shared placeholder.
  for (const f of NULLABLE_PII_FIELDS) {
    fields[f] = null;
  }
  fields.name = NAME_PLACEHOLDER;
  fields[BLOB_FIELD] = buildGuestPiiBlob(merged);
  return fields;
}
