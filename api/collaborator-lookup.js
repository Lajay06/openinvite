/**
 * GET /api/collaborator-lookup?token=<invite_token>
 *
 * NOT YET FUNCTIONAL — verified empirically that Base44's admin key is
 * bound by Collaborator's owner-scoped read RLS ({created_by_id: user.id})
 * the same as any other caller, so it cannot read a Collaborator record by
 * invite_token at all (this always 404s right now). Fixing this needs a
 * deliberate RLS tradeoff (see the PR description) that requires explicit
 * sign-off before shipping — this file is otherwise complete and will work
 * once that's resolved.
 *
 * Public, unauthenticated — backs the accept page (src/pages/CollaboratorAccept.jsx)
 * before the invitee has signed in. Resolves the Collaborator by their
 * invite_token via the admin key (their own token doesn't exist yet), and
 * returns only what the accept page needs to render: the collaborator's own
 * name, the couple's name, the granted page permissions, and status. Never
 * the owner's user id or any other identifying data.
 *
 * Response: 200 { collaboratorName, coupleNames, permissions, status }
 *        or 404 { error: 'This invite has expired or is invalid.' }
 *
 * Required env var: BASE44_ADMIN_KEY.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';

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
  const { limited, remaining } = checkRateLimit(ip, 'collaborator-lookup', 30, 60_000);
  res.setHeader('X-RateLimit-Limit', '30');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const token = sanitizeString(req.query?.token || '');
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[collaborator-lookup] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const query = encodeURIComponent(JSON.stringify({ invite_token: token }));
    const collabRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Collaborator?q=${query}`, {
      headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    });
    const collaborators = collabRes.ok ? unwrapList(await collabRes.json()) : [];
    if (collaborators.length === 0) {
      return res.status(404).json({ error: 'This invite has expired or is invalid.' });
    }
    const collaborator = collaborators[0];

    const weddingQuery = encodeURIComponent(JSON.stringify({ created_by_id: collaborator.created_by_id }));
    const weddingRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`, {
      headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    });
    const weddings = weddingRes.ok ? unwrapList(await weddingRes.json()).filter(w => !w.is_test) : [];
    const wedding = weddings.length > 0
      ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;
    const coupleNames = wedding?.coupleNames || [wedding?.couple1Name, wedding?.couple2Name].filter(Boolean).join(' & ') || '';

    return res.status(200).json({
      collaboratorName: collaborator.name,
      coupleNames,
      permissions: collaborator.permissions || {},
      status: collaborator.status || 'pending',
    });
  } catch (err) {
    console.error('[collaborator-lookup] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
