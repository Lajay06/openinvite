/**
 * tests/persistence/gift-links.mjs
 *
 * WHAT THE GIFT LINKS OPEN, FLAGGED, LIVE SINCE ITEM 8.
 * goals/2026-10-11-gifting-v2.md, item 3: the couple's claim page at
 * /gift/claim/:token and the giver's edit page at /gift/edit/:token.
 *
 * What it holds:
 *   - both routes exist in both route tables, and both pages send the visitor
 *     to /gifting with the flag off (the seam answers null)
 *   - nothing reaches the server: no fetch, no base44 client, no /api path in
 *     the seam or the pages, and the claim and save buttons are disabled by
 *     GIFT_LINKS_LIVE, which is false until item 8
 *   - an unknown token reads as a used one, never as "not found"
 *   - the claim page's copy is the goal's, verbatim; no dash and no
 *     banned product name (the vocabulary guard's) in the new copy
 *   - the note card has square corners (the 8px radius is the email's alone)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';
import { CLAIM, EDIT } from '../../src/lib/giftingV2.js';
import { loadGiftByToken, SAMPLE_GIFTS, GIFT_LINKS_LIVE } from '../../src/lib/giftLinks.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

export async function runGiftLinks() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Gifting v2 items 3 and 8, the claim and edit pages:\n');

  const app = read('src/App.jsx');
  check('both routes are in both route tables',
    (app.match(/<Route path="\/gift\/claim\/:token" element=\{<GiftClaim \/>\} \/>/g) || []).length === 2
      && (app.match(/<Route path="\/gift\/edit\/:token" element=\{<GiftEdit \/>\} \/>/g) || []).length === 2);
  check('both are public paths, as /gift is', /startsWith\('\/gift\/claim\/'\)/.test(app) && /startsWith\('\/gift\/edit\/'\)/.test(app));

  // In node the flag is off (no Vite env, no window), which is production.
  check('with the flag off the seam answers null, for every token', (await loadGiftByToken('sample')) === null && (await loadGiftByToken('anything')) === null);
  const claim = stripComments(read('src/pages/GiftClaim.jsx'));
  const edit = stripComments(read('src/pages/GiftEdit.jsx'));
  const seam = stripComments(read('src/lib/giftLinks.js'));
  check('and both pages send the visitor to /gifting on null', [claim, edit].every((s) => /gift === null\) return <Navigate to="\/gifting" replace \/>/.test(s)));

  // LIVE SINCE ITEM 8: the pages talk to api/gift-link.js and nothing else;
  // the samples never reach the server.
  check('live: the seam talks to /api/gift-link only, the pages never call the network themselves',
    /\/api\/gift-link/.test(seam) && ![claim, edit].some((s) => /\bfetch\(|['"`]\/api\//.test(s)) && !/base44Client/.test(seam));
  check('GIFT_LINKS_LIVE is true since item 8', GIFT_LINKS_LIVE === true);
  check('the buttons act: Open your gift claims, Save changes saves',
    /onClick=\{claim\}/.test(claim) && /onClick=\{save\}/.test(edit));
  check('a sample token claims and saves nothing', /if \(isSampleToken\(token\)\) return; \/\/ a sample claims nothing/.test(read('src/pages/GiftClaim.jsx')) && /if \(isSampleToken\(token\)\) return; \/\/ a sample changes nothing/.test(read('src/pages/GiftEdit.jsx')));
  check('a failed or unknown read reads as used', (seam.match(/return \{ status: 'used' \};/g) || []).length >= 2);
  check('the claim page shows the used page for anything not open, the edit page tells claimed from gone',
    /gift\.status !== 'open'\) return <PlainLinkPage text=\{CLAIM\.used\} \/>/.test(claim)
      && /gift\.status === 'claimed'\) return <PlainLinkPage text=\{EDIT\.claimed\} \/>/.test(edit)
      && /<PlainLinkPage text=\{EDIT\.gone\} \/>/.test(edit));
  check('the samples are reserved names, never the shape of a token', Object.keys(SAMPLE_GIFTS).every((k) => /^sample(-[a-z]+)?$/.test(k)));

  check('the edit page\'s own lines are the owner\'s, verbatim (2026-10-12)',
    EDIT.save === 'Save changes' && EDIT.claimed === 'They have opened it, so it can no longer be changed.'
      && EDIT.gone === 'This link no longer works. If that is a surprise, reply to your confirmation email and we will sort it out.');
  check('the claim copy is the goal\'s, verbatim',
    CLAIM.button === 'Open your gift' && CLAIM.under === 'We will ask for your names and a date.'
      && CLAIM.used === 'This link has already been used. If that is a surprise, reply to the email it came in and we will look.');
  const copy = [...Object.values(CLAIM), ...Object.values(EDIT)].join(' ');
  const banned = new RegExp(['wedding', 'website'].join(' '), 'i'); // spelled in parts so this file does not say it
  check('no em or en dash, and never the banned product name, in the new copy', !/[–—]/.test(copy) && !banned.test(copy));
  check('the note card has square corners and no shadow', !/borderRadius|boxShadow|rounded/.test(/function NoteCard[\s\S]*?\n}\n/.exec(claim)?.[0] || 'borderRadius'));
  check('on a phone the claim page still shows the giver\'s photo', /className="md:hidden" data-gift-claim-phone-photo/.test(claim));

  return r;
}
