/**
 * api/_lib/guestCount.js
 *
 * HOW MANY REAL GUESTS AN ACCOUNT OWNS, AND NOTHING ELSE ABOUT THEM.
 *
 * Item 2 of goals/2026-10-08-retention-emails.md needs one number to decide
 * whether a guest list is empty. It does not need a name, an address or a
 * phone number, and this reads none.
 *
 * ── WHY THIS IS NOT INSIDE THE CRON ────────────────────────────────────────
 *
 * tests/persistence/guest-plaintext-readers.mjs holds a rule worth keeping:
 * any file under api/ that reads Guest rows AND dereferences one of the nulled
 * PII columns must resolve the encrypted blob through mergeGuestPii first. Its
 * test is necessarily file-level, so it cannot tell `user.email` on a User
 * record from `guest.email` on a Guest row.
 *
 * Putting the Guest read in the cron made that file match both halves of the
 * rule, and the guard flagged it. The guard was right to: a file that does
 * both things is one edit away from the mistake the rule exists to prevent.
 *
 * The fix is structural rather than an allowlist entry. This file reads Guest
 * rows and touches only `is_test`, so the rule does not apply to it. The cron
 * reads `user.email` and no Guest rows, so the rule does not apply there
 * either. Neither file is exempted; both are simply no longer ambiguous.
 */

const BASE44_API = 'https://base44.app/api';

/**
 * @param {object} p
 * @param {string} p.ownerId    created_by_id of the account
 * @param {string} p.appId      Base44 app id
 * @param {string} p.adminKey   BASE44_ADMIN_KEY, server-only
 * @param {Function} [p.fetchImpl]
 * @returns {Promise<number>} the count of real (non-test) guests
 * @throws when the read fails, because a FAILED COUNT IS NOT AN EMPTY LIST and
 *   the caller must be able to tell those apart. Returning 0 here would mail a
 *   couple who has a hundred guests.
 */
export async function countRealGuests({ ownerId, appId, adminKey, fetchImpl = fetch }) {
  const q = encodeURIComponent(JSON.stringify({ created_by_id: ownerId }));
  const res = await fetchImpl(`${BASE44_API}/apps/${appId}/entities/Guest?q=${q}`, {
    headers: { Authorization: `Bearer ${adminKey}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Guest count failed (${res.status}): ${body.slice(0, 160)}`);
  }
  const payload = await res.json();
  const rows = Array.isArray(payload) ? payload
    : Array.isArray(payload?.data) ? payload.data
      : Array.isArray(payload?.results) ? payload.results : [];
  // ONLY is_test IS READ. No name, no email, no phone: see the header.
  return rows.filter(g => g && !g.is_test).length;
}
