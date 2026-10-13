#!/usr/bin/env node
/**
 * scripts/test-api-response-safety.mjs
 *
 * NO api/ RESPONSE BODY NAMES A SECRET OR ECHOES AN EXCEPTION.
 *
 * ── THE INCIDENT ───────────────────────────────────────────────────────────
 *
 * On 2026-10-13 a giver on a gift page was shown
 * "APP_ENC_KEY is not set. Refusing to hash or encrypt under an empty key..."
 *
 * That sentence is mine. It is thrown by `required()` in api/_lib/appKeys.js and
 * it names the variable ON PURPOSE, because it is written for a log, where
 * naming the variable is the whole value. What went wrong is at the other end:
 * an endpoint caught it and put `err.message` in the response body.
 *
 * Owner ruling the same day, and it is deliberately one rule rather than a list
 * of which endpoints are public: EXCEPTION TEXT IS BANNED OUTRIGHT in every
 * api/ response body. The server logs the exception; the body returns a fixed
 * code and a calm line. A list of public endpoints would go stale the first
 * time a route changed audience, and nobody would notice until a giver saw a
 * stack frame.
 *
 * ── REPORT ONLY, FOR NOW ──────────────────────────────────────────────────
 *
 * This run prints and exits 0. The drift it names is pre-existing, across
 * ordinary, held and frozen files, and it is being fixed in tiers with the
 * owner wording each string. Turning the guard red first would block every
 * lane on copy nobody has written yet.
 *
 * Pass --enforce to make it exit 1 on any finding. That is how it will run once
 * the tiers land, and the flag exists now so the switch is one word in
 * package.json rather than an edit to this file under time pressure.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { responseStrings, exceptionSites, envNamesIn, SECRET_ENV_NAMES } from './lib/apiResponseCopy.mjs';

const ROOT = new URL('../api/', import.meta.url).pathname;
const ENFORCE = process.argv.includes('--enforce');

/**
 * EXEMPT, AND ONLY FOR NAMING AN ENV VAR. Owner ruling 2026-10-13: only routes
 * that refuse without a CRON_SECRET bearer, each named with a reason, and
 * nothing reachable from a browser.
 *
 * The exemption does NOT cover echoing an exception. These routes still return
 * a fixed code rather than err.message, because a cron's response body ends up
 * in a log aggregator that more people can read than can call the route.
 */
const ENV_NAME_EXEMPT = new Map([
  ['cron/check-activation-mismatch.js',
   'refuses without a CRON_SECRET bearer; "CRON_SECRET is required in production" is the only useful thing it can say to the scheduler'],
  ['cron/send-onboarding-emails.js',
   'same CRON_SECRET bearer refusal, same audience'],
  ['cron/send-weekly-digest.js',
   'same CRON_SECRET bearer refusal, same audience'],
  ['retention-test.js',
   'owner-run route behind the same CRON_SECRET bearer; it fails closed in production when the secret is unset'],
]);

/**
 * EXEMPT FROM THE COPY RULES, not from the exception rule. Owner ruling
 * 2026-10-13: webhooks/stripe.js answers only Stripe, so its wording is not
 * couple-facing. Its bodies still carry a fixed code rather than err.message.
 */
const COPY_EXEMPT = new Map([
  ['webhooks/stripe.js', 'answers only Stripe, never a browser; wording is not couple-facing'],
]);

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const BRITISH = /\b\w*(colour|honour|organis|licence|centre|behaviour|favour|apologis|recognis|customis|optimis|realis|cancelling|travelling|labelled|modelled)\w*\b/i;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = walk(ROOT).sort();
const findings = [];

for (const full of files) {
  const rel = full.slice(ROOT.length);
  const src = readFileSync(full, 'utf8');

  for (const s of responseStrings(src)) {
    const problems = [];
    if (s.text.includes(EM_DASH)) problems.push('em dash');
    if (s.text.includes(EN_DASH)) problems.push('en dash');
    const b = s.text.match(BRITISH);
    if (b) problems.push(`British spelling "${b[0]}"`);
    const envs = envNamesIn(s.text);
    if (envs.length && !ENV_NAME_EXEMPT.has(rel)) problems.push(`names ${envs.join(', ')}`);
    // A copy-exempt file is still read for env names, which is the serious half.
    const copyOnly = problems.every((p) => p.includes('dash') || p.startsWith('British'));
    if (problems.length && !(COPY_EXEMPT.has(rel) && copyOnly)) {
      findings.push({ rel, line: s.line, kind: 'copy', detail: `[${problems.join('; ')}] ${s.field}: ${s.text}` });
    }
  }

  for (const e of exceptionSites(src)) {
    findings.push({ rel, line: e.line, kind: 'exception', detail: e.code });
  }
}

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.rel)) byFile.set(f.rel, []);
  byFile.get(f.rel).push(f);
}

const bar = '─'.repeat(55);
console.log(`\n${bar}`);
console.log(`  api/ response safety ${ENFORCE ? '' : '(REPORT ONLY, exits 0)'}`);
console.log(`${bar}\n`);
console.log(`  ${files.length} api/*.js file(s) read, ${SECRET_ENV_NAMES.length} secret names watched.`);
console.log(`  ${ENV_NAME_EXEMPT.size} route(s) may name an env var, ${COPY_EXEMPT.size} exempt from copy rules.\n`);

const copyCount = findings.filter((f) => f.kind === 'copy').length;
const excCount = findings.filter((f) => f.kind === 'exception').length;

if (!findings.length) {
  console.log('  Nothing to report.\n');
} else {
  for (const [rel, list] of [...byFile.entries()].sort()) {
    console.log(`  api/${rel}`);
    for (const f of list.sort((a, b) => a.line - b.line)) {
      console.log(`    ${String(f.line).padStart(4)}  ${f.kind === 'exception' ? 'EXCEPTION' : 'COPY     '}  ${f.detail.slice(0, 120)}`);
    }
  }
  console.log(`\n  ${byFile.size} file(s): ${copyCount} copy finding(s), ${excCount} exception site(s).`);
  console.log('  Exception text is banned outright: log it, return a fixed code and a calm line.\n');
}

// THE EXEMPTIONS ARE PRINTED EVERY RUN, so one cannot sit there unread.
if (ENV_NAME_EXEMPT.size) {
  console.log('  May name an env var, by owner ruling:');
  for (const [f, why] of ENV_NAME_EXEMPT) console.log(`    api/${f}: ${why}`);
}
if (COPY_EXEMPT.size) {
  console.log('\n  Exempt from the copy rules, but NOT from the exception rule:');
  for (const [f, why] of COPY_EXEMPT) console.log(`    api/${f}: ${why}`);
}
console.log('');

process.exit(ENFORCE && findings.length ? 1 : 0);
