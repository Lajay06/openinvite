/**
 * GET /api/my-guests?sort=<field>
 *
 * Authenticated (the couple's own Base44 session). Returns the caller's own
 * Guest rows.
 *
 * WHY THIS EXISTS — Guest family, Track A.
 *
 * `Guest.read` RLS is `null`, so any authenticated account can list every
 * Guest row in the app. Verified, not inferred: an unrelated test account
 * reads 206 rows carrying name, email and phone. Scoping that read is not
 * available to us — six server readers use the admin key, and the anonymous
 * ones (a guest clicking an invitation link, a cron) have no caller session to
 * switch to, so an owner-scoped rule would answer them 200-with-empty-array
 * and break silently (gotcha #1). Encryption at rest is the only lever, and
 * encryption needs a server-side key the browser can never hold.
 *
 * So every read of Guest has to come through a server endpoint first. This is
 * that endpoint, shipped ALONE and with NO CRYPTO, so that if anything breaks
 * it is unambiguously the indirection rather than the encryption:
 *
 *   A (this PR) — every client read routes through here. Same rows, same
 *                 shape, same order. Nothing is encrypted yet.
 *   B           — the three PII-touching client writers move server-side, and
 *                 the forwarding-endpoint guard widens to PROTECTED_FIELDS.
 *   C           — declare encrypted_guest_pii, dual-write, prefer the blob.
 *   migration   — 206 rows, per-row write-verify-null.
 *   D           — drop the dual-write and the plaintext fallback.
 *
 * Reads use the CALLER's own forwarded bearer token, never the admin key. With
 * `Guest.read` open the admin key would work — that is exactly the problem —
 * but using it here would mean this endpoint could serve any account's rows if
 * the ownership filter were ever wrong. The caller's token makes Base44 itself
 * the second check, and it is what keeps working unchanged if `Guest.read` is
 * ever scoped later.
 *
 * POST   /api/my-guests            { fields }            -> 200 { guest }
 * PUT    /api/my-guests?id=<id>     { fields }            -> 200 { guest }
 * DELETE /api/my-guests?id=<id>                           -> 200 { ok: true }
 *
 * The write half is Track B2. The couple's browser wrote Guest rows directly
 * until now; from Track C those writes have to produce an AES blob, which
 * needs a server-only key. Moving them BEFORE any encryption exists is the
 * same ordering Track E used, and for the same reason: encrypt a field while a
 * browser still writes it and the browser silently overwrites ciphertext with
 * plaintext.
 *
 * There is no crypto in this PR. Writes store exactly what the browser stored.
 *
 * PII IS ALLOWED HERE, unlike the collaborator passthrough. Writing name,
 * email and dietary requirements is this endpoint's entire job — it is the
 * path that will produce the blob in C. Only DERIVED fields are refused: the
 * six token fields and the blob itself, which a caller must never be able to
 * forge. See api/_lib/guestProtectedFields.js for why those are two different
 * lists rather than one.
 *
 * Response: 200 { guests: [...] }   — is_test rows excluded, as getMyRecords did
 *        or 401 { error: 'Unauthorized' }
 *        or 404 { error: 'Guest not found' }   — also returned for a row the
 *             caller does not own, so the response cannot distinguish "not
 *             yours" from "does not exist"
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { tokenPatch } from './_lib/rsvpTokenCrypto.js';
import { rejectIfTrialExpired } from './_lib/trialGuard.js';
import { stripDerivedFields } from './_lib/guestProtectedFields.js';
import { mergeGuestPii, buildGuestWriteFields } from './_lib/guestPii.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

/**
 * One fetch, no skip paging. Base44's skip pagination overlaps and omits —
 * 205 rows once returned 200 unique ids across pages, which read as data loss
 * and was not (gotcha #19). A guest list that silently drops rows is worse
 * than one that fails.
 */
const FETCH_LIMIT = 1000;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

