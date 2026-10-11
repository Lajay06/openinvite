/**
 * tests/persistence/app-key-sourcing.mjs
 *
 * NO MODULE DERIVES A HASH OR CIPHER KEY FROM A CREDENTIAL.
 *
 * Owner ruling 2026-10-11, after the BASE44_ADMIN_KEY rotation orphaned every
 * hash and killed every ciphertext in the app. The report that led to this
 * guard is in BASE44_PLATFORM_NOTES.md; the design is in api/_lib/appKeys.js.
 *
 * ── WHAT THIS CATCHES THAT A RULE DOES NOT ─────────────────────────────────
 *
 * The coupling was never a decision anyone defended. It spread by precedent:
 * pollAuth.js used the admin key because it was the server-only value to hand,
 * questionnaireCrypto.js copied pollAuth.js and said so in its header, giftAuth.js
 * copied that, and the two stop-token modules copied it again. Five modules, one
 * unexamined habit, and the cost arrived years later on an ordinary Tuesday
 * rotation. A sixth would have joined the same way.
 *
 * So the check is on the construction, not on anyone's intent: a file that reads
 * process.env.BASE44_ADMIN_KEY and also calls a crypto key function is refused,
 * unless it is one of the three NAMED carve-outs below. Comments are stripped
 * first, because four of those modules now discuss the admin key in prose while
 * correctly keying on APP_HASH_KEY, and a guard that cannot tell prose from code
 * would report them all red forever.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readdirSync, readFileSync } from 'node:fs';

const LIB = new URL('../../api/_lib/', import.meta.url);

/**
 * THE CARVE-OUTS ARE NAMED, with a reason each, so a fourth cannot join
 * quietly. Both conditions are temporary and belong to someone else's lane:
 * when either clears, its line is deleted and the guard tightens by itself.
 */
const EXEMPT = new Map([
  ['collaboratorAuth.js',
   'collaborator hashing stays with lane C by owner ruling 2026-10-11; same orphaning, different owner'],
  ['collaboratorInviteToken.js',
   'collaborator invite signing stays with lane C by owner ruling 2026-10-11'],
  ['giftAuth.js',
   'inside the payments freeze (scripts/check-payments-freeze.mjs FROZEN); needs the owner line and a Payments-Change trailer, so it is its own PR'],
]);

