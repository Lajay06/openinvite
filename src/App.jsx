import React, { useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"
import ScrollToTop from "@/components/ScrollToTop"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { base44 } from '@/api/base44Client';
import { show as crispShow, hide as crispHide } from '@/lib/crisp';
import DevReset from './pages/DevReset';
import About from './pages/About';
import Ava from './pages/Ava';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import DataDeletion from './pages/DataDeletion';
import RefundPolicy from './pages/RefundPolicy';
import ScrollMorph from './pages/ScrollMorph';
import GuestWebsite from './pages/GuestWebsite';
import WeddingWebsiteEditor from './pages/WeddingWebsiteEditor';
import Universes from './pages/Universes';
import Onboarding from './pages/Onboarding';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import MultiPageWeddingWebsite from './components/guest-website/MultiPageWeddingWebsite';
import RSVPPage from './components/rsvp/RSVPPage';
import GuestRSVPRetired from './pages/GuestRSVPRetired';
import UniverseStudio from './pages/UniverseStudio';
import StudioHub from './pages/StudioHub';
import StudioWebsite from './pages/StudioWebsite';
import StudioUniverse from './pages/StudioUniverse';
import FoodBeverage from './pages/FoodBeverage';
import PhotographyDetails from './pages/PhotographyDetails';
import Florals from './pages/Florals';
import EntertainmentDetails from './pages/EntertainmentDetails';
import Transport from './pages/Transport';
import Accommodation from './pages/Accommodation';
import GuestTransport from './pages/GuestTransport';
import GuestAccommodation from './pages/GuestAccommodation';
import GuestMusic from './pages/GuestMusic';
import Music from './pages/Music';
import CeremonyDetails from './pages/CeremonyDetails';
import Honeymoon from './pages/Honeymoon';
import EmergencyContact from './pages/EmergencyContact';
import LiveStreaming from './pages/LiveStreaming';
import WeddingParty from './pages/WeddingParty';
import WeddingFavours from './pages/WeddingFavours';
import EventDetails from './pages/EventDetails';
import PaymentSuccess from './pages/PaymentSuccess';
import StudioAman from './pages/StudioAman';
import StudioTulum from './pages/StudioTulum';
import StudioKyoto from './pages/StudioKyoto';
import StudioCapri from './pages/StudioCapri';
import StudioTokyo from './pages/StudioTokyo';
import StudioMarrakech from './pages/StudioMarrakech';
import StudioParis from './pages/StudioParis';
import StudioAmalfi from './pages/StudioAmalfi';
import StudioSedona from './pages/StudioSedona';
import StudioAspen from './pages/StudioAspen';
import StudioSantorini from './pages/StudioSantorini';
import StudioShare from './pages/StudioShare';
import AvaStudio from './pages/AvaStudio';
import AvaStudioWebsite from './pages/AvaStudioWebsite';
import AvaStudioAssets from './pages/AvaStudioAssets';
import Help from './pages/Help';
import Account from './pages/Account';
import Admin from './pages/Admin';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import StudioGuestSuite from './pages/StudioGuestSuite';
import ExperienceGuide from './pages/ExperienceGuide';
import Features from './pages/Features';
import Home from './pages/Home';

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
  PUBLIC_PATH_SET.has(pathname) || pathname.startsWith('/w/') || pathname.startsWith('/rsvp/');

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const location = useLocation();

  // Hide Crisp on public marketing pages; show inside the app
  useEffect(() => {
    const p = location.pathname;
    const hide = p === '/' || p === '/Pricing' || p === '/pricing';
    hide ? crispHide() : crispShow();
  }, [location.pathname]);

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
        <Route path="/w/:weddingSlug/transport" element={<GuestTransport />} />
        <Route path="/w/:weddingSlug/music" element={<GuestMusic />} />
        <Route path="/w/:weddingSlug/experience" element={<ExperienceGuide />} />
        <Route path="/w/:weddingSlug" element={<MultiPageWeddingWebsite />} />
        <Route path="/w/:weddingSlug/:page" element={<MultiPageWeddingWebsite />} />
        <Route path="/rsvp/:token" element={<RSVPPage />} />
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
        <Route path="/w/:weddingSlug/transport" element={<GuestTransport />} />
        <Route path="/w/:weddingSlug/music" element={<GuestMusic />} />
        <Route path="/w/:weddingSlug/experience" element={<ExperienceGuide />} />
        <Route path="/w/:weddingSlug" element={<MultiPageWeddingWebsite />} />
        <Route path="/w/:weddingSlug/:page" element={<MultiPageWeddingWebsite />} />
        <Route path="/website-editor" element={<StudioWebsite />} />
        <Route path="/universe-studio" element={
          <LayoutWrapper currentPageName="UniverseStudio">
            <UniverseStudio />
          </LayoutWrapper>
        } />
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
        <Route path="/studio/universe" element={
          <LayoutWrapper currentPageName="StudioUniverse">
            <StudioUniverse />
          </LayoutWrapper>
        } />
        <Route path="/food-beverage" element={<LayoutWrapper currentPageName="FoodBeverage"><FoodBeverage /></LayoutWrapper>} />
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
        <Route path="/studio/universe/aman" element={<StudioAman />} />
        <Route path="/studio/universe/tulum" element={<StudioTulum />} />
        <Route path="/studio/universe/kyoto" element={<StudioKyoto />} />
        <Route path="/studio/universe/capri" element={<StudioCapri />} />
        <Route path="/studio/universe/tokyo" element={<StudioTokyo />} />
        <Route path="/studio/universe/marrakech" element={<StudioMarrakech />} />
        <Route path="/studio/universe/paris" element={<StudioParis />} />
        <Route path="/studio/universe/amalfi" element={<StudioAmalfi />} />
        <Route path="/studio/universe/sedona" element={<StudioSedona />} />
        <Route path="/studio/universe/aspen" element={<StudioAspen />} />
        <Route path="/studio/universe/santorini" element={<StudioSantorini />} />
        <Route path="/studio/share" element={<StudioShare />} />
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
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <VisualEditAgent />
        </CurrencyProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App