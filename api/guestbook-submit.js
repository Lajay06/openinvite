/**
 * POST /api/guestbook-submit
 *
 * Public, unauthenticated endpoint backing the Guestbook section on a
 * couple's published wedding website. Anonymous visitors submit a name +
 * message; this endpoint verifies the submission is human (Cloudflare
 * Turnstile) and rate-limited before writing a GuestbookEntry, using the
 * same server-side admin-key write pattern as api/rsvp-link-request.js
 * (BASE44_ADMIN_KEY bearer token — never exposed to the browser).
 *
 * Body: { weddingSlug: string, guestName: string, message: string, turnstileToken: string }
 * Response: 200 { ok: true }
 *
 * Required env vars:
 *   BASE44_ADMIN_KEY      — server-side-only Base44 service token.
 *   TURNSTILE_SECRET_KEY  — Cloudflare Turnstile secret key.
 *   VITE_BASE44_APP_ID    — already configured.
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

const MAX_NAME_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 1000;

/**
 * Fetch all records of an entity via the Base44 admin REST API.
 * Handles both plain-array and envelope responses.
 */
async function fetchAll(entity) {
  const url = `${BASE44_API}/apps/${BASE44_APP_ID}/entities/${entity}?limit=1000`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Base44 ${entity} fetch failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const payload = await res.json();
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'guestbook-submit', 5, 60_000);
  res.setHeader('X-RateLimit-Limit', '5');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const weddingSlug = sanitizeString(req.body?.weddingSlug || '');
  const guestName = sanitizeString(req.body?.guestName || '').slice(0, MAX_NAME_LENGTH);
  const message = sanitizeString(req.body?.message || '').slice(0, MAX_MESSAGE_LENGTH);
  const turnstileToken = req.body?.turnstileToken;

  if (!weddingSlug || !guestName || !message) {
    return res.status(400).json({ error: 'Please fill in your name and a message.' });
  }

  if (!turnstileToken) {
    return res.status(400).json({ error: 'Security verification token is missing.' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[guestbook-submit] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  // ── Cloudflare Turnstile verification ──────────────────────────────────────
  let turnstileResult;
  try {
    turnstileResult = await verifyTurnstileToken(turnstileToken, ip, '[guestbook-submit]');
  } catch (err) {
    console.error('[guestbook-submit] Turnstile network error:', err.message);
    return res.status(500).json({ error: 'Security check unavailable. Please try again.' });
  }

  if (!turnstileResult.success) {
    console.warn('[guestbook-submit] Turnstile failed — codes:', turnstileResult['error-codes'], '| IP:', ip);
    return res.status(400).json({ error: 'Security verification failed. Please refresh the page and try again.' });
  }

  try {
    const allWeddings = await fetchAll('WeddingDetails');
    const wedding = allWeddings.find(w => w.slug === weddingSlug);
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found.' });
    }

    const createRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/GuestbookEntry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BASE44_ADMIN_KEY}`,
      },
      body: JSON.stringify({
        wedding_id: wedding.id,
        guest_name: guestName,
        message,
      }),
    });

    if (!createRes.ok) {
      const body = await createRes.text().catch(() => '');
      throw new Error(`Base44 GuestbookEntry create failed (${createRes.status}): ${body.slice(0, 200)}`);
    }

    console.log('[guestbook-submit] Entry created for wedding', weddingSlug);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[guestbook-submit] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
