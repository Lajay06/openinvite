/**
 * POST /api/rsvp-submit
 *
 * Public, unauthenticated endpoint backing RSVPPage.jsx's RSVP form
 * submission. Validates the rsvp_link_id token server-side (resolving the
 * guest exactly as api/rsvp-lookup.js does — never a client-supplied guest
 * id), derives the overall rsvp_status from the submitted per-event
 * responses using the exact same rule RSVPPage.jsx used to apply
 * client-side, and writes RsvpResponse rows with the server-side admin key
 * — NOT Guest.update(), which 403s (Guest gained an owner-scoped update RLS
 * rule the admin key structurally cannot satisfy — same root cause as the
 * poll-vote breaks fixed in fix/poll-entities-migration). Per-event data
 * (status/meal_choice/plus_ones/plus_one_names) writes one row per event_id;
 * whole-submission data (song_request/rsvp_note/dietary_restrictions) writes
 * one additional row with event_id: null. Append-only, same reason as
 * PollVote — a guest resubmitting creates new rows; latest-wins aggregation
 * (src/lib/rsvpAggregation.js) determines current state. SMART_RSVP_MODEL.md
 * documents why this supersedes its original "leave Guest fields as-is"
 * guidance.
 *
 * Body: {
 *   token: string,
 *   event_responses: Array<{ event_id, status, meal_choice?, plus_ones?, plus_one_names?, responded_at? }>,
 *   song_request?: string, rsvp_note?: string, dietary_restrictions?: string, email?: string,
 * }
 *
 * email is optional and never blocks submission — an invalid or missing
 * value is just dropped from the guest-level row, same tolerant handling
 * as the other free-text fields. "Don't overwrite an existing Guest.email"
 * is enforced at READ time (src/lib/resolveMyWedding.js's
 * getMyGuestsWithRsvp overlay prefers the real Guest.email whenever it's
 * set), not here — Guest.email itself is never touched by this endpoint,
 * so there is nothing here that could overwrite it even by mistake.
 *
 * feat/plus-one-identity: resolveGuestByToken's `role` says whether this
 * submission is the primary guest's own or their plus-one's (same
 * underlying guest_id either way — there's no separate Guest record for a
 * plus-one). Rows are stamped is_plus_one accordingly, which is what keeps
 * the two sets of answers from colliding under latest-wins aggregation
 * (src/lib/rsvpAggregation.js).
 * Response: 200 { ok: true }
 *        or 404 { error: 'This link has expired or is invalid.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString, isValidEmail } from './_lib/security.js';
import { resolveGuestByToken } from './_lib/rsvpAuth.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
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

async function createRsvpResponse(payload) {
  const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/RsvpResponse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Base44 RsvpResponse create failed (${res.status}): ${body.slice(0, 200)}`);
  }
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
  const submittedEmail = sanitizeString(req.body?.email || '').trim();
  const email = submittedEmail && isValidEmail(submittedEmail) ? submittedEmail : '';

  try {
    const resolved = await resolveGuestByToken(token);
    if (!resolved || !resolved.wedding) {
      return res.status(404).json({ error: 'This link has expired or is invalid.' });
    }
    const { guest, wedding, role } = resolved;
    const isPlusOne = role === 'plus_one';

    // One row per submitted event (append-only — an event this submission
    // didn't touch simply gets no new row, and its previous latest row still
    // stands under latest-wins aggregation). Plus exactly one guest-level
    // row (event_id: null) for the whole-submission text fields, written
    // unconditionally (even if empty) so a guest clearing a previous song
    // request/note/dietary entry is itself the new latest value.
    await Promise.all([
      ...eventResponses.map(r => createRsvpResponse({
        wedding_id: wedding.id,
        guest_id: guest.id,
        is_plus_one: isPlusOne,
        event_id: r.event_id,
        status: r.status,
        meal_choice: r.meal_choice,
        plus_ones: r.plus_ones,
        plus_one_names: r.plus_one_names,
      })),
      createRsvpResponse({
        wedding_id: wedding.id,
        guest_id: guest.id,
        is_plus_one: isPlusOne,
        event_id: null,
        song_request: songRequest,
        note: rsvpNote,
        dietary_restrictions: dietaryRestrictions,
        email,
      }),
    ]);

    console.log('[rsvp-submit] RSVP recorded for token', token.slice(0, 8) + '…');
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[rsvp-submit] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
