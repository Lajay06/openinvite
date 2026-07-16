/**
 * GET /api/collaborator-budget?ownerUserId=<id>
 *
 * Real, server-enforced Budget access for an accepted collaborator — read
 * only. Same permission mechanism as collaborator-guests.js (CollaboratorGrant,
 * see api/_lib/collaboratorAuth.js), checked against the 'Budget' page
 * before touching any data. A collaborator with no Budget permission at
 * all gets a 403 here — before any Base44 call is even made — and would
 * be denied a second time regardless, since Budget.read is also
 * owner-scoped and the admin key can't satisfy that for a non-owner
 * either. Write operations aren't offered here at all: Budget.update is
 * owner-scoped the same way Guest's is, so an admin-key write would 403
 * even for a collaborator legitimately granted 'edit' (same limitation
 * documented in collaborator-guests.js).
 *
 * Query always includes ownerUserId — the wedding owner's Base44 User.id.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { getCollaborationFor, hasPagePermission } from './_lib/collaboratorAuth.js';
import { excludeTestRecords } from './_lib/productData.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;
const PAGE = 'Budget';

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function adminFetch(method, path) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'collaborator-budget', 60, 60_000);
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
    console.error('[collaborator-budget] BASE44_ADMIN_KEY env var is not set');
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
    if (!hasPagePermission(collaboration.permissions, PAGE, 'view')) {
      return res.status(403).json({ error: 'You do not have permission to view the budget for this wedding.' });
    }

    const query = encodeURIComponent(JSON.stringify({ created_by_id: ownerUserId }));
    const rows = unwrapList(await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/Budget?q=${query}`));

    return res.status(200).json({ budget: excludeTestRecords(rows) });
  } catch (err) {
    console.error('[collaborator-budget] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
