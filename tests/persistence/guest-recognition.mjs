/**
 * Guest recognition transport (T1 / PR 2).
 *
 * The couple's site IS the invitation. A guest arrives from their emailed link,
 * replies on the RSVP tab, and keeps using the site for months. Recognition is
 * what lets that tab be THEIR form rather than an email box asking who they are.
 *
 * Three properties are pinned here, each of which was a deliberate decision:
 *
 *  1. localStorage, NOT sessionStorage. The website password next door is
 *     sessionStorage and should stay so -- it is the couple's shared secret,
 *     short-lived by design. This is the GUEST'S identity, and they return days
 *     or weeks later. Tab-scoped storage would show a recognised guest the
 *     stranger's bridge on every return visit, reintroducing the exact defect
 *     this work exists to fix. The two must not be "harmonised".
 *
 *  2. The token is stripped from the URL BEFORE anything can navigate or fetch
 *     a subresource, so it never reaches a Referer header. Consumption happens
 *     in a useState initialiser, which React runs during the first render --
 *     ahead of every effect in the tree.
 *
 *  3. Clearing is complete. There is exactly ONE copy of the token; if a second
 *     is ever introduced it must clear here too, or "not you?" becomes a lie on
 *     the shared phone it exists for.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => readFileSync(root(p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export async function runGuestRecognition() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Guest recognition transport — the site knows who you are:\n');

  const lib = strip(read('src/lib/guestRecognition.js'));

  check('recognition persists in localStorage', /localStorage\.getItem\(keyFor/.test(lib), 'survives the tab');
  check('  and never uses sessionStorage', !/sessionStorage/.test(lib), 'that is the password, a different lifetime');
  check('  keyed per slug', /const KEY_PREFIX = 'oi_rsvp_'/.test(lib) && /KEY_PREFIX \+ slug/.test(lib), 'oi_rsvp_<slug>');

  // Ordering is the whole point: store, then strip, then anything else.
  const consume = lib.slice(lib.indexOf('export function consumeTokenFromUrl'));
  const setIdx = consume.indexOf('localStorage.setItem');
  const delIdx = consume.indexOf('searchParams.delete');
  const repIdx = consume.indexOf('history.replaceState');
  check('the token is stripped from the URL after being stored',
    setIdx > -1 && delIdx > setIdx && repIdx > delIdx, 'store -> delete -> replaceState');
  check('  and the strip is synchronous, not deferred',
    !/setTimeout|requestAnimationFrame|queueMicrotask|await /.test(consume), 'no deferral before the strip');

  const shell = strip(read('src/components/guest-website/MultiPageWeddingWebsite.jsx'));
  check('  consumed in a useState initialiser, before any effect',
    /useState\(\s*\(\) => consumeTokenFromUrl\(weddingSlug\)/.test(shell), 'first render, ahead of effects');

  check('clearing is available and complete',
    /export function forgetRecognisedGuest/.test(lib) && /localStorage\.removeItem\(keyFor\(slug\)\)/.test(lib),
    'one copy, one clear');
  check('  the shell exposes it to the RSVP tab',
    /onForgetGuest=\{forgetGuest\}/.test(shell) && /forgetRecognisedGuest\(weddingSlug\)/.test(shell), 'not you?');

  // Storage-disabled browsers are a supported state, not an error.
  check('storage failures degrade to "not recognised"',
    (lib.match(/catch/g) || []).length >= 3, 'private mode still works');

  // The permanent public URL contract.
  const app = read('src/App.jsx');
  check('/rsvp/:token is documented as PERMANENT',
    /THIS ROUTE IS PERMANENT/.test(app) && /path="\/rsvp\/:token"/.test(app),
    'links already in inboxes');
  check('  and still renders the working form until PR 3 embeds it',
    /path="\/rsvp\/:token" element=\{<RSVPPage \/>\}/.test(app),
    'redirecting first would regress the core loop');

  return results;
}
