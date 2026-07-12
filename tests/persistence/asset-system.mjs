/**
 * tests/persistence/asset-system.mjs
 *
 * Covers feat/asset-system (WEBSITE_BUILDER_GAP_MAP.md items 5-6):
 * - src/lib/seatingChart.js — real Table/Guest data → seating chart /
 *   guest tag shapes, with honest empty states (no fake placeholder names).
 * - src/lib/assetExport.js's ASSET_EXPORT_SPECS — every asset type the
 *   asset system offers (src/components/website-builder/AssetEditors.jsx's
 *   ASSET_EDITOR_MAP) has a real export spec with sane print dimensions.
 *
 * Pure-function tests — no Base44 API calls, no auth needed. jsPDF/
 * html2canvas themselves need a browser DOM (canvas, document) the plain-
 * Node harness doesn't have, so "does exportAsset() produce a real PDF
 * blob" isn't covered here — verified manually in the browser instead
 * (see the PR description). What IS covered: every asset has a spec, no
 * two print assets are configured with degenerate (zero/negative) sizes,
 * and guest-tags' 6-per-page constant matches the product's own printed
 * claim ("6 per A4 sheet").
 */

import { buildTablesWithGuests, buildGuestTagList } from '../../src/lib/seatingChart.js';
import { ASSET_EXPORT_SPECS } from '../../src/lib/assetExport.js';
import { pass, fail } from './_shared.mjs';

// Mirrors ASSET_EDITOR_MAP's keys (src/components/website-builder/
// AssetEditors.jsx) — not imported directly since that file contains real
// JSX syntax the plain-Node harness can't parse (same constraint noted in
// tests/persistence/universe-picker-integrity.mjs).
const EDITABLE_ASSET_KEYS = [
  'saveTheDate', 'digitalInvitation', 'menuCard', 'seatingChart', 'rsvpCard',
  'instagramStory', 'welcomeSignage', 'guestTags', 'thankYouNotes', 'motionGraphic',
];

const GUESTS = [
  { id: 'g1', name: 'Alice Chen', meal_choice: 'vegetarian' },
  { id: 'g2', name: 'Ben Okafor', meal_choice: 'beef' },
  { id: 'g3', name: 'Carla Diaz', meal_choice: 'fish' },
  { id: 'g4', name: '__PERSISTENCE_TEST_GUEST__', meal_choice: 'chicken', is_test: true },
];

const TABLES = [
  { id: 't1', name: 'Table 1', assigned_guests: [{ seat_index: 0, guest_id: 'g1' }, { seat_index: 1, guest_id: 'g2' }] },
  { id: 't2', name: 'Table 2', assigned_guests: [] }, // no one seated yet — must not appear as an empty fake box
  { id: 't3', name: 'Head Table', assigned_guests: [{ seat_index: 0, guest_id: 'g-does-not-exist' }] }, // dangling ref — must not crash or show a phantom guest
];

