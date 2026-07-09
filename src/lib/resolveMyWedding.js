/**
 * src/lib/resolveMyWedding.js
 *
 * Every dashboard/builder surface needs "the current couple's own wedding" —
 * previously this was resolved as base44.entities.WeddingDetails.list()[0]
 * (or Invitation.list()[0]), i.e. the single most-recently-created record
 * across the WHOLE app, not the logged-in user's own record. Any other
 * account (including the test-persistence.mjs harness account) creating a
 * newer record made it appear on every other user's dashboard.
 *
 * These helpers resolve by ownership (created_by_id === the logged-in user's
 * id) instead. They always re-fetch the current user rather than caching it,
 * so a logout/login as a different account can never leak a stale identity.
 *
 * Records flagged is_test are excluded defensively, even from their owner's
 * results, so test-harness records can never surface in product UI.
 *
 * Do NOT use these for the published guest-facing site (MultiPageWeddingWebsite
 * and friends) — that surface correctly resolves by slug, since guests aren't
 * logged in as the couple.
 */

import { base44 } from '@/api/base44Client';

function mostRecent(records) {
  const real = (records || []).filter(r => !r.is_test);
  if (real.length === 0) return null;
  return real.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
}

/** @returns {Promise<object|null>} the logged-in user's own WeddingDetails record, or null if they have none yet. */
export async function getMyWeddingDetails() {
  const me = await base44.auth.me().catch(() => null);
  if (!me?.id) return null;
  const rows = await base44.entities.WeddingDetails.filter({ created_by_id: me.id });
  return mostRecent(rows);
}

/** @returns {Promise<object|null>} the logged-in user's own Invitation record, or null if they have none yet. */
export async function getMyInvitation() {
  const me = await base44.auth.me().catch(() => null);
  if (!me?.id) return null;
  const rows = await base44.entities.Invitation.filter({ created_by_id: me.id });
  return mostRecent(rows);
}

/** @returns {Promise<object|null>} the logged-in user's own LiveStream record, or null if they have none yet. */
export async function getMyLiveStream() {
  const me = await base44.auth.me().catch(() => null);
  if (!me?.id) return null;
  const rows = await base44.entities.LiveStream.filter({ created_by_id: me.id });
  return mostRecent(rows);
}

/**
 * Same ownership scoping as the resolvers above, but for the many
 * dashboard entities that are genuinely one-to-many per couple (guests,
 * budget lines, vendors, schedule items, photos, notes, tasks…) rather
 * than a singleton record. Replaces the unscoped `Entity.list(sort)` /
 * `Entity.list(sort, limit)` calls those pages used to make, which
 * returned every record of that type across every couple's account, not
 * just the logged-in user's own.
 *
 * @param {string} entityName    e.g. 'Guest', 'Budget', 'Vendor'
 * @param {string} [sort]        same syntax as .list()/.filter()'s own sort param, e.g. '-created_date'
 * @param {number} [limit]       caps the result client-side after filtering, since
 *                                the underlying .filter() call has no reliable limit arg
 * @returns {Promise<object[]>}  the logged-in user's own records, excluding is_test
 */
export async function getMyRecords(entityName, sort, limit) {
  const me = await base44.auth.me().catch(() => null);
  if (!me?.id) return [];
  const rows = await base44.entities[entityName].filter({ created_by_id: me.id }, sort);
  const real = (rows || []).filter(r => !r.is_test);
  return typeof limit === 'number' ? real.slice(0, limit) : real;
}
