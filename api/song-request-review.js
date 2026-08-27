/**
 * GET/POST /api/song-request-review
 *
 * Authenticated (the couple's own Base44 session) endpoint backing the
 * "Song requests" panel on the Music dashboard page — GuestMusic.jsx's
 * public form writes SongRequest rows via api/song-request-submit.js's
 * admin-key create, so (same reasoning/pattern as api/guest-contact-
 * review.js) every guest-submitted row is stamped created_by_id:
 * "anonymous" by Base44 itself, not the wedding owner's real id. That
 * means the couple's own dashboard can never see these rows via a plain
 * getMyRecords('SongRequest') (created_by_id-scoped) call, and could never
 * update one directly even if it could see it — SongRequest.update RLS is
 * {created_by_id: "{{user.id}}"}, which "anonymous" can never match for
 * any real user. Ownership is verified here in application code (matching
 * the row's weddingId against the caller's own resolved wedding) before
 * any admin-key write, the same as the deleted guest contact collector did
 * identical class of problem on GuestContactSubmission.
 *
 * GET → { requests: SongRequest[] } — every request for the caller's own
 *   wedding, is_test excluded. All statuses; the dashboard groups/filters
 *   client-side same as it already did.
 *
 * POST body: { songRequestId: string, action: 'approve' | 'add' | 'decline' }
 *   'add'     — valid from status pending or approved. Creates a real
 *               Music entry (via the CALLER's own token, so Base44 stamps
 *               ownership correctly — Music.create is open RLS, exactly
 *               like the deleted guest contact collector did) from the
 *               request's track data, then sets the SongRequest's own
 *               status to 'added' (its own dedicated terminal state,
 *               distinct from 'approved' — this is what "approval
 *               actually does something" means: one click both approves
 *               and bridges it onto the couple's real list, rather than a
 *               two-step "approve, then separately add" flow).
 *   'decline' — valid from status pending or approved. Sets status to
 *               'declined'. No Music entry created.
 * Response: 200 { ok: true } or 400/401/404 { error: string }
 *
 * BOTH status writes use the CALLER's own token, never the admin key. These
 * rows are created with the admin key on behalf of anonymous guests, so
 * created_by_id is permanently 'anonymous' — an admin-key update returns a
 * flat 403 (BASE44_PLATFORM_NOTES.md, "the admin key is not a superuser
 * bypass"), which is exactly what broke this endpoint until 2026-08-17.
 * SongRequest.update RLS is scoped on {"data.ownerUserId": "{{user.id}}"}
 * instead, and api/song-request-submit.js stamps ownerUserId at create — the
 * same pattern Notification.recipient_user_id already uses. Do not "simplify"
 * these back to adminFetch; it silently reinstates the 403.
 *
 * 'add' is also idempotent: it creates the Music row before the status write,
 * and the two are not atomic, so a failure in between used to leave the track
 * added and the request pending, with every retry adding the track again.
 * The sourceSongRequestId guard makes the retry find the existing row and
 * complete the status write instead. See scratchpad/SONG-REQUEST-REVIEW-FIX.md.
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function adminFetch(method, path, body) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

/** Music.create with the CALLER's own token — never the admin key, so Base44 stamps real ownership (see file header). */
async function callerFetch(method, path, callerToken, body) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${callerToken}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

async function getMyWedding(callerId) {
  const q = encodeURIComponent(JSON.stringify({ created_by_id: callerId }));
  const weddings = unwrapList(await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${q}`))
    .filter(w => !w.is_test);
  return weddings.length > 0
    ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
    : null;
}

function fmtDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function handleGet(req, res, caller) {
  const wedding = await getMyWedding(caller.id);
  if (!wedding?.id) return res.status(200).json({ requests: [] });

  const q = encodeURIComponent(JSON.stringify({ weddingId: wedding.id }));
  const rows = unwrapList(await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/SongRequest?q=${q}&limit=1000`))
    .filter(r => !r.is_test);

  return res.status(200).json({ requests: rows });
}

