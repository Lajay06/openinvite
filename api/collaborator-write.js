/**
 * POST /api/collaborator-write
 *   body: { ownerUserId, page, action: 'update' | 'delete', id, data? }
 *
 * The one write path for a collaborator, generic across the pages on
 * COLLABORATOR_EDIT_PAGES (src/lib/collaboratorPageMap.js): Schedule now,
 * Moodboard with its own PR. Item 7's writes, owner rulings 2026-10-12 and
 * 2026-10-13, new lane C file by ruling.
 *
 * Every entity a collaborator can change has owner-scoped update and delete,
 * so the admin key cannot write them. The write happens inside
 * base44/functions/collaboratorWrite, which checks the grant again itself,
 * writes only the page's allowlisted fields, and only to the owner's rows.
 * This endpoint checks the grant first (edit on the page, the page on the
 * edit list), then forwards the collaborator's own token with the shared
 * secret header. It never trusts the body for who is asking.
 *
 * NOT CONFIGURED FAILS CLOSED: without COLLAB_FN_SECRET or a valid
 * COLLAB_HASH_KEY, as on Preview, nothing is called and the answer is 503.
 * A read can fail calm with empty lists; a write must say it did not save.
 *
 * Response: 200 { ok: true }
 *        or 4xx/5xx { error: 'That did not save. Try again.' } for anything else,
 *        with the real reason in the log and never an id.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { getCollaborationFor, hasPagePermission } from './_lib/collaboratorAuth.js';
import { collabReadsConfigured } from './collaborator-data.js';
import { COLLABORATOR_EDIT_PAGES } from '../src/lib/collaboratorPageMap.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
// No create (owner ruling 2026-10-13): a hosted function cannot stamp a new row
// as the owner, so a collaborator changes and removes, never adds.
const ACTIONS = ['update', 'delete'];

export const SAVE_FAILED = 'That did not save. Try again.';
export const WRITES_NOT_CONFIGURED = 'collaborator writes not configured';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'collaborator-write', 30, 60_000);
  res.setHeader('X-RateLimit-Limit', '30');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: SAVE_FAILED });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const body = req.body || {};
  const ownerUserId = sanitizeString(body.ownerUserId || '');
  const page = typeof body.page === 'string' ? body.page : '';
  const action = typeof body.action === 'string' ? body.action : '';
  const id = typeof body.id === 'string' ? sanitizeString(body.id) : '';
  if (!ownerUserId || !COLLABORATOR_EDIT_PAGES.includes(page) || !ACTIONS.includes(action) || !id) {
    return res.status(400).json({ error: SAVE_FAILED });
  }

  if (!collabReadsConfigured()) {
    console.log(WRITES_NOT_CONFIGURED);
    return res.status(503).json({ error: SAVE_FAILED });
  }

  try {
    const collaboration = await getCollaborationFor(caller.id, ownerUserId, process.env.BASE44_ADMIN_KEY);
    if (!collaboration || !hasPagePermission(collaboration.permissions, page, 'edit')) {
      return res.status(403).json({ error: SAVE_FAILED });
    }

    const callerToken = String(req.headers.authorization || '').replace(/^Bearer /, '');
    const fnRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/functions/collaboratorWrite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${callerToken}`,
        'X-Collab-Fn-Secret': process.env.COLLAB_FN_SECRET,
      },
      body: JSON.stringify({ ownerUserId, page, action, ...(id ? { id } : {}), data: body.data || {} }),
    });
    if (!fnRes.ok) {
      console.error(`[collaborator-write] write failed (${fnRes.status}) on ${page} ${action}`);
      return res.status(fnRes.status === 404 || fnRes.status === 403 ? fnRes.status : 502).json({ error: SAVE_FAILED });
    }
    return res.status(200).json({ ok: true });
  } catch {
    console.error(`[collaborator-write] write failed on ${page} ${action}`);
    return res.status(500).json({ error: SAVE_FAILED });
  }
}
