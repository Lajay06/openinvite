/**
 * An address the product accepts is an address a mail provider will take.
 *
 * ── TWO LIVE PASSES, TWO REFUSALS, ONE PERMISSIVE PATTERN ──────────────────
 *
 *   2026-09-27  mailto:la.jay06+notiftest01@gmail.com   pasted from a mailto link
 *   2026-09-28  la.jay06+notiftest01@gmail.com.         a trailing full stop
 *
 * Both were accepted by isValidEmail, encrypted, stored, printed to the couple's
 * Messages row, and handed to Resend as a recipient — which refused both, so the
 * reply failed with "Something went wrong — please try again." twice, a day
 * apart, on the same defect.
 *
 * The first fix added `if (/[:<>]/.test(email)) return false`. That closed the
 * shape in front of it and left the class open, which is the whole lesson here:
 * a character blacklist has to anticipate the next paste. The validator now
 * checks the domain AS A DOMAIN, so a trailing stop fails because it produces an
 * empty final label, not because '.' was added to a list.
 *
 * ── WHAT THIS GUARD IS FOR ────────────────────────────────────────────────
 *
 * NOT to restate the rules — that would pass on any implementation of itself.
 * Two properties that could each ship a broken product:
 *
 *   1. NOTHING LOOSENED, NOTHING REGRESSED. The historical validator is kept
 *      below, verbatim, and every address in the repository is put through
 *      both. An address the old one accepted and the new one refuses is a real
 *      account that can no longer sign up — so each is listed, with a reason,
 *      or this fails.
 *   2. THE DEFECTS STAY FIXED. Both live-pass addresses, and the shapes the
 *      ruling names, driven through normalize-then-validate.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
import { isValidEmail, normalizeEmail } from '../../api/_lib/security.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../');

/**
 * THE VALIDATOR AS IT STOOD BEFORE 2026-09-28, character for character.
 *
 * Kept here, not imported, because the point is to compare against history. If
 * it is ever "tidied" to match the current one, the comparison becomes a
 * tautology — which is why the check below also proves it still refuses the two
 * live-pass addresses' fixed forms differently from the new one.
 */
const historicalIsValidEmail = (email) =>
  typeof email === 'string'
  && email.length <= 320
  && !/[:<>]/.test(email)
  && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Addresses the old validator accepted that the new rules refuse, each with the
 * ruling that refuses it. An entry is a decision, not a silencer.
 */
const ACCEPTED_REGRESSIONS = new Map([
  ['a@b.c', 'single-letter TLD — the ruling requires a final label of at least '
    + 'two letters. Test filler on tests/persistence/trial-server-guard.mjs\'s '
    + 'three plan fixtures; nothing validates it, and no product path sends to it.'],
]);

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.vercel', 'prerendered', 'coverage']);
/**
 * THIS FILE IS EXCLUDED FROM ITS OWN SWEEP.
 *
 * The REFUSE table below is a list of addresses that MUST be rejected —
 * `a@b-.com`, `a@b..com`, `a@b_c.com` and the rest. The old validator accepted
 * every one of them, so sweeping this file reports each as a regression and the
 * guard fails on its own counter-examples. The sweep is about addresses the
 * product and its fixtures actually use; a table of things that must not work
 * is not that.
 */
const SKIP_FILES = new Set([resolve(ROOT, 'tests/persistence/email-validation.mjs')]);
const EXTS = /\.(js|jsx|mjs|ts|json|jsonc|md)$/;
const EMAIL_SHAPED = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z0-9-]+/g;

/** Every address-shaped string in the repository. */
function sweepAddresses(dir = ROOT, found = new Set()) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) { sweepAddresses(full, found); continue; }
    if (!EXTS.test(entry) || SKIP_FILES.has(full)) continue;
    let text;
    try { text = readFileSync(full, 'utf8'); } catch { continue; }
    for (const m of text.match(EMAIL_SHAPED) || []) found.add(m);
  }
  return found;
}

