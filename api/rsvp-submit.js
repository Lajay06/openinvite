/**
 * POST /api/rsvp-submit
 *
 * Public, unauthenticated endpoint backing RSVPPage.jsx's RSVP form
 * submission. Validates the rsvp_link_id token server-side (resolving the
 * guest exactly as api/rsvp-lookup.js does — never a client-supplied guest
 * id), derives the overall rsvp_status from the submitted per-event
 * responses using the exact same rule RSVPPage.jsx used to apply
 * client-side, and writes event_responses/song_request/rsvp_note/
 * dietary_restrictions with the server-side admin key.
 *
 * Body: {
 *   token: string,
 *   event_responses: Array<{ event_id, status, meal_choice?, plus_ones?, plus_one_names?, responded_at? }>,
 *   song_request?: string, rsvp_note?: string, dietary_restrictions?: string,
 * }
 * Response: 200 { ok: true }
 *        or 404 { error: 'This link has expired or is invalid.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { resolveGuestByToken, updateGuest } from './_lib/rsvpAuth.js';

const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

const MAX_TEXT_LENGTH = 1000;
const VALID_STATUSES = new Set(['yes', 'no', 'pending']);

/**
 * Sanity-checks and sanitizes the submitted per-event responses. Malformed
 * entries are dropped rather than rejecting the whole submission — a
 * client bug in one event's form state shouldn't block a guest's response
 * to the events they filled in correctly.
 */
function sanitizeEventResponses(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter(r => r && typeof r.event_id === 'string' && r.event_id)
    .map(r => ({
      event_id: sanitizeString(r.event_id),
      invited: true,
      status: VALID_STATUSES.has(r.status) ? r.status : 'pending',
      meal_choice: r.status === 'yes' ? (sanitizeString(r.meal_choice || '') || null) : null,
      plus_ones: r.status === 'yes' && Number(r.plus_ones) > 0 ? 1 : 0,
      plus_one_names: r.status === 'yes' && Array.isArray(r.plus_one_names)
        ? r.plus_one_names.map(sanitizeString).filter(Boolean).slice(0, 1)
        : [],
      responded_at: typeof r.responded_at === 'string' ? r.responded_at : new Date().toISOString(),
    }));
}

/** Mirrors RSVPPage.jsx's prior client-side derivation exactly. */
function deriveRsvpStatus(eventResponses) {
  const invited = eventResponses.filter(r => r.invited);
  const anyYes = invited.some(r => r.status === 'yes');
  const allNo = invited.length > 0 && invited.every(r => r.status === 'no');
  return anyYes ? 'attending' : allNo ? 'declined' : 'pending';
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'rsvp-submit', 15, 60_000);
  res.setHeader('X-RateLimit-Limit', '15');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const token = sanitizeString(req.body?.token || '');
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[rsvp-submit] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const eventResponses = sanitizeEventResponses(req.body?.event_responses);
  const songRequest = sanitizeString(req.body?.song_request || '').slice(0, MAX_TEXT_LENGTH);
  const rsvpNote = sanitizeString(req.body?.rsvp_note || '').slice(0, MAX_TEXT_LENGTH);
  const dietaryRestrictions = sanitizeString(req.body?.dietary_restrictions || '').slice(0, MAX_TEXT_LENGTH);

  try {
    const resolved = await resolveGuestByToken(token);
    if (!resolved) {
      return res.status(404).json({ error: 'This link has expired or is invalid.' });
    }
    const { guest } = resolved;

    // Merge onto the guest's EXISTING responses (by event_id) rather than
    // replacing wholesale, so an event this submission didn't touch (e.g.
    // one added to the invite set after this page loaded) isn't dropped.
    const existingByEventId = new Map((guest.event_responses || []).map(r => [r.event_id, r]));
    for (const r of eventResponses) existingByEventId.set(r.event_id, r);
    const nextEventResponses = Array.from(existingByEventId.values());

    const now = new Date().toISOString();
    await updateGuest(guest.id, {
      event_responses: nextEventResponses,
      rsvp_status: deriveRsvpStatus(nextEventResponses),
      song_request: songRequest,
      rsvp_note: rsvpNote,
      dietary_restrictions: dietaryRestrictions,
      rsvp_date: now.split('T')[0],
    });

    console.log('[rsvp-submit] RSVP recorded for token', token.slice(0, 8) + '…');
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[rsvp-submit] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
