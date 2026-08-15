/**
 * src/lib/seatingChart.js
 *
 * Pure helpers turning the real Table/Guest data (src/pages/Seating.jsx's
 * data model — Table.assigned_guests: [{ seat_index, guest_id }]) into the
 * shape the asset previews need (Seating Chart, Guest Tags/Place Cards).
 * No DOM, no React — directly testable from the plain-Node harness.
 */

import { isPlusOneId, MEAL_CHOSEN } from './attendees.js';

/**
 * @param {object[]} tables   Table records ({ id, name, assigned_guests })
 * @param {object[]} people   ATTENDEES (src/lib/attendees.js), not Guest records
 * @returns {{ id: string, name: string, guests: object[] }[]}
 *   Only tables with at least one resolvable assigned guest — a table with
 *   no one seated yet isn't shown as an empty box implying data exists.
 */
/**
 * A seated attendee whose id could not be resolved.
 *
 * THE LOUD/QUIET SPLIT — the two cases are not the same defect:
 *
 *   an unknown PLAIN id is STALE DATA. A guest was deleted after being seated,
 *     their row lingers in Table.assigned_guests, and dropping it silently is
 *     correct. That is deliberate and fixtured in
 *     tests/persistence/asset-system.mjs:48 with `g-does-not-exist`.
 *
 *   an unresolvable SYNTHETIC id is OUR BUG. It means Guest records were passed
 *     where attendees were required, and every seated plus-one is about to
 *     disappear from the chart the venue works from — the least detectable and
 *     most consequential failure in this whole area. It must never be
 *     indistinguishable from the tested case above.
 *
 * Reported rather than thrown: a broken chart is worse than an incomplete one,
 * so the render continues. The counter makes it assertable without a console.
 */
let unresolvedAttendees = [];

function reportUnresolvedAttendee(id, table) {
  unresolvedAttendees.push({ id, tableId: table && table.id, tableName: table && table.name });
  console.error(
    `[seatingChart] Unresolved PLUS-ONE id "${id}" at table "${table && table.name}". ` +
    'This is a resolution bug, not stale data: buildTablesWithGuests was given Guest ' +
    'records where an attendee list (src/lib/attendees.js resolveAttendees) is required, ' +
    'so seated plus-ones are being dropped from the seating chart.'
  );
}

/** Unresolved synthetic ids seen since the last reset — for assertions. */
export function getUnresolvedAttendees() { return [...unresolvedAttendees]; }
export function resetUnresolvedAttendees() { unresolvedAttendees = []; }

export function buildTablesWithGuests(tables, people) {
  // `people` is an ATTENDEE list, not Guest records: a plus-one is seated by
  // synthetic id and has no Guest record to look up.
  const byId = new Map((people || []).map(p => [p.id, p]));
  return (tables || [])
    .map(t => ({
      id: t.id,
      name: t.name || 'Table',
      guests: (t.assigned_guests || [])
        .map(a => {
          const found = byId.get(a.guest_id);
          if (!found && isPlusOneId(a.guest_id)) reportUnresolvedAttendee(a.guest_id, t);
          return found;
        })
        .filter(Boolean),
    }))
    .filter(t => t.guests.length > 0);
}

/**
 * Flat, alphabetised guest+table list for name tags / place cards.
 * meal_choice comes from the ATTENDEE's own resolved meal, which resolveAttendees
 * has already ranked (the person's per-event answer first, the couple's guest-editor
 * entry second). Only a real selection is emitted; "chose nothing" and "no data"
 * both yield null.
 * @returns {{ name: string, table: string|null, meal_choice: string|null }[]}
 */
export function buildGuestTagList(tables, people) {
  const tablesWithGuests = buildTablesWithGuests(tables, people);
  const tableNameByGuestId = new Map();
  for (const t of tablesWithGuests) {
    for (const g of t.guests) tableNameByGuestId.set(g.id, t.name);
  }
  // Attendees, so plus-ones get their own name tag and place card. Attendees
  // carry is_test through from their source Guest record, so a plus-one of a
  // test guest is filtered out with its host.
  return (people || [])
    .filter(g => !g.is_test)
    .map(g => ({
      name: g.name,
      table: tableNameByGuestId.get(g.id) || null,
      // The attendee's OWN meal, already ranked overlay-then-flat by
      // resolveAttendees. Only a real selection is reported: `none` and
      // `not-loaded` both yield null rather than asserting to a caterer
      // that someone chose nothing. Reaching for g.event_responses here
      // would be reading a Guest field off an attendee — for a plus-one
      // that field does not exist, and its host's is not theirs.
      meal_choice: g.meal && g.meal.state === MEAL_CHOSEN ? g.meal.value : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
