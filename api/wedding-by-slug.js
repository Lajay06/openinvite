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
 * Also returns the public registry section — cash funds (CustomGift) and
 * wishlist items (RegistryProduct) — scoped to this wedding's owner and
 * field-allowlisted via api/_lib/guestSafeRegistry.js (never
 * RegistryProduct.purchased_by/notes; CustomGift.payment_link_url only if
 * it's a validated https:// URL). Both entities have read:null RLS and no
 * wedding-scoping field of their own, so this scoping — not RLS — is what
 * keeps one couple's registry from being enumerable alongside every other
 * couple's; same pattern api/wedding-attendees.js already uses for Guest.
 *
 * Response: 200 { passwordProtected: true }
 *        or 200 { passwordProtected: false, ...guestSafeFields, customGifts, registryProducts }
 *        or 200 { passwordProtected: true, ...guestSafeFields, customGifts, registryProducts }  (correct password supplied)
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
import { pickGuestSafeCustomGift, pickGuestSafeRegistryProduct } from './_lib/guestSafeRegistry.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

/**
 * Cash funds (CustomGift) + wishlist items (RegistryProduct) for the public
 * registry section — same "resolve owner by created_by_id, query the open-
 * read entity server-side with the admin key, field-allowlist before
 * returning" pattern api/wedding-attendees.js already uses for Guest.
 * CustomGift/RegistryProduct RLS is read:null with no wedding-scoping
 * field, so this filter (not client-side RLS) is what keeps one couple's
 * registry from being enumerable alongside every other couple's.
 */
async function fetchGuestSafeRegistry(ownerId) {
  const query = encodeURIComponent(JSON.stringify({ created_by_id: ownerId }));
  const [giftsRes, productsRes] = await Promise.all([
    fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/CustomGift?q=${query}`, {
      headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    }),
    fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/RegistryProduct?q=${query}`, {
      headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    }),
  ]);
  const gifts = giftsRes.ok ? unwrapList(await giftsRes.json()).filter(g => !g.is_test) : [];
  const products = productsRes.ok ? unwrapList(await productsRes.json()).filter(p => !p.is_test) : [];
  return {
    customGifts: gifts.map(pickGuestSafeCustomGift),
    registryProducts: products.map(pickGuestSafeRegistryProduct),
  };
}

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

    const registry = await fetchGuestSafeRegistry(wedding.created_by_id);

    return res.status(200).json({ ...pickGuestSafeFields(wedding), ...registry });
  } catch (err) {
    console.error('[wedding-by-slug] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
