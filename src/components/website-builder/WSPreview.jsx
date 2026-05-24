import React from 'react';
import { WEBSITE_THEMES, TYPOGRAPHY_PAIRINGS } from '@/lib/websiteThemes';
import WeddingHomePage from '@/components/guest-website/pages/WeddingHomePage';
import WeddingOurStoryPage from '@/components/guest-website/pages/WeddingOurStoryPage';
import WeddingCelebrationPage from '@/components/guest-website/pages/WeddingCelebrationPage';
import WeddingRSVPPage from '@/components/guest-website/pages/WeddingRSVPPage';
import WeddingTravelPage from '@/components/guest-website/pages/WeddingTravelPage';
import WeddingAccommodationPage from '@/components/guest-website/pages/WeddingAccommodationPage';
import WeddingRegistryPage from '@/components/guest-website/pages/WeddingRegistryPage';
import WeddingMusicPage from '@/components/guest-website/pages/WeddingMusicPage';
import WeddingPhotosPage from '@/components/guest-website/pages/WeddingPhotosPage';
import WeddingFAQPage from '@/components/guest-website/pages/WeddingFAQPage';

const PAGE_COMPONENTS = {
  home: WeddingHomePage,
  'our-story': WeddingOurStoryPage,
  celebration: WeddingCelebrationPage,
  rsvp: WeddingRSVPPage,
  travel: WeddingTravelPage,
  accommodation: WeddingAccommodationPage,
  registry: WeddingRegistryPage,
  music: WeddingMusicPage,
  photos: WeddingPhotosPage,
  faq: WeddingFAQPage,
};

export default function WSPreview({ details, currentPage = 'home', mobile = false }) {
  const theme = WEBSITE_THEMES.find(t => t.id === (details.activeTheme || 'still')) || WEBSITE_THEMES[0];
  const typography = TYPOGRAPHY_PAIRINGS.find(t => t.id === (details.activeTypography || 'classic')) || TYPOGRAPHY_PAIRINGS[0];
  const PageComponent = PAGE_COMPONENTS[currentPage] || WeddingHomePage;

  return (
    <div style={{
      width: '100%',
      minHeight: mobile ? '100%' : '100%',
      backgroundColor: theme.darkBg,
      color: theme.darkText,
      fontFamily: typography.bodyFont,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Font imports */}
      <style>{`
        ${typography.headingImport || ''}
        ${typography.bodyImport || ''}
      `}</style>

      {/* Preview watermark */}
      <div style={{
        position: 'sticky', top: 0, left: 0, right: 0, zIndex: 9999,
        background: '#0A0A0A', color: '#fff',
        fontSize: 11, fontWeight: 500, letterSpacing: '0.05em',
        height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        PREVIEW MODE — Not visible to guests
      </div>

      {/* Page content — rendered directly, no auth */}
      <PageComponent
        weddingDetails={details}
        theme={theme}
        typography={typography}
        previewMode={true}
      />
    </div>
  );
}