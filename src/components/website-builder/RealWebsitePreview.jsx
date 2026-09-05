/**
 * RealWebsitePreview — the single, shared "render the real guest site off
 * in-memory draft data" component. Both the builder's inline canvas
 * (StudioWebsite.jsx's PreviewContent) and the full-screen "Preview" modal
 * (FullScreenPreview.jsx) use this, so there is exactly one implementation
 * of "what a guest sees" outside the published site's own fetch/routing
 * wrapper (MultiPageWeddingWebsite.jsx) — no more hand-rolled
 * reimplementations of the guest pages.
 *
 * Deliberately mirrors MultiPageWeddingWebsite.jsx's own render logic
 * (same resolveColors/resolveTypography/resolveUniverseConfig calls, same
 * PAGE_COMPONENTS map, same TextureOverlay + WeddingWebsiteNav usage) —
 * minus the parts that don't apply to an in-memory preview: no
 * fetchWeddingBySlug (the caller already holds the draft `details` object
 * in React state, so this reflects unsaved edits with zero staleness), no
 * password gate, no URL-driven page routing (the caller controls
 * `currentPage` itself, e.g. via the builder's own page selector).
 */
import React from 'react';
import { resolveTypography, resolveColors, resolveUniverseConfig } from '@/lib/universeStyling';
import TextureOverlay from '@/components/guest-website/TextureOverlay';
import EntranceMoment from '@/components/guest-website/EntranceMoment';
import { visibleSections } from '@/lib/goodToKnow';
import WeddingWebsiteNav from '@/components/guest-website/WeddingWebsiteNav';
import WeddingHomePage from '@/components/guest-website/pages/WeddingHomePage';
import WeddingOurStoryPage from '@/components/guest-website/pages/WeddingOurStoryPage';
import WeddingCelebrationPage from '@/components/guest-website/pages/WeddingCelebrationPage';
import WeddingRSVPPage from '@/components/guest-website/pages/WeddingRSVPPage';
import WeddingRegistryPage from '@/components/guest-website/pages/WeddingRegistryPage';
import WeddingMusicPage from '@/components/guest-website/pages/WeddingMusicPage';
import WeddingStylePage from '@/components/guest-website/pages/WeddingStylePage';
import WeddingPollsPage from '@/components/guest-website/pages/WeddingPollsPage';
import WeddingFAQPage from '@/components/guest-website/pages/WeddingFAQPage';
import WeddingStayPage from '@/components/guest-website/pages/WeddingStayPage';
import WeddingTransportPage from '@/components/guest-website/pages/WeddingTransportPage';
import WeddingExperiencePage from '@/components/guest-website/pages/WeddingExperiencePage';

import { coupleDisplayName } from '@/lib/coupleNames';
import { withSampleContent } from '@/lib/sampleContent/mergeSample';
const PAGE_COMPONENTS = {
  'home':         WeddingHomePage,
  'our-story':    WeddingOurStoryPage,
  'celebration':  WeddingCelebrationPage,
  'rsvp':         WeddingRSVPPage,
  'registry':     WeddingRegistryPage,
  'music':        WeddingMusicPage,
  'styling':      WeddingStylePage,
  'polls':        WeddingPollsPage,
  'faq':          WeddingFAQPage,
  'stay':         WeddingStayPage,
  'transport':    WeddingTransportPage,
  'experience':   WeddingExperiencePage,
};

