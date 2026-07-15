/**
 * tests/persistence/dashboard-structure.mjs
 *
 * Covers fix/dashboard-structure:
 *  (1) Accommodation ("On the day") is a private couple planning page, not
 *      guest-facing framing — the "visible to guests in your Guest Suite"
 *      banner and the "Our recommendations" copy are gone, and this page
 *      is confirmed to never render on the published guest site (the
 *      guest-facing Stay page, WeddingStayPage.jsx, is a separate
 *      component and is untouched).
 *  (2) Every accordion-style planning page (Guest gifts/Wedding favours,
 *      Wedding party, Ceremony details, Emergency contact, and the
 *      further holdouts found in the audit — Florals & décor,
 *      Entertainment, Honeymoon, Policies) is now a tabbed-menu layout
 *      matching the rest of the dashboard (Accommodation's own
 *      Properties/Overview/Notes pattern), not a stack of independently
 *      collapsed accordion sections.
 *
 * These are .jsx files (real render logic, imports React) — this suite
 * runs as a plain Node script with no JSX transform, so these are
 * structural checks against the source text (same convention as
 * component-library.mjs and others in this suite).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(__dir, '..', '..', p), 'utf8');

export async function runDashboardStructure() {
  const results = [];

  console.log('\n  Dashboard structure — Accommodation is a private planning page:\n');

  const accomSource = read('src/pages/Accommodation.jsx');
  results.push(!/visible to guests in your Guest Suite/.test(accomSource)
    ? pass('Accommodation.jsx — Guest Suite visibility banner removed', 'not found')
    : fail('Accommodation.jsx — Guest Suite visibility banner removed', 'not found', 'banner text still present'));
  results.push(!/Our recommendations/.test(accomSource)
    ? pass('Accommodation.jsx — "Our recommendations" guest-facing framing removed', 'not found')
    : fail('Accommodation.jsx — "Our recommendations" guest-facing framing removed', 'not found', 'still present'));
  results.push(/Accommodation options/.test(accomSource)
    ? pass('Accommodation.jsx — section reframed with a private-planning label', 'found "Accommodation options"')
    : fail('Accommodation.jsx — section reframed with a private-planning label', 'found', 'not found'));

  console.log('\n  Dashboard structure — Accommodation.jsx never renders on the published guest site:\n');

  // The guest-facing "Stay" page is a wholly separate component — confirm
  // the internal dashboard page isn't imported anywhere in the guest
  // website's render tree.
  const guestWebsiteFiles = [
    'src/components/guest-website/MultiPageWeddingWebsite.jsx',
    'src/components/guest-website/pages/WeddingStayPage.jsx',
    'src/components/website-builder/RealWebsitePreview.jsx',
  ];
  for (const f of guestWebsiteFiles) {
    const src = read(f);
    results.push(!/from ['"].*pages\/Accommodation['"]/.test(src)
      ? pass(`${f} does not import the internal Accommodation.jsx`, 'not found')
      : fail(`${f} does not import the internal Accommodation.jsx`, 'not found', 'import found — leakage into the guest site'));
  }

  console.log('\n  Dashboard structure — accordion pages converted to tabs:\n');

  const TABBED_PAGES = [
    { file: 'src/pages/WeddingFavours.jsx', label: 'Wedding favours' },
    { file: 'src/pages/WeddingParty.jsx', label: 'Wedding party' },
    { file: 'src/pages/CeremonyDetails.jsx', label: 'Ceremony details' },
    { file: 'src/pages/EmergencyContact.jsx', label: 'Emergency contact' },
    { file: 'src/pages/Florals.jsx', label: 'Florals & décor (holdout)' },
    { file: 'src/pages/EntertainmentDetails.jsx', label: 'Entertainment (holdout)' },
    { file: 'src/pages/Honeymoon.jsx', label: 'Honeymoon (holdout)' },
    { file: 'src/pages/GuestSuitePolicies.jsx', label: 'Policies (holdout)' },
  ];

  for (const { file, label } of TABBED_PAGES) {
    const src = read(file);
    const hasTabsConst = /const TABS = \[/.test(src);
    const hasActiveTabState = /const \[activeTab, setActiveTab\] = useState\(/.test(src);
    const hasTabBar = /onClick=\{\(\) => setActiveTab\(tab\.key\)\}/.test(src);
    results.push(hasTabsConst && hasActiveTabState && hasTabBar
      ? pass(`${label} — converted to a tabbed layout`, 'TABS const + activeTab state + tab bar all found')
      : fail(`${label} — converted to a tabbed layout`, 'TABS const + activeTab state + tab bar', `TABS=${hasTabsConst} activeTab=${hasActiveTabState} tabBar=${hasTabBar}`));

    // Every declared tab key must actually gate SOME content — proves the
    // tab bar isn't just bolted on top of an unchanged accordion. Not a
    // strict one-gate-per-DetailsSection check: some pages intentionally
    // group several sections under one tab (e.g. Emergency contact's
    // "Contacts" tab covers 3 sections with a single gate), which is a
    // valid grouping choice, not a missed conversion.
    const tabsBlockMatch = src.match(/const TABS = \[([\s\S]*?)\];/);
    const tabKeys = tabsBlockMatch
      ? [...tabsBlockMatch[1].matchAll(/key:\s*'([^']+)'/g)].map(m => m[1])
      : [];
    const ungatedKeys = tabKeys.filter(key => !new RegExp(`activeTab === '${key}' &&`).test(src));
    results.push(tabKeys.length > 0 && ungatedKeys.length === 0
      ? pass(`${label} — every declared tab gates real content`, `${tabKeys.length} tabs, all gate content`)
      : fail(`${label} — every declared tab gates real content`, 'all tab keys gate content', `ungated: ${ungatedKeys.join(', ') || '(no TABS found)'}`));
  }

  console.log('\n  Dashboard structure — Wedding party: "Key roles" and "Wedding party" tabs merged into one (fix/wedding-party-merge-tabs):\n');

  const weddingPartySource = read('src/pages/WeddingParty.jsx');
  results.push(!/key:\s*'party'/.test(weddingPartySource)
    ? pass('WeddingParty.jsx — the separate "party" tab key is gone', 'not found')
    : fail('WeddingParty.jsx — the separate "party" tab key is gone', 'not found', 'still present — tabs were not actually merged'));
  results.push(/const TABS = \[\s*\{ key: 'keyRoles', label: 'Key roles' \},\s*\{ key: 'notes',\s*label: 'Notes' \},\s*\];/.test(weddingPartySource)
    ? pass('WeddingParty.jsx — TABS is now exactly Key roles + Notes', 'found')
    : fail('WeddingParty.jsx — TABS is now exactly Key roles + Notes', 'found', 'not found — TABS shape unexpected'));
  results.push(/Wedding party members/.test(weddingPartySource)
    ? pass('WeddingParty.jsx — the merged tab has a section heading separating the two groups', 'found "Wedding party members"')
    : fail('WeddingParty.jsx — the merged tab has a section heading separating the two groups', 'found', 'not found'));

  // The role-roster block (bridesmaids, groomsmen, etc.) must now live
  // inside the same activeTab === 'keyRoles' branch as the key-roles
  // pickers, not gated separately — that's the actual merge, not just a
  // TABS-array edit that leaves the content still split.
  const keyRolesBlockMatch = weddingPartySource.match(/\{activeTab === 'keyRoles' && \([\s\S]*?\n {8}\)\}/);
  const keyRolesBlockBody = keyRolesBlockMatch ? keyRolesBlockMatch[0] : '';
  results.push(/Maid of honour \/ best person/.test(keyRolesBlockBody) && /ROLES\.map\(role =>/.test(keyRolesBlockBody)
    ? pass('WeddingParty.jsx — key-roles pickers AND the full role roster render in the same tab branch', 'both found in the keyRoles block')
    : fail('WeddingParty.jsx — key-roles pickers AND the full role roster render in the same tab branch', 'both present', `maidOfHonour picker=${/Maid of honour \/ best person/.test(keyRolesBlockBody)} roleRoster=${/ROLES\.map\(role =>/.test(keyRolesBlockBody)}`));

  return results;
}
