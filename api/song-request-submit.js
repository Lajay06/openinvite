/**
 * POST /api/song-request-submit
 *
 * Public, unauthenticated endpoint backing GuestMusic.jsx's "Request a
 * song" form. Resolves the wedding by slug using the server-side admin
 * key, stamps the correct weddingId onto the SongRequest server-side
 * (the previous client-side base44.entities.SongRequest.create() call had
 * NO wedding linkage at all — every wedding's requests landed in one
 * unscoped table), and re-validates the guest-requests-enabled /
 * requests-closed gates server-side rather than trusting the client's own
 * UI gating.
 *
 * Body: {
 *   weddingSlug: string, turnstileToken: string,
 *   spotifyTrackId?, title, artist, album?, albumArt?, duration?, explicit?,
 *   spotifyUrl?, submittedBy: string, guestNote?: string,
 * }
 * Response: 200 { ok: true }
 *        or 404 { error: 'Wedding not found.' }
 *        or 403 { error: 'Song requests are not open for this wedding.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import {
  applyCors,
  checkRateLimit,
  getClientIp,
  sanitizeString,
  verifyTurnstileToken,
} from './_lib/security.js';

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
    const query = encodeURIComponent(JSON.stringify({ slug: weddingSlug }));
    const findRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${query}`, {
      headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    });
    if (!findRes.ok) {
      const body = await findRes.text().catch(() => '');
      throw new Error(`Base44 WeddingDetails lookup failed (${findRes.status}): ${body.slice(0, 200)}`);
    }
    const wedding = unwrapList(await findRes.json()).find(w => w.slug === weddingSlug && !w.is_test);
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found.' });
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

    const payload = {
      weddingId: wedding.id,
      spotifyTrackId: sanitizeString(req.body?.spotifyTrackId || ''),
      title,
      artist,
      album: sanitizeString(req.body?.album || '').slice(0, MAX_TEXT_LENGTH),
      albumArt: sanitizeString(req.body?.albumArt || ''),
      duration: Number.isFinite(Number(req.body?.duration)) ? Number(req.body.duration) : 0,
      explicit: !!req.body?.explicit,
      spotifyUrl: sanitizeString(req.body?.spotifyUrl || ''),
      submittedBy,
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
