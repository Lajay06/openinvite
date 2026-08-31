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
 * feat/plus-one-identity: resolveGuestByToken's `role` tells us whose
 * perspective to render — a plus-one's own token resolves to the SAME
 * underlying Guest record (there's no separate Guest row for them), so
 * pickGuestSafeGuestFields branches on role to substitute their own
 * name/email/dietary and overlay their own is_plus_one:true RsvpResponse
 * rows instead of the primary guest's.
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
 * fix/rsvp-response-encryption (PR 1a): RsvpResponse rows are now matched
 * by guest_id_hash (HMAC of guest.id, api/_lib/questionnaireCrypto.js
 * hashId) rather than the plaintext guest_id this entity used to carry, and
 * the guest-level row's song_request/note/dietary_restrictions/email live
 * in one encrypted_guest_level ciphertext blob (decryptPayload) instead of
 * four plaintext columns — see that file's header and
 * BASE44_PLATFORM_NOTES.md for why (read:null + a real confidentiality
 * promise means the row itself must not carry anything plaintext-readable).
 *
 *
 * ── THIS ROUTE DELIBERATELY DOES NOT CHECK websiteEnabled ────────────────────
 *
 * Two sibling routes gained a publication gate on 2026-08-31 after an audit
 * found unpublished weddings were being served: api/wedding-by-slug.js (#632)
 * and api/wedding-poll-results.js (#634). Both now return 404 when
 * websiteEnabled is not true.
 *
 * THIS ROUTE IS NOT THE SAME CASE, AND MUST NOT BE MADE CONSISTENT WITH THEM.
 *
 *   A CAPABILITY TOKEN IS A SECRET THE HOLDER WAS GIVEN. A SLUG IS A NAME.
 *
 * Those two routes were reached by SLUG — derived from the couple's names at
 * onboarding, so guessable by anyone who knows them. An identifier that is hard
 * to type is not a credential, which is why they needed a gate.
 *
 * This route is reached by an rsvp_link_id: a crypto.randomUUID token minted per
 * guest and delivered to that guest in their own invitation. The token IS the
 * credential. It was given deliberately, to that person.
 *
 * WHAT ADDING A websiteEnabled CHECK HERE WOULD DO: strand every invitation
 * already sent, the moment a couple toggles their site off. A guest holding a
 * valid link would be told their invitation does not exist. Unpublishing a
 * website is a decision about a PUBLIC PAGE; it is not a decision to revoke
 * access from people who were personally invited.
 *
 * This is a decision, not an omission. It was raised with the owner on
 * 2026-08-31 and left as-is on purpose. The danger it guards against is not the
 * current behaviour — it is that someone later applies the pattern uniformly in
 * the name of consistency. AN UNDECIDED BEHAVIOUR THAT HAPPENS TO BE RIGHT IS
 * ONE REFACTOR AWAY FROM BEING WRONG, so the reason lives here, where that
 * refactor will be read, rather than only in a ticket.
 *
 * If the product ever needs "unpublish also revokes sent invitations", that is
 * a deliberate product decision with its own design — not a consistency fix.
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { pickGuestSafeFields } from './_lib/guestSafeWedding.js';
import { resolveGuestByToken } from './_lib/rsvpAuth.js';
import { latestEventResponses, latestGuestLevel, toEventResponsesShape, mergePlusOneEventResponses } from '../src/lib/rsvpAggregation.js';
import { hashId, decryptPayload } from './_lib/questionnaireCrypto.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

/** decryptPayload throws on a truncated/tampered blob — treat that as "no data" rather than 500ing the whole lookup. */
function safeDecrypt(blob) {
  if (!blob) return null;
  try {
    return decryptPayload(blob);
  } catch (err) {
    console.error('[rsvp-lookup] Failed to decrypt encrypted_guest_level:', err.message);
    return null;
  }
}

/**
 * Minimal guest fields the RSVP form needs — deliberately excludes `id`,
 * `created_by_id`, `rsvp_link_id`, and every other guest's data. All future
 * writes are re-resolved server-side from the token, never a client-
 * supplied guest id, so the client never needs the raw id at all.
 *
 * When role === 'plus_one', every field below is the PLUS-ONE's own —
 * their name, their email, their dietary needs, their own event answers —
 * never the primary guest's. They're invited to whatever events the
 * primary is invited to (inherited, not answered separately for them) via
 * mergePlusOneEventResponses, but their attendance/meal/etc. per event is
 * entirely their own, recorded under is_plus_one:true rows.
 */
function pickGuestSafeGuestFields(guest, rsvpRows, role) {
  const isPlusOne = role === 'plus_one';
  const guestLevelRows = latestGuestLevel(rsvpRows, { plusOne: isPlusOne });
  const guestLevel = guestLevelRows[0] || null;
  const decrypted = safeDecrypt(guestLevel?.encrypted_guest_level);

  if (isPlusOne) {
    return {
      name: guest.plus_one_name || 'Guest',
      plus_one: false, // a plus-one doesn't get their own plus-one
      poll_votes: {},
      song_request: decrypted?.song_request ?? '',
      rsvp_note: decrypted?.note ?? '',
      dietary_restrictions: decrypted?.dietary_restrictions ?? (guest.plus_one_dietary_restrictions || ''),
      email: guest.plus_one_email || decrypted?.email || '',
      event_responses: mergePlusOneEventResponses(guest.event_responses || [], rsvpRows),
    };
  }

  const eventRows = latestEventResponses(rsvpRows);
  return {
    name: guest.name,
    plus_one: !!guest.plus_one,
    poll_votes: guest.poll_votes || {},
    song_request: decrypted?.song_request ?? (guest.song_request || ''),
    rsvp_note: decrypted?.note ?? (guest.rsvp_note || ''),
    dietary_restrictions: decrypted?.dietary_restrictions ?? (guest.dietary_restrictions || ''),
    // Opposite precedence from the fields above: a real Guest.email always
    // wins over a previously RSVP-submitted one, matching the same "don't
    // overwrite an existing email" rule api/my-guests-rsvp.js enforces on
    // the couple's own dashboard read.
    email: guest.email || decrypted?.email || '',
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
    const { guest, wedding, role } = resolved;

    let rsvpRows = [];
    if (wedding?.id) {
      const rsvpQuery = encodeURIComponent(JSON.stringify({ wedding_id: wedding.id, guest_id_hash: hashId(guest.id) }));
      const rsvpRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/RsvpResponse?q=${rsvpQuery}`, {
        headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
      });
      if (rsvpRes.ok) {
        rsvpRows = unwrapList(await rsvpRes.json()).filter(r => !r.is_test);
      }
    }

    return res.status(200).json({
      guest: pickGuestSafeGuestFields(guest, rsvpRows, role),
      wedding: wedding ? pickGuestSafeFields(wedding) : null,
    });
  } catch (err) {
    console.error('[rsvp-lookup] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
