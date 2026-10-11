/**
 * POST /api/collaborator-revoke
 *
 * Authenticated as the OWNER (their own bearer token, from CollaborateModal).
 * Removing a collaborator or changing their permissions used to touch only the
 * Collaborator record, which nothing on the server reads: access is decided by
 * the latest CollaboratorGrant event (api/_lib/collaboratorAuth.js), so a
 * removed collaborator kept access. This endpoint writes the event that
 * actually changes access, before the modal touches the Collaborator record.
 *
 * The owner never learns the collaborator's user id, so events are keyed the
 * only way the owner can key them: the owner hash comes from the verified
 * caller, never the body, and the email hash from the lowercased email. Every
 * distinct collaborator_user_id_hash found under that pair gets one new event.
 * The write uses the owner's own token (CollaboratorGrant create is null), and
 * the admin key is used only to derive hashes and list rows.
 *
 * Actions (body):
 *   { action: 'revoke', email }               one revoke event per grantee found
 *   { action: 'permissions', email, permissions }  one grant event with the new permissions
 *   { action: 'reconcile', emails }           revoke every grant under this owner whose
 *                                             latest event is a grant and whose email has
 *                                             no Collaborator record (the emails the modal
 *                                             just loaded), which catches collaborators
 *                                             removed before this endpoint existed
 *
 * No grant rows for an email means the invite is still pending: nothing is
 * written and the response says pending, so the modal resends the invite.
 *
 * Response: 200 { ok: true, written, pending } or 200 { ok: true, revoked }
 *        or 400/401/405/429/500 { error }
 */

import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { hashId, latestEvent, listGrantsForOwner } from './_lib/collaboratorAuth.js';
import { COLLABORATOR_PERMISSION_KEYS } from '../src/lib/collaboratorPageMap.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const MAX_RECONCILE_EMAILS = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  const email = value.trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 254 ? email : '';
}

/** Only known permission keys, and only booleans: nothing else from the body reaches a grant. */
function cleanPermissions(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of COLLABORATOR_PERMISSION_KEYS) {
    const p = raw[key];
    if (!p || typeof p !== 'object') continue;
    const edit = p.edit === true;
    const view = p.view === true || edit;
    out[key] = { view, edit };
  }
  return out;
}

async function writeEvent(ownerToken, row) {
  const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/CollaboratorGrant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ ...row, granted_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`CollaboratorGrant create failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

/** Rows grouped by collaborator, each reduced to the event that decides access. */
function latestByCollaborator(rows) {
  const groups = new Map();
  for (const r of rows) {
    if (!r.collaborator_user_id_hash) continue;
    if (!groups.has(r.collaborator_user_id_hash)) groups.set(r.collaborator_user_id_hash, []);
    groups.get(r.collaborator_user_id_hash).push(r);
  }
  return [...groups.values()].map(latestEvent);
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'collaborator-revoke', 30, 60_000);
  res.setHeader('X-RateLimit-Limit', '30');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const ownerToken = (req.headers.authorization || '').slice(7);

  const adminKey = process.env.BASE44_ADMIN_KEY;
  if (!adminKey) {
    console.error('[collaborator-revoke] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const action = req.body?.action;
  if (!['revoke', 'permissions', 'reconcile'].includes(action)) {
    return res.status(400).json({ error: 'Unknown action' });
  }

  const ownerHash = hashId(caller.id);

  try {
    if (action === 'reconcile') {
      const raw = Array.isArray(req.body?.emails) ? req.body.emails : null;
      if (!raw || raw.length > MAX_RECONCILE_EMAILS) {
        return res.status(400).json({ error: 'emails must be a list' });
      }
      const kept = new Set(raw.map(normalizeEmail).filter(Boolean).map(hashId));
      const rows = await listGrantsForOwner(caller.id, adminKey);
      const orphans = latestByCollaborator(rows).filter(r => (
        r.event_type === 'grant' && !kept.has(r.collaborator_email_hash)
      ));
      for (const r of orphans) {
        await writeEvent(ownerToken, {
          owner_user_id_hash: ownerHash,
          collaborator_user_id_hash: r.collaborator_user_id_hash,
          ...(r.collaborator_email_hash ? { collaborator_email_hash: r.collaborator_email_hash } : {}),
          event_type: 'revoke',
        });
      }
      return res.status(200).json({ ok: true, revoked: orphans.length });
    }

    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    const emailHash = hashId(email);
    const rows = (await listGrantsForOwner(caller.id, adminKey))
      .filter(r => r.collaborator_email_hash === emailHash);
    const grantees = [...new Set(rows.map(r => r.collaborator_user_id_hash).filter(Boolean))];

    const permissions = action === 'permissions' ? cleanPermissions(req.body?.permissions) : null;
    for (const collaboratorHash of grantees) {
      await writeEvent(ownerToken, {
        owner_user_id_hash: ownerHash,
        collaborator_user_id_hash: collaboratorHash,
        collaborator_email_hash: emailHash,
        event_type: action === 'revoke' ? 'revoke' : 'grant',
        ...(permissions ? { permissions } : {}),
      });
    }
    return res.status(200).json({ ok: true, written: grantees.length, pending: grantees.length === 0 });
  } catch (err) {
    console.error('[collaborator-revoke] Error:', err.message);
    return res.status(500).json({ error: 'That did not save. Try again.' });
  }
}
