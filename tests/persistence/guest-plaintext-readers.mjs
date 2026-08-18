/**
 * tests/persistence/guest-plaintext-readers.mjs
 *
 * After Track D, the nine nulled columns are not a data source. Any server
 * file that reads one off a Guest row must first resolve it through
 * mergeGuestPii, or it reads null and fails SILENTLY — an empty ownership set
 * that drops every recipient, a match that never matches, an attendee list of
 * placeholders. None of those error.
 *
 * Two files legitimately mention PII field names without reading a Guest row:
 * collect-guest-contact reads the submitting guest's own req.body, and
 * guest-contact-review reads an already-decrypted GuestContactSubmission.
 * They are allowlisted BY NAME with the reason recorded at the call site,
 * because the failure this codebase keeps producing is a later sweep
 * "correcting" something that was already right.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const API = path.resolve(new URL('../../api/', import.meta.url).pathname);

/** Reads PII field names but does NOT read them from a Guest row. */
const ALLOWLIST = {
  'collect-guest-contact.js': 'reads the submitting guest\'s own req.body, not a stored Guest row',
  'guest-contact-review.js': 'reads an already-decrypted GuestContactSubmission, not a Guest row',
  'cron/send-weekly-digest.js': 'every .email is user.email — the couple\'s own address from a User row; Guest rows are read only for counts',
};

/**
 * Every column that stops being a data source at Track D.
 *
 * `name` is included even though it is PLACEHELD rather than nulled — reading
 * it raw after D returns "—", which is not an error and not a name. Leaving it
 * out let a mutation through: removing wedding-attendees' .map(mergeGuestPii)
 * passed this check, because the only field it reads is name.
 */
const NULLED = [
  'name',
  'email', 'phone', 'mailing_address', 'dietary_restrictions', 'special_requests',
  'notes', 'plus_one_name', 'plus_one_email', 'plus_one_dietary_restrictions',
];

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Actual invocation, with import lines removed so a stale import cannot satisfy it. */
const usesMerge = (code) =>
  /mergeGuestPii\s*[(),]/.test(code.replace(/^\s*import[\s\S]*?;\s*$/gm, ''));

function files(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files(full, out);
    else if (e.name.endsWith('.js')) out.push(full);
  }
  return out;
}

export async function runGuestPlaintextReaders() {
  const results = [];
  const offenders = [];
  let readerCount = 0;

  for (const f of files(API)) {
    const rel = path.relative(API, f);
    const code = stripComments(fs.readFileSync(f, 'utf8'));

    // Does this file read a Guest row at all?
    const readsGuest = /entities\/Guest|fetchAll\(\s*['"]Guest['"]\s*\)/.test(code);
    if (!readsGuest) continue;

    // Does it dereference one of the nulled columns off some object?
    const touches = NULLED.filter(c => new RegExp(`\\.${c}\\b`).test(code));
    if (touches.length === 0) continue;

    readerCount++;
    if (rel in ALLOWLIST) continue;
    // USE, not mention. Checking for the identifier anywhere matches the
    // import line too, so a file that imports mergeGuestPii and then stops
    // calling it would pass — verified: removing the .map() call while leaving
    // the import in place slipped through the first version of this check.
    if (usesMerge(code)) continue;
    offenders.push(`${rel} reads ${touches.join(', ')} without mergeGuestPii`);
  }

  results.push(offenders.length === 0
    ? pass('guest plaintext readers — every Guest-row PII reader resolves the blob first', `${readerCount} reader(s) checked`)
    : fail('guest plaintext readers — every Guest-row PII reader resolves the blob first', 'all resolved',
           offenders.join(' | ')));

  // The allowlist must stay honest: an entry that no longer exists, or that
  // has quietly started reading a Guest row, is worse than no allowlist.
  // Existence is checked on the SAME key used for the lookup. Keying by
  // basename while checking by path (or vice versa) is how an allowlist entry
  // silently stops matching the file it names.
  const stale = Object.keys(ALLOWLIST).filter(n => !fs.existsSync(path.join(API, n)));
  results.push(stale.length === 0
    ? pass('guest plaintext readers — allowlist has no stale entries', `${Object.keys(ALLOWLIST).length} entries`)
    : fail('guest plaintext readers — allowlist has no stale entries', 'none', stale.join(', ')));

  // Each allowlisted file must carry the "do not fix this" comment, so the
  // reason travels with the code rather than living only in this test.
  const uncommented = Object.keys(ALLOWLIST).filter(n => {
    const p = path.join(API, n);
    return fs.existsSync(p) && !/NOT a Guest-PII reader/.test(fs.readFileSync(p, 'utf8'));
  });
  results.push(uncommented.length === 0
    ? pass('guest plaintext readers — each allowlisted file explains itself at the call site', 'documented')
    : fail('guest plaintext readers — each allowlisted file explains itself at the call site', 'all commented',
           uncommented.join(', ')));

  // The six known readers must still be resolving. Named, so that a refactor
  // which stops reading Guest entirely does not quietly shrink the check.
  const EXPECTED = ['_lib/auth.js', 'rsvp-link-request.js', 'song-request-submit.js',
                    'wedding-attendees.js', 'my-guests-rsvp.js', 'my-guest-links.js'];
  const missing = EXPECTED.filter(rel => {
    const p = path.join(API, rel);
    return !fs.existsSync(p) || !usesMerge(stripComments(fs.readFileSync(p, 'utf8')));
  });
  results.push(missing.length === 0
    ? pass('guest plaintext readers — all six known readers resolve the blob', `${EXPECTED.length} readers`)
    : fail('guest plaintext readers — all six known readers resolve the blob', 'all six',
           `${missing.join(', ')} no longer resolves`));

  return results;
}
