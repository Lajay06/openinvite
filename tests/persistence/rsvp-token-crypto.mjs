/**
 * tests/persistence/rsvp-token-crypto.mjs
 *
 * Track E step 2 — the token transforms and the dual-write invariant.
 *
 * These run offline against a fixed test key, so they pin the CONSTRUCTION
 * rather than any stored data. The properties that matter:
 *
 *   - hashing is deterministic (or resolveGuestByToken finds nothing)
 *   - encryption round-trips exactly (or a recovered link is wrong, silently)
 *   - NO SHAPE ASSUMPTIONS — one live token is a 27-character legacy value,
 *     not a uuid, and anything that validated a uuid would strand that guest
 *     permanently once E3 nulls the plaintext column
 *   - a token is never written without its hash AND ciphertext
 */

import { pass, fail } from './_shared.mjs';

const FIXED_KEY = 'test-key-for-construction-pinning-only';

export async function runRsvpTokenCrypto() {
  const results = [];
  const prev = process.env.RSVP_TOKEN_KEY;
  process.env.RSVP_TOKEN_KEY = FIXED_KEY;
  // Imported after the env is set — the module reads the key at import time.
  const mod = await import(`../../api/_lib/rsvpTokenCrypto.js?t=${Date.now()}`);
  const { hashToken, encryptToken, decryptToken, tokenPatch } = mod;

  // The real shapes in production today: 201 uuidv4 and one 27-char legacy.
  const UUID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
  const LEGACY_27 = 'abc123def456ghi789jkl012mno';
  const ODD = 'a';                    // single char
  const UNICODE = 'tok-Ω-é-🎉-end';    // non-ascii, multi-byte

  for (const [label, tok] of [['uuidv4', UUID], ['27-char legacy', LEGACY_27], ['1-char', ODD], ['unicode', UNICODE]]) {
    const h1 = hashToken(tok), h2 = hashToken(tok);
    results.push(h1 && h1 === h2 && /^[0-9a-f]{64}$/.test(h1)
      ? pass(`rsvp token — hash is deterministic and hex-64 (${label})`, h1.slice(0, 12) + '…')
      : fail(`rsvp token — hash is deterministic and hex-64 (${label})`, 'stable 64-hex', String(h1).slice(0, 20)));

    const round = decryptToken(encryptToken(tok));
    results.push(round === tok
      ? pass(`rsvp token — ciphertext round-trips exactly (${label})`, `${tok.length} chars`)
      : fail(`rsvp token — ciphertext round-trips exactly (${label})`, tok, String(round)));
  }

  // Distinct tokens must not collide.
  results.push(hashToken(UUID) !== hashToken(LEGACY_27)
    ? pass('rsvp token — distinct tokens hash differently', 'no collision')
    : fail('rsvp token — distinct tokens hash differently', 'different', 'collision'));

  // Ciphertext must be non-deterministic (random iv) — otherwise equal tokens
  // are identifiable across rows by an unscoped lister.
  results.push(encryptToken(UUID) !== encryptToken(UUID)
    ? pass('rsvp token — ciphertext differs per call (random iv)', 'non-deterministic')
    : fail('rsvp token — ciphertext differs per call (random iv)', 'different blobs', 'identical'));

  // A corrupt blob must return null, never throw — one bad row must not fail a
  // whole bulk copy-links.
  let threw = false;
  let corrupt;
  try { corrupt = decryptToken('not-valid-base64-@@@'); } catch { threw = true; }
  results.push(!threw && corrupt === null
    ? pass('rsvp token — corrupt ciphertext returns null, never throws', 'null')
    : fail('rsvp token — corrupt ciphertext returns null, never throws', 'null', threw ? 'threw' : String(corrupt)));

  // Empty input is null-safe on every transform.
  results.push(hashToken('') === null && encryptToken('') === null && decryptToken('') === null
    ? pass('rsvp token — empty input is null-safe on all three transforms', 'null')
    : fail('rsvp token — empty input is null-safe on all three transforms', 'null', 'non-null'));

  // THE DUAL-WRITE INVARIANT: a token is never written alone.
  for (const [label, isPlusOne, prefix] of [['primary', false, 'rsvp_link_id'], ['plus-one', true, 'plus_one_rsvp_link_id']]) {
    const patch = tokenPatch(UUID, isPlusOne);
    const complete = patch[prefix] === UUID
      && typeof patch[`${prefix}_hash`] === 'string'
      && typeof patch[`${prefix}_enc`] === 'string'
      && Object.keys(patch).length === 3;
    results.push(complete
      ? pass(`rsvp token — tokenPatch writes plaintext + hash + enc together (${label})`, Object.keys(patch).join(', '))
      : fail(`rsvp token — tokenPatch writes plaintext + hash + enc together (${label})`, '3 fields', JSON.stringify(Object.keys(patch))));
  }

  // The hash in a patch must be the same one a lookup will compute.
  const patch = tokenPatch(LEGACY_27, false);
  results.push(patch.rsvp_link_id_hash === hashToken(LEGACY_27)
    ? pass('rsvp token — patch hash matches the lookup hash (legacy token)', 'match')
    : fail('rsvp token — patch hash matches the lookup hash (legacy token)', 'match', 'MISMATCH — lookups would miss'));

  // And the patch's ciphertext must recover the same token.
  results.push(decryptToken(patch.rsvp_link_id_enc) === LEGACY_27
    ? pass('rsvp token — patch ciphertext recovers the original (legacy token)', 'recovered')
    : fail('rsvp token — patch ciphertext recovers the original (legacy token)', LEGACY_27, 'mismatch'));

  // ── THE ADMIT PATH for the collaborator forwarding guard ─────────────────
  //
  // A guard that also blocks lawful edits is worse than no guard: it is a lock
  // that bricks the door. Asserting only "token fields are removed" would pass
  // for a function that returned {} — so both halves are pinned, and the
  // lawful half is asserted field by field rather than by count.
  const { stripTokenFields, TOKEN_FIELDS } = mod;

  const lawful = {
    dietary_restrictions: 'vegan',
    table_assignment: 'Table 4',
    notes: 'allergic to shellfish',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '0400 000 000',
    tags: ['college friends'],
    category: 'family',
    rsvp_status: 'attending',
    meal_choice: 'beef',
    plus_one: true,
    plus_one_name: 'Charles',
    seating_preferences: ['g1', 'g2'],
    event_responses: [{ event: 'ceremony', response: 'yes' }],
    invitation_sent: true,
  };
  const mixed = { ...lawful, ...Object.fromEntries(TOKEN_FIELDS.map(f => [f, 'SHOULD-BE-STRIPPED'])) };
  const out = stripTokenFields(mixed);

  const survivors = Object.keys(lawful).filter(k => JSON.stringify(out[k]) === JSON.stringify(lawful[k]));
  results.push(survivors.length === Object.keys(lawful).length
    ? pass('collaborator guard — every lawful field survives the strip (ADMIT path)', `${survivors.length}/${Object.keys(lawful).length} preserved exactly`)
    : fail('collaborator guard — every lawful field survives the strip (ADMIT path)', 'all preserved',
           `dropped: ${Object.keys(lawful).filter(k => !survivors.includes(k)).join(', ')}`));

  const leaked = TOKEN_FIELDS.filter(f => f in out);
  results.push(leaked.length === 0
    ? pass('collaborator guard — every token field is removed (DENY path)', `${TOKEN_FIELDS.length} stripped`)
    : fail('collaborator guard — every token field is removed (DENY path)', 'none present', leaked.join(', ')));

  // A strip that returned {} would satisfy the deny half alone — pin that the
  // result is genuinely non-empty and shaped like the lawful input.
  results.push(Object.keys(out).length === Object.keys(lawful).length
    ? pass('collaborator guard — result is the lawful input exactly, not an empty object', `${Object.keys(out).length} fields`)
    : fail('collaborator guard — result is the lawful input exactly, not an empty object', String(Object.keys(lawful).length), String(Object.keys(out).length)));

  // Input must not be mutated — the caller may still need the original.
  results.push(mixed.rsvp_link_id === 'SHOULD-BE-STRIPPED'
    ? pass('collaborator guard — input object is not mutated', 'caller copy intact')
    : fail('collaborator guard — input object is not mutated', 'intact', 'mutated'));

  // Null/undefined input must not throw.
  let safe = true;
  try { stripTokenFields(undefined); stripTokenFields(null); } catch { safe = false; }
  results.push(safe
    ? pass('collaborator guard — null/undefined input does not throw', 'safe')
    : fail('collaborator guard — null/undefined input does not throw', 'safe', 'threw'));

  if (prev === undefined) delete process.env.RSVP_TOKEN_KEY; else process.env.RSVP_TOKEN_KEY = prev;
  return results;
}
