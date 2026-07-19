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
import { runCuratedFonts } from '../tests/persistence/curated-fonts.mjs';
import { runBlockStylingUniverse } from '../tests/persistence/block-styling-universe.mjs';
import { runEntranceMoment } from '../tests/persistence/entrance-moment.mjs';
import { runGuestlistEditable } from '../tests/persistence/guestlist-editable.mjs';
import { runModalViewportCentering } from '../tests/persistence/modal-viewport-centering.mjs';
import { runSeatingPolish } from '../tests/persistence/seating-polish.mjs';
import { runDashboardStructure } from '../tests/persistence/dashboard-structure.mjs';
import { runGuestbookRemoval } from '../tests/persistence/guestbook-removal.mjs';
import { runDesignStudioEntrance } from '../tests/persistence/design-studio-entrance.mjs';
import { runConsolidateOverview } from '../tests/persistence/consolidate-overview.mjs';
import { runTableGuestSync } from '../tests/persistence/table-guest-sync.mjs';
import { runPlusOneIdentity } from '../tests/persistence/plus-one-identity.mjs';
import { runCollaboratorInvite } from '../tests/persistence/collaborator-invite.mjs';
import { runCollaboratorPageMap } from '../tests/persistence/collaborator-page-map.mjs';
import { runCheckoutErrorHandling } from '../tests/persistence/checkout-error-handling.mjs';

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

  // Runs one domain module, catching any exception that escapes its own
  // internal try/catch. Previously NOTHING wrapped these ~24 calls — a
  // single uncaught throw anywhere aborted the whole script immediately,
  // skipping every module still to come AND the final cleanupWeddingDetails()
  // call below, permanently leaking whatever cleanup hadn't run yet. This is
  // the root cause behind the persistence suite's production data leak: a
  // crash mid-run left later domain files' own finally blocks (and the
  // shared sentinel delete) never executed.
  async function runModule(name, fn) {
    try {
      results.push(...await fn());
    } catch (err) {
      console.error(`\n  ⚠️  UNCAUGHT ERROR in ${name} — its own cleanup may not have completed: ${err.message}\n`);
      results.push(false);
    }
  }

  try {
    // wedding-details.mjs creates the shared sentinel WeddingDetails record
    // that rsvp.mjs (events-array reorder) and ownership.mjs (WeddingDetails
    // ownership isolation) also exercise, so it must run first and its
    // recordId must survive until every domain that needs it has run.
    const wd = await runWeddingDetails(token);
    recordId = wd.recordId;
    results.push(...wd.results);

    await runModule('runGuest', () => runGuest(token));
    await runModule('runRsvp', () => runRsvp(token, recordId));
    await runModule('runOwnership', () => runOwnership(token, recordId));
    await runModule('runEmails', () => runEmails());
    await runModule('runOnboarding', () => runOnboarding(token));
    await runModule('runEndpointAuth', () => runEndpointAuth());
    await runModule('runSpotifyOAuth', () => runSpotifyOAuth());
    await runModule('runAnonymousEndpoints', () => runAnonymousEndpoints());
    await runModule('runUniverseStyling', () => runUniverseStyling());
    await runModule('runRateLimiting', () => runRateLimiting());
    await runModule('runHeroVideo', () => runHeroVideo());
    await runModule('runUniversePickerIntegrity', () => runUniversePickerIntegrity());
    await runModule('runAssetSystem', () => runAssetSystem());
    await runModule('runStripeWebhook', () => runStripeWebhook());
    await runModule('runComponentLibrary', () => runComponentLibrary());
    await runModule('runCuratedFonts', () => runCuratedFonts());
    await runModule('runBlockStylingUniverse', () => runBlockStylingUniverse());
    await runModule('runEntranceMoment', () => runEntranceMoment());
    await runModule('runGuestlistEditable', () => runGuestlistEditable(token));
    await runModule('runModalViewportCentering', () => runModalViewportCentering());
    await runModule('runSeatingPolish', () => runSeatingPolish(token));
    await runModule('runDashboardStructure', () => runDashboardStructure());
    await runModule('runGuestbookRemoval', () => runGuestbookRemoval());
    await runModule('runDesignStudioEntrance', () => runDesignStudioEntrance());
    await runModule('runConsolidateOverview', () => runConsolidateOverview());
    await runModule('runTableGuestSync', () => runTableGuestSync(token));
    await runModule('runPlusOneIdentity', () => runPlusOneIdentity(token));
    await runModule('runCollaboratorInvite', () => runCollaboratorInvite(token));
    await runModule('runCollaboratorPageMap', () => runCollaboratorPageMap());
    await runModule('runCheckoutErrorHandling', () => runCheckoutErrorHandling());
  } finally {
    // Always runs, even if something above threw uncaught (runWeddingDetails
    // itself, or a bug in runModule) — this is the actual safety net the
    // old version was missing entirely.
    await cleanupWeddingDetails(token, recordId);
  }

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

  process.exit(allOk ? 0 : 1);
}

run().catch(err => {
  console.error('\n✗ Unexpected error:', err.message);
  process.exit(1);
});
