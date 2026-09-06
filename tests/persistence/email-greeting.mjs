/**
 * tests/persistence/email-greeting.mjs
 *
 * NEVER PRINT AN ADDRESS WHERE A NAME GOES.
 *
 * Owner report: the welcome email greeted him as "Welcome,
 * la.jay06@gmail.com." — an address in the first sentence of the first email
 * the product ever sends.
 *
 * WHY THE EXISTING FALLBACK DID NOT CATCH IT. Every template had one:
 * `name ? name.split(' ')[0] : 'there'`. It reads as defended and it is not,
 * because the field is never empty. api/on-signup.js:116 takes
 * `user.full_name` from Base44, and for an account created without a name
 * Base44 puts the ADDRESS there. So the truthy branch runs, `split(' ')[0]`
 * returns the whole address, and the "there" branch — the only thing anyone
 * would have tested — never executes at all.
 *
 * That is the shape worth remembering: a fallback guarded on emptiness cannot
 * see a field that is populated with the wrong thing.
 *
 * NO EMAIL IS SENT BY THIS FILE. The templates are pure functions returning
 * HTML; this renders them and reads the heading.
 */
import { pass, fail } from './_shared.mjs';
import { firstNameOrNull, greeting } from '../../src/lib/emailGreeting.js';
import { onboardingDay1Email } from '../../api/emails/onboarding-day1.js';
import { onboardingDay3Email } from '../../api/emails/onboarding-day3.js';
import { onboardingDay7Email } from '../../api/emails/onboarding-day7.js';

const heading = (html) => {
  const m = String(html).match(/<h1[^>]*>\s*([^<]+)</);
  return m ? m[1].trim() : '';
};

export async function runEmailGreeting() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  Email greetings — a name, or no name, and never an address:\n');

  // ── THE RESOLVER ────────────────────────────────────────────────────────
  check('a real name yields its first word', firstNameOrNull('Lachlan Jay') === 'Lachlan', firstNameOrNull('Lachlan Jay'));
  check('  a single-word name works too', firstNameOrNull('Lachlan') === 'Lachlan', firstNameOrNull('Lachlan'));
  check('  surrounding whitespace is not a name', firstNameOrNull('   ') === null, `${firstNameOrNull('   ')}`);
  check('  an empty field is no name', firstNameOrNull('') === null && firstNameOrNull(null) === null && firstNameOrNull(undefined) === null, 'null');
  check('AN ADDRESS IS NOT A NAME — the reported bug',
    firstNameOrNull('la.jay06@gmail.com') === null, `${firstNameOrNull('la.jay06@gmail.com')}`);
  check('  nor is one with a plus tag', firstNameOrNull('la.jay06+notiftest01@gmail.com') === null, 'null');
  check('  nor one hiding as the first word', firstNameOrNull('la.jay06@gmail.com Smith') === null, 'null');

  // ── THE THREE ONBOARDING EMAILS, RENDERED ───────────────────────────────
  const CASES = [
    ['a name',      'Lachlan Jay',        true],
    ['the address', 'la.jay06@gmail.com', false],
    ['no name',     '',                   false],
    ['null',        null,                 false],
  ];
  const TEMPLATES = [
    ['day 1 welcome',  onboardingDay1Email, 'Welcome, Lachlan.',                 'Welcome.'],
    ['day 3',          onboardingDay3Email, 'Have you met Ava yet, Lachlan?',    'Have you met Ava yet?'],
    ['day 7',          onboardingDay7Email, "Don't lose your progress, Lachlan.", "Don't lose your progress."],
  ];
  for (const [label, render, withName, without] of TEMPLATES) {
    for (const [caseName, value, expectName] of CASES) {
      const got = heading(render({ name: value, email: 'someone@example.com' }));
      const want = expectName ? withName : without;
      check(`${label}, ${caseName}: "${want}"`, got === want, got || '(no heading)');
    }
  }

  // ── THE ONE THING THAT MUST NEVER APPEAR ────────────────────────────────
  {
    const leaked = [];
    for (const [label, render] of TEMPLATES) {
      for (const addr of ['la.jay06@gmail.com', 'someone@example.com']) {
        const h = heading(render({ name: addr, email: addr }));
        if (h.includes('@')) leaked.push(`${label}: ${h}`);
      }
    }
    check('no greeting anywhere contains an @', leaked.length === 0, leaked.join(' | ') || '3 templates, 2 addresses each');
  }

  // ── PLANTS (R19) ────────────────────────────────────────────────────────
  {
    // PLANT 1: the old expression, on the reported input.
    const old = (name) => (name ? name.split(' ')[0] : 'there');
    check('PLANT: the old expression returns the whole address',
      old('la.jay06@gmail.com') === 'la.jay06@gmail.com', old('la.jay06@gmail.com'));
    check('  and its empty-field branch never fires on a populated one',
      old('la.jay06@gmail.com') !== 'there', 'which is why the fallback read as defended and was not');

    // PLANT 2: a "fix" that swaps the address for a placeholder rather than
    // dropping the name. The owner's rule is to omit it, not to invent one.
    check('PLANT: a placeholder is not the fix — the greeting drops the name entirely',
      greeting('Welcome, {name}.', 'Welcome.', 'la.jay06@gmail.com') === 'Welcome.'
        && !/there/.test(greeting('Welcome, {name}.', 'Welcome.', null)),
      'no "there", no address, and the comma goes with the name');
  }

  return results;
}
