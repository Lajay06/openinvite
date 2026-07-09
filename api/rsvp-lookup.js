/**
 * GET /api/rsvp-lookup?token=<rsvp_link_id>
 *
 * Public, unauthenticated endpoint backing RSVPPage.jsx. Resolves the guest
 * by their rsvp_link_id token using the server-side admin key, and returns
 * ONLY that guest's own data plus the guest-safe subset of their wedding's
 * fields (see api/_lib/guestSafeWedding.js — never websitePassword,
 * emergencyContacts, dayVendorContacts, etc.).
 *
 * Replaces RSVPPage.jsx's direct client-side
 * base44.entities.Guest.filter({rsvp_link_id}) and
 * base44.entities.WeddingDetails.filter({created_by_id}) calls, which
 * required Guest/WeddingDetails to be readable entity-wide by any caller
 * for the token-scoped lookup to work at all in the browser.
 *
 * Response: 200 { guest: {...}, wedding: {...} }
 *        or 404 { error: 'This link has expired or is invalid.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { pickGuestSafeFields } from './_lib/guestSafeWedding.js';
import { resolveGuestByToken } from './_lib/rsvpAuth.js';

const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

/**
 * Minimal guest fields the RSVP form needs — deliberately excludes `id`,
 * `created_by_id`, `rsvp_link_id`, and every other guest's data. All future
 * writes are re-resolved server-side from the token, never a client-
 * supplied guest id, so the client never needs the raw id at all.
 */
function pickGuestSafeGuestFields(guest) {
  return {
    name: guest.name,
    plus_one: !!guest.plus_one,
    poll_votes: guest.poll_votes || {},
    song_request: guest.song_request || '',
    rsvp_note: guest.rsvp_note || '',
    dietary_restrictions: guest.dietary_restrictions || '',
    event_responses: guest.event_responses || [],
  };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'rsvp-lookup', 30, 60_000);
  res.setHeader('X-RateLimit-Limit', '30');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const token = sanitizeString(req.query?.token || '');
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[rsvp-lookup] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const resolved = await resolveGuestByToken(token);
    if (!resolved) {
      return res.status(404).json({ error: 'This link has expired or is invalid.' });
    }
    const { guest, wedding } = resolved;

    return res.status(200).json({
      guest: pickGuestSafeGuestFields(guest),
      wedding: wedding ? pickGuestSafeFields(wedding) : null,
    });
  } catch (err) {
    console.error('[rsvp-lookup] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
