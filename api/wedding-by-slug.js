/**
 * GET  /api/wedding-by-slug?slug=<weddingSlug>&preview=<optional>
 * POST /api/wedding-by-slug   { slug, password?, preview? }
 *
 * TRANSPORT: the candidate password is accepted ONLY from a POST body. It
 * used to ride in the query string, which put the credential into Vercel
 * access logs, browser history and the Referer header — and, because
 * Vercel's default Cache-Control for functions is
 * `public, max-age=0, must-revalidate`, made it part of the shared-cache KEY.
 * Nothing was serving stale (max-age=0 forces revalidation), but a
 * credential belongs in neither a log nor a cache key. POST also can't be
 * cached by an intermediary regardless of headers, so the default becomes
 * moot rather than something to fight.
 *
 * GET is retained for password-less reads — the three guest pages that never
 * send one (GuestCollect, GuestMusic, GuestAccommodation) and every
 * unprotected site — so the common path is unchanged.
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
 * preview=true lets the couple view their own password-protected site
 * without entering the password — the dashboard preview links
 * (FullScreenPreview.jsx, StudioGuestSuite.jsx, StudioWebsite.jsx) append it
 * to their own /w/:slug links.
 *
 * SECURITY: the flag is honored ONLY for an authenticated caller whose id
 * matches the wedding's created_by_id. Until fix/preview-bypass it was
 * honored for ANYONE — a bare `?preview=true` on a known slug returned the
 * full guest-safe payload of a password-protected site, with no
 * authentication of any kind. That was an unauthenticated bypass of the
 * whole feature, not a faithful mirror of the old client-side gate, and the
 * comment that used to sit here arguing otherwise was wrong.
 *
 * For a caller who does not own the wedding the flag is IGNORED rather than
 * rejected: erroring would confirm to an attacker that the slug exists and
 * is password-protected. Ignoring makes the response identical to one where
 * the flag was never sent.
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
import { pickGuestSafeFields, verifyWeddingPassword, websiteGateIsOn } from './_lib/guestSafeWedding.js';
import { pickGuestSafeCustomGift, pickGuestSafeRegistryProduct } from './_lib/guestSafeRegistry.js';
import { verifyBase44User } from './_lib/auth.js';

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

  // POST exists ONLY so the password never has to travel in the URL. See the
  // transport note in the header comment; everything else about the two
  // methods is identical.
  if (req.method !== 'GET' && req.method !== 'POST') {
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

  // Inputs come from the body on POST, the query string on GET. The password
  // is accepted ONLY from a POST body — never from the query string, which
  // would put the credential into Vercel access logs, browser history, the
  // Referer header, and (because Vercel's default Cache-Control for functions
  // is `public, max-age=0, must-revalidate`) into shared-cache keys.
  const src = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const slug = sanitizeString(src.slug || '');
  const candidatePassword = req.method === 'POST' && typeof src.password === 'string' ? src.password : '';
  // NOTE: requesting preview is not the same as being granted it. This flag
  // only says the caller ASKED; whether it is honored is decided below,
  // after the wedding is resolved, by previewGranted.
  // Not a secret, so it reads from whichever source this method uses. Accepts
  // the boolean true as well as the string 'true' because a JSON body can
  // carry a real boolean where a query string cannot.
  const previewRequested = src.preview === 'true' || src.preview === true;

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

    const { on: passwordProtected, failedOpen } = websiteGateIsOn(wedding);
    if (failedOpen) {
      // Unreachable through the UI — useWebsitePasswordGate never persists
      // websitePasswordEnabled without a credential. Loud because reaching it
      // means something wrote the row outside that path, and the site is
      // serving publicly while its owner believes it is locked.
      console.error(`[wedding-by-slug] websitePasswordEnabled is true but no credential is stored for slug "${slug}" — gate FAILED OPEN, site served publicly. See scratchpad/DECISION-LOG.md.`);
    }

    // The preview flag bypasses the password gate, so it is honored ONLY for
    // an authenticated caller who owns this wedding. For anyone else the flag
    // is ignored entirely — not rejected with an error, which would tell an
    // attacker the slug exists and is protected; simply treated as absent, so
    // the gate behaves exactly as it would without it.
    //
    // Only resolve the caller when the flag is actually present AND would
    // change the outcome: verifyBase44User costs a round-trip to Base44, and
    // the ordinary anonymous guest path must not pay it.
    let previewGranted = false;
    if (previewRequested && passwordProtected) {
      const caller = await verifyBase44User(req);
      previewGranted = !!caller && caller.id === wedding.created_by_id;
      if (!previewGranted) {
        console.warn(`[wedding-by-slug] preview flag ignored for slug "${slug}" — ${caller ? `caller ${caller.id} does not own this wedding` : 'unauthenticated caller'}`);
      }
    } else if (previewRequested) {
      // Not password-protected: nothing to bypass, so ownership is irrelevant.
      previewGranted = true;
    }

    if (passwordProtected && !previewGranted && !verifyWeddingPassword(wedding, candidatePassword)) {
      return res.status(200).json({ passwordProtected: true });
    }

    const registry = await fetchGuestSafeRegistry(wedding.created_by_id);

    return res.status(200).json({ ...pickGuestSafeFields(wedding), ...registry });
  } catch (err) {
    console.error('[wedding-by-slug] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
