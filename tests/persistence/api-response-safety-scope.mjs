/**
 * tests/persistence/api-response-safety-scope.mjs
 *
 * THE api/ RESPONSE RULES, AND THE EXTRACTOR THREE GUARDS SHARE.
 *
 * Owner rulings 2026-10-13, after a giver on a gift page was shown
 * "APP_ENC_KEY is not set. Refusing to hash or encrypt under an empty key...":
 *
 *   1. The copy gates extend to user-facing strings returned by api/*.js, any
 *      message, error or toast field in a response body.
 *   2. Exception text is banned OUTRIGHT in every api/ response body. One rule,
 *      deliberately, rather than a list of public endpoints to go stale.
 *   3. An env var name may be returned only by a route that refuses without a
 *      CRON_SECRET bearer, named with a reason, and nothing reachable from a
 *      browser is exempt.
 *
 * ── WHY THE EXTRACTOR IS TESTED AND NOT THE DRIFT ─────────────────────────
 *
 * The drift itself is 83 strings over 51 files and is being worded in tiers, so
 * asserting a count here would mean editing this guard on every tier. What must
 * not rot is the READER: if responseStrings stops seeing a field, all three
 * guards go quietly green on everything, which is the "guard that looked at
 * nothing" shape this repo keeps finding. So the fixtures below are the
 * contract, and the whole-repo numbers live in the report.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import {
  responseStrings, exceptionSites, envNamesIn, USER_FACING_FIELDS, SECRET_ENV_NAMES,
} from '../../scripts/lib/apiResponseCopy.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

export async function runApiResponseSafetyScope() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── 1. THE READER SEES WHAT IT MUST ─────────────────────────────────────
  const found = responseStrings(`
    return res.status(429).json({ error: 'Too many requests, please wait a moment.' });
    res.status(403).json({ message: "We could not find your invitation." });
  `);
  ok('a quoted literal on a user-facing field is read',
     found.length === 2 && found[0].field === 'error' && found[1].field === 'message',
     `${found.length} string(s)`);
  ok('  and its line number is the line it is on',
     found[0].line === 2 && found[1].line === 3, `${found[0].line}, ${found[1].line}`);
  ok('  every named field is covered',
     USER_FACING_FIELDS.every((f) => responseStrings(`{ ${f}: 'x' }`).length === 1),
     USER_FACING_FIELDS.join(', '));

  // A COMMENT IS NOT COPY. api files are mostly prose, and reading it would
  // bury every real finding under a hundred discussions of past bugs.
  ok('a field named inside a comment is not copy',
     responseStrings(`    // error: 'Too many requests, please wait.'`).length === 0
       && responseStrings(`     * message: 'something'`).length === 0, 'skipped');

  // AND IT IS HONEST ABOUT WHAT IT CANNOT SEE, which the module header states.
  ok('  a message held in a variable is NOT seen, and the header says so',
     responseStrings(`const msg = 'Too many requests';\nres.json({ error: msg });`).length === 0
       && /absence of a finding is not proof/.test(read('scripts/lib/apiResponseCopy.mjs')),
     'documented limit');

  // ── 2. EXCEPTION TEXT, EVERY SHAPE IT ARRIVES IN ────────────────────────
  for (const [code, what] of [
    [`return res.status(500).json({ error: err.message });`, 'err.message'],
    [`return res.status(500).json({ error: error.message });`, 'error.message'],
    [`res.json({ error: \`Render failed: \${err.message}\` });`, 'interpolated'],
    [`res.json({ error: String(err) });`, 'String(err)'],
    [`res.json({ error: err.message || String(err) });`, 'with a fallback'],
    [`res.json({ message: e.stack });`, 'a stack'],
  ]) {
    ok(`  exception text is caught: ${what}`, exceptionSites(code).length === 1, 'caught');
  }
  ok('  and a fixed code is not mistaken for one',
     exceptionSites(`res.status(409).json({ error: 'Not published yet.', reason: 'website_unpublished' });`).length === 0,
     'a calm line passes');
  ok('  nor is a logged exception, which is where it belongs',
     exceptionSites(`console.error('[send-invites] failed:', err.message);`).length === 0,
     'logs are the right home');

  // ── 3. THE SECRET NAMES ARE NAMED, NOT SHAPE-MATCHED ────────────────────
  ok('the watched secrets include every key this repo reads',
     ['APP_HASH_KEY', 'APP_ENC_KEY', 'COLLAB_HASH_KEY', 'BASE44_ADMIN_KEY', 'RESEND_API_KEY',
      'STRIPE_SECRET_KEY', 'CRON_SECRET', 'RSVP_TOKEN_KEY', 'CALENDAR_FEED_SECRET',
      'GOOGLE_PLACES_API_KEY'].every((n) => SECRET_ENV_NAMES.includes(n)),
     `${SECRET_ENV_NAMES.length} names`);
  ok('  APP_ENC_KEY is among them, since it is the one that leaked',
     envNamesIn('APP_ENC_KEY is not set. Refusing to hash or encrypt').includes('APP_ENC_KEY'),
     'the incident string is caught');
  ok('  and an ordinary shouty constant is not a secret',
     envNamesIn('TRIAL_EXPIRED_CODE and CONTENT_TYPE are not secrets').length === 0,
     'named, not shape-matched');

  // ── 4. THE GUARD AND ITS EXEMPTIONS ─────────────────────────────────────
  const guard = read('scripts/test-api-response-safety.mjs');
  const bare = stripComments(guard);

  ok('the guard is report-only today and can be switched with one word',
     /--enforce/.test(bare) && /process\.exit\(ENFORCE && findings\.length \? 1 : 0\)/.test(bare),
     '--enforce');

  // EXACTLY THE FOUR THE OWNER NAMED. A fifth cannot join quietly, and each
  // must carry a reason long enough to be worth reading.
  const envExempt = [...bare.matchAll(/\['(cron\/[\w-]+\.js|[\w-]+\.js)',\s*\n?\s*'([^']{30,})'\]/g)]
    .map((m) => m[1]);
  ok('only CRON_SECRET-bearer routes may name an env var',
     envExempt.sort().join(',') === [
       'cron/check-activation-mismatch.js', 'cron/send-onboarding-emails.js',
       'cron/send-weekly-digest.js', 'retention-test.js',
     ].sort().join(','), envExempt.join(', '));
  ok('  and each exemption carries a reason, not just a filename',
     envExempt.length === 4, `${envExempt.length} reasons`);
  ok('  nothing browser-reachable is exempt: places-search.js is not on the list',
     !envExempt.includes('places-search.js'), 'in scope');

  ok('webhooks/stripe.js is exempt from the copy rules only',
     /COPY_EXEMPT = new Map\(\[\s*\n\s*\['webhooks\/stripe\.js'/.test(bare)
       && /answers only Stripe/.test(guard), 'Stripe-only audience');
  ok('  but its bodies are still read for exception text',
     /const copyOnly = problems\.every/.test(bare) && /kind: 'exception'/.test(bare),
     'the exception rule has no exemptions');

  ok('  the exemptions print on every run, so one cannot sit unread',
     /May name an env var, by owner ruling/.test(guard)
       && /Exempt from the copy rules, but NOT from the exception rule/.test(guard),
     'printed');

  // ── 5. BOTH COPY GATES READ api/ THROUGH THE SAME EXTRACTOR ─────────────
  for (const g of ['scripts/test-calm-copy.mjs', 'scripts/test-us-english-spelling.mjs']) {
    const src = read(g);
    ok(`${g.split('/').pop()} reads api/ response copy through the extractor`,
       /from '\.\/lib\/apiResponseCopy\.mjs'/.test(src) && /responseStrings\(/.test(src),
       'shared reader');
    ok(`  and reports it without failing, for now`,
       /REPORT ONLY, not failing/.test(src), 'report only');
  }

  return results;
}
