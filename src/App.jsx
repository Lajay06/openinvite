import React, { lazy, Suspense } from 'react'
import { Toaster } from "@/components/ui/toaster"
import ScrollToTop from "@/components/ScrollToTop"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { base44 } from '@/api/base44Client';
import ProtectedRoute from '@/components/ProtectedRoute';
import RouteLoadingFallback from '@/components/shared/RouteLoadingFallback';

// AUDIT_2026-07.md B1: every page below is lazy-loaded so each becomes its
// own chunk — a marketing-site visitor no longer downloads the entire
// authenticated dashboard's code, and vice versa.
const NotFound = lazy(() => import('./pages/NotFound'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const DevReset = lazy(() => import('./pages/DevReset'));
const About = lazy(() => import('./pages/About'));
const Ava = lazy(() => import('./pages/Ava'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Contact = lazy(() => import('./pages/Contact'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const DataDeletion = lazy(() => import('./pages/DataDeletion'));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));
const ScrollMorph = lazy(() => import('./pages/ScrollMorph'));
const Universes = lazy(() => import('./pages/Universes'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const MultiPageWeddingWebsite = lazy(() => import('./components/guest-website/MultiPageWeddingWebsite'));
const RSVPPage = lazy(() => import('./components/rsvp/RSVPPage'));
const GamesPage = lazy(() => import('./components/games/GamesPage'));
const CollaboratorAccept = lazy(() => import('./pages/CollaboratorAccept'));
const CollaboratorGuests = lazy(() => import('./pages/CollaboratorGuests'));
// Dev-only shared vendor-template mocks — not linked from any nav, not
// reachable without the URL. Does NOT touch Beauty.jsx/FoodBeverage.jsx or
// any real page; own new files only (src/components/mocks/VendorTemplateMock.jsx,
// src/pages/MockVendorTemplateBeauty.jsx, src/pages/MockVendorTemplateFoodBeverage.jsx).
const MockVendorTemplateBeauty = lazy(() => import('./pages/MockVendorTemplateBeauty'));
const MockVendorTemplateFoodBeverage = lazy(() => import('./pages/MockVendorTemplateFoodBeverage'));
const GuestRSVPRetired = lazy(() => import('./pages/GuestRSVPRetired'));
const UniverseStudio = lazy(() => import('./pages/UniverseStudio'));
const StudioHub = lazy(() => import('./pages/StudioHub'));
const StudioWebsite = lazy(() => import('./pages/StudioWebsite'));
const FoodBeverage = lazy(() => import('./pages/FoodBeverage'));
const PhotographyDetails = lazy(() => import('./pages/PhotographyDetails'));
const Florals = lazy(() => import('./pages/Florals'));
const EntertainmentDetails = lazy(() => import('./pages/EntertainmentDetails'));
const Transport = lazy(() => import('./pages/Transport'));
const Accommodation = lazy(() => import('./pages/Accommodation'));
const GuestAccommodation = lazy(() => import('./pages/GuestAccommodation'));
const GuestMusic = lazy(() => import('./pages/GuestMusic'));
const Music = lazy(() => import('./pages/Music'));
const CeremonyDetails = lazy(() => import('./pages/CeremonyDetails'));
const Honeymoon = lazy(() => import('./pages/Honeymoon'));
const EmergencyContact = lazy(() => import('./pages/EmergencyContact'));
const LiveStreaming = lazy(() => import('./pages/LiveStreaming'));
const WeddingParty = lazy(() => import('./pages/WeddingParty'));
const WeddingFavours = lazy(() => import('./pages/WeddingFavours'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const AvaStudio = lazy(() => import('./pages/AvaStudio'));
const AvaStudioWebsite = lazy(() => import('./pages/AvaStudioWebsite'));
const AvaStudioAssets = lazy(() => import('./pages/AvaStudioAssets'));
const Help = lazy(() => import('./pages/Help'));
const Account = lazy(() => import('./pages/Account'));
const Admin = lazy(() => import('./pages/Admin'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const StudioGuestSuite = lazy(() => import('./pages/StudioGuestSuite'));
// Dev-only Design Studio redesign mocks — not linked from any nav, not
// used by the real DesignStudio (UniverseStudio.jsx) route. See each
// file's header comment.
const MockUniverseA = lazy(() => import('./pages/MockUniverseA'));
const MockUniverseB = lazy(() => import('./pages/MockUniverseB'));
const MockUniverseC = lazy(() => import('./pages/MockUniverseC'));
const Features = lazy(() => import('./pages/Features'));
const Home = lazy(() => import('./pages/Home'));

// ── Public paths — bypass auth check entirely ─────────────────────────────────
const PUBLIC_PATH_SET = new Set([
  '/',
  '/About', '/about',
  '/Contact', '/contact',
  '/Pricing', '/pricing',
  '/Features', '/features',
  '/ava',
  '/scroll-morph',
  '/universes',
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

const AuthenticatedApp = () => {
  const location = useLocation();

  // Lowercase /dashboard → canonical /Dashboard
  if (location.pathname === '/dashboard') {
    return <Navigate to="/Dashboard" replace />;
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
        <Route path="/scroll-morph" element={<ScrollMorph />} />
        <Route path="/universes" element={<Universes />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/w/:weddingSlug/accommodation" element={<GuestAccommodation />} />
        <Route path="/w/:weddingSlug/music" element={<GuestMusic />} />
        <Route path="/w/:weddingSlug" element={<MultiPageWeddingWebsite />} />
        <Route path="/w/:weddingSlug/:page" element={<MultiPageWeddingWebsite />} />
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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        <Route path="/Features" element={<Features />} />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="/About" element={<About />} />
        <Route path="/ava" element={<Ava />} />
        <Route path="/collaborate/guests" element={<CollaboratorGuests />} />
        <Route path="/Pricing" element={<Pricing />} />
        <Route path="/Contact" element={<Contact />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/scroll-morph" element={<ScrollMorph />} />
        <Route path="/universes" element={<Universes />} />
        <Route path="/w/:weddingSlug/accommodation" element={<GuestAccommodation />} />
        <Route path="/w/:weddingSlug/music" element={<GuestMusic />} />
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
        <Route path="/food-beverage" element={<LayoutWrapper currentPageName="FoodBeverage"><FoodBeverage /></LayoutWrapper>} />
        {/* Dev-only vendor-template mocks (Beauty/Music/Food & beverage/Photography
            unification) — see import comment above. */}
        <Route path="/mocks/vendor-template/beauty" element={<LayoutWrapper currentPageName="MockVendorTemplateBeauty"><MockVendorTemplateBeauty /></LayoutWrapper>} />
        <Route path="/mocks/vendor-template/food" element={<LayoutWrapper currentPageName="MockVendorTemplateFoodBeverage"><MockVendorTemplateFoodBeverage /></LayoutWrapper>} />
        <Route path="/photography-details" element={<LayoutWrapper currentPageName="PhotographyDetails"><PhotographyDetails /></LayoutWrapper>} />
        <Route path="/florals" element={<LayoutWrapper currentPageName="Florals"><Florals /></LayoutWrapper>} />
        <Route path="/entertainment-details" element={<LayoutWrapper currentPageName="EntertainmentDetails"><EntertainmentDetails /></LayoutWrapper>} />
        <Route path="/transport" element={<LayoutWrapper currentPageName="Transport"><Transport /></LayoutWrapper>} />
        <Route path="/music" element={<LayoutWrapper currentPageName="Music"><Music /></LayoutWrapper>} />
        <Route path="/accommodation" element={<LayoutWrapper currentPageName="Accommodation"><Accommodation /></LayoutWrapper>} />
        <Route path="/ceremony-details" element={<LayoutWrapper currentPageName="CeremonyDetails"><CeremonyDetails /></LayoutWrapper>} />
        <Route path="/honeymoon" element={<LayoutWrapper currentPageName="Honeymoon"><Honeymoon /></LayoutWrapper>} />
        <Route path="/emergency-contact" element={<LayoutWrapper currentPageName="EmergencyContact"><EmergencyContact /></LayoutWrapper>} />
        <Route path="/LiveStreaming" element={<LayoutWrapper currentPageName="LiveStreaming"><LiveStreaming /></LayoutWrapper>} />
        <Route path="/wedding-party" element={<LayoutWrapper currentPageName="WeddingParty"><WeddingParty /></LayoutWrapper>} />
        <Route path="/wedding-favours" element={<LayoutWrapper currentPageName="WeddingFavours"><WeddingFavours /></LayoutWrapper>} />
        <Route path="/event-details" element={<LayoutWrapper currentPageName="EventDetails"><EventDetails /></LayoutWrapper>} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/studio/ava" element={<AvaStudio />} />
        <Route path="/studio/ava/website" element={<AvaStudioWebsite />} />
        <Route path="/studio/ava/website/:step" element={<AvaStudioWebsite />} />
        <Route path="/studio/ava/assets" element={<AvaStudioAssets />} />
        <Route path="/studio/ava/assets/:step" element={<AvaStudioAssets />} />
        <Route path="/onboarding" element={<Onboarding />} />
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