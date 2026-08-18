/**
 * api/_lib/guestProtectedFields.js
 *
 * The fields on `Guest` that a caller-supplied update may never set, and the
 * function that removes them.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * `api/collaborator-guests.js` forwards a caller-supplied field bag straight
 * into a Guest PUT. Track E added `stripTokenFields` to that path, because a
 * forwarded `rsvp_link_id` would store a plaintext token with no matching hash
 * or ciphertext — a row that still resolves through the legacy fallback, looks
 * completely healthy, and dies silently the moment the plaintext column is
 * nulled.
 *
 * The Guest PII family creates the identical hazard at ten times the size. Once
 * the ten PII fields live inside `encrypted_guest_pii`, a forwarded
 * `{name: "..."}` would write plaintext beside a now-stale ciphertext. The
 * discriminator (`encrypted_guest_pii != null`) would still say "migrated",
 * every read would return the stale decrypted name, and the plaintext column
 * nobody reads would hold the real one. Nothing would error.
 *
 * `encrypted_guest_pii` itself is protected too, and that is not paranoia: a
 * caller who could set the blob directly could write any name they liked into
 * a row they are allowed to edit, and it would decrypt cleanly because it was
 * encrypted with our own key by our own endpoint.
 *
 * ── Why a denylist and not an allowlist ─────────────────────────────────────
 *
 * The invariant being protected is specific: these fields are derived, and may
 * only be written by the one server path that can compute all of their parts
 * together. An allowlist over Guest's ~35 fields would silently drop unrelated
 * ones as the entity grows — a guard that quietly discards a lawful edit is a
 * worse failure than the one it prevents, because nobody reports it.
 *
 * ── The rule this list must satisfy ─────────────────────────────────────────
 *
 * Both directions, always. Protected fields removed AND every lawful field
 * preserved exactly. A strip that returned `{}` would satisfy the first half
 * perfectly. See tests/persistence/guest-protected-fields.mjs.
 */

import { TOKEN_FIELDS } from './rsvpTokenCrypto.js';

/**
 * The ten fields destined for `encrypted_guest_pii` (Guest family, Track C).
 *
 * Listed here BEFORE they are encrypted, deliberately: the guard has to be in
 * place before the first write path can produce a stale-plaintext row, not
 * after. Three of them are empty today, which is exactly why now is the cheap
 * moment.
 */
export const PII_FIELDS = [
  'name',
  'email',
  'phone',
  'mailing_address',
  'dietary_restrictions',
  'special_requests',
  'notes',
  'plus_one_name',
  'plus_one_email',
  'plus_one_dietary_restrictions',
];

/** The encrypted blob itself — never settable by a caller. */
export const BLOB_FIELD = 'encrypted_guest_pii';

/**
 * `name` is `required` on the entity, so unlike the other nine it cannot be
 * null. Post-Track-D it holds this placeholder: visibly not a name, harmless to
 * sort, not mistakable for real data in an export, and deliberately not an
 * empty string — some UI treats "" as missing and substitutes a fallback that
 * could itself read as a name.
 *
 * Shared by the write path and scripts/null-guest-pii.mjs so the two cannot
 * drift onto different placeholders.
 */
export const NAME_PLACEHOLDER = '—';

/** The nine that become null at Track D. `name` is placeheld instead. */
export const NULLABLE_PII_FIELDS = PII_FIELDS.filter(f => f !== 'name');

/** Everything a forwarded update may not set. */
export const PROTECTED_FIELDS = [...TOKEN_FIELDS, ...PII_FIELDS, BLOB_FIELD];

/**
 * Removes protected fields from a caller-supplied update, leaving every other
 * field untouched. Does not mutate the input.
 *
 * @param {object} updates
 * @returns {{ updates: object, stripped: string[] }} the safe update, and what
 *   was removed — returned rather than discarded so callers can log it. A
 *   caller attempting to set a protected field is either a stale client or
 *   someone probing, and silence about it helps neither.
 */
export function stripProtectedFields(updates) {
  const out = { ...(updates || {}) };
  const stripped = [];
  for (const f of PROTECTED_FIELDS) {
    if (f in out) { stripped.push(f); delete out[f]; }
  }
  return { updates: out, stripped };
}

/**
 * Fields that are DERIVED — computed by a server path from other inputs, never
 * supplied by a caller. The distinction from PROTECTED_FIELDS matters:
 *
 *   PROTECTED_FIELDS — for a PASSTHROUGH (collaborator-guests). PII is
 *                      included, because a passthrough cannot rewrite the blob.
 *   DERIVED_FIELDS   — for the TRUSTED write path (api/my-guests.js). PII is
 *                      NOT included: writing PII is precisely that endpoint's
 *                      job, and from Track C it is what produces the blob.
 *
 * Collapsing the two lists would either brick the couple's own guest editing
 * or let a caller forge a token. They are different questions with different
 * answers.
 */
export const DERIVED_FIELDS = [...TOKEN_FIELDS, BLOB_FIELD];

/**
 * Removes derived fields from a caller-supplied guest payload, leaving PII and
 * every ordinary field intact.
 *
 * @param {object} fields
 * @returns {{ fields: object, stripped: string[] }}
 */
export function stripDerivedFields(fields) {
  const out = { ...(fields || {}) };
  const stripped = [];
  for (const f of DERIVED_FIELDS) {
    if (f in out) { stripped.push(f); delete out[f]; }
  }
  return { fields: out, stripped };
}
