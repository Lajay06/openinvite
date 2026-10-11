/**
 * api/_lib/collaboratorInvites.js
 *
 * Which collaborator invite link is the live one. The link itself is a signed
 * payload (collaboratorInviteToken.js), so on its own every link ever sent for
 * an owner and email pair verifies, and a resend could not kill the old one.
 * CollaboratorInvite records each send as hashed ids only (create null, read
 * null, update and delete by the creator, the CollaboratorGrant shape), and a
 * link is honored only when its hash is the newest row for its pair and that
 * row is still 'sent'.
 *
 * Writes use the OWNER's own token, so the owner is the creator and is the only
 * one who can later mark a row superseded or revoked. Reads go through any
 * token, since read is null; the accept and lookup endpoints use the admin key.
 * Rows with is_test set are never read here.
 *
 * Every hash is hashId from collaboratorAuth.js: HMAC-SHA256 under
 * COLLAB_HASH_KEY, hex, the same construction as CollaboratorGrant.
 */

import { hashId } from './collaboratorAuth.js';
import { INVITE_TTL_MS } from './collaboratorInviteToken.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function base44(method, path, token, body) {
  const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 ${method} CollaboratorInvite failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

/** Newest first. A tie keeps the later row in list order, so the result is stable. */
function newestFirst(rows) {
  return rows
    .map((r, i) => ({ r, i, t: new Date(r.created_date).getTime() || 0 }))
    .sort((a, b) => (b.t - a.t) || (b.i - a.i))
    .map(x => x.r);
}

/** Every non-test invite row for one owner and email pair, newest first, hashes re-checked. */
export async function listInvitesForPair(ownerUserId, email, token) {
  const ownerHash = hashId(ownerUserId);
  const emailHash = hashId(normalizeEmail(email));
  if (!ownerHash || !emailHash) return [];
  const query = encodeURIComponent(JSON.stringify({ owner_user_id_hash: ownerHash, collaborator_email_hash: emailHash }));
  const rows = unwrapList(await base44('GET', `/entities/CollaboratorInvite?q=${query}`, token));
  return newestFirst(rows.filter(r => (
    r.owner_user_id_hash === ownerHash && r.collaborator_email_hash === emailHash && !r.is_test
  )));
}

/**
 * Record a send. The new row is written first, and only then are the older
 * 'sent' rows marked superseded: if that second step fails, the new row is
 * still the newest, so the old links are refused all the same. Throws if the
 * new row cannot be written, so the caller does not email a link that would
 * be refused.
 */
export async function recordInviteSend({ ownerUserId, email, weddingId, signedInvite, iat, ownerToken }) {
  const prior = await listInvitesForPair(ownerUserId, email, ownerToken);
  const created = await base44('POST', '/entities/CollaboratorInvite', ownerToken, {
    // A wedding record should always exist by the time a couple invites
    // anyone; if it does not, the owner id stands in so the field (required)
    // still holds a hash and never a raw value.
    wedding_id_hash: hashId(weddingId || ownerUserId),
    owner_user_id_hash: hashId(ownerUserId),
    collaborator_email_hash: hashId(normalizeEmail(email)),
    invite_token_hash: hashId(signedInvite),
    status: 'sent',
    expires_at: new Date(iat + INVITE_TTL_MS).toISOString(),
    resend_count: prior.length,
  });
  await markPairStatus(prior, 'superseded', ownerToken);
  return created;
}

/** Mark every 'sent' row in `rows` with `status`, using the creator's token. Best effort, never throws. */
async function markPairStatus(rows, status, ownerToken) {
  let marked = 0;
  for (const r of rows) {
    if (r.status !== 'sent' || !r.id) continue;
    try {
      await base44('PUT', `/entities/CollaboratorInvite/${r.id}`, ownerToken, { status });
      marked += 1;
    } catch (err) {
      console.error(`[collaboratorInvites] could not mark ${status}:`, err.message);
    }
  }
  return marked;
}

/**
 * Mark a pending invite revoked, so removing someone who never accepted kills
 * their link too. Not best effort at the decision level: the caller treats a
 * failure to READ as a failure, because a removal that silently left a live
 * link would be the bug this file exists for.
 */
export async function revokeInvitesForPair(ownerUserId, email, ownerToken) {
  const rows = await listInvitesForPair(ownerUserId, email, ownerToken);
  if (rows.length === 0) return 0;
  // The newest row decides, so write a revoke on it even if an older
  // supersede was missed.
  const newest = rows[0];
  if (newest.status === 'sent') {
    await base44('PUT', `/entities/CollaboratorInvite/${newest.id}`, ownerToken, { status: 'revoked' });
  }
  return 1 + await markPairStatus(rows.slice(1), 'revoked', ownerToken);
}

/**
 * Is this verified invite the live link for its pair?
 *   'current'  the newest row is this token's hash and is still 'sent'
 *   'legacy'   no row exists for the pair: sent before this file shipped,
 *              honored until its 7 days run out like any other link
 *   'stale'    anything else: superseded by a resend, revoked, or a link
 *              whose hash is not the newest row
 */
export async function inviteStanding(payload, signedInvite, token) {
  const rows = await listInvitesForPair(payload.ownerUserId, payload.email, token);
  if (rows.length === 0) return 'legacy';
  const newest = rows[0];
  return newest.invite_token_hash === hashId(signedInvite) && newest.status === 'sent' ? 'current' : 'stale';
}
