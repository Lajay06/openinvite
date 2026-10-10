import { AVA_PAGES } from './avaPages.generated';
import { FEATURES } from './registry';

/* The mobile feature (or tab) whose desktop page carries each AvaModal. */
const PAGE_OF = {
  'event-details': 'EventDetails', schedule: 'ScheduleHub', checklist: 'Checklist', 'guest-list': 'Guests', polls: 'Polls', messages: 'Messages', seating: 'Seating', 'wedding-party': 'WeddingParty',
  moodboard: 'Moodboard', styling: 'Styling', beauty: 'Beauty', food: 'FoodBeverage', music: 'Music', photography: 'Photography', favours: 'WeddingFavours',
  vendors: 'Vendors', marketplace: 'VendorMarketplace', ceremony: 'CeremonyDetails', transport: 'Transport', accommodation: 'Accommodation', emergency: 'EmergencyContact',
  budget: 'Budget', registry: 'Registry', 'suite-registry': 'Registry', qna: 'QandA', 'good-to-know': 'GuestSuitePolicies', 'suite-polls': 'Polls', honeymoon: 'Honeymoon', studio: 'UniverseStudio',
  home: 'Dashboard', guests: 'Guests', site: 'UniverseStudio', account: 'Account',
};

/**
 * What the Ava sheet hands the shared pod for the screen it opened from: the
 * desktop route (so buildAvaPrompt's page block matches), the page's own
 * voice line as pageContext, and its quick actions. The same page-scoped Ava
 * every desktop page has, through the one pod. Off a known screen, nothing
 * is passed and the pod is the general one.
 */
export function avaDetailFor(pathname, base = '/m') {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const parts = rest.split('/').filter(Boolean);
  let key = null;
  let feature = null;
  if (parts.length === 0) key = 'home';
  else if (parts[0] === 'guests') key = 'guests';
  else if (parts[0] === 'site') key = 'site';
  else if (parts[0] === 'account') key = 'account';
  else if (parts[0] === 'plan' && parts[1]) { feature = FEATURES.find((f) => f.path === parts[1]) || null; key = feature?.key || null; }
  const pageKey = key ? PAGE_OF[key] : null;
  const page = pageKey ? AVA_PAGES[pageKey] : null;
  if (!page) return null;
  const route = feature?.desktop || { home: '/DailyUpdate', guests: '/Guests', site: '/studio', account: '/account' }[key] || '/';
  return { page: route, pageContext: page.systemPrompt, quickActions: page.quickActions, title: page.title };
}
