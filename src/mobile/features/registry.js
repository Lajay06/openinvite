/**
 * src/mobile/features/registry.js
 *
 * Every couple-facing feature, in the desktop sidebar's groups and order
 * (src/components/layout/AnimatedSidebar.jsx is the source of truth). The
 * Plan hub, the coverage table in MOBILE_APP.md, global search and the
 * "keep planning" carousel all read this list.
 *
 * kind
 *   entity   a list of base44 records with add / edit / delete (EntityListScreen)
 *   details  a sub-object of WeddingDetails, edited as a form (DetailsScreen)
 *   custom   its own screen under src/mobile/screens/plan/
 *   desktop  view-only here; a hand-off to the desktop page
 *
 * depth: full | light | view
 *
 * stat(d) reads the Plan hub's loaded data (see usePlanData) and returns
 * one short live figure for the tile.
 */
import {
  Calendar, ListTodo, Users, BarChart2, MessageCircle, LayoutGrid, UserCheck, Image, Palette, Sparkles,
  UtensilsCrossed, Music2, Camera, FileText, Package, Store, ShoppingBag, Heart, Car, Hotel, Phone, Wallet,
  Gift, Clock, HelpCircle, MapPin, ScrollText, Plane, Lightbulb, Mail, Send, CalendarDays,
} from 'lucide-react';
import { imageUrl } from '../images';
import { money } from '../lib/format';

const n = (v) => (Array.isArray(v) ? v.length : 0);
const count = (arr, label) => `${n(arr)} ${n(arr) === 1 ? label : `${label}s`}`;

export const GROUPS = [
  { key: 'planning', label: 'Planning' },
  { key: 'guests', label: 'Guests' },
  { key: 'style', label: 'Style & experience' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'day', label: 'On the day' },
  { key: 'finances', label: 'Finances' },
  { key: 'suite', label: 'Guest suite' },
  { key: 'extras', label: 'Extras' },
];

