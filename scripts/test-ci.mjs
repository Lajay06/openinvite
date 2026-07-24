/**
 * scripts/test-ci.mjs
 *
 * CI-safe subset of the persistence suite: every module that needs no live
 * Base44 login and no BASE44_ADMIN_KEY — pure-function / mocked-network
 * checks only. Exists so GitHub Actions can gate PRs without holding
 * BASE44_ADMIN_KEY (full production database access) as a repo secret, and
 * without every PR run writing to the live production Base44 database
 * (which risks colliding with whatever a local `npm run test:persistence`
 * run is doing at the same time).
 *
 * The live, credential-requiring modules (guest/RSVP/ownership round-trips,
 * onboarding, endpoint-auth, anonymous-endpoints, notifications, seating,
 * table-guest-sync, plus-one identity, collaborator invite, todo-list
 * schema, wedding-details) stay in scripts/test-persistence.mjs as the
 * mandatory LOCAL pre-merge step WORKFLOW.md documents — this script's job
 * is to catch everything CI safely can without those.
 *
 * Usage: npm run test:ci
 * Exits 0 if all pass, 1 if any fail.
 */

import { runEmails } from '../tests/persistence/emails.mjs';
import { runSpotifyOAuth } from '../tests/persistence/spotify-oauth.mjs';
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
import { runModalViewportCentering } from '../tests/persistence/modal-viewport-centering.mjs';
import { runDashboardStructure } from '../tests/persistence/dashboard-structure.mjs';
import { runGuestbookRemoval } from '../tests/persistence/guestbook-removal.mjs';
import { runDesignStudioEntrance } from '../tests/persistence/design-studio-entrance.mjs';
import { runConsolidateOverview } from '../tests/persistence/consolidate-overview.mjs';
import { runCollaboratorPageMap } from '../tests/persistence/collaborator-page-map.mjs';
import { runCheckoutErrorHandling } from '../tests/persistence/checkout-error-handling.mjs';
import { runGuestRsvpTally } from '../tests/persistence/guest-rsvp-tally.mjs';
import { runPrerenderAssetRewrite } from '../tests/persistence/prerender-asset-rewrite.mjs';
import { runOnboardingCronWindow } from '../tests/persistence/onboarding-cron-window.mjs';
import { runSchemaDriftGuard } from '../tests/persistence/schema-drift-guard.mjs';

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  CI test suite — Openinvite (credential-free subset)');
  console.log('  Live Base44 round-trip checks run locally via npm run test:persistence');
  console.log('═══════════════════════════════════════════════════════\n');

  const results = [];

  async function runModule(name, fn) {
    try {
      results.push(...await fn());
    } catch (err) {
      console.error(`\n  ⚠️  UNCAUGHT ERROR in ${name}: ${err.message}\n`);
      results.push(false);
    }
  }

  await runModule('runEmails', () => runEmails());
  await runModule('runSpotifyOAuth', () => runSpotifyOAuth());
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
  await runModule('runModalViewportCentering', () => runModalViewportCentering());
  await runModule('runDashboardStructure', () => runDashboardStructure());
  await runModule('runGuestbookRemoval', () => runGuestbookRemoval());
  await runModule('runDesignStudioEntrance', () => runDesignStudioEntrance());
  await runModule('runConsolidateOverview', () => runConsolidateOverview());
  await runModule('runCollaboratorPageMap', () => runCollaboratorPageMap());
  await runModule('runCheckoutErrorHandling', () => runCheckoutErrorHandling());
  await runModule('runGuestRsvpTally', () => runGuestRsvpTally());
  await runModule('runPrerenderAssetRewrite', () => runPrerenderAssetRewrite());
  await runModule('runOnboardingCronWindow', () => runOnboardingCronWindow());
  await runModule('runSchemaDriftGuard', () => runSchemaDriftGuard());

  const passed = results.filter(Boolean).length;
  const total = results.length;
  const allOk = passed === total;

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  Result: ${passed}/${total} checks passed`);
  if (!allOk) {
    console.log('  ⚠️  Some checks failed — see output above.');
  }
  console.log(`${'─'.repeat(55)}\n`);

  process.exit(allOk ? 0 : 1);
}

run().catch(err => {
  console.error('\n✗ Unexpected error:', err.message);
  process.exit(1);
});