/**
 * The RSVP token family. These are BEARER CAPABILITIES: whoever holds one can
 * answer as that guest. They have no business in an owner-side list response.
 *
 * api/my-guest-links.js is the one deliberate path by which a token reaches a
 * client -- rate limited, `Cache-Control: private, no-store`, and only for the
 * ids the caller asked for. This endpoint used to ship the ciphertext and hash
 * of every guest's token to the browser on every guest-list load, unread by any
 * client code, with none of that handling.
 *
 * What replaces it is a derived boolean. The browser learns WHETHER a token
 * exists, never what it is -- which is all the backfill sweep needs in order to
 * know which guests to mint for.
 *
 * THE PLAINTEXT COLUMNS ARE STRIPPED TOO, and that is a correction. This list
 * first held only the ciphertext and hash, on the reasoning that E3 had nulled
 * the plaintext so "removing a null gains nothing". The column was not null:
 * tokenPatch() was still WRITING the token there on every mint (fixed in #540),
 * because E3 nulled the DATA and left the writer alone. Shipped as first
 * drafted, this strip would have removed the encrypted form and kept sending
 * the live one -- strictly worse than the leak it was opened to close.
 *
 * They stay on this list permanently even once the data is purged: a response
 * that omits a column cannot leak it if a writer ever reappears.
 *
 * Two client fallbacks still NAME the plaintext column -- SendInvitesModal
 * (`l.token || g.rsvp_link_id`) and EmailTemplates (`guests.find(g =>
 * g.rsvp_link_id)`). Both are correct with the field absent: the first falls
 * through to the minted token it already has, and the second takes its
 * placeholder branch, which is exactly what it was written for -- a sample
 * email must never carry a live RSVP capability.
 */
const TOKEN_COLUMNS = [
  'rsvp_link_id', 'rsvp_link_id_enc', 'rsvp_link_id_hash',
  'plus_one_rsvp_link_id', 'plus_one_rsvp_link_id_enc', 'plus_one_rsvp_link_id_hash',
];

