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
  'Dashboard': {
    pageName: 'Dashboard', route: '/Dashboard', navLabel: 'Overall', navSection: 'Planning', icon: 'LayoutDashboard',
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
    entities: ['Guest', 'Table', 'VenueAsset'],
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
  'Notes': {
    pageName: 'Notes', route: '/Notes', navLabel: 'Notes', navSection: 'Planning', icon: 'StickyNote',
    entities: ['Task'], notInOwnerNav: true,
  },
};

/** Every permission key CollaborateModal.jsx should offer — derived, not hand-kept in sync. */
export const COLLABORATOR_PERMISSION_KEYS = Object.keys(COLLABORATOR_PAGE_MAP);
