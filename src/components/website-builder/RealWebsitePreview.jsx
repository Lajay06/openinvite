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
import WeddingWebsiteNav from '@/components/guest-website/WeddingWebsiteNav';
import WeddingHomePage from '@/components/guest-website/pages/WeddingHomePage';
import WeddingOurStoryPage from '@/components/guest-website/pages/WeddingOurStoryPage';
import WeddingCelebrationPage from '@/components/guest-website/pages/WeddingCelebrationPage';
import WeddingRSVPPage from '@/components/guest-website/pages/WeddingRSVPPage';
import WeddingRegistryPage from '@/components/guest-website/pages/WeddingRegistryPage';
import WeddingMusicPage from '@/components/guest-website/pages/WeddingMusicPage';
import WeddingPhotosPage from '@/components/guest-website/pages/WeddingPhotosPage';
import WeddingStylePage from '@/components/guest-website/pages/WeddingStylePage';
import WeddingPollsPage from '@/components/guest-website/pages/WeddingPollsPage';
import WeddingFAQPage from '@/components/guest-website/pages/WeddingFAQPage';
import WeddingStayPage from '@/components/guest-website/pages/WeddingStayPage';
import WeddingTransportPage from '@/components/guest-website/pages/WeddingTransportPage';
import WeddingExperiencePage from '@/components/guest-website/pages/WeddingExperiencePage';
import WeddingGuestbookPage from '@/components/guest-website/pages/WeddingGuestbookPage';

const PAGE_COMPONENTS = {
  'home':         WeddingHomePage,
  'our-story':    WeddingOurStoryPage,
  'celebration':  WeddingCelebrationPage,
  'rsvp':         WeddingRSVPPage,
  'registry':     WeddingRegistryPage,
  'music':        WeddingMusicPage,
  'photos':       WeddingPhotosPage,
  'styling':      WeddingStylePage,
  'polls':        WeddingPollsPage,
  'faq':          WeddingFAQPage,
  'stay':         WeddingStayPage,
  'transport':    WeddingTransportPage,
  'experience':   WeddingExperiencePage,
  'guestbook':    WeddingGuestbookPage,
};

export default function RealWebsitePreview({ details, currentPage = 'home', onNavigate, editable = false, onRequestInsert, onMoveBlock, onDeleteBlock, onSelectBlock, selectedBlockId }) {
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
      {universeConfig?.texture && (
        <TextureOverlay textureId={universeConfig.texture.type} opacity={universeConfig.texture.opacity} />
      )}

      <WeddingWebsiteNav
        weddingName={details?.coupleNames}
        theme={theme}
        enabledPages={enabledPages}
        currentPage={currentPage}
        weddingSlug={details?.slug}
        hasTransport={!!details?.transport?.enabledModes?.length}
        hasAccommodation={!!details?.accommodation?.manualProperties?.length}
        hasMusic={!!details?.music?.guestRequestsEnabled}
        hasExperience={!!details?.experienceGuide?.published}
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
