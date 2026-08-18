/**
 * GET /api/my-guests-rsvp
 *
 * Authenticated endpoint (the couple's own Base44 session) backing
 * src/lib/resolveMyWedding.js's getMyGuestsWithRsvp(). Exists because
 * fix/rsvp-response-encryption (PR 1a) moved RsvpResponse's guest_id to a
 * one-way guest_id_hash (HMAC of guest.id) and its guest-level text fields
 * (song_request/note/dietary_restrictions/email) into one AES-256-GCM
 * encrypted_guest_level blob — both keyed off BASE44_ADMIN_KEY, a
 * server-only secret. The browser can no longer read RsvpResponse directly
 * the way it used to (base44.entities.RsvpResponse.filter(...)) — it has
 * no way to compute hashId(guest.id) or call decryptPayload() itself. This
 * endpoint does that work server-side and returns the exact same overlay
 * shape getMyGuestsWithRsvp used to compute client-side, so every dashboard
 * page that already consumes getMyGuestsWithRsvp/getMyRecords (confirmed:
 * none of them touch base44.entities.RsvpResponse directly — they all go
 * through that one function) needs zero changes.
 *
 * Response: 200 { byGuestId: { [guestId]: { event_responses, rsvp_status,
 *   song_request, rsvp_note, dietary_restrictions, email,
 *   plus_one_rsvp_status, plus_one_event_responses } } } — only guests with
 *   at least one RsvpResponse row are present; callers should treat a
 *   missing entry as "no overlay, use the Guest record as-is," exactly as
 *   getMyGuestsWithRsvp did.
 * or 401 { error: 'Unauthorized' }
 *
 * WeddingDetails and Guest reads use the CALLER's own forwarded bearer token
 * (callerFetch), not the admin key. RsvpResponse stays on the admin key below;
 * its RLS is unaffected.
 *
 * CORRECTED 2026-08-18 (Guest family, Track A). This comment previously said
 * Guest.read "is owner-scoped as of this change". THAT WAS NEVER TRUE of the
 * live schema — Guest.read is `null`, verified by listing 206 Guest rows from
 * an unrelated authenticated account. The caller's token is still the right
 * credential here, but for a different reason than the one stated: it is not
 * required by RLS, it is chosen so that this endpoint cannot serve another
 * account's rows even if its ownership filter were wrong, and so that it keeps
 * working unchanged if Guest.read is ever scoped later.
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token
 * (still used for the RsvpResponse read below).
 */

import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { hashId, decryptPayload } from './_lib/questionnaireCrypto.js';
import {
  latestEventResponses,
  latestGuestLevel,
  deriveRsvpStatus,
  toEventResponsesShape,
  mergePlusOneEventResponses,
} from '../src/lib/rsvpAggregation.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function adminFetch(path) {
  const res = await fetch(`${BASE44_API}${path}`, {
    headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
  });
  if (!res.ok) throw new Error(`Base44 GET ${path} failed (${res.status})`);
  return res.json();
}

/** WeddingDetails/Guest reads with the CALLER's own token, not the admin key.
 * The caller here is always the wedding owner querying their own records
 * (verifyBase44User below), so their own token is sufficient — and using it
 * rather than the admin key means Base44 enforces ownership a second time,
 * independently of this file's own filtering.
 *
 * CORRECTED 2026-08-18: this comment previously claimed Guest.read is
 * owner-scoped and that the admin key "can never satisfy" it. Guest.read is
 * `null` in the live schema and always has been — the admin key would work
 * fine here, which is precisely the exposure the Guest family exists to close.
 * See the header. */
async function callerFetch(path, callerToken) {
  const res = await fetch(`${BASE44_API}${path}`, {
    headers: { Authorization: `Bearer ${callerToken}` },
  });
  if (!res.ok) throw new Error(`Base44 GET ${path} failed (${res.status})`);
  return res.json();
}

