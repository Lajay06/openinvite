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

/**
 * @returns {Promise<object|null>} the logged-in user's own WeddingDetails record, or null if they have none yet.
 *
 * fix/weddingdetails-field-encryption (Step 2a): now fetched via
 * /api/my-wedding-details instead of a raw base44.entities.WeddingDetails.filter()
 * call — budget/contactPerson (and, from Step 2b on, emergencyContacts/
 * dayVendorContacts/celebrant/license) are AES-256-GCM ciphertext at rest,
 * and decrypting needs BASE44_ADMIN_KEY, a server-only secret the browser
 * never holds. The "owns more than one real record" telemetry that used to
 * live here (the "Alex & Sam" incident) moved server-side, into that
 * endpoint. websitePassword and every other field are unaffected and come
 * back exactly as before.
 */
export async function getMyWeddingDetails() {
  const token = localStorage.getItem('base44_access_token');
  if (!token) return null;
  try {
    const res = await fetch('/api/my-wedding-details', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error(`[getMyWeddingDetails] /api/my-wedding-details failed (${res.status})`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('[getMyWeddingDetails] /api/my-wedding-details fetch error:', err.message);
    return null;
  }
}

/**
 * A user counts as already onboarded if they've explicitly completed the
 * wizard (onboardingCompleted), or already own a real, non-draft
 * WeddingDetails record — the latter covers every account created before
 * this flag existed, with no migration needed. Shared by Onboarding.jsx's
 * own skip-if-already-done guard and PaymentSuccess.jsx's post-payment
 * routing decision, so the two can never disagree about what "already
 * onboarded" means.
 *
 * @param {object|null} user   result of base44.auth.me()
 * @param {object|null} draft  result of getMyWeddingDetails()
 * @returns {boolean}
 */
export function isOnboardingComplete(user, draft) {
  return !!(user?.onboardingCompleted || (draft && !draft.onboardingDraft));
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

/**
 * Same as getMyRecords('Guest', sort, limit), but overlays each guest's
 * live event_responses/rsvp_status/song_request/rsvp_note/dietary_restrictions
 * from RsvpResponse (fix/rsvp-entities-migration) — the same fields on the
 * Guest record itself are frozen forever the moment a guest RSVPs, since
 * Guest's owner-scoped update RLS blocks the admin-key write that used to
 * keep them current (api/rsvp-submit.js now writes RsvpResponse rows
 * instead). A guest who has never submitted an RSVP has no RsvpResponse
 * rows yet, so their Guest record's own (still-accurate, pre-migration
 * default) fields pass through unchanged.
 *
 * email is overlaid with the OPPOSITE precedence from the other fields
 * above: the real Guest.email wins whenever it's set, and an RSVP-
 * submitted email only fills the gap when Guest.email is empty ("if the
 * guest record has no email, save it; if it has one, don't overwrite").
 * Since Guest.email itself is never actually written by this flow (same
 * update-RLS constraint as the rest of this comment), this precedence is
 * enforced entirely here, at read time, and stays correct even if the
 * couple later types a real email directly onto the Guest record.
 *
 * feat/plus-one-identity: when a guest has plus_one_email set, also
 * overlays plus_one_rsvp_status — derived from the plus-one's OWN
 * is_plus_one:true RsvpResponse rows (mergePlusOneEventResponses), never
 * the primary guest's. Computed independently of whether the primary has
 * answered yet, since the plus-one may respond first via their own link.
 *
 * fix/rsvp-response-encryption (PR 1a): this used to read
 * base44.entities.RsvpResponse directly, client-side. That's no longer
 * possible — RsvpResponse.guest_id is now guest_id_hash (an HMAC keyed by
 * BASE44_ADMIN_KEY, a server-only secret) and the guest-level text fields
 * live in an AES-256-GCM encrypted_guest_level blob, so the browser has no
 * way to compute a matching hash or decrypt the blob itself. The overlay is
 * now computed server-side by api/my-guests-rsvp.js (same admin key, same
 * aggregation helpers) and fetched here instead — the merge logic below is
 * unchanged, it just merges a fetched overlay map instead of one computed
 * inline. On any fetch failure this fails soft (returns the unenriched
 * guest list) rather than breaking the whole dashboard.
 */
export async function getMyGuestsWithRsvp(sort, limit) {
  const guests = await getMyRecords('Guest', sort, limit);
  if (guests.length === 0) return guests;

  let overlayByGuestId = {};
  try {
    const token = localStorage.getItem('base44_access_token');
    const res = await fetch('/api/my-guests-rsvp', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      overlayByGuestId = data?.byGuestId || {};
    } else {
      console.error(`[getMyGuestsWithRsvp] /api/my-guests-rsvp failed (${res.status})`);
    }
  } catch (err) {
    console.error('[getMyGuestsWithRsvp] /api/my-guests-rsvp fetch error:', err.message);
  }

  return guests.map(g => {
    const overlay = overlayByGuestId[g.id];
    return overlay ? { ...g, ...overlay } : g;
  });
}