function stripTokenColumns(guest) {
  if (!guest) return guest;
  const out = { ...guest, has_rsvp_token: !!guest.rsvp_link_id_enc };
  for (const f of TOKEN_COLUMNS) delete out[f];
  return out;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // A guest list is the couple's private data. Never let an intermediary
  // store it.
  res.setHeader('Cache-Control', 'private, no-store');

  const ip = getClientIp(req);
  // Generous: several dashboard pages load the guest list on mount.
  const { limited, remaining } = checkRateLimit(ip, 'my-guests', 120, 60_000);
  res.setHeader('X-RateLimit-Limit', '120');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Trial enforcement. GET is always allowed -- an expired couple keeps
  // full read access, and every export is a pure read. Mutating methods
  // are rejected with a distinct code the client maps to the upgrade
  // prompt. Expiry is computed here from the User record, never trusted
  // from the request. See api/_lib/trialGuard.js for the scope limits.
  if (rejectIfTrialExpired(req, res, caller)) return;
  const callerToken = (req.headers.authorization || '').slice(7);

  if (req.method !== 'GET') {
    return handleWrite(req, res, caller, callerToken);
  }

  // Passed straight through to Base44's own sort, exactly as
  // base44.entities.Guest.filter(query, sort) did.
  const sort = sanitizeString(req.query?.sort || '');

  try {
    const query = encodeURIComponent(JSON.stringify({ created_by_id: caller.id }));
    const sortParam = sort ? `&sort=${encodeURIComponent(sort)}` : '';
    const payload = await fetch(
      `${BASE44_API}/apps/${BASE44_APP_ID}/entities/Guest?q=${query}${sortParam}&limit=${FETCH_LIMIT}`,
      { headers: { Authorization: `Bearer ${callerToken}` } },
    );
    if (!payload.ok) {
      const body = await payload.text().catch(() => '');
      throw new Error(`Base44 Guest read failed (${payload.status}): ${body.slice(0, 200)}`);
    }
    const rows = unwrapList(await payload.json());

    if (rows.length >= FETCH_LIMIT) {
      // Loud rather than silently truncated: a couple with 1000+ guests would
      // otherwise see a short list with no indication anything was missing.
      console.error(`[my-guests] caller ${caller.id} hit the ${FETCH_LIMIT}-row fetch limit — the list is TRUNCATED. Raise FETCH_LIMIT.`);
    }

    // Ownership is filtered by the query and enforced again by Base44 against
    // the caller's own token; is_test is excluded here exactly as
    // getMyRecords did, so test-harness rows can never surface in product UI.
    const guests = rows
      .filter(g => g.created_by_id === caller.id && !g.is_test)
      // Blob preferred, plaintext fallback for rows the migration has not
      // reached. This is THE chokepoint every client read passes through
      // (Track A), so resolving PII here means no consumer knows encryption
      // happened — and it needs no change at Track D, when the fallback simply
      // stops having anything to fall back to.
      .map(mergeGuestPii)
      .map(stripTokenColumns);

    return res.status(200).json({ guests });
  } catch (err) {
    console.error('[my-guests] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}

/**
 * Confirms the target row belongs to the caller before any update or delete.
 *
 * Belt and braces on purpose. The write below also uses the caller's own
 * token, so Base44's owner-scoped update rule is a second, independent check —
 * but an endpoint that accepts an arbitrary row id from the client should
 * never rely on a single gate, and `Guest.read` being open means an admin-key
 * read here would happily return someone else's row.
 */
async function assertOwned(guestId, caller, callerToken) {
  const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Guest/${guestId}`, {
    headers: { Authorization: `Bearer ${callerToken}` },
  });
  if (!res.ok) return null;
  const row = await res.json().catch(() => null);
  return row && row.created_by_id === caller.id ? row : null;
}

async function handleWrite(req, res, caller, callerToken) {
  const guestId = typeof req.query?.id === 'string' ? req.query.id : '';
  const raw = req.body?.fields && typeof req.body.fields === 'object' ? req.body.fields : null;

  const { fields, stripped } = stripDerivedFields(raw || {});
  if (stripped.length > 0) {
    console.warn(`[my-guests] refused derived field(s) from caller ${caller.id}: ${stripped.join(', ')}`);
  }

  try {
    if (req.method === 'POST') {
      if (!raw) return res.status(400).json({ error: 'fields is required.' });
      // A new guest has no current PII, so the blob is built from the payload
      // alone.
      // MINT THE RSVP TOKEN AT CREATION, not at invite-send.
      //
      // Tokens used to be minted lazily by api/my-guest-links.js, and only for
      // the guest ids that endpoint was ASKED for -- every caller passes a
      // narrow selection (a send list, checked rows, one guest), never the whole
      // list. So a guest added and never invited had no token, and
      // api/rsvp-link-request.js requires `rsvp_link_id_enc` to match: that
      // guest received the neutral `{sent:true}` response and no email,
      // indistinguishable from not being on the list. Opening the guest list did
      // NOT backfill them.
      //
      // Minting HERE rather than in the UI covers every client path through this
      // endpoint at once -- the add flow, CSV import, and Ava's create_guest
      // tool -- and cannot be missed by a call site added later. It costs no
      // extra write: the fields ride in the create payload rather than a
      // follow-up PUT.
      //
      // Plus-one tokens stay lazy. my-guest-links only mints one when the guest
      // actually has a plus_one_email, because a token nobody will be sent is
      // just more capability to leak, and a new guest has no plus-one contact.
      const created = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${callerToken}` },
        body: JSON.stringify({
          ...buildGuestWriteFields({}, fields),
          ...tokenPatch(crypto.randomUUID(), false),
        }),
      });
      if (!created.ok) {
        const body = await created.text().catch(() => '');
        throw new Error(`Base44 Guest create failed (${created.status}): ${body.slice(0, 200)}`);
      }
      return res.status(200).json({ guest: stripTokenColumns(mergeGuestPii(await created.json())) });
    }

    if (!guestId) return res.status(400).json({ error: 'id is required.' });
    // 404 for both "missing" and "not yours" — no existence oracle. The row is
    // kept: PUT needs it to rebuild the blob from current values.
    const owned = await assertOwned(guestId, caller, callerToken);
    if (!owned) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    if (req.method === 'PUT') {
      if (!raw) return res.status(400).json({ error: 'fields is required.' });
      // Rebuild the blob from the row's CURRENT resolved PII plus this patch.
      // Building it from the patch alone would blank the nine fields the
      // caller did not send — a couple editing a meal preference would watch
      // that guest's name and email vanish.
      const body = buildGuestWriteFields(mergeGuestPii(owned), fields);
      const updated = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Guest/${guestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${callerToken}` },
        body: JSON.stringify(body),
      });
      if (!updated.ok) {
        const body = await updated.text().catch(() => '');
        throw new Error(`Base44 Guest update failed (${updated.status}): ${body.slice(0, 200)}`);
      }
      return res.status(200).json({ guest: stripTokenColumns(mergeGuestPii(await updated.json())) });
    }

    // DELETE
    const deleted = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Guest/${guestId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${callerToken}` },
    });
    if (!deleted.ok) {
      const body = await deleted.text().catch(() => '');
      throw new Error(`Base44 Guest delete failed (${deleted.status}): ${body.slice(0, 200)}`);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[my-guests] write error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
