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
 *
 * SCOPE IS THE WHOLE api/ TREE since 2026-10-14, and the carve-out list is
 * empty: giftAuth.js, the last entry, was fixed in the same change.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(new URL('../../', import.meta.url).pathname);
const API_DIR = join(ROOT, 'api');

/** Every .js file under api/, at any depth. House style, as cors-allow-list.mjs. */
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules') continue;
    const f = join(dir, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (/\.js$/.test(e)) out.push(f);
  }
  return out;
}

/**
 * THE CARVE-OUTS ARE NAMED, with a reason each, so a fourth cannot join
 * quietly. Both conditions are temporary and belong to someone else's lane:
 * when either clears, its line is deleted and the guard tightens by itself.
 */
const EXEMPT = new Map([
  // EMPTY, AND IT STAYS THAT WAY UNLESS SOMEONE EARNS AN ENTRY. Keys are
  // repo-relative paths, not basenames, because this now scans a whole tree
  // and two files may share a name.
  //
  // giftAuth.js was the last entry, carved out because it sat inside the
  // payments freeze. The fix of 2026-10-14 moved it onto appKeys.js, this
  // guard went red on its own 'still needs its carve-out' assertion, and the
  // only correct response was deleting the line. collaboratorAuth.js and
  // collaboratorInviteToken.js left the same way when #1011 moved them onto
  // COLLAB_HASH_KEY. An exemption nobody has to re-earn becomes a hole that
  // reads like a decision.
]);

const CREDENTIAL = /process\.env\.BASE44_ADMIN_KEY/;

/**
 * THE CREDENTIAL MUST REACH A KEY POSITION, not merely share a file.
 *
 * The first version of this check asked only whether a file mentioned the
 * credential AND called a crypto constructor anywhere. That held while the
 * scan was api/_lib/ alone, because a helper rarely does both. It breaks the
 * moment the scan covers routes: api/collaborator-suggestions.js
 * authenticates with the admin key as a BEARER TOKEN and separately encrypts
 * under APP_ENC_KEY, which is exactly right, and the old predicate called it
 * an offender. A guard that condemns correct code teaches people to carve out
 * exemptions, which is how the hole this file exists to close got dug.
 *
 * So: collect the identifiers the credential is bound to (one hop, so a
 * derived value counts too), then look only at the places a key actually goes
 * \u2014 the second argument of createHmac/createCipheriv/createDecipheriv, and
 * whatever is fed to .update() on a createHash chain, which is the
 * SHA-256-to-32-bytes derivation giftAuth.js used.
 */
function credentialAliases(src) {
  const names = new Set();
  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*)/g)) {
    if (CREDENTIAL.test(m[2])) names.add(m[1]);
  }
  return names;
}

function mentionsCredential(expr, aliases) {
  if (CREDENTIAL.test(expr)) return true;
  for (const n of aliases) if (new RegExp(`\\b${n}\\b`).test(expr)) return true;
  return false;
}

export function derivesKeyFromCredential(source) {
  const src = stripComments(String(source || ''));
  if (!CREDENTIAL.test(src)) return false;
  const aliases = credentialAliases(src);

  // The key argument: createHmac(alg, KEY), create(De)cipheriv(alg, KEY, iv).
  for (const m of src.matchAll(/create(?:Hmac|Cipheriv|Decipheriv)\s*\(([^)]*)\)/g)) {
    const args = m[1].split(',');
    if (args.length >= 2 && mentionsCredential(args[1], aliases)) return true;
  }
  // The derivation: createHash(...).update(KEY).
  for (const m of src.matchAll(/createHash\s*\([^)]*\)\s*\.update\s*\(([^)]*)\)/g)) {
    if (mentionsCredential(m[1], aliases)) return true;
  }
  return false;
}

