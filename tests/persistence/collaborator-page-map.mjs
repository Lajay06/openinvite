/**
 * tests/persistence/collaborator-page-map.mjs
 *
 * Structural guard for src/lib/collaboratorPageMap.js — the single source
 * of truth CollaborateModal.jsx (the permission list) and
 * AnimatedSidebar.jsx (the collaborator nav) both build from. This test
 * doesn't touch Base44 at all; it asserts the shape of the map itself, so a
 * future 13th permission key can't ship half-wired (a key with no route, no
 * nav label, no icon, or no backing entity) without failing the suite.
 */

import { pass, fail } from './_shared.mjs';
import { COLLABORATOR_PAGE_MAP, COLLABORATOR_PERMISSION_KEYS } from '../../src/lib/collaboratorPageMap.js';

const KNOWN_ICONS = new Set([
  'LayoutDashboard', 'Users', 'Wallet', 'Calendar', 'Music2', 'Send',
  'LayoutGrid', 'Gift', 'Store', 'Image', 'FileText', 'StickyNote',
]);

export async function runCollaboratorPageMap() {
  const results = [];

  console.log('\n  Collaborator page map — structural completeness (every permission key must be fully wired):\n');

  results.push(COLLABORATOR_PERMISSION_KEYS.length > 0
    ? pass('COLLABORATOR_PERMISSION_KEYS is non-empty', `${COLLABORATOR_PERMISSION_KEYS.length} keys`)
    : fail('COLLABORATOR_PERMISSION_KEYS is non-empty', '> 0', '0'));

  for (const key of COLLABORATOR_PERMISSION_KEYS) {
    const entry = COLLABORATOR_PAGE_MAP[key];

    results.push(!!entry
      ? pass(`"${key}" has a map entry`, 'found')
      : fail(`"${key}" has a map entry`, 'defined', 'undefined'));
    if (!entry) continue;

    results.push(typeof entry.route === 'string' && entry.route.startsWith('/')
      ? pass(`"${key}".route is a real path`, entry.route)
      : fail(`"${key}".route is a real path`, 'starts with "/"', JSON.stringify(entry.route)));

    results.push(typeof entry.pageName === 'string' && entry.pageName.length > 0
      ? pass(`"${key}".pageName is set`, entry.pageName)
      : fail(`"${key}".pageName is set`, 'non-empty string', JSON.stringify(entry.pageName)));

    results.push(typeof entry.navLabel === 'string' && entry.navLabel.length > 0
      ? pass(`"${key}".navLabel is set`, entry.navLabel)
      : fail(`"${key}".navLabel is set`, 'non-empty string', JSON.stringify(entry.navLabel)));

    results.push(entry.navSection === null || typeof entry.navSection === 'string'
      ? pass(`"${key}".navSection is null or a string`, JSON.stringify(entry.navSection))
      : fail(`"${key}".navSection is null or a string`, 'null | string', JSON.stringify(entry.navSection)));

    results.push(KNOWN_ICONS.has(entry.icon)
      ? pass(`"${key}".icon resolves to a real sidebar icon`, entry.icon)
      : fail(`"${key}".icon resolves to a real sidebar icon`, [...KNOWN_ICONS].join('|'), JSON.stringify(entry.icon)));

    results.push(Array.isArray(entry.entities) && entry.entities.length > 0
      ? pass(`"${key}".entities lists at least one backing entity`, JSON.stringify(entry.entities))
      : fail(`"${key}".entities lists at least one backing entity`, 'non-empty array', JSON.stringify(entry.entities)));

    // WeddingDetails is never returned whole (see collaborator-data.js) — any
    // key backed by it MUST declare an explicit sub-field allowlist, or a
    // future page would silently get zero data back.
    if (entry.entities.includes('WeddingDetails')) {
      results.push(Array.isArray(entry.weddingDetailsFields) && entry.weddingDetailsFields.length > 0
        ? pass(`"${key}" backed by WeddingDetails declares weddingDetailsFields`, JSON.stringify(entry.weddingDetailsFields))
        : fail(`"${key}" backed by WeddingDetails declares weddingDetailsFields`, 'non-empty array', JSON.stringify(entry.weddingDetailsFields)));
    }
  }

  // pageName values must be unique — buildCollaboratorNav / permissionKeyForPageName
  // both key off this, and a collision would make one page invisible/unreachable.
  const pageNames = COLLABORATOR_PERMISSION_KEYS.map(k => COLLABORATOR_PAGE_MAP[k].pageName);
  const uniquePageNames = new Set(pageNames);
  results.push(uniquePageNames.size === pageNames.length
    ? pass('Every pageName is unique across the map', `${uniquePageNames.size} unique of ${pageNames.length}`)
    : fail('Every pageName is unique across the map', 'no duplicates', JSON.stringify(pageNames)));

  // routes must be unique too, for the same reason.
  const routes = COLLABORATOR_PERMISSION_KEYS.map(k => COLLABORATOR_PAGE_MAP[k].route);
  const uniqueRoutes = new Set(routes);
  results.push(uniqueRoutes.size === routes.length
    ? pass('Every route is unique across the map', `${uniqueRoutes.size} unique of ${routes.length}`)
    : fail('Every route is unique across the map', 'no duplicates', JSON.stringify(routes)));

  return results;
}
