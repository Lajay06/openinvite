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
import { runSpotifyTeardown } from '../tests/persistence/spotify-teardown.mjs';
import { runBase44ReadGuard } from '../tests/persistence/base44-read-guard.mjs';
import { runGuestEndpointGate } from '../tests/persistence/guest-endpoint-gate.mjs';
import { runGuestLinkMinting } from '../tests/persistence/guest-link-minting.mjs';
import { runRsvpTokenCrypto } from '../tests/persistence/rsvp-token-crypto.mjs';
import { runRetryPolicy } from '../tests/persistence/retry-policy.mjs';
import { runRlsCommentClaims } from '../tests/persistence/rls-comment-claims.mjs';
import { runGuestProtectedFields } from '../tests/persistence/guest-protected-fields.mjs';
import { runGuestPiiBlob } from '../tests/persistence/guest-pii-blob.mjs';
import { runGuestPlaintextReaders } from '../tests/persistence/guest-plaintext-readers.mjs';
import { runMealChoiceContract } from '../tests/persistence/meal-choice-contract.mjs';
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
import { runAvaActionValidation } from '../tests/persistence/ava-action-validation.mjs';
import { runDailyUpdateLoadStates } from '../tests/persistence/dailyupdate-load-states.mjs';
import { runDashboardSources } from '../tests/persistence/dashboard-sources.mjs';
import { runPlaylistEmbedUrls } from '../tests/persistence/playlist-embed-urls.mjs';
import { runNextUp } from '../tests/persistence/next-up.mjs';
import { runBudgetClarity } from '../tests/persistence/budget-clarity.mjs';
import { runSoundPreference } from '../tests/persistence/sound-preference.mjs';
import { runWeddingSeason } from '../tests/persistence/wedding-season.mjs';
import { runIndexingPosture } from '../tests/persistence/indexing-posture.mjs';
import { runWeatherProxy } from '../tests/persistence/weather-proxy.mjs';
import { runThirdPartyAssets } from '../tests/persistence/third-party-assets.mjs';
import { runUltraGateUnification } from '../tests/persistence/ultra-gate-unification.mjs';
import { runBannerOffset } from '../tests/persistence/banner-offset.mjs';
import { runContactSendPath } from '../tests/persistence/contact-send-path.mjs';
import { runMutedTextTokens } from '../tests/persistence/muted-text-tokens.mjs';
import { runSentenceCaseChrome } from '../tests/persistence/sentence-case-chrome.mjs';
import { runCountUpInstant } from '../tests/persistence/countup-instant.mjs';
import { runRsvpTokenMinting } from '../tests/persistence/rsvp-token-minting.mjs';
import { runGuestRecognition } from '../tests/persistence/guest-recognition.mjs';
import { runClipboardActions } from '../tests/persistence/clipboard-actions.mjs';
import { runInviteLinkIntegrity } from '../tests/persistence/invite-link-integrity.mjs';
import { runIndexingPosture } from '../tests/persistence/indexing-posture.mjs';
import { runGuestCsvExport } from '../tests/persistence/guest-csv-export.mjs';
import { runBudgetPlanExport } from '../tests/persistence/budget-plan-export.mjs';
import { runNotesExport } from '../tests/persistence/notes-export.mjs';
import { runPhotoExport } from '../tests/persistence/photo-export.mjs';
import { runGuestTelemetry } from '../tests/persistence/guest-telemetry.mjs';
import { runStripImageGps } from '../tests/persistence/strip-image-gps.mjs';
import { runTrialStatus } from '../tests/persistence/trial-status.mjs';
import { runTrialServerGuard } from '../tests/persistence/trial-server-guard.mjs';
import { runTrialClientLock } from '../tests/persistence/trial-client-lock.mjs';
import { runIcsExport } from '../tests/persistence/ics-export.mjs';
import { runGiftCheckout } from '../tests/persistence/gift-checkout.mjs';
import { runGuestSafeRegistry } from '../tests/persistence/guest-safe-registry.mjs';
import { runGuestSafeWedding } from '../tests/persistence/guest-safe-wedding.mjs';

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  CI test suite — Openinvite (credential-free subset)');
  console.log('  Live Base44 round-trip checks run locally via npm run test:persistence');
  console.log('═══════════════════════════════════════════════════════\n');

  const results = [];

  // Modules that died mid-run rather than returning results. A throw already
  // fails the suite (results.push(false) -> non-zero exit), but the UNCAUGHT
  // line prints hundreds of lines above the summary, so a dead module reads as
  // "one check failed somewhere" in a 861-check log. Named here so the summary
  // says WHICH module never ran — the difference between a failing assertion
  // and a file whose assertions did not execute at all.
  const crashed = [];

  async function runModule(name, fn) {
    try {
      results.push(...await fn());
    } catch (err) {
      console.error(`\n  ⚠️  UNCAUGHT ERROR in ${name}: ${err.message}\n`);
      crashed.push(`${name}: ${err.message}`);
      results.push(false);
    }
  }

  await runModule('runEmails', () => runEmails());
  await runModule('runSpotifyTeardown', () => runSpotifyTeardown());
  await runModule('runBase44ReadGuard', () => runBase44ReadGuard());
  await runModule('runGuestEndpointGate', () => runGuestEndpointGate());
  await runModule('runGuestLinkMinting', () => runGuestLinkMinting());
  await runModule('runRsvpTokenCrypto', () => runRsvpTokenCrypto());
  await runModule('runRetryPolicy', () => runRetryPolicy());
  await runModule('runRlsCommentClaims', () => runRlsCommentClaims());
  await runModule('runGuestProtectedFields', () => runGuestProtectedFields());
  await runModule('runGuestPiiBlob', () => runGuestPiiBlob());
  await runModule('runGuestPlaintextReaders', () => runGuestPlaintextReaders());
  await runModule('runMealChoiceContract', () => runMealChoiceContract());
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
  await runModule('runAvaActionValidation', () => runAvaActionValidation());
  await runModule('runDailyUpdateLoadStates', () => runDailyUpdateLoadStates());
  await runModule('runDashboardSources', () => runDashboardSources());
  await runModule('runPlaylistEmbedUrls', () => runPlaylistEmbedUrls());
  await runModule('runNextUp', () => runNextUp());
  await runModule('runBudgetClarity', () => runBudgetClarity());
  await runModule('runSoundPreference', () => runSoundPreference());
  await runModule('runWeddingSeason', () => runWeddingSeason());
  await runModule('runIndexingPosture', () => runIndexingPosture());
  await runModule('runWeatherProxy', () => runWeatherProxy());
  await runModule('runThirdPartyAssets', () => runThirdPartyAssets());
  await runModule('runUltraGateUnification', () => runUltraGateUnification());
  await runModule('runBannerOffset', () => runBannerOffset());
  await runModule('runContactSendPath', () => runContactSendPath());
  await runModule('runMutedTextTokens', () => runMutedTextTokens());
  await runModule('runSentenceCaseChrome', () => runSentenceCaseChrome());
  await runModule('runCountUpInstant', () => runCountUpInstant());
  await runModule('runRsvpTokenMinting', () => runRsvpTokenMinting());
  await runModule('runGuestRecognition', () => runGuestRecognition());
  await runModule('runClipboardActions', () => runClipboardActions());
  await runModule('runInviteLinkIntegrity', () => runInviteLinkIntegrity());
  await runModule('runIndexingPosture', () => runIndexingPosture());
  await runModule('runGuestCsvExport', () => runGuestCsvExport());
  await runModule('runBudgetPlanExport', () => runBudgetPlanExport());
  await runModule('runNotesExport', () => runNotesExport());
  await runModule('runPhotoExport', () => runPhotoExport());
  await runModule('runGuestTelemetry', () => runGuestTelemetry());
  await runModule('runStripImageGps', () => runStripImageGps());
  await runModule('runTrialStatus', () => runTrialStatus());
  await runModule('runTrialServerGuard', () => runTrialServerGuard());
  await runModule('runTrialClientLock', () => runTrialClientLock());
  await runModule('runIcsExport', () => runIcsExport());
  await runModule('runGiftCheckout', () => runGiftCheckout());
  await runModule('runGuestSafeRegistry', () => runGuestSafeRegistry());
  await runModule('runGuestSafeWedding', () => runGuestSafeWedding());

  const passed = results.filter(Boolean).length;
  const total = results.length;
  const allOk = passed === total;

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  Result: ${passed}/${total} checks passed`);
  if (crashed.length) {
    console.log(`  ⛔  ${crashed.length} MODULE(S) CRASHED — their assertions never ran:`);
    for (const c of crashed) console.log(`        ${c}`);
  }
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
