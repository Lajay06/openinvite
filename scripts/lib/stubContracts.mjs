/**
 * stubContracts — assert the harness's API stubs return the ENVELOPE the real
 * endpoint returns.
 *
 * WHY A SEPARATE CHECK. /api/my-wedding-details was stubbed as
 * `{ details: <record> }`. The endpoint ends in `res.status(200).json(decrypted)`
 * and getMyWeddingDetails() returns `await res.json()` untouched — so EVERY
 * dashboard pass that read wedding details got an object with no wedding fields
 * on it. getWeddingEvents(wd) saw no events; mealOptions, weddingParty, slug and
 * id were all undefined. The pages rendered their no-data state and the sweeps
 * read them as clean.
 *
 * NO NAME-BASED CHECK CATCHES THAT. The stub's path was right. Its shape was
 * not. So each contract below is derived by READING the endpoint's own return
 * statement, cited in the comment, and asserts the SHAPE.
 *
 * WHAT THIS CANNOT CATCH: an endpoint whose real response shape changes without
 * this table being updated. The citation is there so the next reader can check
 * it against the file in one step rather than trusting the comment.
 */

/** path fragment -> { cite, ok(body) } */
export const CONTRACTS = [
  { match: '/api/my-wedding-details',
    cite: 'api/my-wedding-details.js — res.status(200).json(decrypted)',
    ok: (b) => b === null || (b && typeof b === 'object' && !Array.isArray(b) && !('details' in b)),
    want: 'the wedding record itself, NOT { details: … }' },

  { match: '/api/my-guests',
    cite: 'api/my-guests.js:206 — res.status(200).json({ guests })',
    ok: (b) => b && Array.isArray(b.guests),
    want: '{ guests: [...] }' },

  { match: '/api/my-guest-links',
    cite: 'api/my-guest-links.js — res.status(200).json({ links })',
    ok: (b) => b && Array.isArray(b.links),
    want: '{ links: [...] }' },

  { match: '/api/wedding-by-slug',
    cite: 'api/wedding-by-slug.js — res.json({ ...pickGuestSafeFields(wedding), ...registry })',
    ok: (b) => b && typeof b === 'object' && !Array.isArray(b) && 'slug' in b,
    want: 'the wedding record spread at the top level (has .slug)' },

  { match: '/api/rsvp-lookup',
    cite: 'api/rsvp-lookup.js — res.status(200).json({ guest, wedding })',
    ok: (b) => b && 'guest' in b && 'wedding' in b,
    want: '{ guest, wedding }' },

  { match: '/api/wedding-attendees',
    cite: 'api/wedding-attendees.js — res.status(200).json({ attendees, circle })',
    ok: (b) => b && Array.isArray(b.attendees) && Array.isArray(b.circle),
    want: '{ attendees: [...], circle: [...] }' },
];

/**
 * Run every stub through its contract by asking the handler for a body.
 * `probe(url)` must return the parsed body the stub would fulfil with.
 */
export async function assertStubContracts(probe) {
  const failures = [];
  for (const c of CONTRACTS) {
    let body;
    try { body = await probe(`http://localhost${c.match}`); }
    catch (e) { failures.push(`${c.match}: stub threw — ${e.message}`); continue; }
    if (body === undefined) { failures.push(`${c.match}: no stub answers this path`); continue; }
    if (!c.ok(body)) {
      failures.push(
        `${c.match}\n      want: ${c.want}\n      got : ${JSON.stringify(body).slice(0, 90)}\n      per : ${c.cite}`);
    }
  }
  if (failures.length) {
    throw new Error(
      `\n  HARNESS STUBS DO NOT MATCH THEIR ENDPOINTS — ${failures.length}:\n    ` +
      failures.join('\n    ') +
      '\n\n  A stub with the right NAME and the wrong SHAPE makes every page that reads\n' +
      '  it render its no-data state, and the pass reports that as clean.\n');
  }
}
