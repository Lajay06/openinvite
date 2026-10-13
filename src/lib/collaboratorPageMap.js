/**
 * src/lib/collaboratorPageMap.js
 *
 * THE single source of truth for "what does this permission key actually
 * mean" — every permission key CollaborateModal.jsx offers, its real route,
 * its sidebar placement, and which Base44 entities back it. Both
 * CollaborateModal.jsx (the invite form) and AnimatedSidebar.jsx (the
 * collaborator's filtered nav) import their page list FROM this map rather
 * than each keeping their own — so a permission the modal offers can never
 * silently have no corresponding sidebar entry, or vice versa, again.
 *
 * api/collaborator-data.js (the generic collaborator read endpoint) also
 * imports this file server-side (Vercel/Node resolves src/lib/* imports
 * from api/*.js fine — same pattern already used by
 * api/questionnaire-lookup.js importing src/lib/questionnaireRecipients.js)
 * to resolve which entities a given permission key is allowed to read.
 * This is the ONE place that mapping lives — the endpoint never trusts a
 * client-supplied entity name, only ever this hardcoded table.
 *
 * Reconciling the 12 keys against the real app (see BASE44_PLATFORM_NOTES.md
 * companion investigation for the full reasoning):
 *   - "Dashboard"     → Dashboard.jsx, sidebar label "Overall" (that's the
 *                        page's own nav label; the permission key is the
 *                        Base44-style name used in Collaborator.permissions).
 *   - "Invitations"   → Invitations.jsx is a real, working page — but it has
 *                        NO entry in AnimatedSidebar's own NAV_SECTIONS today,
 *                        for the OWNER either. Not a broken permission; a
 *                        pre-existing gap in the owner's own nav that this
 *                        map doesn't try to fix. Flagged via notInOwnerNav.
 *   - "Event Details" → EventDetails.jsx, routed as /event-details with
 *                        currentPageName "EventDetails" (no space) — the
 *                        permission key itself keeps Base44's original
 *                        "Event Details" (with space) spelling, so pageName
 *                        exists specifically to bridge that mismatch.
 *   - "Notes"         → Notes.jsx — reads the Task entity (not a "Note"
 *                        entity, despite the page's name), and like
 *                        Invitations has no current owner-sidebar entry.
 *                        Flagged the same way.
 *
 * weddingDetailsFields is an explicit ALLOWLIST, not a denylist — WeddingDetails
 * holds plenty of fields no permission key covers at all
 * (emergencyContacts, websitePassword, dayVendorContacts, weddingPolicies,
 * billing-adjacent fields…), and none of those may ever be returned by a
 * page whose only permission is, say, "Music" or "Event Details". Only
 * list what that specific page actually reads.
 */

