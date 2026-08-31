import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { resolveUniverseConfig } from '@/lib/websiteThemes';
import { loadFontFamilies, familiesFromGoogleSpec } from '@/lib/selfHostedFonts';
import { resolveTypography, resolveColors } from '@/lib/universeStyling';
import TextureOverlay from './TextureOverlay';
import EntranceMoment from './EntranceMoment';
import BackgroundMusicPlayer from './BackgroundMusicPlayer';
import { consumeTokenFromUrl, getRecognisedToken, forgetRecognisedGuest } from '@/lib/guestRecognition';
import GuestSiteSkeleton from './GuestSiteSkeleton';
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
    // `locked`, not `passwordProtected`. A correct password returns the full
    // payload with passwordProtected:true (the site does have a password —
    // that stays true once you are inside), so branching on it here rejected
    // every correct password. See api/wedding-by-slug.js's two-flag contract.
    if (result && !result.locked) {
      // Kept in sessionStorage deliberately (advisor decision, 2026-08-17),
      // even though websitePassword is a scrypt hash at rest as of Step 2b
      // stage (iii): the client must still submit something hashable on every
      // navigation, so it has to hold the plaintext somewhere. Tab-scoped and
      // cleared on close; an XSS able to read it is already executing inside
      // the very content the gate protects; and it is a shared event password
      // with no reuse value elsewhere.
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
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>Enter the password to continue</p>
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
  'music': 'Music', 'styling': 'Styling', 'polls': 'Polls', 'faq': 'FAQ',
  'stay': 'Stay', 'transport': 'Getting here', 'experience': 'Guide',
};
import { motion, AnimatePresence } from 'framer-motion';
import WeddingWebsiteNav from './WeddingWebsiteNav';
import WeddingHomePage from './pages/WeddingHomePage';
import WeddingOurStoryPage from './pages/WeddingOurStoryPage';
import WeddingCelebrationPage from './pages/WeddingCelebrationPage';
import WeddingRSVPPage from './pages/WeddingRSVPPage';
import WeddingRegistryPage from './pages/WeddingRegistryPage';
import WeddingMusicPage from './pages/WeddingMusicPage';
import WeddingFAQPage from './pages/WeddingFAQPage';
import WeddingStylePage from './pages/WeddingStylePage';
import WeddingPollsPage from './pages/WeddingPollsPage';
import WeddingStayPage from './pages/WeddingStayPage';
import WeddingTransportPage from './pages/WeddingTransportPage';
import WeddingExperiencePage from './pages/WeddingExperiencePage';
import WeddingGoodToKnowPage from './pages/WeddingGoodToKnowPage';
import { visibleSections } from '@/lib/goodToKnow';
import InvitationNotAvailable from './InvitationNotAvailable';
import { withAlwaysOnPages } from '@/lib/guestPages';
import { WEDDING_PAGES } from '@/lib/websiteThemes';

import { coupleDisplayName } from '@/lib/coupleNames';
// Background music: reader gated OFF (owner decision, video-sound batch 4b).
// The same SHOW_BACKGROUND_MUSIC_UI flag that hides the two writing surfaces
// (GuestSuitePolicies.jsx, WBRightPanel.jsx). Hiding the writers does not
// silence rows that already had it enabled, and the decision is that sound on
// the guest site comes only from the couple's own uploaded or linked video --
// couple-uploaded audio included. Reader and writers turn off together, and
// would turn back on together.
//
// Verified before landing: 0 wedding rows had backgroundMusic.enabled === true
// and 0 had a track url, so no live guest site changed audibly.
const SHOW_BACKGROUND_MUSIC_UI = false;

const PAGE_COMPONENTS = {
  home: WeddingHomePage,
  'our-story': WeddingOurStoryPage,
  'celebration': WeddingCelebrationPage,
  'rsvp': WeddingRSVPPage,
  'registry': WeddingRegistryPage,
  'music': WeddingMusicPage,
  'styling': WeddingStylePage,
  'polls': WeddingPollsPage,
  'faq': WeddingFAQPage,
  'stay': WeddingStayPage,
  'transport': WeddingTransportPage,
  'experience': WeddingExperiencePage,
  'good-to-know': WeddingGoodToKnowPage,
};

