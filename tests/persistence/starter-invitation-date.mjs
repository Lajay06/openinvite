/**
 * tests/persistence/starter-invitation-date.mjs
 *
 * A NEW STARTER INVITATION CARRIES THE DATE IN THE COUPLE'S OWN ORDER, AND THE
 * WEB AND THE APP WRITE THE SAME STRING.
 *
 * Lane D's finding, owner ruling 2026-10-16(c). The web's two starter builders
 * hardcoded 'en-US':
 *
 *   new Date(weddingDate).toLocaleDateString('en-US', { year, month, day })
 *
 * so every couple's starter read "June 14, 2027" whatever their setting, while
 * the app's starter already followed the couple's format. A couple who set
 * day-first got a month-first invitation from the web and a day-first one from
 * the phone, for the same wedding.
 *
 * ── THE WEEKDAY, AND WHY THIS ONE SURFACE DIFFERS FROM THE EMAIL ───────────
 *
 * The ruling said "same as the email and the app", and those two are not the
 * same: the email names the day ("Monday 14 June 2027"), the app's starter
 * never has ("14 June 2027"). An email is a sentence a guest reads; a starter's
 * date block is artwork on a card.
 *
 * Matching the APP is the requirement the ruling also states as a guard, and
 * adding a weekday to invitation artwork is a design change nobody asked for.
 * So the starter uses the shared formatter with weekday: false, and the three
 * surfaces line up like this:
 *
 *   email, web preview, app preview   Monday, June 14, 2027 / Monday 14 June 2027
 *   starter invitation, web and app   June 14, 2027         / 14 June 2027
 *
 * ── WHAT IS NOT TOUCHED ────────────────────────────────────────────────────
 *
 * Existing saved invitations are never rewritten, and that is structural
 * rather than promised: both builders write the formatted STRING into the
 * saved design at creation, inside a create handler, so nothing re-derives a
 * date for an invitation that already exists. Asserted below.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';
import { formatWeddingDateText, STARTER_DATE_PARTS, WEDDING_DATE_PARTS } from '../../src/lib/weddingDateText.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (src) => stripComments(src);

const BUILDER = 'src/components/invitations/InvitationBuilder.jsx';
const DESIGNER = 'src/components/invitations/InvitationDesigner.jsx';
const APP_STARTER = 'src/mobile/screens/plan/PlanContainer.jsx';

const DATE = '2027-06-14';

export async function runStarterInvitationDate() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want) ? pass(label, JSON.stringify(got)) : fail(label, want, got));

  console.log('\n  A new starter invitation dates itself in the couple\'s order:\n');

  // ── THE OWNER'S NAMED GUARD: WEB AND APP WRITE THE SAME STRING ──────────
  //
  // Driven, not grepped: both formatters are called and their output compared.
  const { formatAppDateWritten } = await import('../../src/mobile/lib/dates.js');
  const webStarter = (format) => formatWeddingDateText(DATE, format, { weekday: false });
  // THE OPTIONS ARE WRITTEN OUT, NOT SCRAPED AND EVALUATED. This line used to
  // regex the options object out of PlanContainer.jsx and run it through
  // `new Function`, so the comparison took its shape from whatever that file
  // happened to say. Two things were wrong with that. A guard that evaluates
  // repository source executes whatever is at that call site, inside CI. And
  // when the regex missed it fell back to `{}`, which silently restored the
  // weekday and turned a real date mismatch into what looked like a date bug.
  // The options are the ruling, so they are stated here, and the assertion
  // further down is what holds the call site to them.
  const appStarter = (format) => formatAppDateWritten(DATE, { weekday: false, format });
  for (const format of ['dmy', 'mdy']) {
    check(`the web and app starters write the same date for ${format}`,
          webStarter(format), appStarter(format));
  }
  // AND BOTH ANSWERS ARE DISTINCT, so the equality above cannot be satisfied
  // by two functions that ignore the format and return one string.
  ok('  and the two formats actually differ, so the check is not vacuous',
     webStarter('dmy') !== webStarter('mdy'), `${webStarter('dmy')} vs ${webStarter('mdy')}`);
  check('  month-first reads the US way', webStarter('mdy'), 'June 14, 2027');
  check('  and day-first reads the other way', webStarter('dmy'), '14 June 2027');

  // ── THE STARTER CARRIES NO WEEKDAY, THE EMAIL DOES ──────────────────────
  check('a starter date block asks for no weekday', STARTER_DATE_PARTS,
        { day: 'numeric', month: 'long', year: 'numeric' });
  check('  while the email still names the day', WEDDING_DATE_PARTS,
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  ok('  and they are visibly different strings',
     formatWeddingDateText(DATE, 'dmy') !== webStarter('dmy'),
     `${formatWeddingDateText(DATE, 'dmy')} vs ${webStarter('dmy')}`);

  // ── BOTH WEB BUILDERS GO THROUGH THE SHARED FORMATTER ───────────────────
  for (const f of [BUILDER, DESIGNER]) {
    const src = code(read(f));
    const name = f.split('/').pop();
    ok(`${name} formats the starter date with the shared formatter`,
       /formatWeddingDateText\([\s\S]*?\{ weekday: false \}\)/.test(src), 'formatWeddingDateText');
    ok(`  ${name} reads the couple's resolved format`,
       /accountDateFormat\(\)/.test(src), 'accountDateFormat()');
    ok(`  ${name} no longer hardcodes a locale`,
       !/toLocaleDateString\('en-US'/.test(src), "no 'en-US' literal left");
  }

  // ── EXISTING INVITATIONS ARE NEVER REWRITTEN ────────────────────────────
  //
  // Structural: the formatted string goes into the saved design once, at
  // creation. If either builder ever formatted a date during render instead,
  // every already-saved invitation would silently change on open, which the
  // ruling forbids. The string is written into a `content: { text: ... }`
  // block, which is what gets persisted.
  for (const f of [BUILDER, DESIGNER]) {
    const src = code(read(f));
    const name = f.split('/').pop();
    ok(`  ${name} writes the string into the saved design, not on render`,
       /content: \{[\s\S]{0,200}?formatWeddingDateText\(/.test(src),
       'persisted at creation');
  }
  ok('  and neither builder formats a date anywhere else',
     [BUILDER, DESIGNER].every((f) => (code(read(f)).match(/formatWeddingDateText\(/g) || []).length === 1),
     'one call each');

  // ── THE APP'S STARTER IS UNTOUCHED ──────────────────────────────────────
  //
  // This PR is web files and tests only, by the ruling. The app's starter
  // already followed the couple's format, which is why it is the reference
  // the equality above is measured against rather than something to change.
  ok('the app starter uses its own written formatter, without the weekday',
     /formatAppDateWritten\(weddingDate, \{ weekday: false \}\)/.test(code(read(APP_STARTER))), 'weekday: false');

  // ── NO DATE IS STILL NO DATE ────────────────────────────────────────────
  check('nothing in, nothing out',
        ['', null, undefined, 'not a date'].map((v) => webStarter_safe(v)), ['', '', '', '']);

  function webStarter_safe(v) { return formatWeddingDateText(v, 'dmy', { weekday: false }); }

  return results;
}
