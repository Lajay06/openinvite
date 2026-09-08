/**
 * tests/persistence/onboarding-not-locked-out.mjs
 *
 * A COUPLE WHO STARTS ONBOARDING CAN GET BACK INTO IT.
 *
 * Onboarding.jsx:247 asks isOnboardingComplete() before a single step mounts
 * and redirects to the dashboard if the answer is yes. Onboarding.jsx:314
 * creates the WeddingDetails record on the FIRST step advance. So the exact
 * question this predicate answers is "may this couple finish signing up", and
 * a wrong yes is not a routing inconvenience — it is a couple locked out of
 * the product with a wedding record holding two names and nothing else.
 *
 * THE OLD ANSWER WAS ALWAYS YES, and the reason is worth keeping in front of
 * whoever reads this next: `!draft.onboardingDraft` tested a field Base44 does
 * not have. Onboarding.jsx sends it; the platform accepts the write with 200
 * and discards it. The clause read "a real, non-draft wedding" and evaluated
 * "a wedding". Live probe, 2026-09-06: onboardingDraft and onboardingStepIndex
 * read back undefined after a successful PUT; activeUniverse, websiteMode and
 * guestType, in the same call, persisted.
 *
 * Every row below is a state the product actually produces, named after the
 * couple it happens to.
 */
import { pass, fail } from './_shared.mjs';
import { isOnboardingComplete } from '../../src/lib/onboardingComplete.js';
import { isBackend, ONBOARDING_USER, ONBOARDING_SEED } from '../../scripts/lib/renderHarness.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Source with the comments taken out — LINE COMMENTS FIRST, and that order is
 * not a style choice.
 *
 * Onboarding.jsx line 68 is `// [5] universe-step-rebuild: Universes (Design
 * Studio / custom wedding /* imports)`. Strip block comments first and that
 * stray `/*` opens a comment that runs to the next `*` + `/` twenty thousand
 * characters later, taking persistDraftStep, isOnboardingComplete and half the
 * file with it. Two checks below reported red against code that was correct,
 * for exactly this reason, before the order was fixed.
 *
 * Stripping at all is the older lesson: a check that forbids a string in
 * source will otherwise forbid writing down why the string was removed.
 */
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

