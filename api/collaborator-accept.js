/**
 * POST /api/collaborator-accept
 *
 * Authenticated as the INVITEE (their own bearer token, from having just
 * signed in/up on the accept page). Verifies the signed invite payload
 * (api/_lib/collaboratorInviteToken.js — no Collaborator read at all, see
 * that file's header for why), confirms the caller's own verified email
 * matches the invited email (case-insensitive) — so accepting always
 * requires actually being the invited person, not just knowing the link —
 * then writes a CollaboratorGrant 'grant' event using the INVITEE'S OWN
 * bearer token, not the admin key. That's what makes this work at all:
 * CollaboratorGrant's create RLS is null (unrestricted, like
 * RsvpResponse/PollVote), so it doesn't matter whose token creates it, but
 * using the invitee's own token here means created_by_id auto-stamps to
 * their real id — not that it's relied on for anything, since every read
 * of this entity goes by the hashed id fields instead.
 *
 * A tampered or expired signature gets the same 404 as a bad token — never
 * a distinguishing error.
 *
 * Body: { token: string }
 * Response: 200 { ok: true, ownerUserId } or 403/404 { error }
 *
 * Required env var: BASE44_ADMIN_KEY (only used here to derive the HMAC
 * hashes — the actual write uses the caller's own bearer token).
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { verifyInvite } from './_lib/collaboratorInviteToken.js';
import { hashId } from './_lib/collaboratorAuth.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

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
  const callerToken = (req.headers.authorization || '').slice(7);

  const token = sanitizeString(req.body?.token || '');
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  const invite = verifyInvite(token);
  if (!invite || !invite.ownerUserId || !invite.email) {
    return res.status(404).json({ error: 'This invite has expired or is invalid.' });
  }

  const invitedEmail = invite.email.trim().toLowerCase();
  const callerEmail = (caller.email || '').trim().toLowerCase();
  if (!invitedEmail || invitedEmail !== callerEmail) {
    return res.status(403).json({ error: `This invite was sent to ${invite.email}. Please sign in with that email address.` });
  }

  try {
    const createRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/CollaboratorGrant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${callerToken}` },
      body: JSON.stringify({
        owner_user_id_hash: hashId(invite.ownerUserId),
        collaborator_user_id_hash: hashId(caller.id),
        collaborator_email_hash: hashId(invitedEmail),
        event_type: 'grant',
        permissions: invite.permissions || {},
        granted_at: new Date().toISOString(),
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => '');
      throw new Error(`CollaboratorGrant create failed (${createRes.status}): ${body.slice(0, 200)}`);
    }

    return res.status(200).json({ ok: true, ownerUserId: invite.ownerUserId });
  } catch (err) {
    console.error('[collaborator-accept] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
