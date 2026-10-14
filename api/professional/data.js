/**
 * api/professional/data.js
 *
 * POST { op, collection, id?, event_id?, workspace_id, data? }
 *
 * Every read and write a Professional screen makes, once the entities exist.
 * In order, on every call:
 *   1. The flag: off is a 404, so production does not know this exists.
 *   2. The caller, from their own token (verifyBase44User), never the body.
 *   3. Their live membership in the workspace, resolved by the hosted
 *      function from the hashed user id.
 *   4. The row's event, read server-side, never trusted from the body.
 *   5. authorize(): the role table in src/lib/professionalAccess.js.
 *   6. The allowlist both ways (FIELDS), with *_enc fields encrypted and
 *      decrypted here.
 * Errors are calm and never carry a server's own text.
 */
import { applyCors, checkRateLimit, getClientIp, sanitizeString } from '../_lib/security.js';
import { verifyBase44User } from '../_lib/auth.js';
import { hmacHex } from '../_lib/appKeys.js';
import { TOO_MANY_TRIES, DID_NOT_GO_THROUGH } from '../_lib/calmErrors.js';
import { professionalOnServer, authorize, liveMember, AREA_MAP, OPS } from '../_lib/professionalAuth.js';
import { proFn, toStored, fromStored, isConfigured } from '../_lib/professionalData.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!professionalOnServer()) return res.status(404).json({ error: 'Not found' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { limited } = checkRateLimit(getClientIp(req), 'professional-data', 240, 60_000);
  if (limited) return res.status(429).json({ error: TOO_MANY_TRIES });

  const caller = await verifyBase44User(req);
  if (!caller) return res.status(401).json({ error: 'Sign in to continue.' });
  if (!isConfigured()) return res.status(503).json({ error: 'Professional is not switched on yet.' });

  const body = req.body || {};
  const op = sanitizeString(body.op || '');
  const collection = sanitizeString(body.collection || '');
  const workspaceId = sanitizeString(body.workspace_id || '');
  if (!OPS.includes(op) || !AREA_MAP[collection] || !workspaceId) return res.status(400).json({ error: DID_NOT_GO_THROUGH });

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try {
    const { rows: memberRows } = await proFn('members', { workspace_id: workspaceId }, token);
    const member = liveMember(memberRows, { userHash: hmacHex(caller.id), emailHash: null });
    if (!member) return res.status(403).json({ error: 'You are not on this team.' });
    const memberView = { ...member, id: member.id };

    const scope = AREA_MAP[collection].scope;
    let event = null;
    let existing = null;
    if (op !== 'list' && op !== 'create' && body.id) {
      existing = (await proFn('get', { collection, id: sanitizeString(body.id), workspace_id: workspaceId }, token)).row;
      if (!existing) return res.status(404).json({ error: 'That is no longer here.' });
    }
    const eventId = sanitizeString(existing?.event_id || body.event_id || body.data?.event_id || (collection === 'ProEvent' ? existing?.id || '' : ''));
    if (scope === 'event' && eventId) {
      event = collection === 'ProEvent' && existing ? existing : (await proFn('get', { collection: 'ProEvent', id: eventId, workspace_id: workspaceId }, token)).row;
      if (!event || event.workspace_id !== workspaceId) return res.status(404).json({ error: 'That is no longer here.' });
    }

    const verdict = authorize({ member: memberView, collection, op, patch: body.data || null, event: op === 'create' && collection === 'ProEvent' ? null : event });
    if (!verdict.ok) return res.status(verdict.status).json({ error: verdict.status === 404 ? 'That is no longer here.' : 'Your role on this team does not include that.' });

    if (op === 'list') {
      const { rows } = await proFn('list', { collection, workspace_id: workspaceId, event_id: eventId || null }, token);
      return res.status(200).json({ rows: rows.map((r) => fromStored(collection, r)) });
    }
    if (op === 'get') return res.status(200).json({ row: fromStored(collection, existing) });
    if (op === 'remove') { await proFn('remove', { collection, id: existing.id, workspace_id: workspaceId }, token); return res.status(200).json({ ok: true }); }
    const stored = toStored(collection, { ...(body.data || {}), ...(scope === 'workspace' ? { workspace_id: workspaceId } : {}) });
    const { row } = await proFn(op, { collection, id: existing?.id || null, workspace_id: workspaceId, data: stored }, token);
    return res.status(200).json({ row: fromStored(collection, row) });
  } catch (err) {
    console.error('[professional-data]', collection, op, err?.status || 'error');
    if (err?.status === 503) return res.status(503).json({ error: 'Professional is not switched on yet.' });
    return res.status(500).json({ error: DID_NOT_GO_THROUGH });
  }
}
