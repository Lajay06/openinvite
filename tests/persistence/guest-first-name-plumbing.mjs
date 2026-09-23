/**
 * The recognised guest's first name reaches the entrance — without the
 * entrance, the skeleton or the wedding fetch ever waiting for it.
 *
 * Guest greeting, package two. MultiPageWeddingWebsite resolves the RSVP
 * token in a useState initialiser (consume-and-strip, before any effect),
 * and now looks that token up against /api/rsvp-lookup in an effect OF ITS
 * OWN, beside the wedding fetch, holding greetableFirstName(...) in state and
 * passing it to EntranceMoment as a named prop. Package three then renders it
 * as one line above the kicker, decided at the kicker beat.
 *
 * What is asserted is the SHAPE that keeps the hard constraints true:
 *   - the lookup lives in its own effect keyed on the token, not inside
 *     loadWeddingDetails and not chained to it;
 *   - no token, no request — the guard precedes the fetch;
 *   - a failure is swallowed, never thrown to the boundary;
 *   - the entrance receives `guestFirstName` by name, and the shell passes it
 *     by name;
 *   - the value goes through the one greeting rule from #825.
 * Render-level proof (prop arrives / null / DOM byte-identical / timing with
 * a delayed lookup) lives in the PR body — it needs a browser and a stubbed
 * endpoint, which this lane runs on its own port.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

export async function runGuestFirstNamePlumbing() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Guest first name reaches the entrance without gating anything:\n');

  const shell = read('src/components/guest-website/MultiPageWeddingWebsite.jsx');
  const entrance = read('src/components/guest-website/EntranceMoment.jsx');

  // The effect, as one block: guard first, fetch inside, swallow, keyed on the token.
  const effect = shell.match(/useEffect\(\(\) => \{\s*if \(!recognisedToken\) \{[\s\S]*?\}, \[recognisedToken\]\);/);
  check('the lookup is its own effect keyed on recognisedToken', !!effect, effect ? 'found' : 'no such effect');
  const body = effect ? effect[0] : '';
  check('  no token, no request — the guard precedes the fetch',
    body.indexOf('if (!recognisedToken)') > -1 && body.indexOf('if (!recognisedToken)') < body.indexOf('fetch('), 'guard before fetch');
  check('  it calls /api/rsvp-lookup with the encoded token', /fetch\(`\/api\/rsvp-lookup\?token=\$\{encodeURIComponent\(recognisedToken\)\}`\)/.test(body), 'exact URL');
  check('  a failed lookup is swallowed, not thrown', /catch \{/.test(body) && !/console\.(error|warn)/.test(body), 'try/catch, no console noise');
  check('  the value goes through greetableFirstName', /setGuestFirstName\(greetableFirstName\(data\?\.guest\?\.name\)\)/.test(body)
    && /import \{ greetableFirstName \} from '@\/lib\/guestGreeting'/.test(shell), 'one rule, #825');
  check('  a stale response is ignored after the token changes', /stale = true/.test(body), 'cleanup flag');

  // Not chained: the wedding fetch effect does not mention the lookup, and vice versa.
  const wedding = shell.match(/const loadWeddingDetails = async \(\) => \{[\s\S]*?\};/);
  check('the wedding fetch does not await or mention the lookup', !!wedding && !/rsvp-lookup|guestFirstName/.test(wedding[0]), 'independent');
  check('  and the lookup does not await the wedding', !/fetchWeddingBySlug|weddingDetails/.test(body), 'independent');

  // The prop, by name, at both ends.
  check('the shell passes guestFirstName to EntranceMoment by name', /<EntranceMoment[\s\S]*?guestFirstName=\{guestFirstName\}[\s\S]*?\/>/.test(shell), 'named prop, no spread');
  check('  EntranceMoment accepts guestFirstName in its signature', /export default function EntranceMoment\(\{[^}]*\bguestFirstName = null\b[^}]*\}\)/.test(entrance), 'named, defaults to null');
  // Package three: the prop is read by the kicker timer through a ref and
  // rendered as greetName — never straight from the prop, so a late name
  // cannot pop in after the beat.
  check('  and the greeting is fixed at the kicker beat, not read live from the prop',
    /guestFirstNameRef\.current = guestFirstName/.test(entrance) && /const name = guestFirstNameRef\.current \|\| null;/.test(entrance) && /\{greetName && \(/.test(entrance) && !/\{guestFirstName\}/.test(entrance),
    'ref at the beat, greetName in the tree');

  return results;
}
