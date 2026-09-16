/**
 * AN ADDRESS THE COUPLE USED TO HAVE STILL WORKS.
 *
 * Owner ruling, Run 4 S8b: the address NEVER changes silently. A change is a
 * deliberate action, the old slug is kept as an alias, and /w/<old> 301s to
 * /w/<new>. RSVP token links are unaffected — they resolve by token.
 *
 * ── WHAT THIS CAN AND CANNOT CHECK ─────────────────────────────────────────
 *
 * The alias arithmetic is pure and is tested here directly. The redirect
 * itself is a Vercel function reading Base44 with the admin key, which no
 * credential-free guard can exercise — so what is asserted about it is its
 * SHAPE: that guest-page 301s rather than rewriting, that it carries the rest
 * of the path, that it refuses on more than one match, and that the API's
 * alias branch returns no record.
 *
 * THAT LAST ONE IS THE IMPORTANT CHECK. The obvious way to write the API's
 * alias branch is to return the wedding, and that would answer around the
 * publish gate and the password gate — the exact leak this endpoint's own
 * history is about, where an unpublished site returned 200 with the couple's
 * names and venue. The branch names the new address and nothing else.
 *
 * The live behaviour of `?q={"previousSlugs":"x"}` was proved separately
 * against the smoke record (owner-authorized probe, 2026-09-16): it resolves
 * as an array-contains and returned exactly the one matching record. Without
 * that proof the redirect would silently never fire.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { previousSlugsOf, withAlias, canonicalSlug } from '../../api/_lib/slugCanon.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

export async function runSlugAliasRedirect() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  console.log('\n  The address a couple used to have still works:\n');

  // ── ABSENT IS EMPTY ──────────────────────────────────────────────────────
  // The field is declared but unset on every record written before it existed.
  // The smoke probe read `undefined` on its first read and `[]` only after a
  // write, so a reader that trusted `.length` would throw on a real record.
  check('an unset previousSlugs reads as empty', eq(previousSlugsOf({}), []), '[]');
  check('  and so does undefined', eq(previousSlugsOf({ previousSlugs: undefined }), []), '[]');
  check('  and a non-array does not throw', eq(previousSlugsOf({ previousSlugs: 'x' }), []), '[]');
  check('  blanks are not addresses', eq(previousSlugsOf({ previousSlugs: ['a', '', null, '  '] }), ['a']), '["a"]');

  // ── THE ALIAS ARITHMETIC ────────────────────────────────────────────────
  check('a first rename keeps the old address',
    eq(withAlias({}, 'john-suzanne', 'jay-ella'), ['john-suzanne']), '["john-suzanne"]');
  check('  a second rename keeps both',
    eq(withAlias({ previousSlugs: ['john-suzanne'] }, 'jay-ella', 'jay-and-ella'), ['john-suzanne', 'jay-ella']),
    '["john-suzanne","jay-ella"]');
  // A SLUG IN BOTH PLACES REDIRECTS TO ITSELF FOREVER. Renaming back to an
  // address the wedding used to have is the ordinary way that happens.
  check('  and the new address is never left as its own alias',
    !withAlias({ previousSlugs: ['jay-ella'] }, 'john-suzanne', 'jay-ella').includes('jay-ella'),
    'jay-ella removed when it becomes canonical');
  check('  aliases are deduped',
    eq(withAlias({ previousSlugs: ['a'] }, 'a', 'b'), ['a']), '["a"]');
  check('  and stored in canonical form', eq(withAlias({}, 'John Suzanne!', 'x'), [canonicalSlug('John Suzanne!')]),
    canonicalSlug('John Suzanne!'));

  // ── THE REDIRECT'S SHAPE ────────────────────────────────────────────────
  {
    const gp = code('api/guest-page.js');
    check('/w/<old> answers 301, not a rewrite',
      /statusCode\s*=\s*301/.test(gp) && /setHeader\('Location'/.test(gp), '301 + Location');
    check('  and carries the rest of the path',
      /tailFrom\(req\.url\)/.test(gp), 'tailFrom(req.url)');
    check('  and refuses unless exactly one wedding claims the old address',
      /rows\.length === 1 \? rows\[0\]\.slug : null/.test(gp), 'one row or nothing');
    check('  a failed alias lookup still serves the page',
      /catch\s*\{[\s\S]{0,200}?return null;/.test(gp), 'the redirect is a nicety; the page loading is not');
  }

  // ── THE API'S ALIAS BRANCH CARRIES NO RECORD ────────────────────────────
  {
    const api = code('api/wedding-by-slug.js');
    const branch = (api.match(/const canonical = await aliasTarget[\s\S]{0,400}?\n\s*}/) || [''])[0];
    check('the API answers an alias with the new address and no wedding',
      /canonicalSlug: canonical/.test(branch) && !/guestSafeWedding|pickGuestSafeFields/.test(branch),
      'names the address, returns no record');
    check('  and still 404s, so a moved address and an absent one look the same',
      /status\(404\)[\s\S]{0,80}canonicalSlug/.test(branch), '404 with canonicalSlug');
  }

  // ── THE RENAME IS ITS OWN ENDPOINT ──────────────────────────────────────
  {
    const ca = code('api/change-address.js');
    const cs = code('api/claim-slug.js');
    check('renaming is not a mode of claim-slug',
      !/newSlug/.test(cs), 'claim-slug still only derives');
    check('  the rename refuses an address another wedding redirects FROM',
      /previousSlugs: wanted/.test(ca), 'checks aliases as well as slugs');
    check('  and it writes nothing itself',
      !/method:\s*'PUT'|method:\s*"PUT"/.test(ca), 'answers with what to write; the client writes with its own token');
  }

  // ── THE COUPLE HAS TO MEAN IT ───────────────────────────────────────────
  {
    const dlg = code('src/components/event-details/ChangeAddressDialog.jsx');
    check('the address is typed twice before it moves',
      /canonicalSlug\(confirm\) === cleaned/.test(dlg), 'type-to-confirm');
    check('  and the warning names the address that will keep working',
      /openinvite\.com\.au\/w\/\{currentSlug\}/.test(dlg), 'the old address, by name');
    check('  and says invitation links are unaffected',
      /Invitation links you have already sent are unaffected/.test(dlg), 'they resolve by token, not by slug');
  }

  return results;
}
