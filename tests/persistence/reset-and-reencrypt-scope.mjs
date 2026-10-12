/**
 * tests/persistence/reset-and-reencrypt-scope.mjs
 *
 * THE TWO OWNER-RUN SCRIPTS KEEP THEIR SCOPE.
 *
 * Both are read by a person once, run once against production, and then not
 * looked at for months. Neither can be imported by a guard: they log in and act
 * at module scope, by design. So this reads their source, which is the only
 * honest option and still catches the three things that actually went wrong.
 *
 * ── WHY EACH CHECK EXISTS ──────────────────────────────────────────────────
 *
 * 1. migrate-guest-pii.mjs's precondition named BASE44_ADMIN_KEY and said "the
 *    blob cannot be built" without it. After #1012 the blob's key is
 *    APP_ENC_KEY, so that check passed and the run then died inside appKeys.js
 *    several requests later. A precondition that guards the wrong variable is
 *    worse than none: it reads as reassurance.
 *
 * 2. The --reencrypt mode must select rows on whether the blob OPENS, not on
 *    whether it is PRESENT. Selecting on presence is exactly what made the
 *    original mode skip all 375 damaged rows.
 *
 * 3. The reset must refuse what RLS will not let it do, up front. On
 *    2026-10-11 it attempted 1689 writes that answered 401 and 2 deletes that
 *    answered 404, and the useful signal (PlanGift succeeded, so the token
 *    writes fine where RLS permits) was buried under 1691 failure lines.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readFileSync } from 'node:fs';

const read = (p) => stripComments(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));

export async function runResetAndReencryptScope() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── 1. THE RE-ENCRYPT MODE ──────────────────────────────────────────────
  const mig = read('scripts/migrate-guest-pii.mjs');

  ok('migrate-guest-pii has a --reencrypt mode', /--reencrypt/.test(mig), 'present');

  ok('  it selects rows whose blob does NOT decrypt, not rows missing a blob',
     /readGuestPiiBlob\(g\[BLOB_FIELD\]\)\s*===\s*null/.test(mig),
     'selects on decryptability');

  ok('  and the default mode still selects rows with no blob at all',
     /targets = guests\.filter\(g => !g\[BLOB_FIELD\]\)/.test(mig),
     'unchanged');

  // THE BLOB IS BUILT FROM THE PLAINTEXT COLUMNS. If it were ever built from a
  // decrypt of the old ciphertext it would rebuild nothing, since that is the
  // thing that no longer opens.
  ok('  the blob is built from the plaintext columns',
     /for \(const f of PII_FIELDS\) pii\[f\] = g\[f\] \?\? null;/.test(mig)
       && /buildGuestPiiBlob\(pii\)/.test(mig),
     'from g[f], never from a decrypt');

  ok('  a row whose blob is dead and whose plaintext is gone is SKIPPED',
     /deadNoPlaintext/.test(mig) && /hasPlaintext/.test(mig),
     'a null blob is worse than an unreadable one');

  ok('  the placeholder name counts as plaintext already destroyed',
     /NAME_PLACEHOLDER/.test(mig), 'guarded');

  // ── 2. THE PRECONDITION GUARDS THE RIGHT VARIABLE ───────────────────────
  ok('the precondition names APP_ENC_KEY, the key the blob actually uses',
     /APP_ENC_KEY is not set/.test(mig), 'APP_ENC_KEY');

  ok('  and no longer claims the blob needs BASE44_ADMIN_KEY',
     !/BASE44_ADMIN_KEY is not set/.test(mig),
     'the credential does not build blobs');

  ok('  the dry-run hint repeats the mode it was given',
     /scripts\/migrate-guest-pii\.mjs\$\{REENCRYPT \? ' --reencrypt' : ''\}/.test(mig),
     'so copy-paste keeps --reencrypt');

  // ── 3. THE RESET REFUSES WHAT RLS WILL NOT PERMIT ───────────────────────
  const reset = read('scripts/reset-orphaned-hashes.mjs');

  for (const entity of ['PollVote', 'RsvpResponse', 'QuestionnaireResponse']) {
    const entry = new RegExp(`entity: '${entity}'[\\s\\S]{0,200}?adminWritable: false`);
    ok(`  ${entity} is marked not writable by the admin key`, entry.test(reset), 'adminWritable: false');
  }

  ok('  PlanGift is the one marked writable, because all four rules are null',
     /entity: 'PlanGift'[\s\S]{0,200}?adminWritable: true/.test(reset),
     'adminWritable: true');

  ok('  every refusal carries a reason a reader can check',
     (reset.match(/why: '/g) || []).length >= 4, 'four reasons');

  // UP FRONT MEANS BEFORE THE PER-ROW LOOP, not a continue inside it.
  const skipAt = reset.indexOf('if (step.adminWritable === false)');
  const rowLoopAt = reset.indexOf('for (const row of snapshot.rows)');
  ok('  and the skip happens before the per-row loop, not inside it',
     skipAt > -1 && rowLoopAt > -1 && skipAt < rowLoopAt,
     'refused entities cost zero requests');

  ok('the BEFORE report prints the refusals rather than burying them',
     /REFUSED, and not attempted/.test(reset)
       && /this is not a credential problem/.test(reset),
     'named in the report');

  // ── 4. NEITHER SCRIPT WRITES WITHOUT AN EXPLICIT FLAG ───────────────────
  ok('the reset writes only with --confirm',
     /const CONFIRM = process\.argv\.includes\('--confirm'\)/.test(reset)
       && /if \(!CONFIRM\)/.test(reset), '--confirm');
  ok('  and the migration writes only with --execute plus --expect-rows',
     /const EXECUTE = args\.includes\('--execute'\)/.test(mig)
       && /--execute requires --expect-rows/.test(mig), '--execute + --expect-rows');

  return results;
}
