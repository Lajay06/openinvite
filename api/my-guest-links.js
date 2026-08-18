/**
 * POST /api/my-guest-links
 *
 * Authenticated (the couple's own Base44 session). One place that mints and
 * hands back RSVP links for the caller's OWN guests.
 *
 * WHY THIS EXISTS — Track E, step 1.
 *
 * `Guest.rsvp_link_id` is a bearer capability: `api/_lib/rsvpAuth.js`'s
 * resolveGuestByToken treats whoever presents it as that guest, so anyone
 * holding one can read and submit that guest's RSVP. It is stored in plaintext
 * in a table whose `read` RLS is `null`, which means any authenticated account
 * can list every guest row in the app and harvest every outstanding invitation
 * link. Confirmed live, not inferred: an unrelated test account reads 206 rows
 * belonging to other owners.
 *
 * The fix is to stop storing the raw token — hash it for lookup and encrypt it
 * for recovery (E2/E3). Both transforms need a server-only key, so the browser
 * can no longer mint a token with crypto.randomUUID() and write it directly the
 * way five surfaces do today. This endpoint is that move, made FIRST and on its
 * own so it can be verified in isolation:
 *
 *   E1 (this PR) — every mint and every raw read comes through here. Storage is
 *                  UNCHANGED plaintext, so nothing about behaviour changes and
 *                  any breakage is unambiguously the indirection, not crypto.
 *   E2           — declare *_hash / *_enc, dual-write, lookup by hash with a
 *                  plaintext fallback.
 *   migration    — backfill the 202 existing tokens.
 *   E3           — stop writing plaintext, null the columns.
 *
 * OWNERSHIP IS ENFORCED HERE, NOT ASSUMED. Guest reads and writes use the
 * CALLER's own forwarded bearer token, never the admin key, so Base44's
 * owner-scoped update RLS is the backstop even if the explicit created_by_id
 * check below were wrong. Belt and braces, deliberately: this endpoint hands
 * out capabilities, so a caller must never be able to name someone else's
 * guest id and receive their link.
 *
 * The raw token is returned alongside the URL because not every caller wants
 * an /rsvp/ link — GamesManager builds /games/<token>/<gameId>. That is not a
 * weakening: the owner can already copy a link, and the link contains the
 * token. What changes in E2/E3 is that the token stops being READABLE FROM THE
 * TABLE by anyone who can list it; handing it to the authenticated owner who
 * is entitled to it was always the point.
 *
 * Body: { guestIds: string[], includePlusOne?: boolean }
 * Response: 200 { links: { [guestId]: { token, rsvpUrl, plusOneToken?, plusOneRsvpUrl? } } }
 *        or 401 { error: 'Unauthorized' }
 *        or 400 { error: ... }
 */

import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { decryptToken, tokenPatch } from './_lib/rsvpTokenCrypto.js';
import { mergeGuestPii } from './_lib/guestPii.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

/** Cap per request — the bulk "copy links" path can select a whole guest list. */
const MAX_GUESTS = 500;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

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

/**
 * The guest site is served from the same origin as the dashboard, so the
 * request's own origin is the correct base. Falls back to the configured app
 * URL when a client sends no Origin header.
 */
function resolveBaseUrl(origin) {
  if (typeof origin === 'string' && /^https?:\/\/[^\s/]+$/.test(origin)) return origin;
  return process.env.VITE_APP_URL || 'https://www.openinvite.com.au';
}

/**
 * Mint a token. Kept in one place so E2 has a single site to change when the
 * stored form becomes hash + ciphertext.
 *
 * crypto.randomUUID() matches what the five client call sites minted before
 * this endpoint existed, so tokens issued either side of this PR are
 * indistinguishable — which is what makes E1 a pure refactor.
 */
function mintToken() {
  return crypto.randomUUID();
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Links are capabilities. Never let an intermediary store this response.
  res.setHeader('Cache-Control', 'private, no-store');

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'my-guest-links', 30, 60_000);
  res.setHeader('X-RateLimit-Limit', '30');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const callerToken = (req.headers.authorization || '').slice(7);
  const guestIds = Array.isArray(req.body?.guestIds) ? req.body.guestIds.filter(id => typeof id === 'string') : [];
  const includePlusOne = req.body?.includePlusOne === true;

  if (guestIds.length === 0) {
    return res.status(400).json({ error: 'guestIds is required.' });
  }
  if (guestIds.length > MAX_GUESTS) {
    return res.status(400).json({ error: `Too many guests in one request (max ${MAX_GUESTS}).` });
  }

  try {
    const baseUrl = resolveBaseUrl(req.headers.origin);

    // One read of the caller's own guests, then an in-memory lookup — rather
    // than one request per id, which for a 300-guest "copy links" would be 300
    // round trips.
    const query = encodeURIComponent(JSON.stringify({ created_by_id: caller.id }));
    const mine = unwrapList(await callerFetch('GET', `/apps/${BASE44_APP_ID}/entities/Guest?q=${query}&limit=1000`, callerToken));
    // Track D: plus_one_email gates plus-one token minting and lives in
    // encrypted_guest_pii — unmerged, no plus-one token would ever be minted
    // again, silently.
    const byId = new Map(mine.map(mergeGuestPii).map(g => [g.id, g]));

    const links = {};
    const writes = [];

    for (const id of guestIds) {
      const guest = byId.get(id);
      // Silently skipped, not errored: an id the caller does not own is either
      // a stale client cache or someone probing. Neither deserves a response
      // that distinguishes "not yours" from "does not exist".
      if (!guest || guest.created_by_id !== caller.id) continue;

      const patch = {};

      // RECOVERY ORDER: ciphertext first, plaintext second. During the mixed
      // window a row may have either; after the migration every row has the
      // ciphertext, and after E3 only the ciphertext. Reading _enc first means
      // this code needs no further change at E3.
      let token = decryptToken(guest.rsvp_link_id_enc) || guest.rsvp_link_id;
      if (!token) {
        token = mintToken();
        // Dual-write: plaintext + hash + ciphertext, together, always.
        Object.assign(patch, tokenPatch(token, false));
      }

      let plusOneToken = decryptToken(guest.plus_one_rsvp_link_id_enc) || guest.plus_one_rsvp_link_id;
      // Only minted when the guest actually has a plus-one to invite, matching
      // SendInvitesModal's existing `plus_one_email &&` condition — a token
      // nobody will ever be sent is just more capability to leak.
      if (includePlusOne && guest.plus_one_email && !plusOneToken) {
        plusOneToken = mintToken();
        Object.assign(patch, tokenPatch(plusOneToken, true));
      }

      if (Object.keys(patch).length > 0) {
        writes.push(callerFetch('PUT', `/apps/${BASE44_APP_ID}/entities/Guest/${guest.id}`, callerToken, patch));
      }

      links[id] = {
        token,
        rsvpUrl: `${baseUrl}/rsvp/${token}`,
        ...(plusOneToken ? { plusOneToken, plusOneRsvpUrl: `${baseUrl}/rsvp/${plusOneToken}` } : {}),
      };
    }

    // Awaited before responding: a caller that receives a URL and then reloads
    // must not race the write that made it resolvable.
    if (writes.length > 0) await Promise.all(writes);

    return res.status(200).json({ links });
  } catch (err) {
    console.error('[my-guest-links] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
