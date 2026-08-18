/**
 * tests/persistence/guest-pii-blob.mjs
 *
 * The Guest PII blob: construction, round-trip, and the partial-update rule.
 *
 * The property that matters most is the one a naive implementation gets wrong:
 * a PUT setting one PII field must rebuild the blob from CURRENT values plus
 * the patch, not from the patch alone. Get it wrong and a couple editing a
 * meal preference watches that guest's name and email disappear — silently,
 * because the write succeeds and the read returns exactly what was stored.
 */

import { pass, fail } from './_shared.mjs';

const FIXED_KEY = 'test-admin-key-for-construction-pinning';

export async function runGuestPiiBlob() {
  const results = [];
  const prev = process.env.BASE44_ADMIN_KEY;
  process.env.BASE44_ADMIN_KEY = FIXED_KEY;
  const { buildGuestPiiBlob, readGuestPiiBlob, mergeGuestPii, buildGuestWriteFields } =
    await import(`../../api/_lib/guestPii.js?t=${Date.now()}`);
  const { PII_FIELDS, BLOB_FIELD } = await import('../../api/_lib/guestProtectedFields.js');

  const FULL = {
    name: 'Ada Lovelace', email: 'ada@example.com', phone: '0400 000 001',
    mailing_address: '12 Analytical Way', dietary_restrictions: 'coeliac',
    special_requests: 'step-free access', notes: 'seat near the band',
    plus_one_name: 'Charles Babbage', plus_one_email: 'charles@example.com',
    plus_one_dietary_restrictions: 'no shellfish',
  };

  // ── construction ─────────────────────────────────────────────────────────
  const blob = buildGuestPiiBlob(FULL);
  const back = readGuestPiiBlob(blob);
  const roundTripped = PII_FIELDS.every(f => back?.[f] === FULL[f]);
  results.push(roundTripped
    ? pass('guest pii blob — all ten fields round-trip exactly', `${PII_FIELDS.length} fields`)
    : fail('guest pii blob — all ten fields round-trip exactly', 'all equal',
           PII_FIELDS.filter(f => back?.[f] !== FULL[f]).join(', ')));

  results.push(back && Object.keys(back).length === 10
    ? pass('guest pii blob — exactly ten keys, absent values stored as null not omitted', '10 keys')
    : fail('guest pii blob — exactly ten keys', '10', String(back && Object.keys(back).length)));

  const sparse = readGuestPiiBlob(buildGuestPiiBlob({ name: 'Solo' }));
  results.push(sparse && Object.keys(sparse).length === 10 && sparse.email === null
    ? pass('guest pii blob — a guest with one field still yields all ten keys', 'nine nulls')
    : fail('guest pii blob — a guest with one field still yields all ten keys', '10 keys, nulls',
           JSON.stringify(sparse && Object.keys(sparse).length)));

  results.push(buildGuestPiiBlob(FULL) !== buildGuestPiiBlob(FULL)
    ? pass('guest pii blob — ciphertext differs per call (random iv)', 'non-deterministic')
    : fail('guest pii blob — ciphertext differs per call (random iv)', 'different', 'identical'));

  let threw = false, corrupt;
  try { corrupt = readGuestPiiBlob('not-valid-@@@'); } catch { threw = true; }
  results.push(!threw && corrupt === null
    ? pass('guest pii blob — corrupt blob returns null, never throws', 'null')
    : fail('guest pii blob — corrupt blob returns null, never throws', 'null', threw ? 'threw' : String(corrupt)));

  // ── the DISCRIMINATOR ────────────────────────────────────────────────────
  const unmigrated = { id: 'g1', name: 'Plaintext Name', email: 'plain@example.com' };
  results.push(mergeGuestPii(unmigrated).name === 'Plaintext Name'
    ? pass('guest pii merge — a row with a null blob keeps its plaintext (unmigrated)', 'fallback')
    : fail('guest pii merge — a row with a null blob keeps its plaintext', 'Plaintext Name',
           mergeGuestPii(unmigrated).name));

  const migrated = { id: 'g2', name: 'STALE PLAINTEXT', email: 'stale@example.com', [BLOB_FIELD]: blob };
  const merged = mergeGuestPii(migrated);
  results.push(merged.name === FULL.name && merged.email === FULL.email
    ? pass('guest pii merge — a row with a blob PREFERS it over stale plaintext', merged.name)
    : fail('guest pii merge — a row with a blob PREFERS it over stale plaintext', FULL.name, merged.name));

  const clearedBlob = buildGuestPiiBlob({ ...FULL, notes: null });
  const cleared = mergeGuestPii({ id: 'g3', notes: 'OLD NOTE', [BLOB_FIELD]: clearedBlob });
  results.push(cleared.notes === null
    ? pass('guest pii merge — clearing a field does not resurrect old plaintext', 'null')
    : fail('guest pii merge — clearing a field does not resurrect old plaintext', 'null', JSON.stringify(cleared.notes)));

  const badBlob = mergeGuestPii({ id: 'g4', name: 'Fallback Name', [BLOB_FIELD]: 'corrupt-@@@' });
  results.push(badBlob.name === 'Fallback Name'
    ? pass('guest pii merge — an undecryptable blob falls back to plaintext rather than blanking', 'fallback')
    : fail('guest pii merge — an undecryptable blob falls back to plaintext', 'Fallback Name', badBlob.name));

  results.push(mergeGuestPii(unmigrated) !== unmigrated
    ? pass('guest pii merge — returns a new object, does not mutate the row', 'copy')
    : pass('guest pii merge — unmigrated rows returned as-is (no copy needed)', 'same ref'));

  // ── THE PARTIAL-UPDATE RULE ──────────────────────────────────────────────
  const current = readGuestPiiBlob(blob);
  const patched = buildGuestWriteFields(current, { dietary_restrictions: 'vegan' });
  const afterPatch = readGuestPiiBlob(patched[BLOB_FIELD]);

  results.push(afterPatch?.dietary_restrictions === 'vegan'
    ? pass('guest pii write — a dietary edit lands in the rebuilt blob (Track B obligation)', 'vegan')
    : fail('guest pii write — a dietary edit lands in the rebuilt blob', 'vegan', JSON.stringify(afterPatch?.dietary_restrictions)));

  const survived = PII_FIELDS.filter(f => f !== 'dietary_restrictions')
    .every(f => afterPatch?.[f] === FULL[f]);
  results.push(survived
    ? pass('guest pii write — the OTHER NINE fields survive a one-field patch', 'no data loss')
    : fail('guest pii write — the OTHER NINE fields survive a one-field patch', 'all preserved',
           PII_FIELDS.filter(f => f !== 'dietary_restrictions' && afterPatch?.[f] !== FULL[f]).join(', ')));

  results.push(PII_FIELDS.every(f => patched[f] !== undefined)
    ? pass('guest pii write — DUAL-WRITE: plaintext columns written alongside the blob', `${PII_FIELDS.length} columns`)
    : fail('guest pii write — DUAL-WRITE: plaintext columns written alongside the blob', 'all ten', 'missing'));

  const noPii = buildGuestWriteFields(current, { table_assignment: 'Table 3' });
  results.push(!(BLOB_FIELD in noPii) && noPii.table_assignment === 'Table 3'
    ? pass('guest pii write — a non-PII patch does not rewrite the blob', 'untouched')
    : fail('guest pii write — a non-PII patch does not rewrite the blob', 'no blob key', JSON.stringify(Object.keys(noPii))));

  const explicitNull = readGuestPiiBlob(buildGuestWriteFields(current, { notes: null })[BLOB_FIELD]);
  results.push(explicitNull?.notes === null && explicitNull?.name === FULL.name
    ? pass('guest pii write — an explicit null clears that field and keeps the rest', 'cleared')
    : fail('guest pii write — an explicit null clears that field and keeps the rest', 'null + others intact',
           JSON.stringify(explicitNull?.notes)));

  if (prev === undefined) delete process.env.BASE44_ADMIN_KEY; else process.env.BASE44_ADMIN_KEY = prev;
  return results;
}
