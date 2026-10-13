/**
 * GET /api/collaborator-context?ownerUserId=<id>
 *
 * Resolves what a collaborator can see for the real dashboard shell: their
 * granted permissions and the couple's display name. Same permission
 * mechanism as every other collaborator-*.js endpoint (CollaboratorGrant,
 * see api/_lib/collaboratorAuth.js) — a caller who isn't an accepted
 * collaborator on this owner gets a 403 here exactly like
 * collaborator-guests.js, never a client-side-only decision. The sidebar
 * and per-page access checks are convenience built on top of this same
 * response, not a separate source of truth.
 *
 * Response: 200 { permissions, coupleNames, collaboratorEmail }
 *        or 403 { error } if not an accepted collaborator for this owner
 *
 * WITHOUT ownerUserId it answers "which wedding do I help with" (owner ruling
 * 2026-10-13), for ChoosePlan's routing of a collaborator-only account that
 * signs in without the invite link, and for the Account page's one line:
 * 200 { ownerUserId, permissions } for the most recently accepted wedding
 * whose latest event is a grant (api/_lib/collaboratorAuth.js
 * mostRecentCollaboration), or 200 { ownerUserId: null } when every grant is
 * revoked or there are none. It reads nothing else and writes nothing.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { getCollaborationFor, mostRecentCollaboration } from './_lib/collaboratorAuth.js';
import { excludeTestRecords } from './_lib/productData.js';

import { coupleDisplayName } from './_lib/coupleNames.js';
import { TOO_MANY_TRIES, DID_NOT_GO_THROUGH } from './_lib/calmErrors.js';
const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'collaborator-context', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: TOO_MANY_TRIES });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[collaborator-context] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const ownerUserId = sanitizeString(req.query?.ownerUserId || '');
  if (!ownerUserId) {
    try {
      const mine = await mostRecentCollaboration(caller.id, BASE44_ADMIN_KEY);
      return res.status(200).json(mine ? { ownerUserId: mine.ownerUserId, permissions: mine.permissions } : { ownerUserId: null });
    } catch (err) {
      console.error('[collaborator-context] Error:', err.message);
      return res.status(500).json({ error: DID_NOT_GO_THROUGH });
    }
  }

  try {
    const collaboration = await getCollaborationFor(caller.id, ownerUserId, BASE44_ADMIN_KEY);
    if (!collaboration) {
      return res.status(403).json({ error: 'You are not an accepted collaborator on this wedding.' });
    }

    const weddingQuery = encodeURIComponent(JSON.stringify({ created_by_id: ownerUserId }));
    const weddingRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`, {
      headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    });
    const weddings = weddingRes.ok ? excludeTestRecords(unwrapList(await weddingRes.json())) : [];
    const wedding = weddings.length > 0
      ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;
    const coupleNames = coupleDisplayName(wedding);

    return res.status(200).json({
      permissions: collaboration.permissions,
      coupleNames,
      collaboratorEmail: caller.email,
    });
  } catch (err) {
    console.error('[collaborator-context] Error:', err.message);
    return res.status(500).json({ error: DID_NOT_GO_THROUGH });
  }
}
