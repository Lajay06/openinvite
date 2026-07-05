import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { WEBSITE_THEMES, TYPOGRAPHY_PAIRINGS, UNIVERSE_CONFIGS } from '@/lib/websiteThemes';
import WBSectionRenderer from '@/components/website-builder/WBSectionRenderer';

function PasswordGateSimple({ slug, password }) {
  const [val, setVal] = useState('');
  const [error, setError] = useState(false);
  const submit = () => {
    if (val === password) {
      sessionStorage.setItem('wb_pw_' + slug, password);
      window.location.reload();
    } else {
      setError(true);
    }
  };
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 340, width: '100%', textAlign: 'center' }}>
        <p style={{ fontSize: 24, marginBottom: 8 }}>🔒</p>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>This site is password protected</h2>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>Enter the password to continue</p>
        <input type="password" value={val} onChange={e => { setVal(e.target.value); setError(false); }} onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Password" style={{ width: '100%', padding: '12px 16px', background: '#1a1a1a', border: `1px solid ${error ? '#E03553' : '#333'}`, color: '#fff', fontSize: 14, outline: 'none', borderRadius: 4, marginBottom: 12, boxSizing: 'border-box' }} />
        {error && <p style={{ color: '#E03553', fontSize: 12, marginBottom: 8 }}>Incorrect password</p>}
        <button onClick={submit} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#E03553,#803D81)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Enter
        </button>
      </div>
    </div>
  );
}

const PAGE_LABELS = {
  'home': 'Home', 'our-story': 'Our Story', 'celebration': 'Celebration',
  'rsvp': 'RSVP', 'registry': 'Registry',
  'music': 'Music', 'photos': 'Photos', 'styling': 'Styling', 'polls': 'Polls', 'faq': 'FAQ',
  'stay': 'Stay', 'transport': 'Getting here', 'experience': 'Guide', 'guestbook': 'Guestbook',
};
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WeddingWebsiteNav from './WeddingWebsiteNav';
import WeddingHomePage from './pages/WeddingHomePage';
import WeddingOurStoryPage from './pages/WeddingOurStoryPage';
import WeddingCelebrationPage from './pages/WeddingCelebrationPage';
import WeddingRSVPPage from './pages/WeddingRSVPPage';
import WeddingRegistryPage from './pages/WeddingRegistryPage';
import WeddingMusicPage from './pages/WeddingMusicPage';
import WeddingPhotosPage from './pages/WeddingPhotosPage';
import WeddingFAQPage from './pages/WeddingFAQPage';
import WeddingStylePage from './pages/WeddingStylePage';
import WeddingPollsPage from './pages/WeddingPollsPage';
import WeddingStayPage from './pages/WeddingStayPage';
import WeddingTransportPage from './pages/WeddingTransportPage';
import WeddingExperiencePage from './pages/WeddingExperiencePage';
import WeddingGuestbookPage from './pages/WeddingGuestbookPage';

const PAGE_COMPONENTS = {
  home: WeddingHomePage,
  'our-story': WeddingOurStoryPage,
  'celebration': WeddingCelebrationPage,
  'rsvp': WeddingRSVPPage,
  'registry': WeddingRegistryPage,
  'music': WeddingMusicPage,
  'photos': WeddingPhotosPage,
  'styling': WeddingStylePage,
  'polls': WeddingPollsPage,
  'faq': WeddingFAQPage,
  'stay': WeddingStayPage,
  'transport': WeddingTransportPage,
  'experience': WeddingExperiencePage,
  'guestbook': WeddingGuestbookPage,
};

