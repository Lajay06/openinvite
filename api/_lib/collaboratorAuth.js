/**
 * api/_lib/collaboratorAuth.js
 *
 * Shared server-side resolver for "what is this authenticated user allowed
 * to do, on whose wedding, as a collaborator." Originally tried to resolve
 * this straight off the Collaborator record via the admin key — confirmed
 * empirically that's impossible (a scoped read returns 200/[], a scoped
 * update returns a flat 403; the admin key has no session identity to
 * satisfy Collaborator's owner-scoped {{user.id}} RLS). Collaborator's own
 * RLS is untouched (approved design) — this resolver goes through
 * CollaboratorGrant instead, a small, purpose-built, append-only entity
 * (create:null/read:null, same shape as RsvpResponse/PollVote) written by
 * the collaborator's own bearer token at accept time (api/collaborator-accept.js),
 * never by the admin key. Ids are stored as HMAC digests (hashId) — an
 * unscoped list of this entity (anyone, any API token, since read:null)
 * yields opaque hash pairs, never a real user id, and forging a row that
 * targets a real owner/collaborator pair requires knowing BASE44_ADMIN_KEY.
 *
 * This is real, server-enforced permission checking — not menu-hiding. A
 * request that skips the UI entirely and hits a collaborator-proxy endpoint
 * straight is checked exactly the same way.
 */

import crypto from 'crypto';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const HASH_KEY = process.env.BASE44_ADMIN_KEY || '';

/** One-way HMAC-SHA256 digest, keyed with BASE44_ADMIN_KEY — never reversible without that secret. */
export function hashId(rawValue) {
  if (!rawValue) return null;
  return crypto.createHmac('sha256', HASH_KEY).update(String(rawValue)).digest('hex');
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function adminFetch(method, path, adminKey, body) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * This user's current access to ONE specific owner's wedding — the latest
 * CollaboratorGrant event for (ownerUserId, userId), or null if there is
 * none, or the most recent event was a revoke.
 *
 * @returns {Promise<{permissions: object}|null>}
 */
export async function getCollaborationFor(userId, ownerUserId, adminKey) {
  const ownerHash = hashId(ownerUserId);
  const collabHash = hashId(userId);
  const query = encodeURIComponent(JSON.stringify({ owner_user_id_hash: ownerHash, collaborator_user_id_hash: collabHash }));
  const rows = unwrapList(await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/CollaboratorGrant?q=${query}`, adminKey));
  // Defense in depth: re-check both hashes match exactly, don't just trust the query filter.
  const relevant = rows.filter(r => r.owner_user_id_hash === ownerHash && r.collaborator_user_id_hash === collabHash);

  const latest = relevant.reduce((best, r) => (
    !best || new Date(r.created_date) > new Date(best.created_date) ? r : best
  ), null);

  if (!latest || latest.event_type !== 'grant') return null;
  return { permissions: latest.permissions || {} };
}

/** True if `permissions` grants at least `level` ('view' or 'edit') on `page`. */
export function hasPagePermission(permissions, page, level) {
  const p = permissions?.[page];
  if (!p) return false;
  return level === 'edit' ? !!p.edit : !!(p.view || p.edit);
}