export default function RealWebsitePreview({ details: ownDetails, currentPage = 'home', onNavigate, editable = false, onRequestInsert, onMoveBlock, onDeleteBlock, onSelectBlock, selectedBlockId, replayEntranceKey }) {
  // SAMPLE CONTENT FILLS ONLY WHAT THE COUPLE HAS LEFT EMPTY, and only here.
  //
  // A new account writes names, date, venue, style and universe and nothing
  // else, so the first thing a couple saw after choosing a universe was
  // thirteen empty pages in a new palette — the product's whole proposition
  // invisible at the moment they are deciding whether to pay for it.
  //
  // THIS COMPONENT IS THE RIGHT PLACE BECAUSE OF WHAT IT IS NOT. It renders
  // the builder canvas and the full-screen preview; the PUBLISHED site is
  // rendered by MultiPageWeddingWebsite, which does not import this file and
  // never has. So sample copy cannot reach a guest by any route from here —
  // that is a property of the import graph, not a rule anyone has to keep, and
  // tests/persistence/sample-content-never-published.mjs asserts it directly.
  //
  // The couple's content wins the moment it exists. See mergeSample.js.
  const { details, isSampled, sampledFields } = withSampleContent(ownDetails);
  const theme = resolveColors(details);
  const typography = resolveTypography(details);
  const universeConfig = resolveUniverseConfig(details);
  const enabledPages = details?.enabledPages || ['home'];
  // Custom page slugs with no dedicated component fall back to
  // WeddingHomePage — matching MultiPageWeddingWebsite.jsx's own
  // `PAGE_COMPONENTS[page] || WeddingHomePage` fallback exactly.
  const PageComponent = PAGE_COMPONENTS[currentPage] || WeddingHomePage;

  return (
    <div
      className="wb-guest-root"
      style={{ '--wb-heading-font': typography.headingFont, '--wb-body-font': typography.bodyFont, position: 'relative' }}
    >
      {/* SAY THAT THESE ARE OUR WORDS. #576 shipped the opposite by accident —
          our sentence published in the couple's own first person while the
          builder showed it greyed out, which conventionally means "an example".
          Sample content is that mechanism on purpose, so the one thing it may
          never do is look like something the couple wrote. This is studio
          chrome sitting above the artwork, not part of the site: product face,
          sentence case, and it disappears the moment their own words arrive. */}
      {isSampled && (
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 12, lineHeight: 1.5, color: 'rgba(10,10,10,0.6)',
          background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.12)',
          padding: '10px 16px',
        }}>
          Sample content, so you can see this universe with something in it.
          {' '}Your own words replace it as you add them
          {' '}({sampledFields.length} {sampledFields.length === 1 ? 'section' : 'sections'} shown from the sample).
        </div>
      )}
      {/* feat/entrance-moment: never auto-mounts here — only when the
          builder's own "Replay entrance" button bumps replayEntranceKey.
          `key` forces a fresh mount (fresh internal state) each replay;
          forcePlay bypasses the localStorage "already seen" gate but still
          respects prefers-reduced-motion. */}
      {replayEntranceKey ? (
        <EntranceMoment
          key={replayEntranceKey}
          weddingSlug={details?.slug}
          weddingDetails={details}
          theme={theme}
          typography={typography}
          universeConfig={universeConfig}
          forcePlay
        />
      ) : null}

      {universeConfig?.texture && (
        <TextureOverlay textureId={universeConfig.texture.type} opacity={universeConfig.texture.opacity} />
      )}

      <WeddingWebsiteNav
        weddingName={coupleDisplayName(details)}
        theme={theme}
        typography={typography}
        enabledPages={enabledPages}
        currentPage={currentPage}
        weddingSlug={details?.slug}
        hasTransport={!!details?.transport?.enabledModes?.length}
        hasAccommodation={!!details?.accommodation?.manualProperties?.length}
        hasMusic={!!details?.music?.guestRequestsEnabled}
        hasExperience={!!details?.experienceGuide?.published}
        hasGoodToKnow={visibleSections(details?.weddingPolicies).length > 0}
        onNavigate={onNavigate}
      />

      <PageComponent
        weddingDetails={details}
        theme={theme}
        typography={typography}
        universeConfig={universeConfig}
        editable={editable}
        onRequestInsert={onRequestInsert}
        onMoveBlock={onMoveBlock}
        onDeleteBlock={onDeleteBlock}
        onSelectBlock={onSelectBlock}
        selectedBlockId={selectedBlockId}
      />
    </div>
  );
}
