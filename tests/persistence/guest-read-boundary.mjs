/**
 * tests/persistence/guest-read-boundary.mjs
 *
 * ONE WEDDING'S GUEST CANNOT READ ANOTHER WEDDING.
 *
 * A guest-facing read endpoint is unauthenticated by design — a guest has no
 * account. The only thing standing between "show me this couple's page" and
 * "show me any couple's page" is the shape of the lookup, so that shape is
 * what this file guards.
 *
 * STATIC BY DELIBERATE CHOICE. The sibling `anonymous-endpoints.mjs` exercises
 * the real handlers against real Base44, which is the stronger test and the
 * reason field-leakage is covered there rather than here. It also WRITES —
 * PollVote, RsvpResponse, SongRequest — and its own header documents that
 * those records cannot be cleaned up afterwards. This file reads source and
 * writes nothing, so it can run on every PR without leaving anything behind.
 *
 * The three properties below are the ones an attacker would attack:
 *
 *   1. NO ID LOOKUPS. A slug is a name the couple chose and handed out; a
 *      record id is an internal handle. An endpoint that accepts `?id=` lets
 *      anyone enumerate weddings, and no guest ever needs it. None do today,
 *      and this is what keeps it that way.
 *   2. RESOLUTION GOES THROUGH THE SHARED RESOLVER, which filters is_test and
 *      REFUSES an ambiguous slug rather than handing back whichever row sorted
 *      first — a duplicate slug must resolve to nothing, not to a coin flip.
 *   3. THE RESPONSE IS AN ALLOWLIST, never the raw record. `pickGuestSafeFields`
 *      is the one place that decides what a stranger may see.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(__dir, '../../', p), 'utf8');

/** Every endpoint a guest can reach without an account. */
const GUEST_READ_ENDPOINTS = [
  'api/wedding-by-slug.js',
  'api/wedding-poll-results.js',
  'api/rsvp-lookup.js',
  'api/wedding-attendees.js',
];

export async function runGuestReadBoundary() {
  const results = [];
  const check = (name, ok, detail) => results.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Guest read boundary — a guest of one wedding cannot read another:\n');

  for (const file of GUEST_READ_ENDPOINTS) {
    let src;
    try {
      src = read(file);
    } catch {
      // A GUARD THAT CANNOT FIND ITS INPUT MUST FAIL, NOT PASS. A renamed or
      // deleted endpoint is exactly when this file must speak up.
      check(`${file} exists to be checked`, false, 'FILE NOT FOUND');
      continue;
    }

    // 1 — no id-keyed lookup from anything the caller controls
    const idFromCaller = /req\.(query|body)\s*[.[]\s*['"]?(id|weddingId|wedding_id)\b/.test(src);
    check(`${file} takes no record id from the caller`, !idFromCaller,
      idFromCaller ? 'reads an id from query or body' : 'slug only');

    // and never addresses a record by id against Base44
    const idPath = /entities\/WeddingDetails\/\$\{/.test(src);
    check(`  and never fetches WeddingDetails by id`, !idPath,
      idPath ? 'builds an /entities/WeddingDetails/<id> URL' : 'no by-id fetch');
  }

  // 2 — the shared resolver, which refuses ambiguity and drops is_test
  const resolver = read('api/_lib/resolveWeddingBySlug.js');
  check('the slug resolver refuses an ambiguous slug', /reason:\s*'ambiguous'/.test(resolver),
    'two rows sharing a slug resolve to nothing, not to the first');
  check('the slug resolver excludes is_test records', /!w\.is_test/.test(resolver),
    'a harness record can never be served to a guest');

  for (const file of ['api/wedding-by-slug.js', 'api/wedding-poll-results.js']) {
    const src = read(file);
    check(`${file} resolves through the shared resolver`,
      /resolveWeddingBySlug\s*\(/.test(src), 'not a local .find() on the list');
  }

  // 3 — the response is an allowlist
  const bySlug = read('api/wedding-by-slug.js');
  check('wedding-by-slug returns an allowlist, not the record',
    /pickGuestSafeFields\s*\(/.test(bySlug), 'pickGuestSafeFields');

  // 4 — an unpublished wedding is not served to a stranger
  check('an unpublished wedding is refused unless the caller owns it',
    /websiteEnabled\s*!==\s*true/.test(bySlug) && /verifyBase44User/.test(bySlug),
    'gate present with an ownership check');

  return results;
}
