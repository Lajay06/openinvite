import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { resolveUniverseConfig } from '@/lib/websiteThemes';
import { resolveTypography, resolveColors, googleFontsHref } from '@/lib/universeStyling';
import TextureOverlay from './TextureOverlay';
import { fetchWeddingBySlug } from '@/lib/weddingBySlug';

function PasswordGateSimple({ slug, onUnlock }) {
  const [val, setVal] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const submit = async () => {
    setChecking(true);
    setError(false);
    const result = await fetchWeddingBySlug(slug, val);
    setChecking(false);
    if (result && !result.passwordProtected) {
      sessionStorage.setItem('wb_pw_' + slug, val);
      onUnlock(result);
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
        <button onClick={submit} disabled={checking} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#E03553,#803D81)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: checking ? 'default' : 'pointer', opacity: checking ? 0.6 : 1 }}>
          {checking ? 'Checking…' : 'Enter'}
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

  // Inject Google Fonts for the resolved typography (universe pairing takes
  // priority over the generic activeTypography picker — resolveTypography
  // handles that precedence) via <link> tags in <head>. CSS @import inside a
  // body <style> tag is unreliable — browsers often ignore it.
  //
  // Only ONE stylesheet link ever exists at a time (same id, href swapped in
  // place) — so only the active universe's fonts ever load, never the whole
  // library. Preconnect hints shave the DNS/TLS handshake off the font
  // request's critical path; display=swap (baked into googleFontsHref) means
  // text is never invisible while the font loads (no FOIT). A small, brief
  // reflow when the webfont swaps in for the fallback is an accepted
  // trade-off of display=swap — there is no zero-shift way to use a real
  // custom font without either FOIT or a metrics-matched fallback font per
  // pairing, which is out of scope here.
  useEffect(() => {
    const typography = resolveTypography(weddingDetails);
    const href = googleFontsHref(typography);

    const ensurePreconnect = (url, crossOrigin) => {
      if (document.querySelector(`link[rel="preconnect"][href="${url}"]`)) return;
      const l = document.createElement('link');
      l.rel = 'preconnect';
      l.href = url;
      if (crossOrigin) l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    };

    if (!href) return;
    ensurePreconnect('https://fonts.googleapis.com');
    ensurePreconnect('https://fonts.gstatic.com', true);

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
  }, [weddingDetails?.activeTypography, weddingDetails?.activeUniverse]);

  useEffect(() => {
    const loadWeddingDetails = async () => {
      const cachedPassword = sessionStorage.getItem('wb_pw_' + weddingSlug) || '';
      const result = await fetchWeddingBySlug(weddingSlug, cachedPassword, isPreview);
      if (!result) { navigate('/'); return; }
      setWeddingDetails(result);
      setLoading(false);
    };
    loadWeddingDetails();
  }, [weddingSlug, navigate, isPreview]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Loading...</div></div>;

  if (!weddingDetails) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Wedding not found</div></div>;

  // Password gate — the endpoint returns { passwordProtected: true } with no
  // other fields when a password is required and none (or the wrong one)
  // was supplied; the real password never reaches the browser.
  if (weddingDetails.passwordProtected) {
    return <PasswordGateSimple slug={weddingSlug} onUnlock={setWeddingDetails} />;
  }

  // A universe's own colours take priority over the legacy activeTheme/
  // WEBSITE_THEMES lookup — see resolveColors() (fix/universe-palettes).
  const theme = resolveColors(weddingDetails);
  const typography = resolveTypography(weddingDetails);
  const enabledPages = weddingDetails.enabledPages || ['home', 'our-story', 'celebration', 'rsvp'];
  const PageComponent = PAGE_COMPONENTS[page] || WeddingHomePage;
  const universeConfig = resolveUniverseConfig(weddingDetails);

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
        position: 'relative',
        '--wb-heading-font': typography.headingFont,
        '--wb-body-font': typography.bodyFont,
        '--texture-opacity': universeConfig?.texture?.opacity,
        backgroundColor: theme.darkBg,
        color: theme.darkText,
      }}
    >
      {/* Site-wide texture overlay — one instance covers every page (not just
          the home hero), switches with the active universe, single paint
          layer per TEXTURE_LIBRARY_SPEC.md's performance budget. */}
      {universeConfig?.texture && (
        <TextureOverlay textureId={universeConfig.texture.type} opacity={universeConfig.texture.opacity} />
      )}

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
          {/* fix/published-render-tree: this used to fork onto
              WBSectionRenderer whenever a page had builder-authored
              pageSections — but WBSectionRenderer is the builder's own
              live-editing CANVAS preview (src/pages/StudioWebsite.jsx),
              never given motion/texture-context/universe theming, and
              several of its "interactive" section types (RSVP, guest
              book, song request) are static mockups with no onClick at
              all. Real guests must always get the real, fully-wired,
              interactive PageComponent (WeddingRSVPPage.jsx,
              WeddingGuestbookPage.jsx, etc. — the same components every
              motion/texture/theming/server-mediated-API fix this session
              landed against) — never WBSectionRenderer, unconditionally.
              See UNIVERSE_EXPERIENCE_DIAGNOSTIC.md. */}
          <PageComponent
            weddingDetails={weddingDetails}
            theme={theme}
            typography={typography}
            universeConfig={universeConfig}
          />
        </motion.div>
      </AnimatePresence>

      {/* fix/builder-polish: quiet, universe-styled marketing footer on
          every guest-facing page (not just home/RSVP) — present but never
          loud, sentence case (no text-transform:uppercase). */}
      <div style={{ padding: '20px 24px', textAlign: 'center', borderTop: `1px solid ${theme.accent}15` }}>
        <a
          href="https://openinvite.com.au"
          target="_blank"
          rel="noreferrer"
          style={{ fontFamily: typography.bodyFont, fontSize: 11, letterSpacing: '0.04em', color: theme.darkText, opacity: 0.4, textDecoration: 'none' }}
        >
          Powered by Openinvite
        </a>
      </div>
    </div>
  );
}