export default function MultiPageWeddingWebsite() {
  const { weddingSlug, page = 'home' } = useParams();
  const navigate = useNavigate();
  const [weddingDetails, setWeddingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';

  // Must be called before any early return — React rules of hooks
  const prefersReduced = useReducedMotion();

  // Inject Google Font for the selected typography pairing via a <link> in <head>.
  // CSS @import inside a body <style> tag is unreliable — browsers often ignore it.
  useEffect(() => {
    const pairing = TYPOGRAPHY_PAIRINGS.find(t => t.id === weddingDetails?.activeTypography)
      || TYPOGRAPHY_PAIRINGS[0];
    if (!pairing.googleFonts) return;
    const href = `https://fonts.googleapis.com/css2?family=${pairing.googleFonts}&display=swap`;
    let link = document.getElementById('wf-typo-pairing');
    if (link) {
      if (link.href !== href) link.href = href;
      return;
    }
    link = document.createElement('link');
    link.id = 'wf-typo-pairing';
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [weddingDetails?.activeTypography]);

  useEffect(() => {
    const loadWeddingDetails = async () => {
      try {
        const details = await base44.entities.WeddingDetails.list();
        const match = details.find(d => d.slug === weddingSlug) || details[0];
        if (!match) { navigate('/'); return; }
        setWeddingDetails(match);
      } catch (error) {
        console.error('Error loading wedding:', error);
      }
      setLoading(false);
    };
    loadWeddingDetails();
  }, [weddingSlug, navigate]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Loading...</div></div>;

  if (!weddingDetails) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Wedding not found</div></div>;

  // Password gate (skipped when isPreview=true)
  if (!isPreview && weddingDetails.websitePassword?.trim()) {
    const enteredPw = sessionStorage.getItem('wb_pw_' + weddingSlug);
    if (enteredPw !== weddingDetails.websitePassword.trim()) {
      return <PasswordGateSimple slug={weddingSlug} password={weddingDetails.websitePassword.trim()} />;
    }
  }

  const theme = WEBSITE_THEMES.find(t => t.id === weddingDetails.activeTheme) || WEBSITE_THEMES[0];
  const typography = TYPOGRAPHY_PAIRINGS.find(t => t.id === weddingDetails.activeTypography) || TYPOGRAPHY_PAIRINGS[0];
  const enabledPages = weddingDetails.enabledPages || ['home', 'our-story', 'celebration', 'rsvp'];
  const PageComponent = PAGE_COMPONENTS[page] || WeddingHomePage;

  // Case-insensitive, whitespace-tolerant lookup so 'Aman'/'aman'/'AMAN' all activate
  const universeKey = typeof weddingDetails.activeUniverse === 'string'
    ? weddingDetails.activeUniverse.trim().toLowerCase()
    : null;
  const universeConfig = universeKey ? (UNIVERSE_CONFIGS[universeKey] ?? null) : null;

  const getTransitionVariants = (transitionType) => {
    switch (transitionType) {
      case 'slide':
        return {
          initial: { opacity: 0, x: 100 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -100 }
        };
      case 'reveal':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };
      case 'dissolve':
        return {
          initial: { opacity: 0, scale: 0.98 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.02 }
        };
      case 'fade':
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };
    }
  };

  return (
    <div
      className="wb-guest-root"
      style={{
        '--wb-heading-font': typography.headingFont,
        '--wb-body-font': typography.bodyFont,
        '--texture-id': universeConfig?.texture?.type,
        '--texture-opacity': universeConfig?.texture?.opacity,
        backgroundColor: theme.darkBg,
        color: theme.darkText,
      }}
    >

      {/* Navigation */}
      <WeddingWebsiteNav
        weddingName={weddingDetails.coupleNames}
        theme={theme}
        enabledPages={enabledPages}
        currentPage={page}
        weddingSlug={weddingSlug}
        hasTransport={!!weddingDetails?.transport?.enabledModes?.length}
        hasAccommodation={!!weddingDetails?.accommodation?.manualProperties?.length}
        hasMusic={weddingDetails?.music?.guestRequestsEnabled}
        hasExperience={weddingDetails?.experienceGuide?.published}
        onNavigate={(newPage) => {
          navigate(`/w/${weddingSlug}/${newPage === 'home' ? '' : newPage}`);
          setMobileMenuOpen(false);
        }}
      />

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          className="fixed inset-0 top-16 z-40"
          style={{ backgroundColor: theme.darkBg }}
        >
          <div className="p-6 space-y-4">
            {enabledPages.map(pageSlug => (
              <button
                key={pageSlug}
                onClick={() => navigate(`/w/${weddingSlug}/${pageSlug === 'home' ? '' : pageSlug}`)}
                className="block w-full text-left py-2 text-sm uppercase tracking-widest"
                style={{ color: page === pageSlug ? theme.accent : theme.darkText, borderBottom: `1px solid ${theme.accent}20` }}
              >
                {PAGE_LABELS[pageSlug] || pageSlug}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Page Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          variants={getTransitionVariants(
            universeConfig?.pageTransition?.type ?? weddingDetails.pageTransition ?? 'fade'
          )}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: prefersReduced
              ? 0
              : (universeConfig?.pageTransition?.duration ?? 0.6),
          }}
        >
          {(() => {
            // If the builder has authored sections for this page, render them.
            // This makes the published site match the builder preview exactly.
            const dynamicSections = weddingDetails.pageSections?.[page];
            const sorted = dynamicSections?.length
              ? [...dynamicSections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              : [];
            if (sorted.length > 0) {
              return (
                <div>
                  {sorted.map(section => (
                    <WBSectionRenderer
                      key={section.id}
                      section={section}
                      theme={theme}
                      typo={typography}
                      universeTheme={null}
                      masterData={weddingDetails}
                    />
                  ))}
                </div>
              );
            }
            // Fallback: data-driven pages (Stay, Transport, Experience) and any
            // page where no sections have been authored yet.
            return (
              <PageComponent
                weddingDetails={weddingDetails}
                theme={theme}
                typography={typography}
                universeConfig={universeConfig}
              />
            );
          })()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}