export async function runAppKeySourcing() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── 1. THE REPO IS IN STEP ──────────────────────────────────────────────
  // THE WHOLE api/ TREE, not api/_lib/ alone. The narrow scan was the shape of
  // the problem rather than a decision: every offender so far happened to be a
  // helper, so a route that keyed its own HMAC on the credential would have
  // walked straight past it. Owner ruling 2026-10-14, with the giftAuth.js fix.
  const files = walk(API_DIR).map((f) => relative(ROOT, f)).sort();
  const offenders = files.filter(
    (f) => !EXEMPT.has(f) && derivesKeyFromCredential(readFileSync(join(ROOT, f), 'utf8')),
  );
  ok('no file under api/ derives a key from BASE44_ADMIN_KEY',
     offenders.length === 0,
     offenders.length ? offenders.join(', ') : `${files.length} files scanned, ${EXEMPT.size} carved out`);

  // AND THE SCAN ACTUALLY REACHES PAST api/_lib/, or widening it proved
  // nothing: a walk that silently returned one directory would pass this file
  // while checking a fraction of the tree.
  ok('  and the scan reaches the routes and the crons, not just api/_lib',
     files.some((f) => f.startsWith('api/webhooks/'))
       && files.some((f) => f.startsWith('api/cron/'))
       && files.some((f) => /^api\/[^/]+\.js$/.test(f)),
     `${files.filter((f) => f.startsWith('api/_lib/')).length} in api/_lib, ${files.length} in all`);

  // THE EMPTY CARVE-OUT LIST IS ASSERTED, NOT ASSUMED. With no entries the
  // loop below iterates nothing, and a guard whose only statement is a loop
  // over nothing passes while checking nothing.
  ok('  and nothing is carved out', EXEMPT.size === 0, `${EXEMPT.size} carve-outs`);

  // EVERY CARVE-OUT MUST STILL NEED ONE. A stale exemption is a hole that
  // reads as a decision, so each is checked to still derive a key: when one is
  // fixed, this fails and the line gets deleted.
  for (const [f, reason] of EXEMPT) {
    const src = readFileSync(join(ROOT, f), 'utf8');
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

  // THE CASE THAT WIDENING THE SCAN BROKE, and the reason the predicate now
  // follows the value instead of counting mentions. A route that bearer-auths
  // with the admin key AND encrypts under APP_ENC_KEY does both in one file,
  // correctly, and the old predicate condemned it. This is
  // api/collaborator-suggestions.js reduced to three lines.
  ok('  a route that bearer-auths AND encrypts correctly is not an offender',
     !derivesKeyFromCredential(
       'const k = process.env.BASE44_ADMIN_KEY;\n'
       + 'await base44(path, k);\n'
       + "crypto.createCipheriv('aes-256-gcm', encKey(), iv);",
     ),
     'a bearer token beside a correct cipher is two right answers');

  // AND IT IS CAUGHT ONE HOP OUT, so a helper wrapped around the credential
  // cannot launder it past the check.
  ok('  a key derived from the credential through a helper is still caught',
     derivesKeyFromCredential(
       'const K = sha256(process.env.BASE44_ADMIN_KEY);\n'
       + "crypto.createCipheriv('aes-256-gcm', K, iv);",
     ),
     'one hop is still a derivation');

  // THE PLANT IS THE REAL CONSTRUCTION, copied from api/_lib/giftAuth.js as
  // it stood before 2026-10-14, so this asserts the check catches the exact
  // shape it was built for rather than a convenient paraphrase.
  //
  // Copied, not read from git: CI checks out shallow, so a guard that shelled
  // out for an old commit would pass locally and flake in the one place it
  // has to work.
  const PRE_FIX_GIFTAUTH = [
    "const ADMIN_KEY = process.env.BASE44_ADMIN_KEY || '';",
    "const ENC_KEY = crypto.createHash('sha256').update(ADMIN_KEY).digest();",
    "crypto.createHmac('sha256', ADMIN_KEY).update(String(rawValue)).digest('hex');",
    "crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);",
  ].join('\n');
  ok('  and the pre-fix giftAuth.js construction is caught',
     derivesKeyFromCredential(PRE_FIX_GIFTAUTH), 'the historical offender');

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
