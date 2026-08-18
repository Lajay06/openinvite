/**
 * POST /api/song-request-submit
 *
 * Public, unauthenticated endpoint backing GuestMusic.jsx's "Request a
 * song" form. Resolves the wedding by slug using the server-side admin
 * key, stamps the correct weddingId onto the SongRequest server-side
 * (the previous client-side base44.entities.SongRequest.create() call had
 * NO wedding linkage at all — every wedding's requests landed in one
 * unscoped table), and re-validates every music.* gate server-side rather
 * than trusting the client's own UI gating: guestRequestsEnabled,
 * requestsClosedDate, onlyForConfirmedGuests (cross-checked against the
 * live, RsvpResponse-derived attendance status — Guest.rsvp_status itself
 * is a frozen-at-creation column nothing keeps current, same reasoning
 * api/my-guests-rsvp.js documents), and limitOnePerGuest (deduped by
 * guestEmailHash against this wedding's existing requests).
 *
 * fix/song-request-email-hash: guestEmail used to be stored on SongRequest
 * as plaintext. Nothing reads it back (api/song-request-review.js never
 * displays it, confirmed via repo-wide grep) — its only real use was the
 * limitOnePerGuest dedup check above, which only needs equality, not the
 * plaintext value itself. Now stored as guestEmailHash (HMAC-SHA256 via
 * api/_lib/questionnaireCrypto.js's hashId, same construction already used
 * for guest_id_hash at the RsvpResponse lookup below). Existing plaintext
 * rows are migrated by scripts/migrate-song-request-email-hash.mjs.
 *
 * Body: {
 *   weddingSlug: string, turnstileToken: string, guestEmail?: string,
 *   spotifyTrackId?, title, artist, album?, albumArt?, duration?, explicit?,
 *   spotifyUrl?, submittedBy: string, guestNote?: string,
 * }
 * Response: 200 { ok: true }
 *        or 400 { error: 'A valid email is required to request a song.' } (onlyForConfirmedGuests/limitOnePerGuest on, no/bad email)
 *        or 403 { error: '...' } (requests closed/disabled, not a confirmed guest, or already submitted)
 *        or 404 { error: 'Wedding not found.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import {
  applyCors,
  checkRateLimit,
  getClientIp,
  sanitizeString,
  isValidEmail,
  verifyTurnstileToken,
} from './_lib/security.js';
import { hashId } from './_lib/questionnaireCrypto.js';
import { latestEventResponses, toEventResponsesShape, deriveRsvpStatus } from '../src/lib/rsvpAggregation.js';
import { guestGateBlocks, GUEST_GATE_MESSAGE } from './_lib/guestSafeWedding.js';
import { mergeGuestPii } from './_lib/guestPii.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

const MAX_TEXT_LENGTH = 300;
const MAX_NOTE_LENGTH = 500;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function adminGet(path) {
  const res = await fetch(`${BASE44_API}${path}`, { headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Base44 GET ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return unwrapList(await res.json());
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'song-request', 10, 60_000);
  res.setHeader('X-RateLimit-Limit', '10');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const weddingSlug = sanitizeString(req.body?.weddingSlug || '');
  // Accepted only from the POST body — never a query string (#449: access
  // logs, browser history, referrer, shared-cache keys).
  const candidatePassword = typeof req.body?.password === 'string' ? req.body.password : '';
  const title = sanitizeString(req.body?.title || '').slice(0, MAX_TEXT_LENGTH);
  const artist = sanitizeString(req.body?.artist || '').slice(0, MAX_TEXT_LENGTH);
  const submittedBy = sanitizeString(req.body?.submittedBy || '').slice(0, 80);
  const turnstileToken = req.body?.turnstileToken;

  if (!weddingSlug || !title || !artist || !submittedBy) {
    return res.status(400).json({ error: 'Wedding, song title, artist, and your name are required.' });
  }

  if (!turnstileToken) {
    return res.status(400).json({ error: 'Security verification token is missing.' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[song-request-submit] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  let turnstileResult;
  try {
    turnstileResult = await verifyTurnstileToken(turnstileToken, ip, '[song-request-submit]');
  } catch (err) {
    console.error('[song-request-submit] Turnstile network error:', err.message);
    return res.status(500).json({ error: 'Security check unavailable. Please try again.' });
  }
  if (!turnstileResult.success) {
    console.warn('[song-request-submit] Turnstile failed — codes:', turnstileResult['error-codes'], '| IP:', ip);
    return res.status(400).json({ error: 'Security verification failed. Please refresh the page and try again.' });
  }

  try {
    const wedding = (await adminGet(`/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${encodeURIComponent(JSON.stringify({ slug: weddingSlug }))}`))
      .find(w => w.slug === weddingSlug && !w.is_test);
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found.' });
    }

    // The website password gate, before any of the song-request rules below.
    // Turnstile proves "not a bot"; this proves "allowed to be here at all".
    if (await guestGateBlocks(wedding, candidatePassword, '[song-request-submit]')) {
      return res.status(403).json({ error: GUEST_GATE_MESSAGE, passwordRequired: true });
    }

    // Re-validate server-side — the client UI hides the form when these
    // don't hold, but that's not an enforcement boundary on its own.
    const music = wedding.music || {};
    if (!music.guestRequestsEnabled) {
      return res.status(403).json({ error: 'Song requests are not open for this wedding.' });
    }
    if (music.requestsClosedDate && new Date(music.requestsClosedDate) <= new Date()) {
      return res.status(403).json({ error: 'Song requests have closed for this wedding.' });
    }

    const guestEmail = sanitizeString(req.body?.guestEmail || '').toLowerCase().slice(0, 200);
    if (music.onlyForConfirmedGuests || music.limitOnePerGuest) {
      if (!guestEmail || !isValidEmail(guestEmail)) {
        return res.status(400).json({ error: 'A valid email is required to request a song.' });
      }
    }
    const guestEmailHash = guestEmail ? hashId(guestEmail) : null;

    if (music.onlyForConfirmedGuests) {
      const guests = (await adminGet(`/apps/${BASE44_APP_ID}/entities/Guest?q=${encodeURIComponent(JSON.stringify({ created_by_id: wedding.created_by_id }))}`))
        .filter(g => !g.is_test);
      // Track D: email lives in encrypted_guest_pii — match on decrypted rows.
      const matchedGuest = guests.map(mergeGuestPii)
        .find(g => typeof g.email === 'string' && g.email.toLowerCase() === guestEmail);
      if (!matchedGuest) {
        return res.status(403).json({ error: "We couldn't find your invitation — song requests are limited to confirmed guests." });
      }

      // "Confirmed" = attending (RSVP'd yes to at least one invited event).
      // Guest.rsvp_status is frozen at creation and never kept current
      // (api/rsvp-submit.js writes RsvpResponse rows instead) — live status
      // has to be derived the same way api/my-guests-rsvp.js already does.
      const guestHash = hashId(matchedGuest.id);
      const rsvpRows = (await adminGet(`/apps/${BASE44_APP_ID}/entities/RsvpResponse?q=${encodeURIComponent(JSON.stringify({ wedding_id: wedding.id, guest_id_hash: guestHash }))}`))
        .filter(r => !r.is_test);
      const status = deriveRsvpStatus(toEventResponsesShape(latestEventResponses(rsvpRows)));
      if (status !== 'attending') {
        return res.status(403).json({ error: "Song requests are limited to guests who've confirmed they're attending." });
      }
    }

    if (music.limitOnePerGuest) {
      const existing = (await adminGet(`/apps/${BASE44_APP_ID}/entities/SongRequest?q=${encodeURIComponent(JSON.stringify({ weddingId: wedding.id }))}`))
        .filter(r => !r.is_test);
      const alreadySubmitted = existing.some(r => r.guestEmailHash === guestEmailHash);
      if (alreadySubmitted) {
        return res.status(403).json({ error: "You've already submitted a song request." });
      }
    }

    const payload = {
      weddingId: wedding.id,
      // The wedding owner's user id, stamped server-side from the wedding we
      // just resolved — never supplied by the guest. This row is created with
      // the admin key on behalf of an anonymous submitter, so created_by_id is
      // permanently 'anonymous' and can never scope the couple's own access to
      // it. ownerUserId is what SongRequest.update RLS scopes on instead, the
      // same shape Notification.recipient_user_id already uses in this app.
      ownerUserId: wedding.created_by_id || '',
      spotifyTrackId: sanitizeString(req.body?.spotifyTrackId || ''),
      title,
      artist,
      album: sanitizeString(req.body?.album || '').slice(0, MAX_TEXT_LENGTH),
      albumArt: sanitizeString(req.body?.albumArt || ''),
      duration: Number.isFinite(Number(req.body?.duration)) ? Number(req.body.duration) : 0,
      explicit: !!req.body?.explicit,
      spotifyUrl: sanitizeString(req.body?.spotifyUrl || ''),
      submittedBy,
      guestEmailHash,
      guestNote: sanitizeString(req.body?.guestNote || '').slice(0, MAX_NOTE_LENGTH),
      status: music.requestsRequireApproval ? 'pending' : 'approved',
      playlist: 'general',
    };

    const createRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/SongRequest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
      body: JSON.stringify(payload),
    });
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => '');
      throw new Error(`Base44 SongRequest create failed (${createRes.status}): ${body.slice(0, 200)}`);
    }

    console.log('[song-request-submit] Request created for wedding', weddingSlug);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[song-request-submit] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
