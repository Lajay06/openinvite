/**
 * POST /api/collaborator-accept
 *
 * NOT YET FUNCTIONAL — same root blocker as collaborator-lookup.js: the
 * admin key can't read the Collaborator record by token (so this 404s
 * before ever reaching the write), and even if it could, Collaborator's
 * update RLS is ALSO owner-scoped, so the admin key couldn't write
 * status:'accepted' to a record it doesn't own either — same structural
 * constraint RsvpResponse/PollVote solved by never updating existing rows
 * (append-only). Needs the same RLS decision as collaborator-lookup.js
 * before this can work; otherwise complete.
 *
 * Authenticated as the INVITEE (their own bearer token, from having just
 * signed in/up on the accept page). Confirms the token resolves to a real
 * Collaborator invite, checks the caller's own verified email matches the
 * invited email (case-insensitive) — so accepting an invite always requires
 * actually being the invited person, not just knowing the link — then
 * writes status:'accepted' + accepted_user_id via the admin key, since
 * Collaborator's own update RLS is scoped to created_by_id === the OWNER,
 * which the invitee's bearer token can never satisfy.
 *
 * Body: { token: string }
 * Response: 200 { ok: true } or 403/404 { error }
 *
 * Required env var: BASE44_ADMIN_KEY.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'collaborator-accept', 10, 60_000);
  res.setHeader('X-RateLimit-Limit', '10');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = sanitizeString(req.body?.token || '');
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[collaborator-accept] BASE44_ADMIN_KEY env var is not set');
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

    const invitedEmail = (collaborator.email || '').trim().toLowerCase();
    const callerEmail = (caller.email || '').trim().toLowerCase();
    if (!invitedEmail || invitedEmail !== callerEmail) {
      return res.status(403).json({ error: `This invite was sent to ${collaborator.email}. Please sign in with that email address.` });
    }

    const updateRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Collaborator/${collaborator.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
      body: JSON.stringify({ status: 'accepted', accepted_user_id: caller.id, accepted_at: new Date().toISOString() }),
    });
    if (!updateRes.ok) {
      const body = await updateRes.text().catch(() => '');
      throw new Error(`Collaborator accept-write failed (${updateRes.status}): ${body.slice(0, 200)}`);
    }

    return res.status(200).json({ ok: true, ownerUserId: collaborator.created_by_id });
  } catch (err) {
    console.error('[collaborator-accept] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