export async function runOnboardingNotLockedOut() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  A couple who starts onboarding can get back into it:\n');

  const NOT_YET = { id: 'u1', onboardingCompleted: false };
  const DONE    = { id: 'u1', onboardingCompleted: true };

  // ── THE PLANT THE OWNER'S REPORT IS ABOUT ───────────────────────────────
  // The record persistDraftStep writes after the names step: no slug, because
  // persistDraftStep deletes it, and no onboardingDraft, because Base44
  // discards it. This is the state a mid-wizard refresh lands in.
  const AFTER_ONE_STEP = { id: 'w1', couple1Name: 'Ada', couple2Name: 'Alan' };
  check('PLANT: one step in, then a refresh — the wizard still opens',
    isOnboardingComplete(NOT_YET, AFTER_ONE_STEP) === false,
    'a record with names and no address is a couple mid-signup, not a finished wedding');

  check('  the same record with the old field present would also not lock them out',
    isOnboardingComplete(NOT_YET, { ...AFTER_ONE_STEP, onboardingDraft: true }) === false,
    'true if the field ever gets added to the schema');

  // ── AND IT STILL SAYS YES WHEN IT SHOULD ────────────────────────────────
  check('a finished wedding sends them to the dashboard',
    isOnboardingComplete(NOT_YET, { id: 'w1', slug: 'ada-and-alan' }) === true,
    'the address is claimed once, at the end (Onboarding.jsx:452)');
  check('  which is how accounts older than the User flag keep working',
    isOnboardingComplete({ id: 'u1' }, { id: 'w1', slug: 'ada-and-alan' }) === true,
    'no flag at all, but a wedding guests can visit');
  check('the User flag alone is enough, address or not',
    isOnboardingComplete(DONE, null) === true && isOnboardingComplete(DONE, AFTER_ONE_STEP) === true,
    'the address claim is non-fatal (Onboarding.jsx:450); the flag is written either way');
  check('a brand new account with nothing at all opens the wizard',
    isOnboardingComplete(NOT_YET, null) === false && isOnboardingComplete(null, null) === false,
    'and a null user does not throw');
  check('an empty-string address is not an address',
    isOnboardingComplete(NOT_YET, { id: 'w1', slug: '' }) === false, 'falsy stays falsy');

  // ── THE PREDICATE MUST STAY LOADABLE ────────────────────────────────────
  // The whole reason it moved out of resolveMyWedding.js: that module imports
  // the authenticated client, so nothing above this line could have run.
  {
    const src = code('src/lib/onboardingComplete.js');
    check('the predicate imports nothing',
      !/^\s*import\s/m.test(src), 'a guard can load it in plain Node');
    const rmw = code('src/lib/resolveMyWedding.js');
    check('  and resolveMyWedding re-exports it rather than keeping a second copy',
      /export \{ isOnboardingComplete \} from '\.\/onboardingComplete'/.test(rmw)
        && !/function isOnboardingComplete/.test(rmw),
      'its two callers keep the import they have');
  }

  // ── NOBODY MAY DECIDE THIS QUESTION SEPARATELY ──────────────────────────
  // The original comment's own requirement: Onboarding.jsx and
  // PaymentSuccess.jsx must never disagree about what "already onboarded"
  // means, so neither may re-derive it.
  for (const f of ['src/pages/Onboarding.jsx', 'src/pages/PaymentSuccess.jsx']) {
    const src = code(f);
    check(`${f.split('/').pop()} asks the shared predicate`,
      /isOnboardingComplete\(/.test(src) && !/onboardingDraft\s*\)\s*\)/.test(src),
      'not its own version of the question');
  }

  // SENTINEL RETIRED: it fired 2026-09-08 when c832e9e declared onboardingDraft and onboardingStepIndex; the resume path is wired in #712.

  // ── THE SEED THAT MAKES ANY OF THIS REPRODUCIBLE ────────────────────────
  //
  // The reproduction above is a routing decision, and until this run there was
  // no way to watch the product make it: FIXTURE_USER is onboarded, so
  // /onboarding redirected before a step mounted. Two things had to be true
  // before the wizard would render at all, and both are checked here because
  // getting one right reproduces nothing and looks identical to getting both
  // right.
  check('the onboarding seed clears the User flag',
    ONBOARDING_USER.onboardingCompleted === false, 'so Onboarding.jsx:247 has something to decide');
  check('  and holds no wedding record',
    Array.isArray(ONBOARDING_SEED.WeddingDetails) && ONBOARDING_SEED.WeddingDetails.length === 0,
    'isOnboardingComplete is an OR — the flag alone is not enough');

  // ── NOT EVERY FILE UNDER api/ IS AN ENDPOINT ────────────────────────────
  //
  // src/lib/coupleNames.js:9 re-exports api/_lib/coupleNames.js so the
  // couple's displayed name has one owner on both sides of the wire, and in
  // dev Vite serves that module at /api/_lib/coupleNames.js. The harness
  // answered it with `[]`; the browser refused the module and every page whose
  // imports reach it rendered zero characters. /onboarding is one of them.
  for (const [url, want, why] of [
    ['https://base44.app/api/apps/x/entities/User/me', true,  'the real backend'],
    ['http://localhost:5173/api/my-wedding-details',   true,  'a real endpoint'],
    ['http://localhost:5173/api/_lib/coupleNames.js',  false, 'a module the browser imports'],
    ['http://localhost:5173/api/_lib/slugCanon.js',    false, 'and so is this one'],
    ['http://localhost:5173/src/api/base44Client.js',  false, 'the trap the predicate already knew about'],
  ]) {
    check(`${want ? 'stubbed' : 'served  '}  ${url.replace(/^https?:\/\/[^/]+/, '')}`,
      isBackend(url) === want, why);
  }

  return results;
}
