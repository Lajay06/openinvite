/**
 * GET /api/wedding-attendees?token=<rsvp_link_id>
 *
 * Public, unauthenticated endpoint backing the "who's coming" guest-suite
 * feature (round 7 ask #16). Resolves the requesting guest by their own
 * rsvp_link_id token (same pattern as rsvp-lookup.js), then returns
 * attendee names ONLY if the owner has actually turned the relevant
 * toggle on — checked here, server-side, as the single source of truth.
 * The UI hiding a section when a toggle is off is not the control; this
 * endpoint returning nothing is. If both toggles are off, the response is
 * always { attendees: [], circle: [] } regardless of anything else.
 *
 * Names are reduced to "first name + last initial" before they ever leave
 * this function — never full names, never email/phone/RSVP status of
 * other guests.
 *
 * "Attending" is derived the same way the rest of the app does — RsvpResponse
 * rows win when they exist (Guest.rsvp_status/event_responses are frozen the
 * moment a guest's first post-migration RSVP is submitted, see
 * resolveMyWedding.js's getMyGuestsWithRsvp), falling back to the Guest
 * record's own fields only for guests with no RsvpResponse rows yet.
 *
 * Response: 200 { attendees: string[], circle: string[] }
 *        or 404 { error: 'This link has expired or is invalid.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { resolveGuestByToken } from './_lib/rsvpAuth.js';
import { latestEventResponses, toEventResponsesShape, deriveRsvpStatus } from '../src/lib/rsvpAggregation.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

/** "Sarah Michelle King" -> "Sarah K." — never a full name. */
function firstNameLastInitial(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function isGuestAttending(guest, rsvpRowsByGuest) {
  const rows = rsvpRowsByGuest.get(guest.id) || [];
  if (rows.length > 0) {
    const eventResponses = toEventResponsesShape(latestEventResponses(rows, { plusOne: false }));
    return deriveRsvpStatus(eventResponses) === 'attending';
  }
  if (Array.isArray(guest.event_responses) && guest.event_responses.length > 0) {
    return deriveRsvpStatus(guest.event_responses) === 'attending';
  }
  return guest.rsvp_status === 'attending';
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'wedding-attendees', 30, 60_000);
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
    console.error('[wedding-attendees] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const resolved = await resolveGuestByToken(token);
    if (!resolved || !resolved.wedding) {
      return res.status(404).json({ error: 'This link has expired or is invalid.' });
    }
    const { guest: requester, wedding } = resolved;
    const settings = wedding.guestExperienceSettings || {};
    const showAttending = !!settings.showAttending;
    const showCircle = !!settings.showCircle;

    // The gate — checked before any guest data is even fetched. Both off
    // means this endpoint does no further work and returns nothing.
    if (!showAttending && !showCircle) {
      return res.status(200).json({ attendees: [], circle: [] });
    }

    const guestsQuery = encodeURIComponent(JSON.stringify({ created_by_id: wedding.created_by_id }));
    const guestsRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Guest?q=${guestsQuery}`, {
      headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    });
    const allGuests = guestsRes.ok ? unwrapList(await guestsRes.json()).filter(g => !g.is_test) : [];

    const rsvpQuery = encodeURIComponent(JSON.stringify({ wedding_id: wedding.id }));
    const rsvpRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/RsvpResponse?q=${rsvpQuery}`, {
      headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    });
    const allRsvpRows = rsvpRes.ok ? unwrapList(await rsvpRes.json()).filter(r => !r.is_test) : [];

    const rsvpRowsByGuest = new Map();
    for (const row of allRsvpRows) {
      if (!rsvpRowsByGuest.has(row.guest_id)) rsvpRowsByGuest.set(row.guest_id, []);
      rsvpRowsByGuest.get(row.guest_id).push(row);
    }

    const attendingGuests = allGuests.filter(g => isGuestAttending(g, rsvpRowsByGuest));

    const attendees = showAttending
      ? attendingGuests.map(g => firstNameLastInitial(g.name)).filter(Boolean)
      : [];

    let circle = [];
    if (showCircle) {
      const requesterTags = new Set(requester.tags || []);
      if (requesterTags.size > 0) {
        circle = attendingGuests
          .filter(g => g.id !== requester.id && (g.tags || []).some(t => requesterTags.has(t)))
          .map(g => firstNameLastInitial(g.name))
          .filter(Boolean);
      }
    }

    return res.status(200).json({ attendees, circle });
  } catch (err) {
    console.error('[wedding-attendees] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
