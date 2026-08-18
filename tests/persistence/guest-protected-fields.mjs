/**
 * tests/persistence/guest-protected-fields.mjs
 *
 * The forwarding guard on Guest updates, asserted BOTH WAYS.
 *
 * A guard that also blocks lawful edits is a lock that bricks the door. That
 * is not hypothetical here: a collaborator editing a guest's dietary
 * requirement or moving them to another table is the ordinary use of the
 * endpoint this guard sits in. Asserting only "protected fields are removed"
 * would pass for a function that returned {} and broke every one of those.
 *
 * So the DENY half and the ADMIT half are separate assertions, the admit half
 * checks lawful fields individually rather than by count, and the over-strip
 * mutation is expected to fail exactly one of them.
 */

import { pass, fail } from './_shared.mjs';
import {
  PROTECTED_FIELDS, PII_FIELDS, BLOB_FIELD, stripProtectedFields,
} from '../../api/_lib/guestProtectedFields.js';
import { TOKEN_FIELDS } from '../../api/_lib/rsvpTokenCrypto.js';

export async function runGuestProtectedFields() {
  const results = [];

  // Ordinary edits a collaborator or the couple legitimately makes. Named
  // explicitly rather than generated, so a regression names the feature it
  // broke.
  //
  // NOTE ON dietary_restrictions — a real conflict, resolved deliberately.
  // It is one of the ten PII fields (allergy data is health-adjacent), so it
  // belongs in encrypted_guest_pii and CANNOT be settable through a
  // passthrough that has no way to rewrite the blob. It is also a legitimate,
  // ordinary edit. Both are true, and the resolution is not to weaken the
  // guard: the field stays protected HERE, and editing it stays possible
  // through the PII-aware write path (Track C/D). A passthrough that accepted
  // it would write plaintext beside a stale ciphertext — the exact failure
  // this guard exists to prevent. Asserted below as REFUSED, with the
  // product obligation recorded rather than silently traded away.
  const LAWFUL = {
    table_assignment: 'Table 7',            // seating
    category: 'family',                     // relationship
    tags: ['college friends'],
    rsvp_status: 'attending',
    meal_choice: 'beef',
    plus_one: true,
    plus_one_rsvp: 'attending',
    plus_one_meal_choice: 'fish',
    seating_preferences: ['g1', 'g2'],
    seating_avoid: ['g3'],
    event_responses: [{ event: 'ceremony', response: 'yes' }],
    invitation_sent: true,
    invite_channel: 'email',
    interests: ['hiking'],
    profile_picture_url: 'https://example.com/a.jpg',
    song_request: 'something danceable',    // dead field, but still not protected
    rsvp_note: 'cannot wait',               // ditto
  };

  const mixed = { ...LAWFUL, ...Object.fromEntries(PROTECTED_FIELDS.map(f => [f, 'SHOULD-BE-REFUSED'])) };
  const { updates: out, stripped } = stripProtectedFields(mixed);

  // ── ADMIT ────────────────────────────────────────────────────────────────
  const lost = Object.keys(LAWFUL).filter(k => JSON.stringify(out[k]) !== JSON.stringify(LAWFUL[k]));
  results.push(lost.length === 0
    ? pass('guest protected fields — every lawful edit survives (ADMIT)', `${Object.keys(LAWFUL).length} fields preserved exactly`)
    : fail('guest protected fields — every lawful edit survives (ADMIT)', 'all preserved', `dropped: ${lost.join(', ')}`));

  for (const named of ['table_assignment', 'category']) {
    results.push(out[named] === LAWFUL[named]
      ? pass(`guest protected fields — "${named}" edit still works`, JSON.stringify(out[named]))
      : fail(`guest protected fields — "${named}" edit still works`, LAWFUL[named], JSON.stringify(out[named])));
  }

  results.push(Object.keys(out).length === Object.keys(LAWFUL).length
    ? pass('guest protected fields — result is the lawful input, not an empty object', `${Object.keys(out).length} fields`)
    : fail('guest protected fields — result is the lawful input, not an empty object',
           String(Object.keys(LAWFUL).length), String(Object.keys(out).length)));

  // ── DENY ─────────────────────────────────────────────────────────────────
  const leaked = PROTECTED_FIELDS.filter(f => f in out);
  results.push(leaked.length === 0
    ? pass('guest protected fields — every protected field is refused (DENY)', `${PROTECTED_FIELDS.length} refused`)
    : fail('guest protected fields — every protected field is refused (DENY)', 'none present', leaked.join(', ')));

  // dietary_restrictions specifically: refused here, and that is correct.
  results.push(!('dietary_restrictions' in out) && stripped.includes('dietary_restrictions')
    ? pass('guest protected fields — "dietary_restrictions" is REFUSED by the passthrough (PII, blob-bound)', 'refused — edit it via the PII-aware path')
    : fail('guest protected fields — "dietary_restrictions" is REFUSED by the passthrough (PII, blob-bound)', 'refused', 'accepted — would write plaintext beside a stale blob'));

  results.push(stripped.length === PROTECTED_FIELDS.length
    ? pass('guest protected fields — the refusal is reported to the caller for logging', `${stripped.length} named`)
    : fail('guest protected fields — the refusal is reported to the caller for logging',
           String(PROTECTED_FIELDS.length), String(stripped.length)));

  // ── the list itself ──────────────────────────────────────────────────────
  results.push(PII_FIELDS.length === 10
    ? pass('guest protected fields — all ten PII fields are listed', PII_FIELDS.join(', '))
    : fail('guest protected fields — all ten PII fields are listed', '10', String(PII_FIELDS.length)));

  const coversTokens = TOKEN_FIELDS.every(f => PROTECTED_FIELDS.includes(f));
  results.push(coversTokens
    ? pass('guest protected fields — token fields are still covered after widening', `${TOKEN_FIELDS.length} token fields`)
    : fail('guest protected fields — token fields are still covered after widening', 'all', 'a token field was dropped'));

  results.push(PROTECTED_FIELDS.includes(BLOB_FIELD)
    ? pass('guest protected fields — the blob itself is not settable by a caller', BLOB_FIELD)
    : fail('guest protected fields — the blob itself is not settable by a caller', BLOB_FIELD, 'missing'));

  // ── hygiene ──────────────────────────────────────────────────────────────
  results.push(mixed.name === 'SHOULD-BE-REFUSED'
    ? pass('guest protected fields — input object is not mutated', 'caller copy intact')
    : fail('guest protected fields — input object is not mutated', 'intact', 'mutated'));

  let safe = true;
  try { stripProtectedFields(undefined); stripProtectedFields(null); } catch { safe = false; }
  results.push(safe
    ? pass('guest protected fields — null/undefined input does not throw', 'safe')
    : fail('guest protected fields — null/undefined input does not throw', 'safe', 'threw'));

  return results;
}
