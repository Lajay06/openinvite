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
 */
import Accommodation from './pages/Accommodation';
import Budget from './pages/Budget';
import CeremonyDetails from './pages/CeremonyDetails';
import EmergencyContact from './pages/EmergencyContact';
import EntertainmentDetails from './pages/EntertainmentDetails';
import Florals from './pages/Florals';
import FoodBeverage from './pages/FoodBeverage';
import Honeymoon from './pages/Honeymoon';
import PhotographyDetails from './pages/PhotographyDetails';
import Transport from './pages/Transport';
import Calendar from './pages/Calendar';
import Catering from './pages/Catering';
import Checklist from './pages/Checklist';
import Considerations from './pages/Considerations';
import CouplesStudio from './pages/CouplesStudio';
import Dashboard from './pages/Dashboard';
import EventDetails from './pages/EventDetails';
import Features from './pages/Features';
import GuestExperience from './pages/GuestExperience';
import GuestRSVP from './pages/GuestRSVP';
import GuestSuite from './pages/GuestSuite';
import Guests from './pages/Guests';
import Home from './pages/Home';
import Invitations from './pages/Invitations';
import LiveStreaming from './pages/LiveStreaming';
import Messages from './pages/Messages';
import Moodboard from './pages/Moodboard';
import Music from './pages/Music';
import Notes from './pages/Notes';
import Onboarding from './pages/Onboarding';
import OurStory from './pages/OurStory';
import PhotoGallery from './pages/PhotoGallery';
import Photography from './pages/Photography';
import PlanSelection from './pages/PlanSelection';
import Policies from './pages/Policies';
import Pricing from './pages/Pricing';
import Registry from './pages/Registry';
import Schedule from './pages/Schedule';
import Seating from './pages/Seating';
import Styling from './pages/Styling';
import Theme from './pages/Theme';
import Vendors from './pages/Vendors';
import VowsSpeeches from './pages/VowsSpeeches';
import WebsiteCustomization from './pages/WebsiteCustomization';
import WeddingWebsite from './pages/WeddingWebsite';
import VendorMarketplace from './pages/VendorMarketplace';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Accommodation": Accommodation,
    "Budget": Budget,
    "CeremonyDetails": CeremonyDetails,
    "EmergencyContact": EmergencyContact,
    "EntertainmentDetails": EntertainmentDetails,
    "Florals": Florals,
    "FoodBeverage": FoodBeverage,
    "Honeymoon": Honeymoon,
    "PhotographyDetails": PhotographyDetails,
    "Transport": Transport,
    "Calendar": Calendar,
    "Catering": Catering,
    "Checklist": Checklist,
    "Considerations": Considerations,
    "CouplesStudio": CouplesStudio,
    "Dashboard": Dashboard,
    "EventDetails": EventDetails,
    "Features": Features,
    "GuestExperience": GuestExperience,
    "GuestRSVP": GuestRSVP,
    "GuestSuite": GuestSuite,
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
    "Schedule": Schedule,
    "Seating": Seating,
    "Styling": Styling,
    "Theme": Theme,
    "Vendors": Vendors,
    "VowsSpeeches": VowsSpeeches,
    "WebsiteCustomization": WebsiteCustomization,
    "WeddingWebsite": WeddingWebsite,
    "VendorMarketplace": VendorMarketplace,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};