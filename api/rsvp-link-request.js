/**
 * POST /api/rsvp-link-request
 *
 * Public, unauthenticated endpoint backing the RSVP section on a couple's
 * published wedding website. That embed has no guest identity (unlike
 * /rsvp/:token, which is the canonical per-guest RSVP flow guests receive via
 * their invite). A visitor can enter their email; if it matches a guest on
 * THIS wedding, we email them their existing personal RSVP link via Resend.
 *
 * Security: responds with the exact same shape/status whether or not the
 * email matches a guest, and never returns guest data (name, rsvp_link_id,
 * etc.) to the browser — the lookup and email send both happen server-side.
 * This prevents the endpoint being used to enumerate a wedding's guest list.
 *
 * Body: { email: string, weddingSlug: string }
 * Response (always, on well-formed input): { sent: true }
 *
 * Required env vars:
 *   BASE44_ADMIN_KEY   — server-side-only Base44 service token (same one used
 *                        by api/cron/send-onboarding-emails.js).
 *   RESEND_API_KEY     — already configured.
 *   VITE_BASE44_APP_ID — already configured.
 */

import { Resend } from 'resend';
import {
  applyCors,
  checkRateLimit,
  getClientIp,
  isValidEmail,
  sanitizeString,
} from './_lib/security.js';
import { weddingReminderEmail } from './emails/wedding-reminder.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Openinvite <hello@openinvite.com.au>';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

const KNOWN_ORIGINS = new Set([
  'https://openinvite.com.au',
  'https://www.openinvite.com.au',
  'https://openinvite-pearl.vercel.app',
]);

/**
 * Fetch all records of an entity via the Base44 admin REST API.
 * Handles both plain-array and envelope responses.
 *
 * @param {string} entity
 * @returns {Promise<Array>}
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

/** Safe base URL for the RSVP link — never trust an arbitrary Origin header verbatim. */
function resolveBaseUrl(originHeader) {
  if (originHeader && (KNOWN_ORIGINS.has(originHeader) || originHeader.endsWith('.vercel.app'))) {
    return originHeader;
  }
  return 'https://openinvite.com.au';
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'rsvp-link', 5, 60_000);
  res.setHeader('X-RateLimit-Limit', '5');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const email = sanitizeString(req.body?.email || '').toLowerCase();
  const weddingSlug = sanitizeString(req.body?.weddingSlug || '');

  if (!isValidEmail(email) || !weddingSlug) {
    return res.status(400).json({ error: 'A valid email and wedding are required' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[rsvp-link-request] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  // Neutral success — returned whether or not the email matched a guest.
  const NEUTRAL = { sent: true };

  try {
    const allWeddings = await fetchAll('WeddingDetails');
    const wedding = allWeddings.find(w => w.slug === weddingSlug);
    if (!wedding) return res.status(200).json(NEUTRAL);

    const allGuests = await fetchAll('Guest');
    const guest = allGuests.find(g =>
      g.created_by_id === wedding.created_by_id &&
      typeof g.email === 'string' &&
      g.email.toLowerCase() === email &&
      g.rsvp_link_id
    );

    if (guest) {
      const baseUrl = resolveBaseUrl(req.headers.origin);
      const rsvpUrl = `${baseUrl}/rsvp/${guest.rsvp_link_id}`;
      const coupleName = wedding.coupleNames
        || [wedding.couple1Name, wedding.couple2Name].filter(Boolean).join(' & ');

      const html = weddingReminderEmail({
        guestName: guest.name,
        coupleName,
        weddingDate: wedding.weddingDate || '',
        rsvpUrl,
      });

      await resend.emails.send({
        from: FROM,
        to: guest.email,
        subject: `Your RSVP link — ${coupleName || 'the wedding'}`,
        html,
      });

      console.log('[rsvp-link-request] Sent RSVP link for wedding', weddingSlug);
    }

    return res.status(200).json(NEUTRAL);
  } catch (err) {
    console.error('[rsvp-link-request] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
