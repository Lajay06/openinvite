import React, { Suspense } from 'react'
import { Toaster } from "@/components/ui/toaster"
import ScrollToTop from "@/components/ScrollToTop"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import RouteLoadingFallback from '@/components/shared/RouteLoadingFallback';
import { lazyWithReload } from '@/lib/lazyWithReload.js';
import InvitationNotAvailable from './components/guest-website/InvitationNotAvailable';

// AUDIT_2026-07.md B1: every page below is lazy-loaded so each becomes its
// own chunk — a marketing-site visitor no longer downloads the entire
// authenticated dashboard's code, and vice versa.
const NotFound = lazyWithReload(() => import('./pages/NotFound'));
const Unauthorized = lazyWithReload(() => import('./pages/Unauthorized'));
const DevReset = lazyWithReload(() => import('./pages/DevReset'));
const About = lazyWithReload(() => import('./pages/About'));
const Ava = lazyWithReload(() => import('./pages/Ava'));
const Pricing = lazyWithReload(() => import('./pages/Pricing'));
const Contact = lazyWithReload(() => import('./pages/Contact'));
const PrivacyPolicy = lazyWithReload(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazyWithReload(() => import('./pages/TermsOfService'));
const CookiePolicy = lazyWithReload(() => import('./pages/CookiePolicy'));
const DataDeletion = lazyWithReload(() => import('./pages/DataDeletion'));
const RefundPolicy = lazyWithReload(() => import('./pages/RefundPolicy'));
const ScrollMorph = lazyWithReload(() => import('./pages/ScrollMorph'));
const Universes = lazyWithReload(() => import('./pages/Universes'));
const Gifting = lazyWithReload(() => import('./pages/Gifting'));
const GiftPurchaseSuccess = lazyWithReload(() => import('./pages/GiftPurchaseSuccess'));
const Onboarding = lazyWithReload(() => import('./pages/Onboarding'));
const Login = lazyWithReload(() => import('./pages/Login'));
const Register = lazyWithReload(() => import('./pages/Register'));
const ChoosePlan = lazyWithReload(() => import('./pages/ChoosePlan'));
const MultiPageWeddingWebsite = lazyWithReload(() => import('./components/guest-website/MultiPageWeddingWebsite'));
const RSVPPage = lazyWithReload(() => import('./components/rsvp/RSVPPage'));
const GamesPage = lazyWithReload(() => import('./components/games/GamesPage'));
const CollaboratorAccept = lazyWithReload(() => import('./pages/CollaboratorAccept'));
const CollaboratorGuests = lazyWithReload(() => import('./pages/CollaboratorGuests'));
const GuestRSVPRetired = lazyWithReload(() => import('./pages/GuestRSVPRetired'));
const UniverseStudio = lazyWithReload(() => import('./pages/UniverseStudio'));
const StudioHub = lazyWithReload(() => import('./pages/StudioHub'));
const StudioWebsite = lazyWithReload(() => import('./pages/StudioWebsite'));
const FoodBeverage = lazyWithReload(() => import('./pages/FoodBeverage'));
const EntertainmentDetails = lazyWithReload(() => import('./pages/EntertainmentDetails'));
const Transport = lazyWithReload(() => import('./pages/Transport'));
const Accommodation = lazyWithReload(() => import('./pages/Accommodation'));
const GuestAccommodation = lazyWithReload(() => import('./pages/GuestAccommodation'));
const GuestMusic = lazyWithReload(() => import('./pages/GuestMusic'));
const Music = lazyWithReload(() => import('./pages/Music'));
const CeremonyDetails = lazyWithReload(() => import('./pages/CeremonyDetails'));
const Honeymoon = lazyWithReload(() => import('./pages/Honeymoon'));
const EmergencyContact = lazyWithReload(() => import('./pages/EmergencyContact'));
const WeddingParty = lazyWithReload(() => import('./pages/WeddingParty'));
const WeddingFavours = lazyWithReload(() => import('./pages/WeddingFavours'));
const EventDetails = lazyWithReload(() => import('./pages/EventDetails'));
const PaymentSuccess = lazyWithReload(() => import('./pages/PaymentSuccess'));
const AvaStudio = lazyWithReload(() => import('./pages/AvaStudio'));
const AvaStudioWebsite = lazyWithReload(() => import('./pages/AvaStudioWebsite'));
const AvaStudioAssets = lazyWithReload(() => import('./pages/AvaStudioAssets'));
const Help = lazyWithReload(() => import('./pages/Help'));
const Account = lazyWithReload(() => import('./pages/Account'));
const Admin = lazyWithReload(() => import('./pages/Admin'));
const ForgotPassword = lazyWithReload(() => import('./pages/ForgotPassword'));
const ResetPassword = lazyWithReload(() => import('./pages/ResetPassword'));
const StudioGuestSuite = lazyWithReload(() => import('./pages/StudioGuestSuite'));
// Dev-only Design Studio redesign mocks — not linked from any nav, not
// used by the real DesignStudio (UniverseStudio.jsx) route. See each
// file's header comment.
const MockUniverseA = lazyWithReload(() => import('./pages/MockUniverseA'));
const MockUniverseB = lazyWithReload(() => import('./pages/MockUniverseB'));
const MockUniverseC = lazyWithReload(() => import('./pages/MockUniverseC'));
const Features = lazyWithReload(() => import('./pages/Features'));
const Home = lazyWithReload(() => import('./pages/Home'));
const FAQ = lazyWithReload(() => import('./pages/FAQ'));
const Tour = lazyWithReload(() => import('./pages/Tour'));

// ── Public paths — bypass auth check entirely ─────────────────────────────────
const PUBLIC_PATH_SET = new Set([
  '/',
  '/About', '/about',
  '/Contact', '/contact',
  '/Pricing', '/pricing',
  '/Features', '/features',
  '/ava',
  '/faq',
  // Private preview until T3: reachable by direct URL, not linked from
  // PublicNav, not prerendered, absent from sitemap.xml, noindex.
  '/tour',
  '/scroll-morph',
  '/universes',
  '/gifting',
  '/gift/success',
  '/forgot-password',
  '/reset-password',
  '/privacy-policy',
  '/terms-of-service',
  '/cookie-policy',
  '/data-deletion',
  '/refund-policy',
  '/GuestRSVP',
]);
const isPublicPath = (pathname) =>
  PUBLIC_PATH_SET.has(pathname) || pathname.startsWith('/w/') || pathname.startsWith('/rsvp/') || pathname.startsWith('/games/') || pathname.startsWith('/collaborate/accept/');

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// AUDIT_2026-07.md S20: pages.config.js's auto-loop below registers every
// PAGES key at its literal PascalCase URL (e.g. "/EventDetails"), but for
// the keys here a differently-formatted URL is the one actually linked
// from the sidebar/collaboratorPageMap.js — confirmed by grepping every
// createPageUrl()/href/navigate() reference in src/, not guessed from
// casing alone. These six get their own dedicated kebab-case route below
// instead (same pattern as Transport/Accommodation etc. further down) and
// are excluded here rather than redirected.
//
// Of the six, only Transport/Accommodation/Honeymoon are single-word
// PascalCase names that actually collide case-insensitively with their own
// kebab-case route ("Transport".toLowerCase() === "transport" — no hyphen
// gets inserted for a single word). React Router v6 matches paths
// case-insensitively by default and resolves ties in declaration order, so
// the earlier-declared "/Transport" auto-route (a `<Navigate to=
// "/transport">`) won every visit to "/transport" — a no-op self-redirect
// to the page already being visited, leaving it blank. Confirmed live for
// all three. CeremonyDetails/EmergencyContact/EventDetails are multi-word,
// so their kebab-case form gains a hyphen their PascalCase form never had
// ("ceremony-details" vs "ceremonydetails") — those three were never
// actually collision-prone, but are excluded anyway as a harmless
// belt-and-braces measure, same fix applied uniformly rather than three
// separate one-offs. scripts/test-route-collisions.mjs asserts both the
// real collisions and this exclusion stay fixed.
const AUTO_ROUTE_EXCLUDE = new Set([
  'Features',
  'CeremonyDetails',
  'Transport',
  'Accommodation',
  'EmergencyContact',
  'Honeymoon',
  'EventDetails',
]);

const AuthenticatedApp = () => {
  const location = useLocation();

  // Lowercase /dashboard → canonical dashboard entry point (Daily update)
  if (location.pathname === '/dashboard') {
    return <Navigate to="/DailyUpdate" replace />;
  }

  // ── Public pages — no auth check, render immediately ─────────────────────────
  if (isPublicPath(location.pathname)) {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/About" element={<About />} />
        <Route path="/about" element={<About />} />
        <Route path="/Contact" element={<Contact />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/Pricing" element={<Pricing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/Features" element={<Features />} />
        <Route path="/features" element={<Features />} />
        <Route path="/ava" element={<Ava />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/tour" element={<Tour />} />
        <Route path="/scroll-morph" element={<ScrollMorph />} />
        <Route path="/universes" element={<Universes />} />
        <Route path="/gifting" element={<Gifting />} />
        <Route path="/gift/success" element={<GiftPurchaseSuccess />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/w/:weddingSlug/accommodation" element={<GuestAccommodation />} />
        <Route path="/w/:weddingSlug/music" element={<GuestMusic />} />
        <Route path="/w" element={<InvitationNotAvailable />} />
        <Route path="/w/" element={<InvitationNotAvailable />} />
        <Route path="/w/:weddingSlug" element={<MultiPageWeddingWebsite />} />
        <Route path="/w/:weddingSlug/:page" element={<MultiPageWeddingWebsite />} />
        {/* THIS ROUTE IS PERMANENT. It is a public URL contract: couples have
            already emailed /rsvp/<token> links, and mail sent today may be
            opened years from now. It must never 404, never be renamed, and
            never be deleted "because nothing links to it any more" -- the
            things that link to it are in other people's inboxes.

            It keeps rendering the standalone form for now. Once
            WeddingRSVPPage embeds the real form (PR 3), this becomes a
            redirect into the site at /w/<slug>/rsvp?rsvp=<token>, resolving
            the slug from the token via rsvp-lookup. Redirecting BEFORE that
            embed would send every guest holding a link from a working RSVP
            form to a page that only offers an email box -- a regression of the
            core loop, for exactly the people most likely to be mid-reply. */}
        <Route path="/rsvp/:token" element={<RSVPPage />} />
        <Route path="/games/:token/:questionnaireId" element={<GamesPage />} />
        <Route path="/collaborate/accept/:token" element={<CollaboratorAccept />} />
        <Route path="/GuestRSVP" element={<GuestRSVPRetired />} />
      </Routes>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/signup" element={<Navigate to="/register" replace />} />
      {/* PlanSelection.jsx (superseded by ChoosePlan.jsx, the account-state-
          gated plan step every auth path routes through) had zero inbound
          links anywhere in the app but was still live and auto-routed here
          via pages.config.js's Pages map, showing stale AUD pricing.
          Redirect kept (not a bare 404) since it may have been indexed
          during the AEO/SEO work — explicit route since removing
          "PlanSelection" from pages.config.js's Pages map also removes its
          auto-generated route, same pattern as /GuestSuite below. */}
      <Route path="/PlanSelection" element={<Navigate to="/choose-plan" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        <Route path="/choose-plan" element={<ChoosePlan />} />
        <Route path="/Features" element={<Features />} />
        {Object.entries(Pages).map(([path, Page]) => {
          if (AUTO_ROUTE_EXCLUDE.has(path)) return null;
          return (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              }
            />
          );
        })}
        <Route path="/About" element={<About />} />
        <Route path="/ava" element={<Ava />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/collaborate/guests" element={<CollaboratorGuests />} />
        {/* No explicit /Pricing route here — "Pricing" is also a
            pages.config.js PAGES key, so the auto-loop above already
            declares "/Pricing" (LayoutWrapper-wrapped) earlier in this same
            block; an identical duplicate declared again here was always
            fully shadowed by it, never reachable. Caught by
            scripts/test-route-collisions.mjs. */}
        <Route path="/Contact" element={<Contact />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/scroll-morph" element={<ScrollMorph />} />
        <Route path="/universes" element={<Universes />} />
        <Route path="/gifting" element={<Gifting />} />
        <Route path="/gift/success" element={<GiftPurchaseSuccess />} />
        <Route path="/w/:weddingSlug/accommodation" element={<GuestAccommodation />} />
        <Route path="/w/:weddingSlug/music" element={<GuestMusic />} />
        <Route path="/w" element={<InvitationNotAvailable />} />
        <Route path="/w/" element={<InvitationNotAvailable />} />
        <Route path="/w/:weddingSlug" element={<MultiPageWeddingWebsite />} />
        <Route path="/w/:weddingSlug/:page" element={<MultiPageWeddingWebsite />} />
        <Route path="/website-editor" element={<StudioWebsite />} />
        <Route path="/studio" element={
          <LayoutWrapper currentPageName="StudioHub">
            <StudioHub />
          </LayoutWrapper>
        } />
        <Route path="/studio/website" element={<StudioGuestSuite />} />
        <Route path="/studio/guest-suite" element={<StudioGuestSuite />} />
        <Route path="/studio/guest-suite/assets" element={<StudioGuestSuite />} />
        <Route path="/studio/guest-suite/policies" element={<StudioGuestSuite />} />
        <Route path="/studio/guest-suite/share" element={<StudioGuestSuite />} />
        {/* fix/universe-picker-integrity: consolidated onto the one
            picker (UniverseSelector.jsx) whose ids exactly match
            UNIVERSE_CONFIGS — StudioUniverse.jsx (previously here) had
            5 of 11 ids with no matching universe config at all. */}
        <Route path="/studio/universe" element={
          <LayoutWrapper currentPageName="UniverseStudio">
            <UniverseStudio />
          </LayoutWrapper>
        } />
        {/* chore/consolidate-overview — GuestSuite.jsx ("Overview") is
            retired; Design Studio is the single design home now. Explicit
            redirect since removing "GuestSuite" from pages.config.js's
            Pages map also removes its auto-generated route. */}
        <Route path="/GuestSuite" element={<Navigate to="/studio/universe" replace />} />
        {/* Dev-only Design Studio redesign mocks — unreachable without the
            URL (no nav entry anywhere); do not modify or replace
            /studio/universe above. */}
        <Route path="/mocks/universe/a" element={<LayoutWrapper currentPageName="MockUniverseA"><MockUniverseA /></LayoutWrapper>} />
        <Route path="/mocks/universe/b" element={<LayoutWrapper currentPageName="MockUniverseB"><MockUniverseB /></LayoutWrapper>} />
        <Route path="/mocks/universe/c" element={<LayoutWrapper currentPageName="MockUniverseC"><MockUniverseC /></LayoutWrapper>} />
        {/* AUDIT_2026-07.md S20: canonical for these is the PascalCase
            auto-route (createPageUrl() is what the sidebar actually uses,
            confirmed via grep — none of these are linked internally at
            all, so the PAGES-map default wins) — redirect the unused
            kebab-case duplicate rather than rendering the page twice.
            /music needs no redirect route of its own: React Router v6
            matches paths case-insensitively by default, so it already
            resolves to the earlier-declared /Music auto-route directly —
            confirmed live, a separate redirect route is unreachable dead
            code. (Florals.jsx — the same case for /florals — was deleted
            outright in the round-6 vendor-consolidation pass: it was an
            orphaned, unreachable duplicate of Styling.jsx's Flowers tab,
            not just a redirect-route question.) */}
        <Route path="/food-beverage" element={<Navigate to="/FoodBeverage" replace />} />
        <Route path="/entertainment-details" element={<Navigate to="/EntertainmentDetails" replace />} />
        {/* Canonical for these five — confirmed via grep that the sidebar
            hardcodes exactly this kebab-case URL for each. The PascalCase
            auto-route is excluded above (AUTO_ROUTE_EXCLUDE) rather than
            redirected here, since a same-path self-redirect left these
            pages blank — see the AUTO_ROUTE_EXCLUDE comment for why. */}
        <Route path="/transport" element={<LayoutWrapper currentPageName="Transport"><Transport /></LayoutWrapper>} />
        <Route path="/accommodation" element={<LayoutWrapper currentPageName="Accommodation"><Accommodation /></LayoutWrapper>} />
        <Route path="/ceremony-details" element={<LayoutWrapper currentPageName="CeremonyDetails"><CeremonyDetails /></LayoutWrapper>} />
        <Route path="/honeymoon" element={<LayoutWrapper currentPageName="Honeymoon"><Honeymoon /></LayoutWrapper>} />
        <Route path="/emergency-contact" element={<LayoutWrapper currentPageName="EmergencyContact"><EmergencyContact /></LayoutWrapper>} />
        <Route path="/wedding-party" element={<LayoutWrapper currentPageName="WeddingParty"><WeddingParty /></LayoutWrapper>} />
        <Route path="/wedding-favours" element={<LayoutWrapper currentPageName="WeddingFavours"><WeddingFavours /></LayoutWrapper>} />
        <Route path="/event-details" element={<LayoutWrapper currentPageName="EventDetails"><EventDetails /></LayoutWrapper>} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/studio/ava" element={<LayoutWrapper currentPageName="AvaStudio"><AvaStudio /></LayoutWrapper>} />
        <Route path="/studio/ava/website" element={<AvaStudioWebsite />} />
        <Route path="/studio/ava/website/:step" element={<AvaStudioWebsite />} />
        <Route path="/studio/ava/assets" element={<AvaStudioAssets />} />
        <Route path="/studio/ava/assets/:step" element={<AvaStudioAssets />} />
        {/* No explicit /onboarding route here — "Onboarding" is also a
            pages.config.js PAGES key, so the auto-loop above already
            declares "/Onboarding" (case-insensitively equal, earlier in
            this same block); a lowercase duplicate declared again here was
            always fully shadowed by it, never reachable. Caught by
            scripts/test-route-collisions.mjs. */}
        <Route path="/help" element={<LayoutWrapper currentPageName="Help"><Help /></LayoutWrapper>} />
        <Route path="/account" element={<LayoutWrapper currentPageName="Account"><Account /></LayoutWrapper>} />
        <Route path="/admin" element={<LayoutWrapper currentPageName="Admin"><Admin /></LayoutWrapper>} />
        <Route path="/dev-reset" element={<DevReset />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CurrencyProvider>
          <Router>
            <ScrollToTop />
            <NavigationTracker />
            <Suspense fallback={<RouteLoadingFallback />}>
              <AuthenticatedApp />
            </Suspense>
          </Router>
          <Toaster />
          <VisualEditAgent />
        </CurrencyProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App