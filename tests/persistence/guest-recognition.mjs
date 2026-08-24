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
  // The route renders the COMPONENT, never a bare <Navigate>: the redirect
  // needs the slug, and the slug comes from the lookup this component already
  // performs. A route-level redirect could not resolve it without a second
  // request, and would strand any token whose lookup fails.
  check('  the route renders the component, not a bare redirect',
    /path="\/rsvp\/:token" element=\{<RSVPPage \/>\}/.test(app),
    'the slug comes from the lookup');

  // ── PR 3: the form is the tab, and the redirect points into it ───────────
  const form = strip(read('src/components/rsvp/RSVPPage.jsx'));
  const tab = strip(read('src/components/guest-website/pages/WeddingRSVPPage.jsx'));

  check('the RSVP form is embeddable', /embedded = false/.test(form) && /if \(embedded\)/.test(form),
    'one prop collapses the page chrome');
  check('  the token can come from a prop, not only the URL',
    /const token = tokenProp \|\| tokenFromUrl/.test(form), 'same form, two entry points');
  check('  every full-page container collapses when embedded',
    !/minHeight: '100vh', display: 'flex'/.test(form) && /shellOuter/.test(form),
    'loading, not-found and the form body');

  check('a recognised guest gets the real form on the tab',
    /if \(recognisedToken\)/.test(tab) && /<RsvpForm token=\{token\} embedded \/>/.test(tab),
    'no email box, no second step');
  check('  an unrecognised visitor still gets the email bridge',
    /rsvpIntro/.test(tab) && /Send me my RSVP link/.test(tab), 'fallback state, not the page');
  check('  the not-you control is present and not buried',
    /Not you\? Use a different invitation/.test(tab) && /onClick=\{onForgetGuest\}/.test(tab),
    'shared phones');

  // THE SEQUENCING CONSTRAINT, pinned. The redirect may only exist alongside a
  // working embedded form; enabling it earlier would send guests holding links
  // from a form that records replies to one that cannot.
  check('the redirect points into the site',
    /navigate\(`\/w\/\$\{slug\}\/rsvp\?rsvp=\$\{encodeURIComponent\(token\)\}`/.test(form),
    '/w/<slug>/rsvp?rsvp=<token>');
  check('  it never fires in embedded mode (no redirect loop)',
    /if \(embedded \|\| redirected\) return;/.test(form), 'guarded');
  check('  it replaces rather than pushes',
    /\{ replace: true \}/.test(form), 'back must not return to the token URL');
  check('  and it only exists because the tab now renders a form',
    /<RsvpForm token=\{token\} embedded \/>/.test(tab), 'the constraint holds');

  return results;
}
