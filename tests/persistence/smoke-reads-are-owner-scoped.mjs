/**
 * tests/persistence/smoke-reads-are-owner-scoped.mjs
 *
 * A SCRIPT THAT HOLDS A PRODUCTION TOKEN IS PRODUCTION CODE.
 *
 * ── THE INCIDENT ───────────────────────────────────────────────────────────
 *
 * On 2026-09-14 the launch smoke's teardown and its step-2 record read both
 * did this:
 *
 *     fetch(`/apps/${appId}/entities/WeddingDetails`)        // the WHOLE thing
 *       .sort((a, b) => b.created_date - a.created_date)[0]  // newest wins
 *
 * A caller's token can read rows it does not own. The newest row in the
 * collection belonged to ANOTHER ACCOUNT, created minutes earlier — so the
 * smoke resolved that record, printed its couple's names in its own report as
 * though they were the smoke account's, and the teardown sent it
 * `PUT { websiteEnabled: false }`.
 *
 * Base44 answered 403 and nothing was written. The refusal came from the
 * platform's row-level security, not from the script, and a teardown must
 * never be relying on that.
 *
 * Two breaches of R23, not one: a non-owner record was read, and one was
 * written to — the write failing only because something else stopped it.
 *
 * ── WHY A GUARD AND NOT A NOTE ─────────────────────────────────────────────
 *
 * src/lib/resolveMyWedding.js has carried this exact lesson in its header
 * since it was written — "previously this was resolved as
 * WeddingDetails.list()[0] … Any other account creating a newer record made it
 * appear on every other user's dashboard" — and it was read twice in the
 * session that then reproduced it by hand. A rule with no instrument is how
 * this arrived. The rule was about product code; nothing said it applied to a
 * test, and a test holding a real production token is where it applies
 * hardest, because nobody reviews it.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SMOKE = 'scripts/launch-smoke.mjs';

/** CODE, NOT COMMENTS — this file's own prose names the things it forbids. */
const code = (src) => src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

export async function runSmokeReadsAreOwnerScoped() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const raw = readFileSync(join(ROOT, SMOKE), 'utf8');
  const src = code(raw);
  // PRESENCE BEFORE PROPERTIES: every check below is trivially true of a file
  // that does not exist or has been emptied.
  check('the launch smoke is readable', raw.length > 10000, `${raw.length} chars`);
  check('  and it still drives the journey', /getByRole\('button'/.test(src) && /chromium\.launch/.test(src),
    'a browser run, not a stub');

  // ── the four ways it could reach a record that is not the owner's ─────────
  const banned = [
    ['a raw entity list', /WeddingDetails\.list\(/],
    ['an unscoped entity filter', /WeddingDetails\.filter\(/],
    ['a direct /entities/ collection read', /entities\/\w+`?\s*,|entities\/\w+['"`]\s*[,)]/],
    ['the admin key', /BASE44_ADMIN_KEY/],
  ];
  for (const [what, re] of banned) {
    const hit = src.match(re);
    check(`  no ${what}`, !hit, hit ? `found: ${hit[0].slice(0, 60)}` : 'none');
  }

  // A record is addressed BY ID for the write, and that is allowed — the id
  // has to come from somewhere owner-scoped, which is the next check.
  check('  every wedding read goes through /api/my-wedding-details',
    /\/api\/my-wedding-details/.test(src) && !/entities\/WeddingDetails['"`]/.test(src),
    'the resolver filters by created_by_id server-side');
  check('  and the guest links through /api/my-guest-links',
    /\/api\/my-guest-links/.test(src), 'the endpoint returns the finished URL, so nothing is assembled');

  // THE WRITE IS THE HALF THAT COST SOMETHING. An entity PUT is permitted only
  // against an id the owner-scoped read returned, so the id's provenance is
  // what this pins: no sort-by-created_date picking a winner out of a list.
  // `[^)]*` WAS THE WRONG CLASS AND A PLANT CAUGHT IT. The incident's own line
  // is `sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]`
  // — there are parentheses INSIDE the comparator, so a pattern that cannot
  // cross a `)` never reaches `created_date`. It passed on a verbatim copy of
  // the thing it exists to forbid.
  check('no record is chosen by being the newest in a collection',
    !/sort\([\s\S]{0,160}?created_date[\s\S]{0,160}?\)\s*\[\s*0\s*\]/.test(src),
    'the incident was newest-wins over rows the token could read but did not own');

  return results;
}