/** decryptPayload throws on a truncated/tampered blob — treat that as "no data" rather than 500ing the whole request. */
function safeDecrypt(blob) {
  if (!blob) return null;
  try {
    return decryptPayload(blob);
  } catch (err) {
    console.error('[my-guests-rsvp] Failed to decrypt encrypted_guest_level:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'my-guests-rsvp', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[my-guests-rsvp] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const callerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  try {
    // Most-recent non-test record wins, mirroring src/lib/resolveMyWedding.js's
    // own mostRecent(). Caller's own token — see callerFetch's header comment.
    const weddingQuery = encodeURIComponent(JSON.stringify({ created_by_id: caller.id }));
    const weddings = unwrapList(await callerFetch(`/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`, callerToken))
      .filter(w => !w.is_test);
    const wedding = weddings.length > 0
      ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;
    if (!wedding?.id) {
      return res.status(200).json({ byGuestId: {} });
    }

    const guestsQuery = encodeURIComponent(JSON.stringify({ created_by_id: caller.id }));
    const guests = unwrapList(await callerFetch(`/apps/${BASE44_APP_ID}/entities/Guest?q=${guestsQuery}`, callerToken))
      .filter(g => !g.is_test);
    if (guests.length === 0) {
      return res.status(200).json({ byGuestId: {} });
    }

    const rsvpQuery = encodeURIComponent(JSON.stringify({ wedding_id: wedding.id }));
    const rows = unwrapList(await adminFetch(`/apps/${BASE44_APP_ID}/entities/RsvpResponse?q=${rsvpQuery}`))
      .filter(r => !r.is_test);
    if (rows.length === 0) {
      return res.status(200).json({ byGuestId: {} });
    }

    const eventsByGuestHash = new Map();
    for (const r of latestEventResponses(rows)) {
      if (!eventsByGuestHash.has(r.guest_id_hash)) eventsByGuestHash.set(r.guest_id_hash, []);
      eventsByGuestHash.get(r.guest_id_hash).push(r);
    }
    const guestLevelByGuestHash = new Map(latestGuestLevel(rows).map(r => [r.guest_id_hash, r]));

    // Every row (both is_plus_one values) for a guest_id_hash, grouped once
    // — mergePlusOneEventResponses does its own is_plus_one filtering
    // internally. Mirrors getMyGuestsWithRsvp's own rowsByGuestId grouping.
    const rowsByGuestHash = new Map();
    for (const r of rows) {
      if (!rowsByGuestHash.has(r.guest_id_hash)) rowsByGuestHash.set(r.guest_id_hash, []);
      rowsByGuestHash.get(r.guest_id_hash).push(r);
    }

    const byGuestId = {};
    for (const g of guests) {
      const gHash = hashId(g.id);
      const eventRows = eventsByGuestHash.get(gHash);
      const guestLevel = guestLevelByGuestHash.get(gHash);
      const decrypted = safeDecrypt(guestLevel?.encrypted_guest_level);
      const eventResponses = eventRows ? toEventResponsesShape(eventRows) : (g.event_responses || []);

      let plusOneRsvpStatus = null;
      let plusOneEventResponses = null;
      if (g.plus_one_email) {
        plusOneEventResponses = mergePlusOneEventResponses(eventResponses, rowsByGuestHash.get(gHash) || []);
        plusOneRsvpStatus = deriveRsvpStatus(plusOneEventResponses);
      }

      if (!eventRows && !guestLevel && plusOneRsvpStatus === null) continue;

      byGuestId[g.id] = {
        event_responses: eventResponses,
        rsvp_status: eventRows ? deriveRsvpStatus(eventResponses) : g.rsvp_status,
        song_request: decrypted?.song_request ?? g.song_request,
        rsvp_note: decrypted?.note ?? g.rsvp_note,
        dietary_restrictions: decrypted?.dietary_restrictions ?? g.dietary_restrictions,
        // Opposite precedence from the fields above: a real Guest.email
        // always wins over a previously RSVP-submitted one — matches
        // api/rsvp-lookup.js's identical rule.
        email: g.email || decrypted?.email || null,
        plus_one_rsvp_status: plusOneRsvpStatus,
        // Same shape as event_responses above, but from the plus-one's own
        // is_plus_one:true rows — lets the dashboard show the plus-one's
        // actual per-event meal choice. Consumers rank this ABOVE the flat
        // Guest.plus_one_meal_choice column, which the couple sets in the
        // guest editor and which is no longer dead — see
        // effectiveMealChoice() in src/lib/weddingEvents.js.
        plus_one_event_responses: plusOneEventResponses,
      };
    }

    return res.status(200).json({ byGuestId });
  } catch (err) {
    console.error('[my-guests-rsvp] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
