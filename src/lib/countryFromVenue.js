import { COUNTRIES } from './countryCodes.generated.js';

/**
 * WHICH COUNTRY A PHONE FIELD SHOULD START ON — read from the venue address.
 *
 * NOTHING STORES A COUNTRY. WeddingDetails has no country field: a venue is a
 * formatted address string and a Google place id on the events array. So this
 * matches the address's LAST comma-separated part against the country table,
 * including the aliases people actually write ("USA", "UK"). A per-wedding
 * country field is the real fix and is on the post-launch ticket; until then
 * this is honest about being a tail match, and its failure mode is the old
 * behaviour — Australia — rather than a wrong country.
 *
 * NO REACT AND NO DATA CLIENT IN THIS FILE, deliberately: the guard reads it
 * directly in Node, and a module that pulls the base44 client in to answer a
 * string question cannot be read that way.
 */
export function countryFromVenueAddress(address) {
  const tail = String(address || '').split(',').pop()?.trim().toLowerCase();
  if (!tail) return null;
  const bare = tail.replace(/\.$/, '');
  for (const c of COUNTRIES) {
    if (c.label.toLowerCase() === bare) return c.iso;
    if ((c.aliases || []).includes(bare)) return c.iso;
  }
  return null;
}

/** The first venue on the record that names a country, else null. */
export function countryFromWedding(wedding) {
  const events = Array.isArray(wedding?.events) ? wedding.events : [];
  for (const e of events) {
    const iso = countryFromVenueAddress(e?.venueAddress || e?.address);
    if (iso) return iso;
  }
  return countryFromVenueAddress(wedding?.venueAddress || wedding?.address);
}