/** A file derives a key from the credential if, with comments gone, it does both. */
export function derivesKeyFromCredential(source) {
  const src = stripComments(String(source || ''));
  return /process\.env\.BASE44_ADMIN_KEY/.test(src)
    && /create(Hmac|Hash|Cipheriv|Decipheriv)\s*\(/.test(src);
}

export async function runAppKeySourcing() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── 1. THE REPO IS IN STEP ──────────────────────────────────────────────
  const files = readdirSync(LIB).filter((f) => f.endsWith('.js')).sort();
  const offenders = files.filter(
    (f) => !EXEMPT.has(f) && derivesKeyFromCredential(readFileSync(new URL(f, LIB), 'utf8')),
  );
  ok('no api/_lib module derives a key from BASE44_ADMIN_KEY',
     offenders.length === 0,
     offenders.length ? offenders.join(', ') : `${files.length} modules scanned, ${EXEMPT.size} carved out`);

  ok('  and the carve-outs are exactly the three the owner named',
     [...EXEMPT.keys()].sort().join(',')
       === 'collaboratorAuth.js,collaboratorInviteToken.js,giftAuth.js',
     [...EXEMPT.keys()].sort().join(','));

  // EVERY CARVE-OUT MUST STILL NEED ONE. A stale exemption is a hole that
  // reads as a decision, so each is checked to still derive a key: when one is
  // fixed, this fails and the line gets deleted.
  for (const [f, reason] of EXEMPT) {
    const src = readFileSync(new URL(f, LIB), 'utf8');
    ok(`  ${f} still needs its carve-out`, derivesKeyFromCredential(src), reason.slice(0, 60));
  }

  // ── 2. THE CHECK CAN FAIL, AND DOES NOT TRIP ON PROSE ───────────────────
  ok('a module that keys an HMAC on the credential is caught',
     derivesKeyFromCredential("const k = process.env.BASE44_ADMIN_KEY; crypto.createHmac('sha256', k);"),
     'caught');
  ok('  a module that only mentions it in a comment is not',
     !derivesKeyFromCredential("// was keyed on process.env.BASE44_ADMIN_KEY once\ncrypto.createHmac('sha256', hashKey());"),
     'prose is not code');
  ok('  and reading the credential for AUTH is not a derivation',
     !derivesKeyFromCredential("const key = process.env.BASE44_ADMIN_KEY;\nfetch(u, { headers: { Authorization: `Bearer ${key}` } });"),
     'a bearer header is not a key schedule');

  // ── 3. appKeys FAILS CLOSED, AND READS PER CALL ─────────────────────────
  const { hashKey, encKey, hmacHex, hmacB64Url, hasHashKey } = await import('../../api/_lib/appKeys.js');
  const priorHash = process.env.APP_HASH_KEY;
  const priorEnc = process.env.APP_ENC_KEY;
  const restore = () => {
    if (priorHash === undefined) delete process.env.APP_HASH_KEY; else process.env.APP_HASH_KEY = priorHash;
    if (priorEnc === undefined) delete process.env.APP_ENC_KEY; else process.env.APP_ENC_KEY = priorEnc;
  };

  try {
    const threw = (fn) => { try { fn(); return false; } catch { return true; } };

    delete process.env.APP_HASH_KEY;
    delete process.env.APP_ENC_KEY;
    ok('an unset APP_HASH_KEY throws rather than hashing under an empty key',
       threw(() => hmacHex('guest_1')), 'threw');
    ok('  and an unset APP_ENC_KEY throws rather than encrypting under one',
       threw(() => encKey()), 'threw');
    ok('  and a signer refuses too', threw(() => hmacB64Url('body')), 'threw');
    ok('  hasHashKey reports absence without throwing, for verifiers',
       hasHashKey() === false, 'false');

    process.env.APP_HASH_KEY = '';
    ok('  an EMPTY string is treated as unset, not as a key',
       threw(() => hmacHex('guest_1')), 'threw');

    // READ PER CALL: the same imported function must follow the environment.
    process.env.APP_HASH_KEY = 'fixture-hash-key-one';
    const first = hmacHex('guest_1');
    process.env.APP_HASH_KEY = 'fixture-hash-key-two';
    const second = hmacHex('guest_1');
    ok('the key is read per call, so the same import follows the environment',
       typeof first === 'string' && typeof second === 'string' && first !== second,
       'two keys, two digests');
    ok('  and it is stable for one key', hmacHex('guest_1') === second, 'stable');
    ok('  an absent VALUE is null, which is not the same as an absent key',
       hmacHex(null) === null && hmacHex('') === null && hmacHex(undefined) === null,
       'null');
    ok('  hashKey returns the value it was given', hashKey() === 'fixture-hash-key-two', 'read back');

    // ── 4. THE TWO KEYS ARE INDEPENDENT ──────────────────────────────────
    //
    // The whole point of the split: moving the hash key must not disturb the
    // cipher key, or a hash rotation silently destroys every payload again.
    process.env.APP_ENC_KEY = 'fixture-enc-key';
    const encBefore = encKey().toString('hex');
    process.env.APP_HASH_KEY = 'a-completely-different-hash-key';
    ok('changing APP_HASH_KEY does not move the cipher key',
       encKey().toString('hex') === encBefore, 'cipher key unmoved');
    process.env.APP_ENC_KEY = 'a-different-enc-key';
    ok('  and changing APP_ENC_KEY does move it',
       encKey().toString('hex') !== encBefore, 'cipher key moved');
    ok('  the cipher key is 32 bytes whatever the env var length',
       encKey().length === 32, '32 bytes');

    // ── 5. ROUND TRIP THROUGH THE REAL CALLERS ───────────────────────────
    process.env.APP_HASH_KEY = 'fixture-hash-key';
    process.env.APP_ENC_KEY = 'fixture-enc-key';
    const { hashId, encryptPayload, decryptPayload } = await import('../../api/_lib/questionnaireCrypto.js');
    const { hashGuestIdentifier } = await import('../../api/_lib/pollAuth.js');
    ok('questionnaireCrypto and pollAuth now share one construction',
       hashId('guest_1') === hashGuestIdentifier('guest_1'), 'same digest');
    const blob = encryptPayload({ answer: 'yes' });
    ok('  a payload still round-trips', decryptPayload(blob)?.answer === 'yes', 'round trip');

    // AND A PAYLOAD WRITTEN UNDER ANOTHER CIPHER KEY IS UNREADABLE, which is
    // the 216 rows of 2026-10-11 reproduced in one line.
    process.env.APP_ENC_KEY = 'the-key-that-was-rotated-away';
    let opened = true;
    try { decryptPayload(blob); } catch { opened = false; }
    ok('  and a payload from another cipher key cannot be opened',
       opened === false, 'unreadable, as the rotation proved');

    // ── 6. BOTH STOP-TOKEN SIGNERS FAIL CLOSED ───────────────────────────
    process.env.APP_HASH_KEY = 'fixture-hash-key';
    process.env.APP_ENC_KEY = 'fixture-enc-key';
    const stop = await import('../../api/_lib/stopEmailsToken.js');
    const guestStop = await import('../../api/_lib/guestStopToken.js');
    const t1 = stop.signStopToken('user_1');
    const t2 = guestStop.signGuestStopToken('guest_1');
    ok('a signed stop token verifies under the same key',
       stop.verifyStopToken(t1) === 'user_1' && guestStop.verifyGuestStopToken(t2) === 'guest_1',
       'both verify');

    delete process.env.APP_HASH_KEY;
    ok('  with no key, signing throws instead of minting a dead token',
       threw(() => stop.signStopToken('user_1')) && threw(() => guestStop.signGuestStopToken('guest_1')),
       'both throw');
    ok('  and verification answers null rather than accepting anything',
       stop.verifyStopToken(t1) === null && guestStop.verifyGuestStopToken(t2) === null,
       'both null');

    process.env.APP_HASH_KEY = 'a-different-key-entirely';
    ok('  a token from another key does not verify',
       stop.verifyStopToken(t1) === null && guestStop.verifyGuestStopToken(t2) === null,
       'both null');
  } finally {
    restore();
  }

  return results;
}
