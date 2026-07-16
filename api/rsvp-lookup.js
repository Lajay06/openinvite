/**
 * GET /api/rsvp-lookup?token=<rsvp_link_id>
 *
 * Public, unauthenticated endpoint backing RSVPPage.jsx. Resolves the guest
 * by their rsvp_link_id token using the server-side admin key, and returns
 * ONLY that guest's own data plus the guest-safe subset of their wedding's
 * fields (see api/_lib/guestSafeWedding.js — never websitePassword,
 * emergencyContacts, dayVendorContacts, etc.).
 *
 * event_responses/song_request/rsvp_note/dietary_restrictions are overlaid
 * from RsvpResponse (fix/rsvp-entities-migration), not read off the Guest
 * record — Guest's own copies of these fields are frozen the moment the
 * guest's FIRST post-migration RSVP write happens (rsvp-submit.js writes
 * RsvpResponse rows now, not Guest.update()), so reading them straight off
 * Guest here would show a returning guest a stale/blank form.
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
import { latestEventResponses, latestGuestLevel, toEventResponsesShape } from '../src/lib/rsvpAggregation.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

/**
 * Minimal guest fields the RSVP form needs — deliberately excludes `id`,
 * `created_by_id`, `rsvp_link_id`, and every other guest's data. All future
 * writes are re-resolved server-side from the token, never a client-
 * supplied guest id, so the client never needs the raw id at all.
 */
function pickGuestSafeGuestFields(guest, rsvpRows) {
  const eventRows = latestEventResponses(rsvpRows);
  const guestLevelRows = latestGuestLevel(rsvpRows);
  const guestLevel = guestLevelRows[0] || null;
  return {
    name: guest.name,
    plus_one: !!guest.plus_one,
    poll_votes: guest.poll_votes || {},
    song_request: guestLevel?.song_request ?? (guest.song_request || ''),
    rsvp_note: guestLevel?.note ?? (guest.rsvp_note || ''),
    dietary_restrictions: guestLevel?.dietary_restrictions ?? (guest.dietary_restrictions || ''),
    // Opposite precedence from the fields above: a real Guest.email always
    // wins over a previously RSVP-submitted one, matching the same "don't
    // overwrite an existing email" rule getMyGuestsWithRsvp() enforces on
    // the couple's own dashboard read.
    email: guest.email || guestLevel?.email || '',
    event_responses: eventRows.length > 0 ? toEventResponsesShape(eventRows) : (guest.event_responses || []),
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

    let rsvpRows = [];
    if (wedding?.id) {
      const rsvpQuery = encodeURIComponent(JSON.stringify({ wedding_id: wedding.id, guest_id: guest.id }));
      const rsvpRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/RsvpResponse?q=${rsvpQuery}`, {
        headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
      });
      if (rsvpRes.ok) {
        rsvpRows = unwrapList(await rsvpRes.json()).filter(r => !r.is_test);
      }
    }

    return res.status(200).json({
      guest: pickGuestSafeGuestFields(guest, rsvpRows),
      wedding: wedding ? pickGuestSafeFields(wedding) : null,
    });
  } catch (err) {
    console.error('[rsvp-lookup] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
