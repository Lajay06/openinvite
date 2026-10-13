/**
 * GET /api/collaborator-budget?ownerUserId=<id>
 *
 * Real, server-enforced Budget access for an accepted collaborator — read
 * only. Same permission mechanism as collaborator-guests.js (CollaboratorGrant,
 * see api/_lib/collaboratorAuth.js), checked against the 'Budget' page
 * before touching any data. A collaborator with no Budget permission at
 * all gets a 403 here, before any Base44 call is even made, and would be
 * denied a second time by the hosted function, which checks the grant again
 * itself. Write operations aren't offered here at all: Budget stays view only
 * (owner ruling 2026-10-12).
 *
 * Query always includes ownerUserId — the wedding owner's Base44 User.id.
 *
 * Item 7, PR 2: the admin key gets an empty list from Budget (owner-scoped
 * read), so the rows come through the hosted function, by readOwnerScoped in
 * collaborator-data.js. Not configured, nothing is read and the page gets an
 * empty budget, the calm empty state.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { getCollaborationFor, hasPagePermission } from './_lib/collaboratorAuth.js';
import { collabReadsConfigured, readOwnerScoped, NOT_CONFIGURED } from './collaborator-data.js';
import { TOO_MANY_TRIES, DID_NOT_GO_THROUGH } from './_lib/calmErrors.js';

const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;
const PAGE = 'Budget';

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
    return res.status(429).json({ error: TOO_MANY_TRIES });
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

  // Before the grant check, which needs COLLAB_HASH_KEY: nothing is read.
  if (!collabReadsConfigured()) {
    console.log(NOT_CONFIGURED);
    return res.status(200).json({ budget: [] });
  }

  try {
    const collaboration = await getCollaborationFor(caller.id, ownerUserId, BASE44_ADMIN_KEY);
    if (!collaboration) {
      return res.status(403).json({ error: 'You are not an accepted collaborator on this wedding.' });
    }
    if (!hasPagePermission(collaboration.permissions, PAGE, 'view')) {
      return res.status(403).json({ error: 'You do not have permission to view the budget for this wedding.' });
    }

    const callerToken = String(req.headers.authorization || '').replace(/^Bearer /, '');
    const { Budget: budget } = await readOwnerScoped({ callerToken, ownerUserId, page: PAGE, entities: ['Budget'] });

    return res.status(200).json({ budget });
  } catch (err) {
    console.error('[collaborator-budget] Error:', err.message);
    return res.status(500).json({ error: DID_NOT_GO_THROUGH });
  }
}
