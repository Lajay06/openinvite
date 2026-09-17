/**
 * THE PILLS AND THE STRING, IN BOTH DIRECTIONS (Run 6 U4).
 *
 * The schema stores one free string; the RSVP form offers pills. Serialising
 * was already in the page, inline at the submit. PARSING was not — the pill
 * state started empty on every visit, so a returning guest saw none of their
 * own pills selected, and the submit read
 *
 *     dietaryPicked.length ? <pills joined> : dietaryRestrictions
 *
 * so an untouched control — which is exactly what "I already answered this"
 * looks like on screen — re-sent the FIRST answer, and clearing every pill
 * could not clear anything at all.
 *
 * Both directions live here rather than in RSVPPage.jsx for one reason: a
 * guard has to be able to drive them. Node cannot import a .jsx module, and a
 * rule this load-bearing should not be provable only through a browser.
 */
export const DIETARY_OTHER = 'Something else';
export const DIETARY_OPTIONS = [
  'No restrictions', 'Vegetarian', 'Vegan', 'Gluten free',
  'Dairy free', 'Nut allergy', 'Halal', 'Kosher', DIETARY_OTHER,
];

/** The stored string, back into the pills that produced it. */
export function parseDietaryPills(str) {
  const parts = String(str || '').split(',').map((x) => x.trim()).filter(Boolean);
  const picked = [];
  let other = '';
  for (const part of parts) {
    if (DIETARY_OPTIONS.includes(part) && part !== DIETARY_OTHER) {
      if (!picked.includes(part)) picked.push(part);
    } else {
      // Anything the list does not know is what the guest typed themselves.
      if (!picked.includes(DIETARY_OTHER)) picked.push(DIETARY_OTHER);
      other = other ? `${other}, ${part}` : part;
    }
  }
  return { picked, other };
}

/**
 * The wire value for the pills. AN EMPTY SELECTION IS AN EMPTY STRING: a guest
 * who clears their restrictions is saying something, not saying nothing, and
 * the endpoint's unconditional guest-level write is what records it.
 */
export function serializeDietaryPills(picked, other) {
  return (picked || [])
    .map((o) => (o === DIETARY_OTHER ? String(other || '').trim() : o))
    .filter(Boolean)
    .join(', ');
}
