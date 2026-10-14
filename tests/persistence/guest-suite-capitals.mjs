/**
 * tests/persistence/guest-suite-capitals.mjs
 *
 * THE PRODUCT IS CALLED "Guest Suite", WITH BOTH CAPITALS, WHEREVER A PERSON
 * READS IT.
 *
 * Owner ruling 2026-10-15, lane D's finding 8. The web named it in lower case
 * 93 times across 38 files while the phone already had it right, so the same
 * product had two names depending on which screen you were on.
 *
 * ── WHAT IS IN SCOPE, AND WHAT IS DELIBERATELY NOT ────────────────────────
 *
 * In scope: the words "guest suite" as a name, in strings and JSX text under
 * src/pages, src/components and src/lib. That is where web copy lives.
 *
 * NOT in scope, and this is the ruling's own wording: code names and URLs stay
 * as they are. GuestSuite the component, guestSuite the field, guest-suite the
 * route and the test id are identifiers, and renaming an identifier to match a
 * display name is how you break a route to win a style argument. Those three
 * forms are untouched and uncounted: 56, 50 and 36 of them at the time of
 * writing.
 *
 * Comments are not checked. They are not copy. Three comment lines were swept
 * with the sweep anyway, because two of them QUOTE UI copy and would otherwise
 * have misquoted the screen they describe, but that is a judgement a guard
 * should not try to make line by line.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(new URL('../../', import.meta.url).pathname);
const DIRS = ['src/pages', 'src/components', 'src/lib'];

/** The name written as anything but "Guest Suite", with a space between. */
const WRONG_CASE = /[Gg]uest suite/g;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules') continue;
    const f = join(dir, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (/\.(js|jsx)$/.test(f)) out.push(f);
  }
  return out;
}

/** Occurrences in code (strings and JSX text), never in comments. */
export function wrongCaseInCopy(source) {
  return (stripComments(String(source || '')).match(WRONG_CASE) || []).length;
}

export async function runGuestSuiteCapitals() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  console.log('\n  The product is called Guest Suite, in both capitals:\n');

  const files = DIRS.flatMap((d) => walk(join(ROOT, d)));
  ok('there are copy files to scan', files.length > 100, `${files.length} file(s)`);

  const offenders = [];
  let correct = 0;
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const n = wrongCaseInCopy(src);
    if (n) offenders.push(`${relative(ROOT, f)} (${n})`);
    correct += (stripComments(src).match(/Guest Suite/g) || []).length;
  }

  ok('no web copy writes the name in lower or sentence case',
     offenders.length === 0,
     offenders.length ? offenders.join(', ') : `${correct} correct use(s) across ${files.length} files`);

  // AND THE NAME IS ACTUALLY THERE. A scan that found nothing either way would
  // pass this file while proving nothing, which is the failure mode a sweep
  // guard is most prone to.
  ok('  and the name appears often enough for the scan to mean something',
     correct > 100, `${correct} correct use(s)`);

  // ── IDENTIFIERS AND ROUTES ARE NOT COPY, AND STAY ───────────────────────
  //
  // Asserted, not assumed: if a later sweep "fixes" these it breaks a route or
  // a field, and this is the line that says so before it ships.
  const all = files.map((f) => readFileSync(f, 'utf8')).join('\n');
  for (const [form, floor] of [['GuestSuite', 40], ['guestSuite', 40], ['guest-suite', 25]]) {
    const n = (all.match(new RegExp(form, 'g')) || []).length;
    ok(`  the identifier form ${form} is untouched`, n >= floor, `${n} occurrence(s)`);
  }

  // ── THE CHECK CAN FAIL ───────────────────────────────────────────────────
  ok('lower case in a string is caught',
     wrongCaseInCopy('const s = "your guest suite is live";') === 1, 'caught');
  ok('  sentence case is caught too',
     wrongCaseInCopy('<p>Guest suite builder</p>') === 1, 'caught');
  ok('  the correct form is not',
     wrongCaseInCopy('<p>Your Guest Suite is live</p>') === 0, 'clean');
  ok('  an identifier is not copy',
     wrongCaseInCopy("import GuestSuite from './GuestSuite'; const k = 'guest-suite';") === 0,
     'identifiers and routes pass');
  ok('  and a comment is not copy',
     wrongCaseInCopy('// the guest suite builder lives here') === 0, 'prose about code is not copy');

  return results;
}
