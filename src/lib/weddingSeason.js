/**
 * Season derivation, hemisphere-aware.
 *
 * The bug this replaces: a New Year's Eve wedding at Crown Sydney was told it
 * was a "winter" wedding. The old helper mapped month to season with a fixed
 * Northern Hemisphere table, having already been handed the venue. December in
 * Sydney is summer.
 *
 * Rules, in order:
 *   1. Country parsed from the venue address decides the hemisphere.
 *   2. A country on neither list, an unparseable address, or no address at all
 *      means NO SEASON. An absent season is correct; a guessed one is the bug.
 *      There is deliberately no default hemisphere.
 *
 * The mapping is METEOROLOGICAL (whole months: Dec-Feb, Mar-May, Jun-Aug,
 * Sep-Nov), not astronomical. Pretending to know that 21 December flips the
 * season would be inventing precision the input does not carry.
 *
 * Better long-term source: resolving the stored Google placeId to real
 * coordinates and taking the hemisphere from the sign of the latitude. Not
 * built — it adds a server round trip to a quiz page for marginal gain over
 * parsing the country the address already ends with.
 */

/** Southern hemisphere. Explicit, not inferred. */
const SOUTHERN = [
  'australia', 'new zealand', 'south africa', 'argentina', 'chile', 'uruguay',
];

/** Northern hemisphere. Explicit, not inferred. */
const NORTHERN = [
  'united states', 'united states of america', 'usa', 'us', 'canada',
  'united kingdom', 'uk', 'great britain', 'england', 'scotland', 'wales',
  'ireland', 'france', 'spain', 'italy', 'germany', 'portugal', 'greece',
  'netherlands', 'belgium', 'switzerland', 'austria', 'sweden', 'norway',
  'denmark', 'finland', 'poland', 'czechia', 'czech republic', 'croatia',
  'hungary', 'romania', 'turkey', 'japan', 'china', 'south korea', 'india',
  'mexico', 'united arab emirates', 'uae',
];

/**
 * Google-formatted addresses end in the country: "1 Barangaroo Ave,
 * Barangaroo NSW 2000, Australia".
 * @returns {string|null} the country as written, or null
 */
export function parseCountry(address) {
  if (!address || typeof address !== 'string') return null;
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;   // a bare venue name is not an address
  return parts[parts.length - 1] || null;
}

/** @returns {'south'|'north'|null} — null means "we do not know", not "north". */
export function hemisphereFor(country) {
  if (!country || typeof country !== 'string') return null;
  const key = country.trim().toLowerCase().replace(/\.$/, '');
  if (SOUTHERN.includes(key)) return 'south';
  if (NORTHERN.includes(key)) return 'north';
  return null;
}

const NORTHERN_BY_MONTH = {
  12: 'Winter', 1: 'Winter', 2: 'Winter',
  3: 'Spring', 4: 'Spring', 5: 'Spring',
  6: 'Summer', 7: 'Summer', 8: 'Summer',
  9: 'Autumn', 10: 'Autumn', 11: 'Autumn',
};
const OPPOSITE = { Winter: 'Summer', Summer: 'Winter', Spring: 'Autumn', Autumn: 'Spring' };

/**
 * @param {string} weddingDate  ISO date
 * @param {string} [venueAddress]  formatted address ending in the country
 * @returns {'Spring'|'Summer'|'Autumn'|'Winter'|null}
 */
export function deriveSeason(weddingDate, venueAddress) {
  if (!weddingDate) return null;
  const d = new Date(weddingDate);
  if (Number.isNaN(d.getTime())) return null;

  const hemisphere = hemisphereFor(parseCountry(venueAddress));
  if (!hemisphere) return null;   // no guessing, and no defaulting to north

  const northern = NORTHERN_BY_MONTH[d.getMonth() + 1];
  return hemisphere === 'north' ? northern : OPPOSITE[northern];
}
