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
 *        or 410 { error, expired: true } for an invite more than 7 days old
 *
 * Required env var: BASE44_ADMIN_KEY (only used here to derive the HMAC
 * hashes — the actual write uses the caller's own bearer token).
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { verifyInvite, isInviteExpired, INVITE_EXPIRED_MESSAGE } from './_lib/collaboratorInviteToken.js';
import { inviteStanding } from './_lib/collaboratorInvites.js';
import { hashId, encryptOwnerId } from './_lib/collaboratorAuth.js';
import { notify } from './_lib/notify.js';
import { TOO_MANY_TRIES, DID_NOT_GO_THROUGH } from './_lib/calmErrors.js';

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
    return res.status(429).json({ error: TOO_MANY_TRIES });
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
  // Seven days from signing, then the link is dead: an old email is not a
  // standing key to the wedding.
  if (isInviteExpired(invite)) {
    return res.status(410).json({ error: INVITE_EXPIRED_MESSAGE, expired: true });
  }

  const invitedEmail = invite.email.trim().toLowerCase();
  const callerEmail = (caller.email || '').trim().toLowerCase();
  if (!invitedEmail || invitedEmail !== callerEmail) {
    return res.status(403).json({ error: `This invite was sent to ${invite.email}. Please sign in with that email address.` });
  }

  try {
    // Only the newest link for this owner and email works. A resend, or the
    // owner removing a pending invite, leaves this one stale: same 404 as an
    // invalid link, and no grant. CollaboratorInvite read is null, so the
    // invitee's own token can read it.
    if (await inviteStanding(invite, token, callerToken) === 'stale') {
      return res.status(404).json({ error: 'This invite has expired or is invalid.' });
    }

    // The owner's id, encrypted, so a later sign-in without this link can find
    // the wedding again (owner ruling 2026-10-13). A missing APP_ENC_KEY must
    // not cost the person their access: the grant is written without it, and
    // the log says so without ids.
    const collaboratorHash = hashId(caller.id);
    let ownerIdEnc = null;
    try { ownerIdEnc = encryptOwnerId(invite.ownerUserId, collaboratorHash); } catch {
      console.error('[collaborator-accept] owner id not stored: APP_ENC_KEY unavailable');
    }
    const createRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/CollaboratorGrant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${callerToken}` },
      body: JSON.stringify({
        owner_user_id_hash: hashId(invite.ownerUserId),
        collaborator_user_id_hash: collaboratorHash,
        collaborator_email_hash: hashId(invitedEmail),
        event_type: 'grant',
        permissions: invite.permissions || {},
        granted_at: new Date().toISOString(),
        ...(ownerIdEnc ? { owner_id_enc: ownerIdEnc } : {}),
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => '');
      throw new Error(`CollaboratorGrant create failed (${createRes.status}): ${body.slice(0, 200)}`);
    }

    await notify({
      recipientUserId: invite.ownerUserId,
      type: 'collaborator_joined',
      title: `${caller.full_name || caller.email} joined as a collaborator`,
      body: 'They can now help plan your wedding.',
      link: '/Dashboard',
      emailCta: 'Go to dashboard',
    });

    return res.status(200).json({ ok: true, ownerUserId: invite.ownerUserId });
  } catch (err) {
    console.error('[collaborator-accept] Error:', err.message);
    return res.status(500).json({ error: DID_NOT_GO_THROUGH });
  }
}
