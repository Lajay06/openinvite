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
 */

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
 * Resolves a Guest by their rsvp_link_id token, and their wedding by the
 * same owner — exactly mirroring RSVPPage.jsx's prior client-side logic.
 *
 * @param {string} token
 * @returns {Promise<{ guest: object, wedding: object|null } | null>}
 *   null if no guest matches the token.
 */
export async function resolveGuestByToken(token) {
  const guestQuery = encodeURIComponent(JSON.stringify({ rsvp_link_id: token }));
  const guests = unwrapList(await base44Fetch('GET', `/apps/${BASE44_APP_ID}/entities/Guest?q=${guestQuery}`));
  if (guests.length === 0) return null;
  const guest = guests[0];

  const weddingQuery = encodeURIComponent(JSON.stringify({ created_by_id: guest.created_by_id }));
  const weddings = unwrapList(await base44Fetch('GET', `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`));
  const realWeddings = weddings.filter(w => !w.is_test);
  const wedding = realWeddings.length > 0
    ? realWeddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
    : null;

  return { guest, wedding };
}

export async function updateGuest(guestId, patch) {
  return base44Fetch('PUT', `/apps/${BASE44_APP_ID}/entities/Guest/${guestId}`, patch);
}

export async function updateWeddingDetails(weddingId, patch) {
  return base44Fetch('PUT', `/apps/${BASE44_APP_ID}/entities/WeddingDetails/${weddingId}`, patch);
}
