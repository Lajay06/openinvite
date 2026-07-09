/**
 * GET /api/wedding-by-slug?slug=<weddingSlug>&password=<optional>&preview=<optional>
 *
 * Public, unauthenticated endpoint backing every page of a couple's
 * published wedding website. Resolves a wedding by its public slug using
 * the server-side admin key, and returns ONLY an explicit allowlist of
 * guest-safe fields (see api/_lib/guestSafeWedding.js) — never
 * websitePassword, emergencyContacts, dayVendorContacts, or any other
 * couple-private field.
 *
 * Replaces every anonymous client-side base44.entities.WeddingDetails.list()
 * / .filter({slug}) call in the guest-facing tree (previously in
 * MultiPageWeddingWebsite.jsx, GuestAccommodation.jsx, GuestTransport.jsx,
 * GuestMusic.jsx, ExperienceGuide.jsx) — those called .list() with NO
 * filter at all (returning every couple's full record to any visitor) or
 * .filter({slug}) client-side (correctly scoped to one wedding, but still
 * shipping the FULL record, including websitePassword and every private
 * field, to the browser).
 *
 * Password handling: the real password is never sent to the browser. If
 * the wedding is password-protected and no (or an incorrect) `password` is
 * supplied, the response is just { passwordProtected: true } with no other
 * fields — the client shows a gate and retries with the candidate password
 * once entered.
 *
 * preview=true bypasses the password gate entirely, matching the existing
 * documented behavior (Help.jsx): the couple's own dashboard preview links
 * (FullScreenPreview.jsx, StudioGuestSuite.jsx, StudioWebsite.jsx) append
 * ?preview=true to their own /w/:slug links specifically so the couple can
 * preview a password-protected site without knowing/entering the password.
 * This mirrors the prior client-side-only gate's behavior faithfully
 * rather than introducing a stricter check the existing preview feature
 * doesn't expect.
 *
 * Response: 200 { passwordProtected: true }
 *        or 200 { passwordProtected: false, ...guestSafeFields }
 *        or 200 { passwordProtected: true, ...guestSafeFields }  (correct password supplied)
 *        or 404 { error: 'Wedding not found.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import {
  applyCors,
  checkRateLimit,
  getClientIp,
  sanitizeString,
} from './_lib/security.js';
import { pickGuestSafeFields, verifyWeddingPassword } from './_lib/guestSafeWedding.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  // Generous limit — every page navigation on a guest site triggers a call.
  const { limited, remaining } = checkRateLimit(ip, 'wedding-by-slug', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const slug = sanitizeString(req.query?.slug || '');
  const candidatePassword = typeof req.query?.password === 'string' ? req.query.password : '';
  const isPreview = req.query?.preview === 'true';

  if (!slug) {
    return res.status(400).json({ error: 'slug is required' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[wedding-by-slug] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const query = encodeURIComponent(JSON.stringify({ slug }));
    const findRes = await fetch(
      `${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${query}`,
      { headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` } },
    );

    if (!findRes.ok) {
      const body = await findRes.text().catch(() => '');
      throw new Error(`Base44 WeddingDetails lookup failed (${findRes.status}): ${body.slice(0, 200)}`);
    }

    const payload = await findRes.json();
    const list = Array.isArray(payload) ? payload : (payload?.data || payload?.results || []);
    const wedding = list.find(w => w.slug === slug && !w.is_test);

    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found.' });
    }

    const passwordProtected = !!wedding.websitePassword?.trim();
    if (passwordProtected && !isPreview && !verifyWeddingPassword(wedding, candidatePassword)) {
      return res.status(200).json({ passwordProtected: true });
    }

    return res.status(200).json(pickGuestSafeFields(wedding));
  } catch (err) {
    console.error('[wedding-by-slug] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
