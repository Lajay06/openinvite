/**
 * GET /api/wedding-guestbook?slug=<weddingSlug>
 *
 * Public, unauthenticated endpoint backing WeddingGuestbookPage.jsx's
 * guestbook display. Resolves the wedding by slug using the server-side
 * admin key, then returns only that wedding's GuestbookEntry records
 * (excluding is_test) — replacing the previous direct client-side
 * base44.entities.GuestbookEntry.filter({wedding_id}) call, which required
 * GuestbookEntry to be readable entity-wide by any caller for that
 * client-side filter to work at all (an unscoped read via the raw Base44
 * API would return every couple's guestbook, not just this one's).
 *
 * Response: 200 { entries: Array<{id, guest_name, message, created_date}> }
 *        or 404 { error: 'Wedding not found.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'wedding-guestbook', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const slug = sanitizeString(req.query?.slug || '');
  if (!slug) {
    return res.status(400).json({ error: 'slug is required' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[wedding-guestbook] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const weddingQuery = encodeURIComponent(JSON.stringify({ slug }));
    const findRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`, {
      headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    });
    if (!findRes.ok) {
      const body = await findRes.text().catch(() => '');
      throw new Error(`Base44 WeddingDetails lookup failed (${findRes.status}): ${body.slice(0, 200)}`);
    }
    const wedding = unwrapList(await findRes.json()).find(w => w.slug === slug && !w.is_test);
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found.' });
    }

    const entriesQuery = encodeURIComponent(JSON.stringify({ wedding_id: wedding.id }));
    const entriesRes = await fetch(
      `${BASE44_API}/apps/${BASE44_APP_ID}/entities/GuestbookEntry?q=${entriesQuery}`,
      { headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` } },
    );
    if (!entriesRes.ok) {
      const body = await entriesRes.text().catch(() => '');
      throw new Error(`Base44 GuestbookEntry fetch failed (${entriesRes.status}): ${body.slice(0, 200)}`);
    }
    const entries = unwrapList(await entriesRes.json())
      .filter(e => !e.is_test)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .map(e => ({ id: e.id, guest_name: e.guest_name, message: e.message, created_date: e.created_date }));

    return res.status(200).json({ entries });
  } catch (err) {
    console.error('[wedding-guestbook] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
