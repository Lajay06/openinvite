/**
 * The guest greeting: a first name, or nothing — never "Hi The,".
 *
 * THE BUG. src/components/rsvp/RSVPPage.jsx derived the greeting as
 * `guest.name.split(' ')[0]`, so a guest the couple invited as "The Smith
 * Family" was greeted "Hi The," on the RSVP form, in production, on both the
 * standalone /rsvp/:token page and the site's RSVP tab. "Nora & Sam" was
 * greeted "Hi Nora,", which is half the household, and an unnamed plus-one
 * — whom api/rsvp-lookup.js names the literal 'Guest' — was greeted "Hi
 * Guest,".
 *
 * THE RULE. One helper, `greetableFirstName(name)` in src/lib/guestGreeting.js,
 * returns a first name a person would recognise as their own, or null. When
 * it is null the greeting line does not render at all: no generic word is
 * substituted, because "Hi there," to a family is worse than no line.
 *
 * WHY EACH CASE HERE FAILED BEFORE THE FIX. Six behaviours are asserted
 * against the helper itself, and the helper did not exist, so every one of
 * them failed for the honest reason — nothing was there to greet correctly.
 * The seventh check reads RSVPPage.jsx and requires the form to route through
 * the helper and keep the line conditional, so the helper cannot pass here
 * while the page still splits on a space.
 *
 * The helper is imported dynamically, inside the runner, so a missing module
 * is a row of red checks with a reason rather than a registry error nobody
 * can read the cases off.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '../..');

/** [input, expected] — the owner's six, plus the markers the helper claims. */
const CASES = [
  ['Nora Kelly', 'Nora'],
  ['The Smith Family', null],
  ['Nora & Sam', null],
  ['Guest', null],
  ['', null],
  ['Nora', 'Nora'],
];

/** The helper's own stated markers, each with a reason it is a household. */
const MARKERS = [
  ['Nora and Sam', null, '" and " joins two people'],
  ['Nora + Sam', null, '"+" joins two people'],
  ['Nora / Sam', null, '"/" joins two people'],
  ['Smith Family', null, '"Family" without the article'],
  ['The Smiths', null, 'a plural surname after "The"'],
  ['Kelly Household', null, '"Household" is the couple naming the address'],
  ['Mr & Mrs Kelly', null, '"&" joins two people'],
  ['   ', null, 'whitespace only'],
  [null, null, 'not a string'],
  ['  Nora Kelly  ', 'Nora', 'surrounding whitespace is not a marker'],
  ['Theodore Kelly', 'Theodore', '"The" as a prefix of a name is not the article'],
  ['Andrea Kelly', 'Andrea', '"and" inside a name is not the conjunction'],
  ['Ana Maria de la Cruz', 'Ana', 'a long name is still one person'],
  ['Nora Kelly-Smith', 'Nora', 'a hyphenated surname is one person'],
];

export async function runGuestGreeting() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Guest greeting — a first name, or no line at all:\n');

  let greetableFirstName = null;
  let loadError = '';
  try {
    ({ greetableFirstName } = await import(pathToFileURL(resolve(ROOT, 'src/lib/guestGreeting.js')).href));
  } catch (err) {
    loadError = err.code || err.message.split('\n')[0];
  }
  const show = (v) => (v === null ? 'null' : v === undefined ? 'undefined' : JSON.stringify(v));

  for (const [input, expected] of CASES) {
    const name = `greetableFirstName(${show(input)}) is ${show(expected)}`;
    if (!greetableFirstName) { check(name, false, `helper missing: ${loadError}`); continue; }
    const got = greetableFirstName(input);
    check(name, got === expected, `got ${show(got)}`);
  }
  for (const [input, expected, why] of MARKERS) {
    const name = `  ${show(input)} -> ${show(expected)} (${why})`;
    if (!greetableFirstName) { check(name, false, `helper missing: ${loadError}`); continue; }
    const got = greetableFirstName(input);
    check(name, got === expected, `got ${show(got)}`);
  }

  // The form must use the helper, and the line must stay conditional on it.
  const page = readFileSync(resolve(ROOT, 'src/components/rsvp/RSVPPage.jsx'), 'utf8');
  check('RSVPPage.jsx derives firstName through greetableFirstName',
    /const firstName = greetableFirstName\(guest\?\.name\)/.test(page) && /from '@\/lib\/guestGreeting'/.test(page),
    /split\(' '\)\[0\]/.test(page) ? 'still splits on a space' : 'routed');
  check('  and the greeting line renders only when there is a name',
    /\{firstName && \(\s*<p[^>]*>Hi \{firstName\},<\/p>/.test(page), 'conditional, no generic fallback');

  return results;
}
