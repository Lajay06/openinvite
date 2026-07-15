/**
 * tests/persistence/guestbook-removal.mjs
 *
 * Covers fix/dashboard-structure's full guestbook removal: dashboard page +
 * nav entry, published-site page + nav link + PAGE_COMPONENTS wiring, the
 * builder's page-toggle list, and the two backend endpoints are all gone —
 * while the GuestbookEntry entity/data itself is left alone in Base44 (only
 * marked retired in its schema doc).
 *
 * .jsx/.js source files are checked structurally (readFileSync — this suite
 * runs as a plain Node script with no JSX transform), same convention as
 * elsewhere in this suite.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const repoPath = (p) => resolve(__dir, '..', '..', p);
const read = (p) => readFileSync(repoPath(p), 'utf8');

export async function runGuestbookRemoval() {
  const results = [];

  console.log('\n  Guestbook removal — the whole feature\'s files are gone:\n');

  const DELETED_FILES = [
    'src/pages/Guestbook.jsx',
    'src/components/guest-website/pages/WeddingGuestbookPage.jsx',
    'api/guestbook-submit.js',
    'api/wedding-guestbook.js',
    'tests/persistence/guestbook.mjs',
  ];
  for (const f of DELETED_FILES) {
    results.push(!existsSync(repoPath(f))
      ? pass(`${f} deleted`, 'gone')
      : fail(`${f} deleted`, 'file removed', 'file still present'));
  }

  console.log('\n  Guestbook removal — no dashboard route, nav entry, or page-toggle remain:\n');

  const pagesConfig = read('src/pages.config.js');
  results.push(!/Guestbook/.test(pagesConfig)
    ? pass('pages.config.js has no Guestbook import/route registration', 'not found')
    : fail('pages.config.js has no Guestbook import/route registration', 'not found', 'still present'));

  const sidebar = read('src/components/layout/AnimatedSidebar.jsx');
  results.push(!/label:\s*"Guestbook"/.test(sidebar)
    ? pass('AnimatedSidebar.jsx has no Guestbook nav entry', 'not found')
    : fail('AnimatedSidebar.jsx has no Guestbook nav entry', 'not found', 'still present'));

  const websiteThemes = read('src/lib/websiteThemes.js');
  results.push(!/slug:\s*'guestbook'/.test(websiteThemes)
    ? pass('WEDDING_PAGES has no guestbook entry (removes the builder\'s page toggle)', 'not found')
    : fail('WEDDING_PAGES has no guestbook entry (removes the builder\'s page toggle)', 'not found', 'still present'));

  console.log('\n  Guestbook removal — published site and builder preview have no guestbook wiring:\n');

  const publishedSite = read('src/components/guest-website/MultiPageWeddingWebsite.jsx');
  results.push(!/WeddingGuestbookPage/.test(publishedSite) && !/'guestbook':/.test(publishedSite)
    ? pass('MultiPageWeddingWebsite.jsx has no guestbook import or PAGE_COMPONENTS entry', 'not found')
    : fail('MultiPageWeddingWebsite.jsx has no guestbook import or PAGE_COMPONENTS entry', 'not found', 'still present'));

  const builderPreview = read('src/components/website-builder/RealWebsitePreview.jsx');
  results.push(!/WeddingGuestbookPage/.test(builderPreview) && !/'guestbook':/.test(builderPreview)
    ? pass('RealWebsitePreview.jsx has no guestbook import or PAGE_COMPONENTS entry', 'not found')
    : fail('RealWebsitePreview.jsx has no guestbook import or PAGE_COMPONENTS entry', 'not found', 'still present'));

  // Existing weddings whose stored enabledPages still lists 'guestbook'
  // must not render a dead/blank nav link — confirm the resilience filter
  // that drops any page slug with no matching WEDDING_PAGES entry.
  const nav = read('src/components/guest-website/WeddingWebsiteNav.jsx');
  results.push(/\.filter\(link => !!link\.label\)/.test(nav)
    ? pass('WeddingWebsiteNav.jsx drops stale enabledPages slugs with no real page (e.g. old guestbook entries)', 'found')
    : fail('WeddingWebsiteNav.jsx drops stale enabledPages slugs with no real page (e.g. old guestbook entries)', 'found', 'not found — a wedding with guestbook still in enabledPages would render a blank nav link'));

  console.log('\n  Guestbook removal — GuestbookEntry entity/data untouched, marked retired in docs only:\n');

  const entityDoc = read('base44/entities/GuestbookEntry.jsonc');
  results.push(/RETIRED/.test(entityDoc)
    ? pass('GuestbookEntry.jsonc notes the entity as retired', 'found')
    : fail('GuestbookEntry.jsonc notes the entity as retired', 'found', 'not found'));
  results.push(/"name": "GuestbookEntry"/.test(entityDoc) && /"wedding_id"/.test(entityDoc)
    ? pass('GuestbookEntry.jsonc schema itself is untouched (data/schema not deleted)', 'fields intact')
    : fail('GuestbookEntry.jsonc schema itself is untouched (data/schema not deleted)', 'fields intact', 'schema appears modified'));

  console.log('\n  Guestbook removal — anonymous-endpoints.mjs no longer imports the deleted handler:\n');

  const anonEndpoints = read('tests/persistence/anonymous-endpoints.mjs');
  results.push(!/wedding-guestbook\.js/.test(anonEndpoints)
    ? pass('anonymous-endpoints.mjs has no reference to the deleted wedding-guestbook.js', 'not found')
    : fail('anonymous-endpoints.mjs has no reference to the deleted wedding-guestbook.js', 'not found', 'still present — would fail to import a deleted file'));

  return results;
}
