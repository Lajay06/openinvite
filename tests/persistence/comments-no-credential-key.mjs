/**
 * tests/persistence/comments-no-credential-key.mjs
 *
 * NO COMMENT MAY SAY THE ADMIN CREDENTIAL IS A CRYPTO KEY.
 *
 * Owner ruling 2026-10-14. The schema descriptions were corrected first
 * (tests/persistence/mirror-names-no-credential.mjs); this is the same claim
 * one layer in, in the source comments the descriptions were written from.
 *
 * ── WHY COMMENTS, AND NOT JUST THE CODE ───────────────────────────────────
 *
 * The code has been right since #1012 and #1054. The comments were not, and a
 * comment is what a person reads before they write a schema description, a
 * runbook, or the next module. api/_lib/guestPii.js said "deliberately the
 * admin key and not a dedicated secret", and that exact sentence is what
 * Base44's Guest.encrypted_guest_pii description said too, because someone
 * read the comment and wrote it down. Wrong prose propagates; it does not sit
 * still.
 *
 * ── WHY A NAMED ALLOWLIST AND NOT A CLEVER RULE ───────────────────────────
 *
 * Six comments legitimately put the credential next to a crypto word: they say
 * it is NOT the key, or that it USED TO BE before the rotation. The first
 * draft of this guard tried to tell those apart with a negation/history
 * marker in a three-line window, and it exempted four comments that were
 * plainly wrong, because an unrelated "not" or "never" happened to sit
 * nearby. api/_lib/rsvpTokenCrypto.js said "questionnaireCrypto derives
 * everything from BASE44_ADMIN_KEY" and passed, on the strength of a "Not
 * style" two lines above it.
 *
 * So the six are named, with the phrase each one depends on. If a legitimate
 * comment is ever rewritten into an assertion, its phrase goes and this fails:
 * the allowance is asserted to still be earned, not merely granted. Same
 * construction as the carve-outs in app-key-sourcing.mjs, for the same reason.
 */

import { pass, fail } from './_shared.mjs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(new URL('../../', import.meta.url).pathname);

const CREDENTIAL = /BASE44_ADMIN_KEY/;
const CRYPTO = /\b(hash|hashing|HMAC|encrypt|encrypting|encrypted|decrypt|decrypting|cipher|ciphertext|keyed|derive[ds]?|derivation)\b/i;

/**
 * THE SIX, each with the phrase that earns it. The phrase is what makes the
 * sentence a denial or a history rather than a claim; lose it and the
 * allowance lapses on its own.
 */
const ALLOWED = new Map([
  ['api/_lib/appKeys.js', { phrase: 'was rotated', why: 'the incident itself, in the module written to prevent it' }],
  ['api/_lib/collaboratorAuth.js', { phrase: 'is a bearer', why: 'states the rule: a bearer credential, never a hashing key' }],
  ['api/_lib/giftDrafts.js', { phrase: 'Never BASE44_ADMIN_KEY', why: 'rules the credential out explicitly' }],
  ['api/_lib/giftTokens.js', { phrase: 'never a hashing key', why: 'rules the credential out explicitly' }],
  ['api/_lib/questionnaireCrypto.js', { phrase: 'used to be', why: 'history: what the rotation destroyed' }],
  ['api/_lib/rsvpTokenCrypto.js', { phrase: 'when this was written', why: 'history: why this module kept its own key' }],
]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules') continue;
    const f = join(dir, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (/\.(js|jsx|mjs)$/.test(e)) out.push(f);
  }
  return out;
}

/** Comment lines naming the credential within reach of a crypto word. */
export function credentialCryptoComments(source) {
  const lines = String(source || '').split('\n');
  const hits = [];
  lines.forEach((l, i) => {
    if (!/^\s*(\/\/|\*|\/\*)/.test(l)) return;
    if (!CREDENTIAL.test(l)) return;
    const window = `${lines[i - 1] || ''} ${l} ${lines[i + 1] || ''}`;
    if (!CRYPTO.test(window)) return;
    hits.push({ line: i + 1, text: l.trim(), window });
  });
  return hits;
}

export async function runCommentsNoCredentialKey() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  console.log('\n  No comment says the admin credential is a crypto key:\n');

  const files = [...walk(join(ROOT, 'api')), ...walk(join(ROOT, 'src'))];
  ok('there are source files to scan', files.length > 100, `${files.length} file(s)`);

  const offenders = [];
  let hitCount = 0;
  for (const f of files) {
    const rel = relative(ROOT, f);
    const hits = credentialCryptoComments(readFileSync(f, 'utf8'));
    hitCount += hits.length;
    const allowed = ALLOWED.get(rel);
    for (const h of hits) {
      if (allowed && h.window.includes(allowed.phrase)) continue;
      offenders.push(`${rel}:${h.line} ${h.text.slice(0, 70)}`);
    }
  }

  ok('no comment names the credential as a hashing or encryption key',
     offenders.length === 0,
     offenders.length ? offenders.join(' | ') : `${hitCount} allowed mention(s), ${files.length} files scanned`);

  // EVERY ALLOWANCE MUST STILL BE EARNED. If one of the six is rewritten into
  // a plain claim, its phrase goes and this fails before the check above does.
  for (const [file, { phrase, why }] of ALLOWED) {
    const src = readFileSync(join(ROOT, file), 'utf8');
    const hits = credentialCryptoComments(src);
    ok(`  ${file} still earns its allowance`,
       hits.length > 0 && hits.every((h) => h.window.includes(phrase)),
       why);
  }

  // ── THE CHECK CAN FAIL ───────────────────────────────────────────────────
  ok('a comment claiming the credential is the key is caught',
     credentialCryptoComments(' * Key is derived from BASE44_ADMIN_KEY, a server-only secret.').length === 1,
     'caught');
  ok('  a comment that only mentions it as a bearer token is not',
     credentialCryptoComments(' * Env: BASE44_ADMIN_KEY (the rows are read through it).').length === 0,
     'bearer use is not a key schedule');
  ok('  and code is not a comment',
     credentialCryptoComments("const k = process.env.BASE44_ADMIN_KEY;\ncrypto.createHmac('sha256', k);").length === 0,
     'app-key-sourcing.mjs owns the code side');

  return results;
}
