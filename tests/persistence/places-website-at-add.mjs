/**
 * A PLACE ADDED FROM THE PICKER KEEPS ITS WEBSITE.
 *
 * Owner report, Run 5 T8: a stay added today through Google search shows only
 * "View on maps".
 *
 * ── WHY THE LINK WAS NEVER THERE ───────────────────────────────────────────
 *
 * api/places-search.js forwards eight named keys from Google's Text Search —
 * place_id, name, address, rating, user_ratings_total, price_level, types,
 * photo_reference, maps_url — and NOT `website`, because Text Search does not
 * return one. Both add paths read `place.website_url` off that result, so both
 * stored null for every place ever added from the picker. The couple could
 * only get a website onto a place by typing it by hand.
 *
 * api/place-details.js has asked Google for `website` by name since it was
 * written (:33). The fix is one details call at add time, and this guard holds
 * both surfaces to it — the Stay page adopted it in S5, Experiences in T8, and
 * a third add path added later would be the next place to forget.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8');

export async function runPlacesWebsiteAtAdd() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  console.log('\n  The website survives the add:\n');

  // The premise the whole package rests on, asserted rather than assumed.
  const search = code('api/places-search.js');
  check('the search endpoint really does not return a website',
    !/website/.test(search.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')),
    'Text Search has no website field, and this forwards named keys only');
  const details = code('api/place-details.js');
  check('  while place-details asks Google for it by name',
    /fields = '[^']*website/.test(details) && /website:\s+p\.website/.test(details),
    'the field is requested and forwarded');

  for (const [label, file, anchor] of [
    ['Stay', 'src/pages/GuestSuiteAccommodation.jsx', 'handleAdd'],
    ['Experiences', 'src/components/studio/guest-suite/ExperienceGuideTab.jsx', 'handleAddPlace'],
  ]) {
    const src = code(file);
    check(`${label} fetches place-details when it adds a place`,
      /await fetch\(`\/api\/place-details\?place_id=\$\{encodeURIComponent\(/.test(src),
      'one call, at add time');
    check(`  ${label} stores what it got`,
      /website_url = \(await res\.json\(\)\)\?\.website \|\| null/.test(src),
      'website_url on the saved item');
    check(`  ${label} adds the place anyway if the lookup fails`,
      /catch \{ \/\* the place is added without it \*\/ \}/.test(src),
      'best effort — a place the couple chose is not lost to a rate limit');
    check(`  ${label}'s add path is the one that awaits it`,
      new RegExp(`${anchor}\\s*=\\s*async`).test(src),
      `${anchor} is async`);
  }

  return results;
}
