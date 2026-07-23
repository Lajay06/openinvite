/**
 * pages.config.js - Page routing configuration
 *
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 *
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 *
 * Example file structure:
 *
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 *
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 *
 * AUDIT_2026-07.md B1: every page below is lazy-loaded (React.lazy) rather
 * than statically imported, so each becomes its own chunk instead of all
 * ~55 dashboard pages shipping in one bundle regardless of which page a
 * couple actually visits. __Layout stays a static import — it's app shell
 * chrome needed on every authenticated page, not a route body.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const Accommodation = lazy(() => import('./pages/Accommodation'));
const Budget = lazy(() => import('./pages/Budget'));
const CeremonyDetails = lazy(() => import('./pages/CeremonyDetails'));
const EmergencyContact = lazy(() => import('./pages/EmergencyContact'));
const EntertainmentDetails = lazy(() => import('./pages/EntertainmentDetails'));
const FoodBeverage = lazy(() => import('./pages/FoodBeverage'));
const Honeymoon = lazy(() => import('./pages/Honeymoon'));
const PhotographyDetails = lazy(() => import('./pages/PhotographyDetails'));
const Transport = lazy(() => import('./pages/Transport'));
const ScheduleHub = lazy(() => import('./pages/ScheduleHub'));
const TasksHub = lazy(() => import('./pages/TasksHub'));
const Considerations = lazy(() => import('./pages/Considerations'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const Features = lazy(() => import('./pages/Features'));
const GuestExperience = lazy(() => import('./pages/GuestExperience'));
const GuestSuiteQandA = lazy(() => import('./pages/GuestSuiteQandA'));
const GuestSuiteSchedule = lazy(() => import('./pages/GuestSuiteSchedule'));
const GuestSuiteAccommodation = lazy(() => import('./pages/GuestSuiteAccommodation'));
const GuestSuiteTransport = lazy(() => import('./pages/GuestSuiteTransport'));
const GuestSuiteRegistry = lazy(() => import('./pages/GuestSuiteRegistry'));
const GuestSuitePolls = lazy(() => import('./pages/GuestSuitePolls'));
const GuestSuiteLiveStream = lazy(() => import('./pages/GuestSuiteLiveStream'));
const GuestSuiteExperience = lazy(() => import('./pages/GuestSuiteExperience'));
const GuestSuitePolicies = lazy(() => import('./pages/GuestSuitePolicies'));
const Guests = lazy(() => import('./pages/Guests'));
const Home = lazy(() => import('./pages/Home'));
const Invitations = lazy(() => import('./pages/Invitations'));
const LiveStreaming = lazy(() => import('./pages/LiveStreaming'));
const Messages = lazy(() => import('./pages/Messages'));
const Moodboard = lazy(() => import('./pages/Moodboard'));
const Music = lazy(() => import('./pages/Music'));
const Notes = lazy(() => import('./pages/Notes'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const OurStory = lazy(() => import('./pages/OurStory'));
const PhotoGallery = lazy(() => import('./pages/PhotoGallery'));
const Photography = lazy(() => import('./pages/Photography'));
const PlanSelection = lazy(() => import('./pages/PlanSelection'));
const Policies = lazy(() => import('./pages/Policies'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Registry = lazy(() => import('./pages/Registry'));
const Seating = lazy(() => import('./pages/Seating'));
const Styling = lazy(() => import('./pages/Styling'));
const Vendors = lazy(() => import('./pages/Vendors'));
const VowsSpeeches = lazy(() => import('./pages/VowsSpeeches'));
const WeddingWebsite = lazy(() => import('./pages/WeddingWebsite'));
const VendorMarketplace = lazy(() => import('./pages/VendorMarketplace'));
const QandA = lazy(() => import('./pages/QandA'));
const Polls = lazy(() => import('./pages/Polls'));
const Beauty = lazy(() => import('./pages/Beauty'));
const DailyUpdate = lazy(() => import('./pages/DailyUpdate'));

export const PAGES = {
    "Accommodation": Accommodation,
    "Budget": Budget,
    "CeremonyDetails": CeremonyDetails,
    "EmergencyContact": EmergencyContact,
    "EntertainmentDetails": EntertainmentDetails,
    "FoodBeverage": FoodBeverage,
    "Honeymoon": Honeymoon,
    "PhotographyDetails": PhotographyDetails,
    "Transport": Transport,
    "Calendar": ScheduleHub,
    "Checklist": TasksHub,
    "Considerations": Considerations,
    "Dashboard": Dashboard,
    "EventDetails": EventDetails,
    "Features": Features,
    "GuestExperience": GuestExperience,
    "GuestSuiteQandA": GuestSuiteQandA,
    "GuestSuiteSchedule": GuestSuiteSchedule,
    "GuestSuiteAccommodation": GuestSuiteAccommodation,
    "GuestSuiteTransport": GuestSuiteTransport,
    "GuestSuiteRegistry": GuestSuiteRegistry,
    "GuestSuitePolls": GuestSuitePolls,
    "GuestSuiteLiveStream": GuestSuiteLiveStream,
    "GuestSuiteExperience": GuestSuiteExperience,
    "GuestSuitePolicies": GuestSuitePolicies,
    "Guests": Guests,
    "Home": Home,
    "Invitations": Invitations,
    "LiveStreaming": LiveStreaming,
    "Messages": Messages,
    "Moodboard": Moodboard,
    "Music": Music,
    "Notes": Notes,
    "Onboarding": Onboarding,
    "OurStory": OurStory,
    "PhotoGallery": PhotoGallery,
    "Photography": Photography,
    "PlanSelection": PlanSelection,
    "Policies": Policies,
    "Pricing": Pricing,
    "Registry": Registry,
    "Schedule": ScheduleHub,
    "Seating": Seating,
    "Styling": Styling,
    "TodoList": TasksHub,
    "Vendors": Vendors,
    "VowsSpeeches": VowsSpeeches,
    "WeddingWebsite": WeddingWebsite,
    "VendorMarketplace": VendorMarketplace,
    "QandA": QandA,
    "Polls": Polls,
    "Beauty": Beauty,
    "DailyUpdate": DailyUpdate,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
