/**
 * POST /api/wedding-poll-comment
 *
 * Public, unauthenticated endpoint backing WeddingPollsPage.jsx's poll
 * comment box. Resolves the wedding by slug using the server-side admin
 * key, then writes a PollComment record — replacing the previous
 * WeddingDetails.polls[].comments[] append, which required an admin-key
 * UPDATE on the couple's own WeddingDetails record and broke outright
 * once WeddingDetails gained an owner-scoped update RLS rule the admin
 * key structurally cannot satisfy. PollComment's create:null RLS has no
 * such problem — same pattern already proven by GuestbookEntry/
 * SongRequest.
 *
 * Body: { weddingSlug: string, pollId: string, comment: string, turnstileToken: string }
 * Response: 200 { ok: true }
 *        or 404 { error: 'Wedding not found.' }
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
const MAX_COMMENT_LENGTH = 500;

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
  const { limited, remaining } = checkRateLimit(ip, 'wedding-poll-comment', 10, 60_000);
  res.setHeader('X-RateLimit-Limit', '10');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const weddingSlug = sanitizeString(req.body?.weddingSlug || '');
  const pollId = sanitizeString(req.body?.pollId || '');
  const comment = sanitizeString(req.body?.comment || '').slice(0, MAX_COMMENT_LENGTH);
  const turnstileToken = req.body?.turnstileToken;

  if (!weddingSlug || !pollId || !comment) {
    return res.status(400).json({ error: 'weddingSlug, pollId, and a comment are required.' });
  }
  if (!turnstileToken) {
    return res.status(400).json({ error: 'Security verification token is missing.' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[wedding-poll-comment] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  let turnstileResult;
  try {
    turnstileResult = await verifyTurnstileToken(turnstileToken, ip, '[wedding-poll-comment]');
  } catch (err) {
    console.error('[wedding-poll-comment] Turnstile network error:', err.message);
    return res.status(500).json({ error: 'Security check unavailable. Please try again.' });
  }
  if (!turnstileResult.success) {
    console.warn('[wedding-poll-comment] Turnstile failed — codes:', turnstileResult['error-codes'], '| IP:', ip);
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

    const createRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/PollComment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
      body: JSON.stringify({ wedding_id: wedding.id, poll_id: pollId, text: comment }),
    });
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => '');
      throw new Error(`Base44 PollComment create failed (${createRes.status}): ${body.slice(0, 200)}`);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[wedding-poll-comment] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