export async function runAssetSystem() {
  const results = [];

  console.log('\n  Asset system — real seating data, no fake placeholders:\n');

  {
    const result = buildTablesWithGuests(TABLES, GUESTS);
    results.push(result.length === 1 && result[0].name === 'Table 1' && result[0].guests.length === 2
      ? pass('buildTablesWithGuests — only tables with real assigned guests are included', JSON.stringify(result.map(t => t.name)))
      : fail('buildTablesWithGuests — only tables with real assigned guests are included', '["Table 1"]', JSON.stringify(result.map(t => t.name))));

    results.push(result[0]?.guests.every(g => g.name && g.name !== 'Guest Name')
      ? pass('buildTablesWithGuests — real guest names, never a generic placeholder', result[0].guests.map(g => g.name).join(', '))
      : fail('buildTablesWithGuests — real guest names, never a generic placeholder', 'real names', JSON.stringify(result[0]?.guests)));

    results.push(buildTablesWithGuests([], GUESTS).length === 0
      ? pass('buildTablesWithGuests — no tables at all → empty result, not fake data', '[]')
      : fail('buildTablesWithGuests — no tables at all → empty result, not fake data', '[]', JSON.stringify(buildTablesWithGuests([], GUESTS))));
  }

  {
    const tagList = buildGuestTagList(TABLES, GUESTS);
    results.push(!tagList.some(t => t.name === 'Guest Name')
      ? pass('buildGuestTagList — never the hardcoded "Guest Name" placeholder', 'confirmed absent')
      : fail('buildGuestTagList — never the hardcoded "Guest Name" placeholder', 'absent', 'present'));

    results.push(!tagList.some(t => t.name === '__PERSISTENCE_TEST_GUEST__')
      ? pass('buildGuestTagList — excludes is_test guest records', 'confirmed excluded')
      : fail('buildGuestTagList — excludes is_test guest records', 'excluded', 'present'));

    const alice = tagList.find(t => t.name === 'Alice Chen');
    results.push(alice?.table === 'Table 1'
      ? pass('buildGuestTagList — seated guest gets their real table name', alice?.table)
      : fail('buildGuestTagList — seated guest gets their real table name', 'Table 1', alice?.table));

    // Carla is a real guest but not assigned to any table — must still
    // appear (couples want a full guest list even before seating is done),
    // just with no table name, not a fake one.
    const carla = tagList.find(t => t.name === 'Carla Diaz');
    results.push(carla && carla.table === null
      ? pass('buildGuestTagList — unassigned real guest still appears, with no fake table', JSON.stringify(carla))
      : fail('buildGuestTagList — unassigned real guest still appears, with no fake table', '{name:"Carla Diaz", table:null}', JSON.stringify(carla)));

    results.push(buildGuestTagList([], []).length === 0
      ? pass('buildGuestTagList — no guests at all → empty list, not 4 fake tags', '[]')
      : fail('buildGuestTagList — no guests at all → empty list, not 4 fake tags', '[]', JSON.stringify(buildGuestTagList([], []))));
  }

  console.log('\n  Asset system — export spec completeness:\n');

  const editorKeys = EDITABLE_ASSET_KEYS;
  const specKeys = Object.keys(ASSET_EXPORT_SPECS);

  results.push(editorKeys.every(k => specKeys.includes(k))
    ? pass('ASSET_EXPORT_SPECS — every editable asset type has an export spec', editorKeys.join(', '))
    : fail('ASSET_EXPORT_SPECS — every editable asset type has an export spec', editorKeys.join(', '), `missing: ${editorKeys.filter(k => !specKeys.includes(k)).join(', ')}`));

  for (const [key, spec] of Object.entries(ASSET_EXPORT_SPECS)) {
    if (spec.format === 'pdf') {
      const sane = spec.widthMm > 0 && spec.heightMm > 0;
      results.push(sane
        ? pass(`${key} — PDF export dimensions are sane (>0mm)`, `${spec.widthMm}x${spec.heightMm}mm`)
        : fail(`${key} — PDF export dimensions are sane (>0mm)`, '>0mm both axes', `${spec.widthMm}x${spec.heightMm}mm`));
    } else if (spec.format === 'png') {
      const sane = spec.pixelWidth > 0 && spec.pixelHeight > 0;
      results.push(sane
        ? pass(`${key} — PNG export dimensions are sane (>0px)`, `${spec.pixelWidth}x${spec.pixelHeight}px`)
        : fail(`${key} — PNG export dimensions are sane (>0px)`, '>0px both axes', `${spec.pixelWidth}x${spec.pixelHeight}px`));
    } else {
      results.push(fail(`${key} — has a recognised export format`, "'pdf' or 'png'", spec.format));
    }
  }

  results.push(ASSET_EXPORT_SPECS.guestTags?.perPage === 6
    ? pass('guestTags — 6 tags per sheet, matching the product\'s own "6 per A4 sheet" claim', '6')
    : fail('guestTags — 6 tags per sheet, matching the product\'s own "6 per A4 sheet" claim', 6, ASSET_EXPORT_SPECS.guestTags?.perPage));

  results.push(ASSET_EXPORT_SPECS.seatingChart?.widthMm >= 297
    ? pass('seatingChart — exports at poster/A-series size, not a small card', `${ASSET_EXPORT_SPECS.seatingChart?.widthMm}x${ASSET_EXPORT_SPECS.seatingChart?.heightMm}mm`)
    : fail('seatingChart — exports at poster/A-series size, not a small card', '>=297mm wide (A3+)', `${ASSET_EXPORT_SPECS.seatingChart?.widthMm}mm`));

  return results;
}
