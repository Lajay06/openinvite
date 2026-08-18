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
  verifyTurnstileToken,
} from './_lib/security.js';
import { renderInvitationEmail } from '../src/lib/emailTemplate.js';
import { getBase44User } from './_lib/base44Admin.js';
import { guestGateBlocks, GUEST_GATE_MESSAGE } from './_lib/guestSafeWedding.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPPORT_ADDRESS = 'hello@openinvite.com.au';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
import { decryptToken } from './_lib/rsvpTokenCrypto.js';
import { mergeGuestPii } from './_lib/guestPii.js';

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
  // Accepted only from the POST body — never a query string (#449: access
  // logs, browser history, referrer, shared-cache keys).
  const candidatePassword = typeof req.body?.password === 'string' ? req.body.password : '';
  const turnstileToken = req.body?.turnstileToken;

  if (!isValidEmail(email) || !weddingSlug) {
    return res.status(400).json({ error: 'A valid email and wedding are required' });
  }

  if (!turnstileToken) {
    return res.status(400).json({ error: 'Security verification token is missing.' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[rsvp-link-request] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  // ── Cloudflare Turnstile verification ──────────────────────────────────────
  // This check must reject on failure (400), NOT fall through to the neutral
  // { sent: true } response below — the neutral response exists specifically
  // to resist email-enumeration on the *match* branch, which is a separate
  // concern from rejecting a request that isn't a human at all.
  let turnstileResult;
  try {
    turnstileResult = await verifyTurnstileToken(turnstileToken, ip, '[rsvp-link-request]');
  } catch (err) {
    console.error('[rsvp-link-request] Turnstile network error:', err.message);
    return res.status(500).json({ error: 'Security check unavailable. Please try again.' });
  }

  if (!turnstileResult.success) {
    console.warn('[rsvp-link-request] Turnstile failed — codes:', turnstileResult['error-codes'], '| IP:', ip);
    return res.status(400).json({ error: 'Security verification failed. Please refresh the page and try again.' });
  }

  // Neutral success — returned whether or not the email matched a guest.
  const NEUTRAL = { sent: true };

  try {
    const allWeddings = await fetchAll('WeddingDetails');
    const wedding = allWeddings.find(w => w.slug === weddingSlug);
    if (!wedding) return res.status(200).json(NEUTRAL);

    // The website password gate — decided BEFORE the guest lookup, and
    // deliberately so. The neutral response above protects EMAIL enumeration:
    // it must not be possible to learn which addresses are on the guest list.
    // The gate protects something else entirely, and its answer depends only
    // on the slug and the supplied password. Resolving it first guarantees the
    // gate's response can never vary by email, so the two properties stay
    // independent rather than leaking through each other.
    if (await guestGateBlocks(wedding, candidatePassword, '[rsvp-link-request]')) {
      return res.status(403).json({ error: GUEST_GATE_MESSAGE, passwordRequired: true });
    }

    // Track D: email lives in encrypted_guest_pii, so the match below has to
    // run against decrypted rows. This is the reader that most needs saying
    // out loud: the neutral {sent:true} response above is deliberate
    // anti-enumeration design, so a match that silently stops working is
    // INDISTINGUISHABLE from "that address isn't a guest". Exactly the shape
    // that hid for a whole track in E3-1. Hence the log line on the matched
    // branch below — the production log is the evidence, never the UI.
    const allGuests = (await fetchAll('Guest')).map(mergeGuestPii);
    // TWO reads of the token here, not one — the filter as well as the URL.
    // Track E3 nulls the plaintext column, so both must come from the
    // ciphertext. The filter is the easy one to miss: left on rsvp_link_id it
    // would silently match no guest at all, and this endpoint's deliberately
    // neutral response would report "sent" for every request forever.
    const guest = allGuests.find(g =>
      g.created_by_id === wedding.created_by_id &&
      typeof g.email === 'string' &&
      g.email.toLowerCase() === email &&
      g.rsvp_link_id_enc
    );

    if (guest) {
      const baseUrl = resolveBaseUrl(req.headers.origin);
      // Server-side decrypt: this endpoint already holds RSVP_TOKEN_KEY, so no
      // hop through api/my-guest-links.js is needed.
      const rsvpToken = decryptToken(guest.rsvp_link_id_enc);
      if (!rsvpToken) {
        // A row whose ciphertext will not decrypt has lost its token — there is
        // no other copy after E3. Log loudly and fall through to the neutral
        // response rather than emailing a broken link.
        console.error(`[rsvp-link-request] rsvp_link_id_enc failed to decrypt for guest ${guest.id} — cannot send a link.`);
        return res.status(200).json(NEUTRAL);
      }
      const rsvpUrl = `${baseUrl}/rsvp/${rsvpToken}`;
      const coupleName = wedding.coupleNames
        || [wedding.couple1Name, wedding.couple2Name].filter(Boolean).join(' & ');

      const events = wedding.weddingDate
        ? [{ name: 'Wedding day', date: wedding.weddingDate, venue: wedding.mainCeremony?.venueName || '' }]
        : [];

      const { html, text } = renderInvitationEmail({
        universeId: wedding.activeUniverse,
        type: 'reminder',
        guestName: guest.name,
        coupleNames: coupleName,
        events,
        rsvpUrl,
      });

      // Guest-facing from-name is the couple's own names (email branding
      // audit) — address stays on the verified sending domain regardless.
      // No caller session here (anonymous endpoint), so reply-to is
      // resolved from the wedding owner's own Base44 User record via the
      // admin key — same single-record-by-id lookup send-weekly-digest.js
      // uses, the one path confirmed reliable for the admin key against
      // the User entity (see BASE44_PLATFORM_NOTES.md). Falls back to the
      // support address if that lookup fails for any reason.
      const owner = await getBase44User(wedding.created_by_id, BASE44_ADMIN_KEY);
      const fromName = coupleName || 'Openinvite';
      const from = `${fromName} <${SUPPORT_ADDRESS}>`;
      const replyTo = owner?.email || SUPPORT_ADDRESS;

      await resend.emails.send({
        from,
        to: guest.email,
        replyTo,
        subject: `Your RSVP link for ${coupleName || 'the wedding'}`,
        html,
        text,
      });

      console.log('[rsvp-link-request] Sent RSVP link for wedding', weddingSlug);
    }

    return res.status(200).json(NEUTRAL);
  } catch (err) {
    console.error('[rsvp-link-request] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
