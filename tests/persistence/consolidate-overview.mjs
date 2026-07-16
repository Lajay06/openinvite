/**
 * tests/persistence/consolidate-overview.mjs
 *
 * Covers chore/consolidate-overview: GuestSuite.jsx (the "Overview" page)
 * is retired, Design Studio (UniverseStudio.jsx) is the single design
 * home, its route redirects there, and the unique content it used to show
 * (venue/date/photo, the "complete event details" nudge, guest-experience
 * Ava) is rehomed rather than silently lost. Structural checks against
 * source text — same convention as design-studio-entrance.mjs — since
 * these are React/JSX files the plain-Node harness can't import directly.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(__dir, '..', '..', p), 'utf8');
const exists = (p) => existsSync(resolve(__dir, '..', '..', p));

export async function runConsolidateOverview() {
  const results = [];

  console.log('\n  Consolidate Overview — the page and its registrations are fully removed:\n');

  results.push(!exists('src/pages/GuestSuite.jsx')
    ? pass('src/pages/GuestSuite.jsx (the "Overview" page) is deleted', 'not found')
    : fail('src/pages/GuestSuite.jsx is deleted', 'file deleted', 'file still present'));

  const pagesConfigSource = read('src/pages.config.js');
  results.push(!/import GuestSuite from '\.\/pages\/GuestSuite'/.test(pagesConfigSource) && !/"GuestSuite": GuestSuite,/.test(pagesConfigSource)
    ? pass('pages.config.js no longer imports or registers GuestSuite', 'not found')
    : fail('pages.config.js no longer imports or registers GuestSuite', 'not found', 'still present'));
  // The GuestSuite* sub-pages (Schedule, Registry, etc.) are a DIFFERENT,
  // still-live part of Guest Suite — only the exact "Overview" page/route
  // is retired, never this whole family of pages.
  results.push(/"GuestSuiteSchedule": GuestSuiteSchedule,/.test(pagesConfigSource)
    ? pass('Other Guest Suite pages (e.g. Schedule) are untouched', 'found')
    : fail('Other Guest Suite pages (e.g. Schedule) are untouched', 'found', 'not found — may have been accidentally removed too'));

  const appSource = read('src/App.jsx');
  results.push(/<Route path="\/GuestSuite" element={<Navigate to="\/studio\/universe" replace \/>} \/>/.test(appSource)
    ? pass('App.jsx redirects the retired /GuestSuite route to Design Studio', 'found')
    : fail('App.jsx redirects the retired /GuestSuite route to Design Studio', 'found', 'not found'));

  const sidebarSource = read('src/components/layout/AnimatedSidebar.jsx');
  results.push(!/label: "Overview"/.test(sidebarSource)
    ? pass('AnimatedSidebar.jsx no longer has the "Overview" nav item', 'not found')
    : fail('AnimatedSidebar.jsx no longer has the "Overview" nav item', 'not found', 'still present'));
  results.push(/label="Design studio"/.test(sidebarSource)
    ? pass('AnimatedSidebar.jsx still has the "Design studio" nav item (the replacement home)', 'found')
    : fail('AnimatedSidebar.jsx still has the "Design studio" nav item', 'found', 'not found'));

  const helpSource = read('src/pages/Help.jsx');
  results.push(!/Overview, Schedule, Q&A/.test(helpSource)
    ? pass('Help.jsx\'s Guest Suite bullet list no longer lists "Overview"', 'not found')
    : fail('Help.jsx\'s Guest Suite bullet list no longer lists "Overview"', 'not found', 'still present'));

  console.log('\n  Consolidate Overview — unique content is rehomed into Design Studio, not lost:\n');

  const studioSource = read('src/pages/UniverseStudio.jsx');
  results.push(/mainCeremony\?\.venueName/.test(studioSource) && /mainCeremony\?\.photoUrl/.test(studioSource)
    ? pass('UniverseStudio.jsx reads venue name + venue photo (rehomed from GuestSuite.jsx)', 'found')
    : fail('UniverseStudio.jsx reads venue name + venue photo', 'found', 'not found'));
  results.push(/fmtWeddingDate/.test(studioSource)
    ? pass('UniverseStudio.jsx formats and shows the wedding date (rehomed)', 'found')
    : fail('UniverseStudio.jsx formats and shows the wedding date', 'found', 'not found'));
  results.push(/Complete event details/.test(studioSource) && /navigate\('\/event-details'\)/.test(studioSource)
    ? pass('UniverseStudio.jsx shows the "complete event details" nudge for new users (rehomed)', 'found')
    : fail('UniverseStudio.jsx shows the "complete event details" nudge', 'found', 'not found'));
  results.push(/<AvaButton/.test(studioSource) && /<AvaModal/.test(studioSource)
    ? pass('UniverseStudio.jsx has an Ava entry point (rehomed guest-experience advisor)', 'found')
    : fail('UniverseStudio.jsx has an Ava entry point', 'found', 'not found'));

  return results;
}