export const FEATURES = [
  // Planning
  { key: 'event-details', group: 'planning', label: 'Event details', icon: CalendarDays, desktop: '/event-details', path: 'event-details', image: imageUrl('tileEventDetails'), kind: 'details', depth: 'full',
    stat: (d) => (d.details?.weddingDate ? new Date(`${d.details.weddingDate}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'Add your date') },
  { key: 'schedule', group: 'planning', label: 'Schedule', icon: Calendar, desktop: '/Schedule', path: 'schedule', image: imageUrl('tileSchedule'), kind: 'entity', depth: 'full',
    stat: (d) => count(d.schedule, 'event') },
  { key: 'checklist', group: 'planning', label: 'To do', icon: ListTodo, desktop: '/TodoList', path: 'checklist', image: imageUrl('tileChecklist'), kind: 'custom', depth: 'full',
    stat: (d) => { const open = (d.tasks || []).filter((t) => !t.completed).length; return open ? `${open} open` : 'All done'; } },
  // Guests
  { key: 'guest-list', group: 'guests', label: 'Guest list', icon: Users, desktop: '/Guests', path: '../guests', image: imageUrl('tileGuests'), kind: 'custom', depth: 'full',
    stat: (d) => { const a = (d.guests || []).filter((g) => g.invite_sent_at && (!g.rsvp_status || g.rsvp_status === 'pending')).length; return a ? `${a} awaiting` : count(d.guests, 'guest'); } },
  { key: 'polls', group: 'guests', label: 'Polls & games', icon: BarChart2, desktop: '/Polls', path: 'polls', image: imageUrl('tilePolls'), kind: 'custom', depth: 'full',
    stat: (d) => count(d.details?.polls, 'poll') },
  { key: 'messages', group: 'guests', label: 'Messages', icon: MessageCircle, desktop: '/Messages', path: 'messages', image: imageUrl('tileMessages'), kind: 'custom', depth: 'full',
    stat: (d) => { const u = (d.messages || []).filter((m) => !m.read).length; return u ? `${u} unread` : count(d.messages, 'message'); } },
  { key: 'seating', group: 'guests', label: 'Seating', icon: LayoutGrid, desktop: '/Seating', path: 'seating', image: imageUrl('tileSeating'), kind: 'custom', depth: 'view',
    stat: (d) => count(d.tables, 'table') },
  { key: 'wedding-party', group: 'guests', label: 'Wedding party', icon: UserCheck, desktop: '/wedding-party', path: 'wedding-party', image: imageUrl('tileWeddingParty'), kind: 'custom', depth: 'full',
    stat: (d) => { const wp = d.details?.weddingParty || {}; const c = Object.values(wp).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0); return c ? `${c} people` : 'Add your people'; } },
  { key: 'send-invites', group: 'guests', label: 'Send invites', icon: Send, desktop: '/SendInvites', path: 'send-invites', kind: 'desktop', depth: 'view',
    stat: (d) => { const s = (d.guests || []).filter((g) => g.invite_sent_at).length; return s ? `${s} sent` : 'Not sent yet'; } },
  { key: 'invitations', group: 'guests', label: 'Invitations', icon: Mail, desktop: '/Invitations', path: 'invitations', kind: 'desktop', depth: 'view', stat: () => 'Design on desktop' },
  // Style & experience
  { key: 'moodboard', group: 'style', label: 'Moodboard', icon: Image, desktop: '/Moodboard', path: 'moodboard', image: imageUrl('tileMoodboard'), kind: 'entity', depth: 'full',
    stat: (d) => count(d.moodboard, 'pin') },
  { key: 'styling', group: 'style', label: 'Styling', icon: Palette, desktop: '/Styling', path: 'styling', image: imageUrl('tileStyling'), kind: 'details', depth: 'light',
    stat: (d) => (d.details?.flowers?.bouquet || d.details?.decorations?.theme ? 'In progress' : 'Start here') },
  { key: 'beauty', group: 'style', label: 'Beauty', icon: Sparkles, desktop: '/Beauty', path: 'beauty', image: imageUrl('tileBeauty'), kind: 'details', depth: 'light',
    stat: (d) => { const b = (d.vendors || []).filter((v) => v.category === 'beauty' && v.status === 'booked').length; return b ? `${b} booked` : 'No artist yet'; } },
  { key: 'food', group: 'style', label: 'Food & beverage', icon: UtensilsCrossed, desktop: '/FoodBeverage', path: 'food', image: imageUrl('tileFood'), kind: 'details', depth: 'light',
    stat: (d) => (d.details?.foodBeverage?.serviceStyle ? d.details.foodBeverage.serviceStyle : 'Plan the menu') },
  { key: 'music', group: 'style', label: 'Music', icon: Music2, desktop: '/Music', path: 'music', image: imageUrl('tileMusic'), kind: 'custom', depth: 'full',
    stat: (d) => { const p = (d.songRequests || []).filter((r) => !r.status || r.status === 'pending').length; return p ? `${p} to review` : count(d.music, 'track'); } },
  { key: 'photography', group: 'style', label: 'Photography', icon: Camera, desktop: '/Photography', path: 'photography', image: imageUrl('tilePhotography'), kind: 'details', depth: 'light',
    stat: (d) => { const b = (d.vendors || []).filter((v) => ['photography', 'videography'].includes(v.category) && v.status === 'booked').length; return b ? `${b} booked` : 'Find a photographer'; } },
  { key: 'vows', group: 'style', label: 'Vows & speeches', icon: FileText, desktop: '/VowsSpeeches', path: 'vows', image: imageUrl('tileVows'), kind: 'entity', depth: 'full',
    stat: (d) => count(d.vows, 'draft') },
  { key: 'favours', group: 'style', label: 'Guest gifts', icon: Package, desktop: '/wedding-favours', path: 'favours', image: imageUrl('tileGuestGifts'), kind: 'details', depth: 'light',
    stat: (d) => (d.details?.weddingFavours?.concept ? d.details.weddingFavours.concept : 'Not chosen yet') },
  // Vendors
  { key: 'vendors', group: 'vendors', label: 'My vendors', icon: Store, desktop: '/Vendors', path: 'vendors', image: imageUrl('tileVendors'), kind: 'entity', depth: 'full',
    stat: (d) => { const b = (d.vendors || []).filter((v) => v.status === 'booked').length; return `${b} booked of ${n(d.vendors)}`; } },
  { key: 'marketplace', group: 'vendors', label: 'Marketplace', icon: ShoppingBag, desktop: '/VendorMarketplace', path: 'marketplace', image: imageUrl('tileMarketplace'), kind: 'custom', depth: 'light', stat: () => 'Search near you' },
  // On the day
  { key: 'ceremony', group: 'day', label: 'Ceremony details', icon: Heart, desktop: '/ceremony-details', path: 'ceremony', image: imageUrl('tileCeremony'), kind: 'details', depth: 'full',
    stat: (d) => (d.details?.celebrant?.name ? `With ${d.details.celebrant.name}` : 'Add your celebrant') },
  { key: 'transport', group: 'day', label: 'Getting here', icon: Car, desktop: '/transport', path: 'transport', image: imageUrl('tileTransport'), kind: 'details', depth: 'light',
    stat: (d) => (d.details?.transport?.shuttles?.length ? count(d.details.transport.shuttles, 'shuttle') : 'Plan the trip') },
  { key: 'accommodation', group: 'day', label: 'Stay', icon: Hotel, desktop: '/accommodation', path: 'accommodation', image: imageUrl('tileAccommodation'), kind: 'details', depth: 'light',
    stat: (d) => count(d.details?.accommodation?.manualProperties, 'place') },
  { key: 'emergency', group: 'day', label: 'Emergency contact', icon: Phone, desktop: '/emergency-contact', path: 'emergency', kind: 'details', depth: 'full',
    stat: (d) => (d.details?.emergencyContacts?.primary?.name ? d.details.emergencyContacts.primary.name : 'Add a contact') },
  // Finances
  { key: 'budget', group: 'finances', label: 'Budget', icon: Wallet, desktop: '/Budget', path: 'budget', image: imageUrl('tileBudget'), kind: 'custom', depth: 'full',
    stat: (d, symbol) => { const spent = (d.budget || []).reduce((s, i) => s + (i.actual_amount || 0), 0); const total = d.details?.budget?.total ? Number(d.details.budget.total) : (d.budget || []).reduce((s, i) => s + (i.budgeted_amount || 0), 0); return total ? `${money(total - spent, symbol)} left` : 'Set a total'; } },
  { key: 'registry', group: 'finances', label: 'Registry', icon: Gift, desktop: '/Registry', path: 'registry', image: imageUrl('tileRegistry'), kind: 'custom', depth: 'full',
    stat: (d) => { const g = n(d.gifts); return g ? `${g} received` : `${n(d.registryItems) + n(d.registryProducts) + n(d.customGifts)} listed`; } },
  // Guest suite
  { key: 'studio', group: 'suite', label: 'Design studio', icon: Sparkles, desktop: '/studio', path: '../site', image: imageUrl('tileStudio'), kind: 'custom', depth: 'view', stat: (d) => (d.details?.websiteEnabled ? 'Site is live' : 'Site is a draft') },
  { key: 'suite-schedule', group: 'suite', label: 'Schedule', icon: Clock, desktop: '/GuestSuiteSchedule', path: 'suite-schedule', image: imageUrl('tileSuiteSchedule'), kind: 'custom', depth: 'view', stat: (d) => count(d.schedule, 'event') },
  { key: 'qna', group: 'suite', label: 'Q&A', icon: HelpCircle, desktop: '/QandA', path: 'qna', image: imageUrl('tileQna'), kind: 'custom', depth: 'full', stat: (d) => count(d.details?.qna, 'question') },
  { key: 'suite-registry', group: 'suite', label: 'Registry', icon: Gift, desktop: '/GuestSuiteRegistry', path: 'registry', image: imageUrl('tileSuiteRegistry'), kind: 'custom', depth: 'full', stat: (d) => `${n(d.registryItems) + n(d.registryProducts) + n(d.customGifts)} on the site` },
  { key: 'suite-accommodation', group: 'suite', label: 'Stay', icon: Hotel, desktop: '/GuestSuiteAccommodation', path: 'suite-accommodation', image: imageUrl('tileSuiteAccommodation'), kind: 'custom', depth: 'light', stat: (d) => count(d.details?.guestSuiteAccommodation?.places, 'place') },
  { key: 'suite-transport', group: 'suite', label: 'Getting here', icon: Car, desktop: '/GuestSuiteTransport', path: 'suite-transport', image: imageUrl('tileSuiteTransport'), kind: 'custom', depth: 'light', stat: (d) => count(d.details?.guestSuiteTransport?.places, 'place') },
  { key: 'experience', group: 'suite', label: 'Experience guide', icon: MapPin, desktop: '/GuestSuiteExperience', path: 'experience', image: imageUrl('tileExperience'), kind: 'custom', depth: 'light', stat: (d) => count(d.details?.experienceGuide?.places, 'place') },
  { key: 'good-to-know', group: 'suite', label: 'Good to know', icon: ScrollText, desktop: '/GuestSuitePolicies', path: 'good-to-know', image: imageUrl('tileGoodToKnow'), kind: 'custom', depth: 'full', stat: (d) => { const p = d.details?.weddingPolicies || {}; const on = Object.values(p).filter((v) => v && typeof v === 'object' && v.display).length; return on ? `${on} shown to guests` : 'Nothing set'; } },
  { key: 'suite-polls', group: 'suite', label: 'Guest polls', icon: BarChart2, desktop: '/GuestSuitePolls', path: 'polls', image: imageUrl('tileSuitePolls'), kind: 'custom', depth: 'full', stat: (d) => count((d.details?.polls || []).filter((p) => p.isActive), 'live poll') },
  // Extras
  { key: 'honeymoon', group: 'extras', label: 'Honeymoon', icon: Plane, desktop: '/honeymoon', path: 'honeymoon', image: imageUrl('tileHoneymoon'), kind: 'details', depth: 'light',
    stat: (d) => (d.details?.honeymoonDetails?.destination ? d.details.honeymoonDetails.destination : 'Dream a little') },
  { key: 'considerations', group: 'extras', label: 'Considerations', icon: Lightbulb, desktop: '/Considerations', path: 'considerations', kind: 'desktop', depth: 'view', stat: () => 'Read on desktop' },
];

export const featureByKey = (key) => FEATURES.find((f) => f.key === key);
export const featuresIn = (group) => FEATURES.filter((f) => f.group === group);

/** The features a couple has touched least, for "keep planning". */
export function leastTouched(d, limit = 5) {
  const score = (f) => {
    const s = f.stat(d, '$');
    return /^(0 |Add |Plan |Start |Not |Find |Dream |Nothing|Set a|Design|Read|Search)/.test(s) ? 0 : 1;
  };
  return FEATURES.filter((f) => f.kind !== 'desktop' && f.key !== 'guest-list' && f.key !== 'checklist').sort((a, b) => score(a) - score(b)).slice(0, limit);
}
