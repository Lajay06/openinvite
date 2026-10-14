/**
 * tests/persistence/mirror-names-no-credential.mjs
 *
 * NO SCHEMA DESCRIPTION MAY NAME BASE44_ADMIN_KEY. NOT ONCE, NOT TO RULE IT OUT.
 *
 * Owner ruling 2026-10-14, at the end of a day that found the same mistake
 * three times.
 *
 * ── WHY THERE IS NO ALLOWANCE ─────────────────────────────────────────────
 *
 * The first draft of this guard had one: GiftDraft's two descriptions were
 * going to be exempt, because our mirror said "encrypted under APP_ENC_KEY
 * ... never BASE44_ADMIN_KEY", which names the credential only to rule it out.
 *
 * Then Base44's live copy turned out to read "Key derived from
 * BASE44_ADMIN_KEY" on the same two fields. There was no ruling-out mention to
 * exempt. The allowance existed to protect a sentence that only ever existed in
 * the mirror, while the real schema said the opposite, and an exemption written
 * from the wrong source would have hidden exactly the error it was carved
 * around.
 *
 * So: any mention at all, in any description, fails. If a future description
 * genuinely needs to discuss the credential, it says "the admin credential" and
 * this guard never has to decide whether that sentence was a warning or a
 * mistake.
 *
 * ── WHAT THIS DOES NOT CHECK ──────────────────────────────────────────────
 *
 * It does not call Base44. A guard that reached the network on every run would
 * fail on a flake and teach people to ignore it, and the mirror's agreement
 * with live is established when the mirror is written, not on every CI run.
 * This checks the one property that holds offline and forever: the credential's
 * name does not appear.
 */

import { pass, fail } from './_shared.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('../../', import.meta.url).pathname);
const DIR = join(ROOT, 'base44/entities');

const CREDENTIAL = /BASE44_ADMIN_KEY/;

/** Every description string in a .jsonc mirror, with its field path. */
export function descriptionsIn(source) {
  const out = [];
  const re = /"description"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  for (const m of source.matchAll(re)) {
    try { out.push(JSON.parse(`"${m[1]}"`)); } catch { out.push(m[1]); }
  }
  return out;
}

export async function runMirrorNamesNoCredential() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  console.log('\n  The schema mirror never names the admin credential:\n');

  const files = readdirSync(DIR).filter((f) => f.endsWith('.jsonc')).sort();
  ok('the mirror directory has files to check', files.length > 0, `${files.length} entity file(s)`);

  const offenders = [];
  let descriptions = 0;
  for (const f of files) {
    const src = readFileSync(join(DIR, f), 'utf8');
    for (const d of descriptionsIn(src)) {
      descriptions += 1;
      if (CREDENTIAL.test(d)) offenders.push(`${f}: ${d.slice(0, 60)}`);
    }
  }

  ok('no description names BASE44_ADMIN_KEY',
     offenders.length === 0,
     offenders.length ? offenders.join(' | ') : `${descriptions} description(s) across ${files.length} file(s)`);

  // AND IT READS THE WHOLE FILE, not just descriptions, because a comment in a
  // .jsonc mirror is read by the same people and carries the same claim.
  const inComments = files.filter((f) => CREDENTIAL.test(readFileSync(join(DIR, f), 'utf8')));
  ok('  and the credential is absent from the mirror files entirely',
     inComments.length === 0,
     inComments.join(', ') || 'absent');

  // ── THE CHECK CAN FAIL ───────────────────────────────────────────────────
  //
  // Both halves, because the second is the one that would silently pass if the
  // extractor stopped finding descriptions.
  ok('a description naming the credential is caught',
     descriptionsIn('{"description": "HMAC-SHA256(BASE44_ADMIN_KEY, x)"}').some((d) => CREDENTIAL.test(d)),
     'caught');
  ok('  a ruling-out mention is caught too, since there is no allowance',
     descriptionsIn('{"description": "under APP_ENC_KEY, never BASE44_ADMIN_KEY"}').some((d) => CREDENTIAL.test(d)),
     'no allowance');
  ok('  and a clean description is not',
     !descriptionsIn('{"description": "HMAC-SHA256(APP_HASH_KEY, x)"}').some((d) => CREDENTIAL.test(d)),
     'clean');

  // THE EXTRACTOR ACTUALLY FINDS THINGS. A regex that matched nothing would
  // make every check above vacuous, which is the failure this file is named for.
  ok('  the extractor finds real descriptions, so the scan is not vacuous',
     descriptions > 100, `${descriptions} found`);

  return results;
}