async function handlePost(req, res, caller, callerToken) {
  const songRequestId = typeof req.body?.songRequestId === 'string' ? req.body.songRequestId : '';
  const action = req.body?.action;

  if (!songRequestId || !['approve', 'add', 'decline'].includes(action)) {
    return res.status(400).json({ error: 'songRequestId and a valid action are required' });
  }

  const wedding = await getMyWedding(caller.id);
  if (!wedding?.id) return res.status(404).json({ error: 'No wedding found for this account' });

  // Ownership check — SongRequest.read is null (open), so fetching by id
  // alone proves nothing; the weddingId match is what actually verifies
  // this request belongs to the caller's own wedding.
  const request = await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/SongRequest/${songRequestId}`).catch(() => null);
  if (!request || request.weddingId !== wedding.id) {
    return res.status(404).json({ error: 'Song request not found' });
  }
  if (!['pending', 'approved'].includes(request.status)) {
    return res.status(400).json({ error: `This request is already ${request.status}.` });
  }

  // 'approve' — say yes without bridging into a track list. The music rebuild
  // (2026-08-18) removed per-track curation, so there is no Music list left to
  // add to; approving now means only "we will play this". 'add' is kept for the
  // Ava/Music-entity path and for any older surface that still bridges.
  if (action === 'approve') {
    await callerFetch('PUT', `/apps/${BASE44_APP_ID}/entities/SongRequest/${songRequestId}`, callerToken, { status: 'approved' });
    return res.status(200).json({ ok: true });
  }

  if (action === 'decline') {
    await callerFetch('PUT', `/apps/${BASE44_APP_ID}/entities/SongRequest/${songRequestId}`, callerToken, { status: 'declined' });
    return res.status(200).json({ ok: true });
  }

  // action === 'add' — bridge into the couple's real Music list, using the
  // caller's own token so Base44 stamps real ownership on the new record
  // (Music.create RLS is open, same as Guest.create).
  //
  // IDEMPOTENT. The Music row is created before the status write, and the two
  // are not atomic — anything that fails in between (today, reliably: the
  // status write 403s because SongRequest.update is still scoped on
  // created_by_id, which is 'anonymous' on every row) leaves the track added
  // and the request still pending. A retry would then add the track a second
  // time. Guarding on sourceSongRequestId makes the retry find the existing
  // row and skip straight to the status write, so ordering stops mattering.
  //
  // Deliberately NOT solved by writing the status first: that turns a visible
  // duplicate into silent loss — a request marked 'added' whose track was
  // never created.
  const existingMusic = unwrapList(await callerFetch(
    'GET',
    `/apps/${BASE44_APP_ID}/entities/Music?q=${encodeURIComponent(JSON.stringify({ sourceSongRequestId: songRequestId }))}`,
    callerToken,
  ).catch(() => []));

  if (existingMusic.length === 0) {
    await callerFetch('POST', `/apps/${BASE44_APP_ID}/entities/Music`, callerToken, {
      song_title: request.title,
      artist: request.artist,
      album: request.album || '',
      spotify_track_id: request.spotifyTrackId || '',
      source: request.spotifyTrackId ? 'spotify' : 'general',
      image_url: request.albumArt || '',
      preview_url: '',
      duration: fmtDuration(request.duration),
      category: 'general',
      approved: true,
      guest_suggestion: true,
      sourceSongRequestId: songRequestId,
      notes: request.guestNote ? `Requested by ${request.submittedBy} — ${request.guestNote}` : `Requested by ${request.submittedBy}`,
    });
  } else {
    console.warn(`[song-request-review] Music row already exists for request ${songRequestId} — skipping create, completing the status write. This is the retry path after a failed status write.`);
  }

  await callerFetch('PUT', `/apps/${BASE44_APP_ID}/entities/SongRequest/${songRequestId}`, callerToken, { status: 'added' });

  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'song-request-review', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[song-request-review] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') return await handleGet(req, res, caller);
    if (req.method === 'POST') {
      const callerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      return await handlePost(req, res, caller, callerToken);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[song-request-review] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