export const COLLABORATOR_PAGE_MAP = {
  // THE KEY AND pageName STAY 'Dashboard'. They are the wire format:
  // DailyUpdate.jsx asks api/collaborator-data.js for `page=Dashboard`, and
  // renaming them would break a permission grant already stored against that
  // string. Only where it POINTS and what it is CALLED changed — Overall was
  // removed on the owner's ruling (2026-09-07) and its route redirects to the
  // daily update, which has its own collaborator branch.
  'Dashboard': {
    pageName: 'Dashboard', route: '/DailyUpdate', navLabel: 'Daily update', navSection: 'Planning', icon: 'LayoutDashboard',
    entities: ['Guest', 'Budget', 'Schedule'],
  },
  'Guests': {
    pageName: 'Guests', route: '/Guests', navLabel: 'Guest list', navSection: 'Guests', icon: 'Users',
    entities: ['Guest'],
  },
  'Budget': {
    pageName: 'Budget', route: '/Budget', navLabel: 'Budget', navSection: 'Finances', icon: 'Wallet',
    entities: ['Budget'],
  },
  'Schedule': {
    pageName: 'Schedule', route: '/Schedule', navLabel: 'Schedule', navSection: 'Planning', icon: 'Calendar',
    entities: ['Schedule'],
  },
  'Music': {
    pageName: 'Music', route: '/Music', navLabel: 'Music', navSection: 'Style & experience', icon: 'Music2',
    entities: ['SongRequest', 'Music', 'WeddingDetails'],
    weddingDetailsFields: ['music'],
  },
  'Invitations': {
    pageName: 'Invitations', route: '/Invitations', navLabel: 'Invitations', navSection: 'Guests', icon: 'Send',
    entities: ['Invitation'], notInOwnerNav: true,
  },
  'Seating': {
    pageName: 'Seating', route: '/Seating', navLabel: 'Seating', navSection: 'Guests', icon: 'LayoutGrid',
    entities: ['Guest', 'Table', 'VenueAsset', 'WeddingDetails'],
    // PR6 (multi-event seating) — the event tab bar reads these via
    // src/lib/weddingEvents.js's getWeddingEvents(), same fields Guests.jsx
    // already allowlists for its own per-event RSVP filter.
    weddingDetailsFields: ['mainCeremony', 'reception', 'preWeddingEvents', 'postWeddingEvents'],
  },
  'Registry': {
    pageName: 'Registry', route: '/Registry', navLabel: 'Registry', navSection: 'Finances', icon: 'Gift',
    entities: ['RegistryItem', 'CustomGift', 'RegistryProduct'],
  },
  'Vendors': {
    pageName: 'Vendors', route: '/Vendors', navLabel: 'My vendors', navSection: 'Vendors', icon: 'Store',
    entities: ['Vendor'],
  },
  'Moodboard': {
    pageName: 'Moodboard', route: '/Moodboard', navLabel: 'Moodboard', navSection: 'Style & experience', icon: 'Image',
    entities: ['MoodboardItem'],
  },
  'Event Details': {
    pageName: 'EventDetails', route: '/event-details', navLabel: 'Event details', navSection: null, icon: 'FileText', // top-level item, no section
    entities: ['WeddingDetails'],
    // Includes the "Details" tab's core fields (couple names, date, guest
    // count/type) alongside the events/theme fields — all of it is what
    // EventDetails.jsx's own three tabs read, nothing beyond it.
    weddingDetailsFields: [
      'mainCeremony', 'reception', 'theme', 'preWeddingEvents', 'postWeddingEvents', 'attire',
      'couple1Name', 'couple2Name', 'weddingDate', 'guestType', 'guestCount',
    ],
  },
  // 'Notes' RETIRED. It routed to Notes.jsx, which read the Task entity --
  // zero rows across every account, ever -- while the linked "To do" page
  // (TodoList.jsx, the Note entity with the kanban) is the real surface. Two
  // routes both titled "To do list", one of them permanently empty.
  //
  // Removing the key removes the permission from CollaborateModal and the
  // collaborator nav. Stored permissions that still name it are inert: both
  // consumers iterate COLLABORATOR_PERMISSION_KEYS (derived from this map)
  // and look it up here, so an orphaned stored key is never dereferenced.
  // Checked before removal -- neither existing collaborator had it granted,
  // and both keep 10+ other keys, so nobody is left with zero permissions
  // (which WOULD crash CollaboratorAccept's landing-route lookup).
};

/** Every permission key CollaborateModal.jsx should offer — derived, not hand-kept in sync. */
export const COLLABORATOR_PERMISSION_KEYS = Object.keys(COLLABORATOR_PAGE_MAP);

/**
 * PAGES A COLLABORATOR MAY CHANGE. Owner ruling 2026-10-12, item 5: every page
 * in the map is offered, and every one is view only. A grant that says edit is
 * read as view, on the server and in the app. Schedule joined with its write PR
 * (owner ruling 2026-10-13); Moodboard joins only with its own.
 */
export const COLLABORATOR_EDIT_PAGES = Object.freeze(['Schedule']);

/** The one sentence the invite email and the accept page say after the page list. */
export const COLLABORATOR_VIEW_ONLY_COPY = 'You can view these pages. You will not be able to change anything.';

/** The sentence instead, when the grant lets them change at least one page. */
export const COLLABORATOR_SOME_EDIT_COPY = 'You can view these pages. You can make changes only where it says so.';

/** After the label of a page they can change. */
export const COLLABORATOR_CAN_CHANGE_SUFFIX = ' (you can make changes)';

/** The closing sentence for a grant: the view-only one unless a page can be changed. */
export function collaboratorClosingCopy(permissions) {
  return COLLABORATOR_PERMISSION_KEYS.some(key => collaboratorCan(permissions, key, 'edit'))
    ? COLLABORATOR_SOME_EDIT_COPY
    : COLLABORATOR_VIEW_ONLY_COPY;
}

/**
 * The single permission check, shared by api/_lib/collaboratorAuth.js and
 * src/lib/collaboratorContext.jsx. A key outside the map grants nothing, and
 * edit holds only for a page on COLLABORATOR_EDIT_PAGES.
 */
export function collaboratorCan(permissions, page, level) {
  if (!Object.prototype.hasOwnProperty.call(COLLABORATOR_PAGE_MAP, page)) return false;
  const p = permissions?.[page];
  if (!p) return false;
  if (level === 'edit') return COLLABORATOR_EDIT_PAGES.includes(page) && !!p.edit;
  return !!(p.view || p.edit);
}

/** The nav labels of the pages a grant can view, in the map's order, marked where they can change it. */
export function collaboratorPageLabels(permissions) {
  return COLLABORATOR_PERMISSION_KEYS
    .filter(key => collaboratorCan(permissions, key, 'view'))
    .map(key => COLLABORATOR_PAGE_MAP[key].navLabel + (collaboratorCan(permissions, key, 'edit') ? COLLABORATOR_CAN_CHANGE_SUFFIX : ''));
}
