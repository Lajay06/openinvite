/**
 * scripts/test-persistence.mjs
 *
 * Thin runner for the persistence test suite — the actual assertions live
 * in per-domain files under tests/persistence/. This file only handles
 * login, orchestrating each domain module in sequence, printing the
 * combined summary, and the exit code. Split out of a single ~1700-line
 * file (chore/split-tests) for readability; no assertion logic changed.
 *
 * Usage:  npm run test:persistence
 *
 * Requires .env.local (gitignored):
 *   BASE44_TEST_EMAIL=...
 *   BASE44_TEST_PASSWORD=...
 *
 * What it does:
 *   1. Authenticates as the dedicated test account
 *   2. Runs each domain module's Base44 round-trip / logic assertions
 *   3. Prints a combined pass/fail summary across all of them
 *   4. Deletes the shared sentinel WeddingDetails record
 *   5. Exits 0 if all pass, 1 if any fail
 */

import { EMAIL, PASS, login, cleanupWeddingDetails } from '../tests/persistence/_shared.mjs';
import { runWeddingDetails } from '../tests/persistence/wedding-details.mjs';
import { runGuest } from '../tests/persistence/guest.mjs';
import { runRsvp } from '../tests/persistence/rsvp.mjs';
import { runOwnership } from '../tests/persistence/ownership.mjs';
import { runEmails } from '../tests/persistence/emails.mjs';
import { runGuestbook } from '../tests/persistence/guestbook.mjs';
import { runOnboarding } from '../tests/persistence/onboarding.mjs';
import { runEndpointAuth } from '../tests/persistence/endpoint-auth.mjs';
import { runSpotifyOAuth } from '../tests/persistence/spotify-oauth.mjs';
import { runAnonymousEndpoints } from '../tests/persistence/anonymous-endpoints.mjs';
import { runUniverseStyling } from '../tests/persistence/universe-styling.mjs';
import { runRateLimiting } from '../tests/persistence/rate-limiting.mjs';
import { runHeroVideo } from '../tests/persistence/hero-video.mjs';
import { runUniversePickerIntegrity } from '../tests/persistence/universe-picker-integrity.mjs';
import { runAssetSystem } from '../tests/persistence/asset-system.mjs';
import { runStripeWebhook } from '../tests/persistence/stripe-webhook.mjs';
import { runComponentLibrary } from '../tests/persistence/component-library.mjs';

if (!EMAIL || !PASS) {
  console.error('✗ BASE44_TEST_EMAIL and BASE44_TEST_PASSWORD must be set in .env.local');
  process.exit(1);
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Base44 persistence test — Openinvite');
  console.log('  Guest Suite + Event Details canonical fields');
  console.log('═══════════════════════════════════════════════════════\n');

  let token = null;
  let recordId = null;
  const results = [];

  // ── Login ────────────────────────────────────────────────────────────────
  process.stdout.write('  Logging in as test account… ');
  try {
    token = await login();
    console.log('✓ authenticated\n');
  } catch (err) {
    console.error(`\n✗ Login failed: ${err.message}`);
    process.exit(1);
  }

  // wedding-details.mjs creates the shared sentinel WeddingDetails record
  // that rsvp.mjs (events-array reorder) and ownership.mjs (WeddingDetails
  // ownership isolation) also exercise, so it must run first and its
  // recordId must survive until every domain that needs it has run.
  const wd = await runWeddingDetails(token);
  recordId = wd.recordId;
  results.push(...wd.results);

  results.push(...await runGuest(token));
  results.push(...await runRsvp(token, recordId));
  results.push(...await runOwnership(token, recordId));
  results.push(...await runEmails());
  results.push(...await runGuestbook(token));
  results.push(...await runOnboarding(token));
  results.push(...await runEndpointAuth());
  results.push(...await runSpotifyOAuth());
  results.push(...await runAnonymousEndpoints());
  results.push(...await runUniverseStyling());
  results.push(...await runRateLimiting());
  results.push(...await runHeroVideo());
  results.push(...await runUniversePickerIntegrity());
  results.push(...await runAssetSystem());
  results.push(...await runStripeWebhook());
  results.push(...await runComponentLibrary());

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter(Boolean).length;
  const total  = results.length;
  const allOk  = passed === total;

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  Result: ${passed}/${total} fields persisted correctly`);
  if (!allOk) {
    console.log('  ⚠️  Some fields failed — check that they are registered in');
    console.log('  the WeddingDetails / Guest entity schemas on Base44.');
  }
  console.log(`${'─'.repeat(55)}\n`);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  await cleanupWeddingDetails(token, recordId);

  process.exit(allOk ? 0 : 1);
}

run().catch(err => {
  console.error('\n✗ Unexpected error:', err.message);
  process.exit(1);
});
