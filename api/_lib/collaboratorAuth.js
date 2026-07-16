/**
 * api/_lib/collaboratorAuth.js
 *
 * Shared server-side resolver for "what is this authenticated user allowed
 * to do, on whose wedding, as a collaborator." Collaborator's own RLS scopes
 * read/update to created_by_id === the OWNER (the couple who sent the
 * invite) — a collaborator's own bearer token can never read or write a
 * Collaborator record at all, by design (same reasoning as every other
 * admin-key-mediated entity in this app: PollVote, RsvpResponse, etc.). So
 * every collaborator-facing endpoint must:
 *   1. verify the caller's own bearer token (verifyBase44User),
 *   2. resolve their accepted Collaborator record(s) via the admin key,
 *   3. check the specific page+level permission being requested,
 *   4. only then perform the actual owner-scoped read/write, ALSO via the
 *      admin key, scoped to the owner's created_by_id — never trusting the
 *      collaborator's own session to reach the owner's data directly.
 *
 * This is real, server-enforced permission checking — not menu-hiding. A
 * request that skips the UI entirely and hits a collaborator-proxy endpoint
 * straight is checked exactly the same way.
 */

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

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
 * Every accepted Collaborator record for a given user, across every couple
 * who has invited them — a person can collaborate on more than one wedding.
 *
 * @returns {Promise<Array<{ collaboratorId: string, ownerUserId: string, permissions: object }>>}
 */
export async function getAcceptedCollaborations(userId, adminKey) {
  const query = encodeURIComponent(JSON.stringify({ accepted_user_id: userId, status: 'accepted' }));
  const rows = unwrapList(await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/Collaborator?q=${query}`, adminKey));
  return rows.map(r => ({ collaboratorId: r.id, ownerUserId: r.created_by_id, permissions: r.permissions || {} }));
}

/**
 * This user's accepted access to ONE specific owner's wedding, or null if
 * they aren't an accepted collaborator for that owner at all.
 */
export async function getCollaborationFor(userId, ownerUserId, adminKey) {
  const collaborations = await getAcceptedCollaborations(userId, adminKey);
  return collaborations.find(c => c.ownerUserId === ownerUserId) || null;
}

/** True if `permissions` grants at least `level` ('view' or 'edit') on `page`. */
export function hasPagePermission(permissions, page, level) {
  const p = permissions?.[page];
  if (!p) return false;
  return level === 'edit' ? !!p.edit : !!(p.view || p.edit);
}