export default function MultiPageWeddingWebsite() {
  const { weddingSlug, page = 'home' } = useParams();
  const navigate = useNavigate();
  const [weddingDetails, setWeddingDetails] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';

  // Consume ?rsvp=<token> BEFORE anything fetches. useState's initialiser runs
  // during the first render, ahead of every effect in this tree, so the token is
  // stored and stripped from the address bar before a single subresource
  // request can carry it in a Referer header.
  const [recognisedToken, setRecognisedToken] = useState(
    () => consumeTokenFromUrl(weddingSlug) || getRecognisedToken(weddingSlug),
  );

  const forgetGuest = () => {
    forgetRecognisedGuest(weddingSlug);
    setRecognisedToken('');
  };

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
  // Self-hosted (L1b): the universe's faces come from our own origin via
  // @fontsource, loaded lazily so only the active universe's families are
  // fetched. No <link> to Google, and no preconnect either -- a preconnect
  // still performs DNS + TCP + TLS, so it would have kept every guest's IP
  // reaching Google even with the stylesheet gone.
  useEffect(() => {
    const typography = resolveTypography(weddingDetails);
    loadFontFamilies(familiesFromGoogleSpec(typography?.googleFonts));
  }, [weddingDetails]);

  // The browser tab. The static guest shell ships a neutral "Wedding
  // invitation" title (scripts/lib/guestShell.mjs) — before this, every
  // wedding site's tab read "Openinvite: the wedding planning platform",
  // because the SPA fallback served the prerendered marketing homepage and
  // nothing guest-side ever set a title.
  //
  // Keyed on the couple's names being PRESENT, never on weddingDetails.locked.
  // That is the privacy constraint expressed as code rather than as a check:
  // a gated site's response is {passwordProtected, locked} with no names in
  // it, so there is nothing to reveal and the neutral title simply stays. It
  // is therefore correct through api/wedding-by-slug.js's documented
  // fail-open as well — the data governs, not the gate's verdict.
  useEffect(() => {
    const names = coupleDisplayName(weddingDetails);
    if (!names) return;
    const previous = document.title;
    document.title = names;
    return () => { document.title = previous; };
  }, [weddingDetails]);

  useEffect(() => {
    const loadWeddingDetails = async () => {
      const cachedPassword = sessionStorage.getItem('wb_pw_' + weddingSlug) || '';
      const result = await fetchWeddingBySlug(weddingSlug, cachedPassword, isPreview);
      // NOT navigate('/'). That sent a guest with a broken invitation link to
      // the MARKETING HOME PAGE — a sales pitch to someone trying to reach a
      // wedding. It also made the `!weddingDetails` branch below unreachable.
      if (!result) { setNotFound(true); setLoading(false); return; }
      setWeddingDetails(result);
      setLoading(false);
    };
    loadWeddingDetails();
  }, [weddingSlug, navigate, isPreview]);

  if (loading) return <GuestSiteSkeleton prefersReduced={prefersReduced} />;

  if (notFound || !weddingDetails) return <InvitationNotAvailable />;

  // Password gate — the endpoint returns { passwordProtected: true,
  // locked: true } and no other fields when a password is required and none
  // (or the wrong one) was supplied; the real password never reaches the
  // browser. Branch on `locked`: passwordProtected is also true on a
  // successful unlock, so using it here re-locked the site immediately after
  // a correct password was accepted.
  if (weddingDetails.locked) {
    return <PasswordGateSimple slug={weddingSlug} onUnlock={setWeddingDetails} />;
  }

  // A universe's own colours take priority over the legacy activeTheme/
  // WEBSITE_THEMES lookup — see resolveColors() (fix/universe-palettes).
  const theme = resolveColors(weddingDetails);
  const typography = resolveTypography(weddingDetails);
  // THE GUARANTEE, applied at render rather than trusted from storage: a record
  // saved before rsvp/celebration were protected may still have them off, and
  // with the date and RSVP gone from the hero that would leave a guest with no
  // date and no way to reply anywhere on the site.
  const enabledPages = withAlwaysOnPages(
    weddingDetails.enabledPages || ['home', 'our-story', 'celebration', 'rsvp'],
    WEDDING_PAGES.map(p => p.slug),
  );
  // A PAGE IS REACHABLE IF, AND ONLY IF, THE NAV WOULD LINK TO IT.
  //
  // `enabledPages` was computed directly above and then never consulted:
  // PAGE_COMPONENTS[page] resolved any slug a guest typed. So every page a
  // couple had turned off was live on a direct URL, and an experience guide
  // with `published: false` — an explicit, deliberate "not yet" — rendered in
  // full to anyone with the link. Publishing controlled the nav link and
  // nothing else.
  //
  // A couple who has not published a guide believes nobody can read it. That is
  // what publishing means, and a half-written list of local recommendations is
  // exactly the sort of thing they would be embarrassed to have found.
  //
  // The rule is deliberately the SAME computation the nav uses, not a second
  // one that could drift from it: the sub-pages carry their own gates
  // (transport/accommodation/music/experience/good-to-know) rather than living
  // in enabledPages, so both inputs are needed to answer the question.
  const subPageAvailability = {
    transport: !!weddingDetails?.transport?.enabledModes?.length,
    // `stay`, not `accommodation`. The duplicate /accommodation route now
    // redirects here, so the availability that used to unlock that path must
    // unlock THIS one — otherwise a couple with properties but no 'stay' in
    // enabledPages would follow a redirect straight into a refusal.
    stay: !!weddingDetails?.accommodation?.manualProperties?.length
       || !!weddingDetails?.guestSuiteAccommodation?.places?.length,
    music: weddingDetails?.music?.guestRequestsEnabled,
    experience: weddingDetails?.experienceGuide?.published,
    'good-to-know': visibleSections(weddingDetails?.weddingPolicies).length > 0,
  };
  const pageIsAvailable =
    page === 'home' ||
    enabledPages.includes(page) ||
    subPageAvailability[page] === true;

  // Indistinguishable from a site that is not published at all — the same warm
  // page, the same words. NOT a new empty state: a guest following a link to
  // something the couple has not published should meet exactly what a guest
  // following a link to an unpublished site meets.
  if (!pageIsAvailable) return <InvitationNotAvailable />;

  const PageComponent = PAGE_COMPONENTS[page] || WeddingHomePage;
  const universeConfig = resolveUniverseConfig(weddingDetails);

  /**
   * PAGE TRANSITIONS — the guest's most repeated motion, and the one that was
   * thinnest.
   *
   * Measured on 2026-08-31 with tests/motion/capture.mjs, which reads the
   * animating element's transform and opacity rather than comparing
   * screenshots: twenty universes produced FOUR distinct motion signatures.
   * Nineteen of twenty collided with at least one other. The declared types
   * did not predict the observed motion — `london` (fade) moved identically to
   * `marrakech` (dissolve), because a 2% scale is not perceptible.
   *
   * THE GUEST TRANSITION IS THE STUDIO ENTRANCE'S QUIETER SIBLING. A couple
   * crosses the entrance once and should be moved by it; a guest crosses this
   * ten or twenty times looking for the venue address. Same character, a
   * fraction of the theatre — Marrakech's slanted sand wipe becomes a short
   * slanted push, Kyoto's unfold a restrained vertical reveal. The family is
   * recognisable; the duration is not.
   *
   * CONSTRAINT: nothing over 340ms, nothing that delays content becoming
   * readable, nothing that moves the page under a thumb mid-scroll (these fire
   * on navigation, never on scroll).
   *
   * `reveal` IS DELETED. It was byte-identical to `fade` — a type that exists
   * and does nothing is a trap for the next reader, who reasonably assumes the
   * name means something.
   */
  const AXES = {
    left:         { x: 28 },  right:       { x: -28 },
    up:           { y: 24 },  down:        { y: -24 },
    'left-sharp': { x: 36 },  'up-sharp':  { y: 30 },
    'left-slant': { x: 26, y: 10 }, 'right-slant': { x: -26, y: 10 },
  };

  const getTransitionVariants = (pt) => {
    const type = typeof pt === 'string' ? pt : pt?.type;
    const dir = typeof pt === 'object' ? pt?.direction : undefined;

    // prefers-reduced-motion gets a NEUTRAL variant, not a zero-duration one.
    // A zero duration still RUNS the transform, so `x: 28` became an instant
    // sideways jump — movement, delivered faster. The correct answer to "I do
    // not want motion" is no motion.
    if (prefersReduced) {
      return { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } };
    }

    const axis = AXES[dir] || {};
    switch (type) {
      case 'push':
        return {
          initial: { opacity: 0, ...axis },
          animate: { opacity: 1, x: 0, y: 0 },
          exit:    { opacity: 0, ...Object.fromEntries(Object.entries(axis).map(([k, v]) => [k, -v])) },
        };
      case 'lift':
        return {
          initial: { opacity: 0, ...axis },
          animate: { opacity: 1, y: 0 },
          exit:    { opacity: 0, y: (axis.y ?? 24) * -0.6 },
        };
      case 'iris':
        return {
          initial: { opacity: 0, scale: dir === 'center-in' || dir === 'scale-down' ? 1.06 : 0.94 },
          animate: { opacity: 1, scale: 1 },
          exit:    { opacity: 0, scale: dir === 'center-in' || dir === 'scale-down' ? 0.97 : 1.03 },
        };
      case 'unfold':
        return {
          initial: {
            opacity: 0,
            clipPath: dir === 'horizontal' ? 'inset(0% 46% 0% 46%)'
                    : dir === 'center-split' ? 'inset(46% 0% 46% 0%)'
                    : dir === 'edge-in' ? 'inset(0% 0% 0% 88%)'
                    : 'inset(42% 0% 42% 0%)',
          },
          animate: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' },
          exit:    { opacity: 0, clipPath: 'inset(0% 0% 0% 0%)' },
        };
      case 'dissolve':
        return {
          initial: { opacity: 0, scale: 0.98 },
          animate: { opacity: 1, scale: 1 },
          exit:    { opacity: 0, scale: 1.02 },
        };
      case 'fade':
      default:
        // aspen + havana keep pure fade DELIBERATELY. universeTransitions.js
        // says it in their own family's words: "Deliberately no scale/clip-path
        // — the stillness IS the character, in contrast to every other, higher-
        // energy style." Stillness is a choice here, not an omission, and this
        // is the comment that stops a later sweep "fixing" it.
        return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
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
      {/* feat/entrance-moment: a fixed-position overlay OVER the page that's
          already mounting/loading below it — never blocks or delays
          content. First-visit-only (localStorage-gated inside the
          component itself), reduced-motion skips straight past it. */}
      <EntranceMoment
        weddingSlug={weddingSlug}
        weddingDetails={weddingDetails}
        theme={theme}
        typography={typography}
        universeConfig={universeConfig}
      />

      {/* Top-level sibling of the page-transition area below, not inside
          it — so the track keeps playing across page navigation instead
          of restarting on every click. */}
      {SHOW_BACKGROUND_MUSIC_UI && (
        <BackgroundMusicPlayer
          weddingSlug={weddingSlug}
          musicSettings={weddingDetails?.guestExperienceSettings?.backgroundMusic}
          accentColor={theme?.accent}
        />
      )}

      {/* Site-wide texture overlay — one instance covers every page (not just
          the home hero), switches with the active universe, single paint
          layer per TEXTURE_LIBRARY_SPEC.md's performance budget. */}
      {universeConfig?.texture && (
        <TextureOverlay textureId={universeConfig.texture.type} opacity={universeConfig.texture.opacity} />
      )}

      {/* Navigation */}
      <WeddingWebsiteNav
        weddingName={coupleDisplayName(weddingDetails)}
        theme={theme}
        typography={typography}
        enabledPages={enabledPages}
        currentPage={page}
        weddingSlug={weddingSlug}
        hasTransport={!!weddingDetails?.transport?.enabledModes?.length}
        hasAccommodation={!!weddingDetails?.accommodation?.manualProperties?.length}
        hasMusic={weddingDetails?.music?.guestRequestsEnabled}
        hasExperience={weddingDetails?.experienceGuide?.published}
        // D-1b: derived, exactly like hasTransport/hasAccommodation/hasMusic
        // above — NOT an enabledPages entry. Every existing wedding record
        // predates this page, so a flag-based nav item would need a data
        // migration to appear; a derived one works for every couple who has
        // already ticked "Display on website" and never knew it did nothing.
        hasGoodToKnow={visibleSections(weddingDetails?.weddingPolicies).length > 0}
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
          // THE WHOLE OBJECT, NOT `.type`. Reading `.type` here threw away
          // `direction` before the function could see it, so every universe
          // took its type's DEFAULT branch: all six pushes rendered as a plain
          // fade (their entire displacement comes from the axis), all four
          // unfolds rendered the same vertical inset, and up/down lift became
          // one direction. The signatures still came back 20-of-20 distinct
          // because durations and sampling jitter differ -- A DISTINCTNESS
          // COUNT IS NOT A VARIETY CHECK. Grade the mechanism, not the tally.
          variants={getTransitionVariants(
            universeConfig?.pageTransition ?? weddingDetails.pageTransition ?? 'fade'
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
              interactive PageComponent (WeddingRSVPPage.jsx, etc. — the
              same components every
              motion/texture/theming/server-mediated-API fix this session
              landed against) — never WBSectionRenderer, unconditionally.
              See UNIVERSE_EXPERIENCE_DIAGNOSTIC.md. */}
          <PageComponent
            weddingDetails={weddingDetails}
            theme={theme}
            typography={typography}
            universeConfig={universeConfig}
            recognisedToken={recognisedToken}
            onForgetGuest={forgetGuest}
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