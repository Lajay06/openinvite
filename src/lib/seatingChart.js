/**
 * src/lib/seatingChart.js
 *
 * Pure helpers turning the real Table/Guest data (src/pages/Seating.jsx's
 * data model — Table.assigned_guests: [{ seat_index, guest_id }]) into the
 * shape the asset previews need (Seating Chart, Guest Tags/Place Cards).
 * No DOM, no React — directly testable from the plain-Node harness.
 */

/**
 * @param {object[]} tables   Table records ({ id, name, assigned_guests })
 * @param {object[]} guests   Guest records ({ id, name, meal_choice, ... })
 * @returns {{ id: string, name: string, guests: object[] }[]}
 *   Only tables with at least one resolvable assigned guest — a table with
 *   no one seated yet isn't shown as an empty box implying data exists.
 */
export function buildTablesWithGuests(tables, guests) {
  const guestById = new Map((guests || []).map(g => [g.id, g]));
  return (tables || [])
    .map(t => ({
      id: t.id,
      name: t.name || 'Table',
      guests: (t.assigned_guests || [])
        .map(a => guestById.get(a.guest_id))
        .filter(Boolean),
    }))
    .filter(t => t.guests.length > 0);
}

/**
 * Flat, alphabetised guest+table list for name tags / place cards.
 * @returns {{ name: string, table: string|null, meal_choice: string|null }[]}
 */
export function buildGuestTagList(tables, guests) {
  const tablesWithGuests = buildTablesWithGuests(tables, guests);
  const tableNameByGuestId = new Map();
  for (const t of tablesWithGuests) {
    for (const g of t.guests) tableNameByGuestId.set(g.id, t.name);
  }
  return (guests || [])
    .filter(g => !g.is_test)
    .map(g => ({
      name: g.name,
      table: tableNameByGuestId.get(g.id) || null,
      meal_choice: g.meal_choice || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
