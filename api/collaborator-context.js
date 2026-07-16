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
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { getCollaborationFor } from './_lib/collaboratorAuth.js';
import { excludeTestRecords } from './_lib/productData.js';

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
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
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
    return res.status(400).json({ error: 'ownerUserId is required' });
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
    const coupleNames = wedding?.coupleNames || [wedding?.couple1Name, wedding?.couple2Name].filter(Boolean).join(' & ') || '';

    return res.status(200).json({
      permissions: collaboration.permissions,
      coupleNames,
      collaboratorEmail: caller.email,
    });
  } catch (err) {
    console.error('[collaborator-context] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
