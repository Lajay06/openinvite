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
 * AUDIT_2026-07.md B1: every page below is lazy-loaded (React.lazy, via the
 * lazyWithReload() wrapper — see src/lib/lazyWithReload.js) rather than
 * statically imported, so each becomes its own chunk instead of all ~55
 * dashboard pages shipping in one bundle regardless of which page a couple
 * actually visits. __Layout stays a static import — it's app shell chrome
 * needed on every authenticated page, not a route body.
 */
import __Layout from './Layout.jsx';
import { lazyWithReload } from './lib/lazyWithReload.js';

const Accommodation = lazyWithReload(() => import('./pages/Accommodation'));
const Budget = lazyWithReload(() => import('./pages/Budget'));
const CeremonyDetails = lazyWithReload(() => import('./pages/CeremonyDetails'));
const EmergencyContact = lazyWithReload(() => import('./pages/EmergencyContact'));
const EntertainmentDetails = lazyWithReload(() => import('./pages/EntertainmentDetails'));
const FoodBeverage = lazyWithReload(() => import('./pages/FoodBeverage'));
const Honeymoon = lazyWithReload(() => import('./pages/Honeymoon'));
const Transport = lazyWithReload(() => import('./pages/Transport'));
const ScheduleHub = lazyWithReload(() => import('./pages/ScheduleHub'));
const TasksHub = lazyWithReload(() => import('./pages/TasksHub'));
const Considerations = lazyWithReload(() => import('./pages/Considerations'));
const Dashboard = lazyWithReload(() => import('./pages/Dashboard'));
const EventDetails = lazyWithReload(() => import('./pages/EventDetails'));
const Features = lazyWithReload(() => import('./pages/Features'));
const GuestExperience = lazyWithReload(() => import('./pages/GuestExperience'));
const GuestSuiteQandA = lazyWithReload(() => import('./pages/GuestSuiteQandA'));
const GuestSuiteSchedule = lazyWithReload(() => import('./pages/GuestSuiteSchedule'));
const GuestSuiteAccommodation = lazyWithReload(() => import('./pages/GuestSuiteAccommodation'));
const GuestSuiteTransport = lazyWithReload(() => import('./pages/GuestSuiteTransport'));
const GuestSuiteRegistry = lazyWithReload(() => import('./pages/GuestSuiteRegistry'));
const GuestSuitePolls = lazyWithReload(() => import('./pages/GuestSuitePolls'));
const GuestSuiteExperience = lazyWithReload(() => import('./pages/GuestSuiteExperience'));
const GuestSuitePolicies = lazyWithReload(() => import('./pages/GuestSuitePolicies'));
const Guests = lazyWithReload(() => import('./pages/Guests'));
const Home = lazyWithReload(() => import('./pages/Home'));
const Invitations = lazyWithReload(() => import('./pages/Invitations'));
const Messages = lazyWithReload(() => import('./pages/Messages'));
const Moodboard = lazyWithReload(() => import('./pages/Moodboard'));
const Music = lazyWithReload(() => import('./pages/Music'));
const Onboarding = lazyWithReload(() => import('./pages/Onboarding'));
const OurStory = lazyWithReload(() => import('./pages/OurStory'));
const PhotoGallery = lazyWithReload(() => import('./pages/PhotoGallery'));
const Photography = lazyWithReload(() => import('./pages/Photography'));
const Policies = lazyWithReload(() => import('./pages/Policies'));
const Pricing = lazyWithReload(() => import('./pages/Pricing'));
const Registry = lazyWithReload(() => import('./pages/Registry'));
const Seating = lazyWithReload(() => import('./pages/Seating'));
const Styling = lazyWithReload(() => import('./pages/Styling'));
const Vendors = lazyWithReload(() => import('./pages/Vendors'));
const VowsSpeeches = lazyWithReload(() => import('./pages/VowsSpeeches'));
const VendorMarketplace = lazyWithReload(() => import('./pages/VendorMarketplace'));
const QandA = lazyWithReload(() => import('./pages/QandA'));
const Polls = lazyWithReload(() => import('./pages/Polls'));
const Beauty = lazyWithReload(() => import('./pages/Beauty'));
const DailyUpdate = lazyWithReload(() => import('./pages/DailyUpdate'));

export const PAGES = {
    "Accommodation": Accommodation,
    "Budget": Budget,
    "CeremonyDetails": CeremonyDetails,
    "EmergencyContact": EmergencyContact,
    "EntertainmentDetails": EntertainmentDetails,
    "FoodBeverage": FoodBeverage,
    "Honeymoon": Honeymoon,
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
    "GuestSuiteExperience": GuestSuiteExperience,
    "GuestSuitePolicies": GuestSuitePolicies,
    "Guests": Guests,
    "Home": Home,
    "Invitations": Invitations,
    "Messages": Messages,
    "Moodboard": Moodboard,
    "Music": Music,
    "Onboarding": Onboarding,
    "OurStory": OurStory,
    "PhotoGallery": PhotoGallery,
    "Photography": Photography,
    "Policies": Policies,
    "Pricing": Pricing,
    "Registry": Registry,
    "Schedule": ScheduleHub,
    "Seating": Seating,
    "Styling": Styling,
    "TodoList": TasksHub,
    "Vendors": Vendors,
    "VowsSpeeches": VowsSpeeches,
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
