/**
 * POST /api/collect-guest-contact
 *
 * Public, unauthenticated endpoint backing GuestCollect.jsx's Contact
 * Collector form (/w/:weddingSlug/collect) — modelled on Withjoy's
 * "Contact Collector" (guests self-submit their own mailing address/phone/
 * email via a shareable link), with one deliberate departure: Withjoy's
 * submissions save straight to the guest list with no review step; ours
 * write to the append-only GuestContactSubmission entity (status: pending)
 * instead of Guest directly, so the couple reviews and approves each one
 * on the Guests page before it becomes a real Guest record. Same
 * slug-resolution + admin-key-write pattern as song-request-submit.js.
 *
 * Abuse resistance (no captcha, per instruction — this is the whole stack):
 *   - honeypot: a hidden form field real guests never see or fill. Any
 *     non-empty value is treated as a bot and silently no-ops with a 200
 *     (never reveals to the bot that it was caught).
 *   - IP rate limit: 5 req/min per IP (checkRateLimit), same mechanism
 *     every other public form endpoint in this app already uses.
 *   - per-wedding email dedupe: a second submission with an email that
 *     already exists among this wedding's submissions no-ops with a 200
 *     rather than creating a duplicate pending row.
 *   - per-wedding submission cap (SUBMISSION_CAP): once a wedding has this
 *     many submissions (pending + approved + dismissed), new submissions
 *     are rejected with a friendly "this list is full" message rather than
 *     growing an unbounded, unmoderated table.
 *
 * Body: { weddingSlug, name, email?, phone?, mailingAddress?, honeypot? }
 * Response: 200 { ok: true }
 *        or 404 { error: 'Wedding not found.' }
 *        or 409 { error: "This guest list isn't accepting new details right now." }
 *        or 429 { error: 'Too many requests — please wait a moment.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString, isValidEmail } from './_lib/security.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

const MAX_TEXT_LENGTH = 200;
const MAX_ADDRESS_LENGTH = 400;
// Sane per-wedding ceiling — a real couple's family/friend network, not a
// number anyone should ever organically reach without something wrong.
const SUBMISSION_CAP = 500;

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
  const { limited, remaining } = checkRateLimit(ip, 'collect-guest-contact', 5, 60_000);
  res.setHeader('X-RateLimit-Limit', '5');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  // Honeypot — a real guest never sees or fills this field. A bot that
  // fills every field blind will fill this too. Pretend success so a bot
  // gets no signal that it was caught.
  if (sanitizeString(req.body?.honeypot || '')) {
    console.warn('[collect-guest-contact] Honeypot triggered — IP:', ip);
    return res.status(200).json({ ok: true });
  }

  const weddingSlug = sanitizeString(req.body?.weddingSlug || '');
  const name = sanitizeString(req.body?.name || '').slice(0, MAX_TEXT_LENGTH);
  const emailRaw = sanitizeString(req.body?.email || '').slice(0, MAX_TEXT_LENGTH);
  const email = emailRaw && isValidEmail(emailRaw) ? emailRaw.toLowerCase() : '';
  const phone = sanitizeString(req.body?.phone || '').slice(0, MAX_TEXT_LENGTH);
  const mailingAddress = sanitizeString(req.body?.mailingAddress || '').slice(0, MAX_ADDRESS_LENGTH);

  if (!weddingSlug || !name) {
    return res.status(400).json({ error: 'Wedding and your name are required.' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[collect-guest-contact] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const weddingQuery = encodeURIComponent(JSON.stringify({ slug: weddingSlug }));
    const weddings = await adminFetch(`/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`);
    const wedding = weddings.find(w => w.slug === weddingSlug && !w.is_test);
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found.' });
    }

    const submissionQuery = encodeURIComponent(JSON.stringify({ wedding_id: wedding.id }));
    const existing = await adminFetch(`/apps/${BASE44_APP_ID}/entities/GuestContactSubmission?q=${submissionQuery}&limit=1000`);
    const nonTest = existing.filter(s => !s.is_test);

    if (nonTest.length >= SUBMISSION_CAP) {
      return res.status(409).json({ error: "This guest list isn't accepting new details right now." });
    }

    if (email && nonTest.some(s => (s.email || '').toLowerCase() === email)) {
      // Already submitted — no-op success, not an error. The guest doesn't
      // need to know their earlier submission exists or what state it's in.
      return res.status(200).json({ ok: true });
    }

    const createRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/GuestContactSubmission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
      body: JSON.stringify({
        wedding_id: wedding.id,
        name,
        email: email || undefined,
        phone: phone || undefined,
        mailing_address: mailingAddress || undefined,
        status: 'pending',
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => '');
      throw new Error(`Base44 GuestContactSubmission create failed (${createRes.status}): ${body.slice(0, 200)}`);
    }

    console.log('[collect-guest-contact] Submission created for wedding', weddingSlug);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[collect-guest-contact] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
