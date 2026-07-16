/**
 * api/_lib/auth.js
 *
 * Shared Base44 bearer-token verification for endpoints that must only act
 * on behalf of the couple who owns the data being touched — send-invites,
 * send-email, create-portal-session. Mirrors the pattern already used by
 * api/admin/stats.js's verifyAdmin, generalized to any authenticated user
 * rather than one hardcoded admin email.
 */

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

/**
 * Verifies the request's Authorization bearer token against Base44 and
 * returns the authenticated user record, or null if there is no token, the
 * token is invalid, or Base44 is unreachable.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<object|null>}
 */
export async function verifyBase44User(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;

  try {
    const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/User/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

/**
 * Fetches the set of guest emails (lowercased) owned by a given user —
 * i.e. Guest records with created_by_id === userId. Used to cross-check
 * that a batch-send request only targets guests belonging to the caller's
 * own wedding, never an arbitrary email address.
 *
 * Includes each owned guest's plus_one_email too (feat/plus-one-identity)
 * — a plus-one with their own identity is still part of a guest the caller
 * owns, so their invite must pass this same ownership check rather than
 * being silently dropped by filterGuestsByOwnership.
 *
 * @param {string} userId
 * @param {string} adminKey — BASE44_ADMIN_KEY, needed because listing
 *   another entity's records by created_by_id requires the admin token;
 *   the user's OWN bearer token cannot list Guest records this way.
 * @returns {Promise<Set<string>>}
 */
export async function fetchOwnedGuestEmails(userId, adminKey) {
  const query = encodeURIComponent(JSON.stringify({ created_by_id: userId }));
  const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Guest?q=${query}`, {
    headers: { Authorization: `Bearer ${adminKey}` },
  });
  if (!res.ok) return new Set();
  const guests = unwrapList(await res.json());
  const emails = guests.map(g => g.email?.trim().toLowerCase()).filter(Boolean);
  const plusOneEmails = guests.map(g => g.plus_one_email?.trim().toLowerCase()).filter(Boolean);
  return new Set([...emails, ...plusOneEmails]);
}

/**
 * Filters a guests[] send-invites payload down to only entries whose email
 * matches a guest the authenticated caller actually owns. Pure function,
 * exported separately from fetchOwnedGuestEmails so it's directly testable
 * without a network call.
 *
 * @param {Array<{email?: string}>} guests
 * @param {Set<string>} ownedEmails — lowercased emails from fetchOwnedGuestEmails
 * @returns {Array} the subset of `guests` whose email is in `ownedEmails`
 */
export function filterGuestsByOwnership(guests, ownedEmails) {
  return (guests || []).filter(g => {
    const email = g?.email?.trim().toLowerCase();
    return !!email && ownedEmails.has(email);
  });
}
