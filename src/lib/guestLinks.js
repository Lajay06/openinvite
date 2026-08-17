/**
 * src/lib/guestLinks.js
 *
 * Client-side access to guest RSVP links, via api/my-guest-links.js.
 *
 * Before Track E, five surfaces each minted their own token with
 * crypto.randomUUID() and wrote it straight onto the Guest record, then built
 * a URL from `guest.rsvp_link_id`. That cannot survive E2, where the stored
 * form becomes an HMAC plus AES ciphertext keyed by RSVP_TOKEN_KEY — a
 * server-only secret the browser can never hold.
 *
 * So every mint and every raw read goes through one endpoint, and every caller
 * goes through this one helper. Callers ask for links by guest id and receive
 * URLs; they never see, generate, or store a token again.
 */

/**
 * @param {string[]} guestIds — ids of the caller's own guests. Ids the caller
 *   does not own are silently absent from the result rather than erroring.
 * @param {{ includePlusOne?: boolean }} [opts] — mint/return the plus-one's own
 *   link too, for guests that have a plus_one_email.
 * @returns {Promise<Record<string, { token: string, rsvpUrl: string,
 *   plusOneToken?: string, plusOneRsvpUrl?: string }>>} — the raw token is
 *   included because some callers build a non-/rsvp/ URL from it (game links).
 *   Empty object on failure — callers should treat a missing entry as "no link
 *   available" rather than assuming one exists.
 */
export async function fetchGuestLinks(guestIds, opts = {}) {
  const ids = (guestIds || []).filter(Boolean);
  if (ids.length === 0) return {};
  try {
    const token = localStorage.getItem('base44_access_token');
    const res = await fetch('/api/my-guest-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ guestIds: ids, includePlusOne: opts.includePlusOne === true }),
    });
    if (!res.ok) {
      console.error(`[guestLinks] /api/my-guest-links failed (${res.status})`);
      return {};
    }
    const data = await res.json();
    return data?.links || {};
  } catch (err) {
    console.error('[guestLinks] fetch error:', err.message);
    return {};
  }
}

/** Convenience for the single-guest callers. Returns '' when unavailable. */
export async function fetchGuestLink(guestId) {
  const links = await fetchGuestLinks([guestId]);
  return links[guestId]?.rsvpUrl || '';
}
