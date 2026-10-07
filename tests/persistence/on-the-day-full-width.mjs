/**
 * tests/persistence/on-the-day-full-width.mjs
 *
 * THE FOUR "ON THE DAY" PAGES ARE ONE SECTION, SO THEY ARE ONE WIDTH.
 *
 * Item 9 of goals/2026-10-08-site-fixes-batch-1.md: "Tabs are inconsistent
 * (some centred, some full width). Ruling: full width everywhere, matching the
 * rest of the dashboard."
 *
 * ── WHAT WAS ACTUALLY INCONSISTENT, SINCE IT WAS NOT THE TABS ──────────────
 *
 * All four tab STRIPS were already identical, to the character: the same
 * border, the same flex row, the same 0 32px padding, the same 32px gap
 * between tabs. Nothing was centred about them.
 *
 * The content BELOW them was the split. Ceremony details and Emergency
 * contact capped their panel at 760px and centred it; Getting here and Stay,
 * reached from the same sidebar group, ran the full width of the page. Four
 * pages in one section, two of each, which is what reads as inconsistency
 * when a couple clicks between them.
 *
 * ── "MATCHING THE REST OF THE DASHBOARD" IS A MAJORITY, NOT A RULE ─────────
 *
 * The dashboard splits too: nine pages use the centred 760px cap and twelve or
 * more run full width, including Budget, Dashboard, Music, Food & beverage and
 * Guests. Full width is the larger half, and the item rules for it. The other
 * seven capped pages are OUTSIDE this item: GuestSuitePolicies, GuestSuitePolls,
 * GuestSuiteQandA, WeddingFavours, Honeymoon, WeddingParty and
 * EntertainmentDetails keep their cap, because item 9 is about On the day and
 * a sweep of the dashboard is not what it asked for. That list is here so the
 * next person reads a decision rather than an oversight.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

// The sidebar's "On the day" group, in its order.
const SECTION = {
  'Ceremony details': 'src/pages/CeremonyDetails.jsx',
  'Getting here': 'src/pages/Transport.jsx',
  Stay: 'src/pages/Accommodation.jsx',
  'Emergency contact': 'src/pages/EmergencyContact.jsx',
};

// Capped, and staying capped: outside item 9.
const STILL_CAPPED = [
  'src/pages/GuestSuitePolicies.jsx',
  'src/pages/GuestSuitePolls.jsx',
  'src/pages/GuestSuiteQandA.jsx',
  'src/pages/WeddingFavours.jsx',
  'src/pages/Honeymoon.jsx',
  'src/pages/WeddingParty.jsx',
  'src/pages/EntertainmentDetails.jsx',
];

export async function runOnTheDayFullWidth() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, String(JSON.stringify(got)).slice(0, 60))
      : fail(label, String(JSON.stringify(want)).slice(0, 60), String(JSON.stringify(got)).slice(0, 60)));

  // ── THE SIDEBAR STILL NAMES THESE FOUR ─────────────────────────────────
  //
  // If the group changes, this guard is measuring the wrong set, and that is
  // worth failing on rather than silently testing four pages nobody groups
  // together any more.
  const nav = read('src/components/layout/AnimatedSidebar.jsx');
  const group = nav.slice(nav.indexOf('label: "On the day"'));
  const groupEnd = group.indexOf('label: "Finances"');
  const urls = [...group.slice(0, groupEnd).matchAll(/url: "([^"]+)"/g)].map((m) => m[1]);
  check('the On the day group is still these four pages',
        urls, ['/ceremony-details', '/transport', '/accommodation', '/emergency-contact']);

  // ── NONE OF THE FOUR CAPS ITS CONTENT ──────────────────────────────────
  for (const [label, file] of Object.entries(SECTION)) {
    const src = code(read(file));
    ok(`${label} runs full width`, !/maxWidth: 760/.test(src), 'no 760px cap');
    ok(`  and still pads like the rest of the dashboard`,
       /padding: '32px 32px 48px'/.test(src), "32px 32px 48px");
  }

  // ── AND THEIR TAB STRIPS WERE AND REMAIN IDENTICAL ─────────────────────
  //
  // Asserted because the item describes the tabs as the problem. They were
  // not, and if one of them is ever "fixed" to match a wrong memory of this
  // item, this is what says so.
  const STRIP = `<div style={{ borderBottom: '1px solid rgba(10,10,10,0.12)', display: 'flex', padding: '0 32px' }}>`;
  for (const [label, file] of Object.entries(SECTION)) {
    ok(`${label}'s tab strip is the shared one`, read(file).includes(STRIP), 'identical');
    ok(`  and is not centred`, !/justifyContent: 'center'[\s\S]{0,200}TABS\.map/.test(read(file)), 'left aligned');
  }

  // ── THE PAGES THIS ITEM DELIBERATELY LEFT ALONE ────────────────────────
  for (const f of STILL_CAPPED) {
    ok(`${f.split('/').pop()} keeps its cap, outside this item`,
       /maxWidth: 760/.test(read(f)), 'untouched');
  }

  return results;
}
