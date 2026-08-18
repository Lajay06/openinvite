/**
 * api/_lib/rsvpAuth.js
 *
 * Shared token-scoped Guest/WeddingDetails resolution for every RSVP
 * endpoint (rsvp-lookup, rsvp-submit, rsvp-poll-vote). Mirrors exactly the
 * client-side logic RSVPPage.jsx used to run in the browser: resolve the
 * guest by rsvp_link_id, then resolve their wedding by the SAME owner
 * (created_by_id) as the matched guest — never the app-wide most-recently-
 * created WeddingDetails record.
 *
 * A guest is only ever resolved by their own token — there is no
 * client-suppliable guest id anywhere in this module's public surface, so
 * a caller can never act on a different guest than the one their token
 * belongs to.
 *
 * feat/plus-one-identity: a token may belong to either the primary guest
 * (Guest.rsvp_link_id) or their plus-one (Guest.plus_one_rsvp_link_id) —
 * both resolve to the SAME underlying Guest record (there's no separate
 * Guest row for a plus-one), so `role` is what callers must branch on to
 * know whose perspective to render/record.
 */

import { hashToken } from './rsvpTokenCrypto.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

async function base44Fetch(method, path, body) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BASE44_ADMIN_KEY}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

/**
 * Resolves a Guest by their rsvp_link_id token (or their plus-one's own
 * plus_one_rsvp_link_id token), and their wedding by the same owner —
 * exactly mirroring RSVPPage.jsx's prior client-side logic.
 *
 * @param {string} token
 * @returns {Promise<{ guest: object, wedding: object|null, role: 'primary'|'plus_one' } | null>}
 *   null if no guest matches the token under either field.
 */
export async function resolveGuestByToken(token) {
  // Track E: the token a guest presents is unchanged — only how it is STORED
  // changed — so a link emailed months ago still resolves. Two lookups:
  // primary hash, then plus-one hash.
  // Nothing here inspects the token's SHAPE: one live token is a 27-character
  // legacy value rather than a uuid, and a shape check would strand it.
  const byField = async (field, value) => {
    if (!value) return [];
    const q = encodeURIComponent(JSON.stringify({ [field]: value }));
    return unwrapList(await base44Fetch('GET', `/apps/${BASE44_APP_ID}/entities/Guest?q=${q}`));
  };

  const tokenHash = hashToken(token);
  let role = 'primary';
  let guests = await byField('rsvp_link_id_hash', tokenHash);

  if (guests.length === 0) {
    guests = await byField('plus_one_rsvp_link_id_hash', tokenHash);
    if (guests.length > 0) role = 'plus_one';
  }
  // The plaintext fallback is GONE as of E3: the columns are null, so those
  // two lookups could only ever match nothing. Removing them is a deletion
  // rather than a reordering precisely because E2 put the hash first.
  //
  // Deleting this while any row was unmigrated would have permanently orphaned
  // that guest's link, so it was gated on the migration reaching 202/202 —
  // which it did, verified by independent re-read, before this line was cut.

  if (guests.length === 0) return null;
  const guest = guests[0];

  const weddingQuery = encodeURIComponent(JSON.stringify({ created_by_id: guest.created_by_id }));
  const weddings = unwrapList(await base44Fetch('GET', `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`));
  const realWeddings = weddings.filter(w => !w.is_test);
  const wedding = realWeddings.length > 0
    ? realWeddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
    : null;

  return { guest, wedding, role };
}
