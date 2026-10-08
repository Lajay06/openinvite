/**
 * api/_lib/excludedAccounts.js
 *
 * THE ACCOUNTS NO CRON EVER MAILS.
 *
 * Owner ruling, item 0 of goals/2026-10-08-retention-emails.md: "hardcode an
 * exclusion list in one place in api/_lib and use it in every cron".
 *
 * ── THERE WAS NO SUCH LIST, WHICH IS WHY THIS EXISTS ───────────────────────
 *
 * Before this, the only filters any cron applied were `is_test` on entity rows
 * and `plan` on the User. Nothing excluded the owner's own account or the
 * smoke-test aliases, so every run of send-onboarding-emails and
 * send-weekly-digest has been mailing them along with real couples.
 *
 * ── THE ALIAS RULE, AND THE TRAP IN IT ─────────────────────────────────────
 *
 * The ruling covers "every la.jay06+<anything>@gmail.com alias", which is how
 * smoke01 and notiftest01 are caught without naming them. The obvious
 * implementation, "does the address contain a plus", would also exclude a REAL
 * COUPLE whose address happens to use one, and plus-addressing is common
 * enough that this is a question of when, not whether.
 *
 * So the local part is split at the first `+` and the part BEFORE it must
 * equal the base exactly, on the exact domain. jay+anything@gmail.com is not
 * la.jay06, and la.jay06@other.com is not on gmail.
 *
 * Gmail also ignores dots in the local part, so la.jay06 and lajay06 are the
 * same mailbox. Dots are stripped for the gmail.com comparison and kept for
 * every other domain, where a dot is significant.
 *
 * ── THE is_test HALF IS NOT HERE ───────────────────────────────────────────
 *
 * The ruling also excludes "any account whose WeddingDetails row is is_test".
 * That is a property of the row, not of the address, and every cron already
 * filters it when it lists WeddingDetails. isExcludedAccount answers only the
 * address question, and its callers keep doing the is_test filter they already
 * do. Two checks in one function would invite a caller to pass a row it does
 * not have.
 */

/** The owner's own addresses, in full. Aliases of the gmail one are covered. */
const EXCLUDED_ADDRESSES = [
  'la.jay06@gmail.com',
  'lajay@openinvite.com.au',
];

/** Gmail treats dots in the local part as insignificant; other hosts do not. */
const DOT_INSENSITIVE_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Normalize one address to the mailbox it actually reaches: lowercased, the
 * `+suffix` dropped, and dots removed from the local part on hosts that ignore
 * them. Returns null for anything that is not an address.
 */
function mailbox(address) {
  const raw = String(address ?? '').trim().toLowerCase();
  const at = raw.lastIndexOf('@');
  if (at <= 0 || at === raw.length - 1) return null;

  let local = raw.slice(0, at);
  const domain = raw.slice(at + 1);

  const plus = local.indexOf('+');
  if (plus !== -1) local = local.slice(0, plus);
  // A LOCAL PART THAT IS NOTHING BUT A SUFFIX reaches no mailbox, and must not
  // normalize to the empty string and then match another empty string.
  if (!local) return null;

  if (DOT_INSENSITIVE_DOMAINS.has(domain)) local = local.split('.').join('');

  return `${local}@${domain}`;
}

const EXCLUDED_MAILBOXES = new Set(EXCLUDED_ADDRESSES.map(mailbox).filter(Boolean));

/**
 * @param {string|null|undefined} email the User's email address
 * @returns {boolean} true when no cron may mail this address
 *
 * AN UNREADABLE ADDRESS IS NOT EXCLUDED, because excluding it would silently
 * drop a real couple whose address this function failed to parse. A cron that
 * cannot read an address has nowhere to send to anyway and skips it for that
 * reason instead, which is a decision made where the sending happens.
 */
export function isExcludedAccount(email) {
  const box = mailbox(email);
  return box !== null && EXCLUDED_MAILBOXES.has(box);
}

/** Exported for the guard, so the list can be asserted without being retyped. */
export const EXCLUDED_ACCOUNT_ADDRESSES = Object.freeze([...EXCLUDED_ADDRESSES]);