export async function runEmailValidation() {
  const r = [];
  const check = (n, ok, d) => r.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Email validation — nothing loosened, and both live-pass defects stay fixed:\n');

  // ── 1. no address the product used to accept is silently refused ──────────
  const addresses = [...sweepAddresses()];
  check('the sweep found the repository\'s addresses', addresses.length > 20, `${addresses.length} found`);

  const regressions = addresses.filter((a) => historicalIsValidEmail(a) && !isValidEmail(a));
  const unexplained = regressions.filter((a) => !ACCEPTED_REGRESSIONS.has(a));
  check('every newly refused address is a listed decision',
    unexplained.length === 0,
    unexplained.length ? unexplained.join(', ') : `${regressions.length} listed, 0 unexplained`);
  // AND THE LIST IS NOT STALE. An entry for an address that no longer appears,
  // or that the new rules now accept, is a note nobody will re-read.
  const stale = [...ACCEPTED_REGRESSIONS.keys()].filter((a) => !regressions.includes(a));
  check('  and the list carries nothing stale', stale.length === 0,
    stale.length ? stale.join(', ') : `${ACCEPTED_REGRESSIONS.size} entries, all live`);

  // NOT LOOSENED EITHER. An address the old validator refused must not start
  // passing — that direction would be the guard's blind spot.
  const loosened = addresses.filter((a) => !historicalIsValidEmail(a) && isValidEmail(a));
  check('nothing the old validator refused is now accepted', loosened.length === 0,
    loosened.length ? loosened.join(', ') : 'strictly narrowing');

  // CONTROL: the historical validator must still be the permissive one, or the
  // comparison above is between two copies of the same function.
  check('  control: the historical validator really is the looser one',
    historicalIsValidEmail('la.jay06+notiftest01@gmail.com.') === true
      && isValidEmail('la.jay06+notiftest01@gmail.com.') === false,
    'the trailing-stop case separates them');

  // ── 2. the defects, and the shapes the ruling names ───────────────────────
  const CASES = [
    // [what a guest pasted, what it must become]
    ['la.jay06+notiftest01@gmail.com.', 'la.jay06+notiftest01@gmail.com', 'the trailing full stop — live pass 2026-09-28'],
    ['mailto:la.jay06+notiftest01@gmail.com', 'la.jay06+notiftest01@gmail.com', 'the mailto: scheme — live pass 2026-09-27'],
    ['Ada Lovelace <ada@example.com>', 'ada@example.com', 'Name <addr>'],
    ['<a@b.com>', 'a@b.com', 'bare angle brackets'],
    ['"a@b.com".', 'a@b.com', 'quotes AND a trailing stop, interleaved'],
    ['(a@b.com,', 'a@b.com', 'a bracket and a comma'],
    ['  a@b.com  ', 'a@b.com', 'surrounding whitespace'],
    ['a@b.com', 'a@b.com', 'already clean — normalize is idempotent'],
  ];
  for (const [raw, want, why] of CASES) {
    const got = normalizeEmail(raw);
    check(`normalize: ${why}`, got === want, `${JSON.stringify(raw)} -> ${JSON.stringify(got)}`);
    check(`  and the result is accepted`, isValidEmail(got), want);
  }

  // THE DOMAIN IS FOLDED AND THE LOCAL PART IS NOT. A local part is
  // case-sensitive by the spec; folding it changes an identifier we were given.
  check('the domain is lower-cased, the local part is left alone',
    normalizeEmail('A.User@Example.COM') === 'A.User@example.com',
    normalizeEmail('A.User@Example.COM'));

  // ── what must still be refused, after normalizing ─────────────────────────
  const REFUSE = [
    ['javascript:x@y.com', 'a scheme that is not mailto:'],
    ['a@b.c', 'a single-letter TLD'],
    ['a@b..com', 'a doubled dot'],
    ['a@.b.com', 'a leading dot in the domain'],
    ['a@-b.com', 'a label starting with a hyphen'],
    ['a@b-.com', 'a label ending with a hyphen'],
    ['a@b_c.com', 'an underscore in the domain'],
    ['a@b.123', 'an all-numeric TLD'],
    ['two@at@b.com', 'two at-signs'],
    ['a@b.com,c@d.com', 'two recipients in one field'],
    ['a;b@c.com', 'a semicolon in the local part'],
    ['@b.com', 'no local part'],
    ['a@', 'no domain'],
    ['not-an-email', 'no at-sign'],
  ];
  for (const [raw, why] of REFUSE) {
    check(`refused: ${why}`, !isValidEmail(normalizeEmail(raw)), JSON.stringify(raw));
  }

  // AND THE ONES THAT MUST KEEP WORKING. A validator that refused these would
  // be a worse defect than the one it fixed.
  const ACCEPT = [
    'la.jay06+notiftest01@gmail.com',
    'hello@openinvite.com.au',
    'a.b-c_d+tag@sub.domain.example.co.uk',
    'x@y.io',
  ];
  for (const a of ACCEPT) check(`accepted: ${a}`, isValidEmail(a), 'unchanged');

  check('a non-string is neither valid nor normalizable',
    isValidEmail(null) === false && isValidEmail(undefined) === false
      && normalizeEmail(null) === '' && normalizeEmail(42) === '',
    'no throw');

  return r;
}
