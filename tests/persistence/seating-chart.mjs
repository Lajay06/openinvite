/**
 * tests/persistence/seating-chart.mjs
 *
 * src/lib/seatingChart.js — real Table/Guest data → seating chart and guest
 * tag shapes, with honest empty states (no fake placeholder names).
 *
 * RENAMED FROM asset-system.mjs, 2026-08-31. It used to cover a second thing:
 * ASSET_EXPORT_SPECS from src/lib/assetExport.js, asserting that every
 * printable asset had sane physical dimensions. That file is deleted — it
 * existed to turn a rendered element into a PDF at its real print size, which
 * is precisely the north star's test for what goes: if a thing exists because
 * it used to lead to a physical artefact, it goes.
 *
 * The name went with it. A test called "asset-system" that no longer tests an
 * asset system is a false state report, and the name is the loudest thing a
 * test says about itself.
 *
 * The seating chart STAYS and is not part of that retirement: it produces a
 * digital plan, and its printing is incidental rather than its purpose.
 *
 * Pure-function tests — no Base44 API calls, no auth needed.
 */

import { resolveAttendees } from '../../src/lib/attendees.js';
import { buildTablesWithGuests, buildGuestTagList } from '../../src/lib/seatingChart.js';
import { pass, fail } from './_shared.mjs';

// meal_choice lives on event_responses (the live per-event RsvpResponse
// overlay), not a flat g.meal_choice column — that column is vestigial,
// nothing writes it once a guest RSVPs (fix/vestigial-meal-choice-reads).
// buildGuestTagList must read it from here.
const GUESTS = [
  { id: 'g1', name: 'Alice Chen', event_responses: [{ event_id: 'reception', invited: true, status: 'yes', meal_choice: 'vegetarian' }] },
  { id: 'g2', name: 'Ben Okafor', event_responses: [{ event_id: 'reception', invited: true, status: 'yes', meal_choice: 'beef' }] },
  { id: 'g3', name: 'Carla Diaz', event_responses: [{ event_id: 'reception', invited: true, status: 'yes', meal_choice: 'fish' }] },
  { id: 'g4', name: '__PERSISTENCE_TEST_GUEST__', event_responses: [{ event_id: 'reception', invited: true, status: 'yes', meal_choice: 'chicken' }], is_test: true },
];

// These builders now take ATTENDEES, not Guest records — a plus-one is seated
// by synthetic id and has no Guest record to resolve against. resolveAttendees
// is the one place that mapping happens.
const ATTENDEES = resolveAttendees(GUESTS);

const TABLES = [
  { id: 't1', name: 'Table 1', assigned_guests: [{ seat_index: 0, guest_id: 'g1' }, { seat_index: 1, guest_id: 'g2' }] },
  { id: 't2', name: 'Table 2', assigned_guests: [] }, // no one seated yet — must not appear as an empty fake box
  { id: 't3', name: 'Head Table', assigned_guests: [{ seat_index: 0, guest_id: 'g-does-not-exist' }] }, // dangling ref — must not crash or show a phantom guest
];

export async function runSeatingChart() {
  const results = [];

  console.log('\n  Seating chart — real seating data, no fake placeholders:\n');

  {
    const result = buildTablesWithGuests(TABLES, ATTENDEES);
    results.push(result.length === 1 && result[0].name === 'Table 1' && result[0].guests.length === 2
      ? pass('buildTablesWithGuests — only tables with real assigned guests are included', JSON.stringify(result.map(t => t.name)))
      : fail('buildTablesWithGuests — only tables with real assigned guests are included', '["Table 1"]', JSON.stringify(result.map(t => t.name))));

    results.push(result[0]?.guests.every(g => g.name && g.name !== 'Guest Name')
      ? pass('buildTablesWithGuests — real guest names, never a generic placeholder', result[0].guests.map(g => g.name).join(', '))
      : fail('buildTablesWithGuests — real guest names, never a generic placeholder', 'real names', JSON.stringify(result[0]?.guests)));

    results.push(buildTablesWithGuests([], ATTENDEES).length === 0
      ? pass('buildTablesWithGuests — no tables at all → empty result, not fake data', '[]')
      : fail('buildTablesWithGuests — no tables at all → empty result, not fake data', '[]', JSON.stringify(buildTablesWithGuests([], ATTENDEES))));
  }

  {
    const tagList = buildGuestTagList(TABLES, ATTENDEES);
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

    // fix/vestigial-meal-choice-reads — meal_choice must come from
    // event_responses (the live overlay), not a flat g.meal_choice field
    // (Alice's fixture has no such field at all, only event_responses).
    results.push(alice?.meal_choice === 'vegetarian'
      ? pass('buildGuestTagList — meal_choice comes from the resolved attendee meal (overlay first, couple-set fallback), never a raw flat read', alice?.meal_choice)
      : fail('buildGuestTagList — meal_choice comes from the resolved attendee meal (overlay first, couple-set fallback), never a raw flat read', 'vegetarian', alice?.meal_choice));

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


  return results;
}
