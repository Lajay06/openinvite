/**
 * GET /api/collaborator-lookup?token=<signed invite>
 *
 * Public, unauthenticated — backs the accept page (src/pages/CollaboratorAccept.jsx)
 * before the invitee has signed in. Unlike the original design, this never
 * reads Collaborator at all (confirmed empirically that the admin key can't
 * — see api/_lib/collaboratorAuth.js's header). The invite link itself
 * carries a signed, tamper-evident payload (api/_lib/collaboratorInviteToken.js)
 * minted by send-collaborator-invite.js using the OWNER's own request, so
 * there is nothing to look up here beyond verifying the signature and
 * reading the couple's display name (WeddingDetails.read is null, so the
 * admin key can fetch that safely).
 *
 * A malformed or tampered token gets the same 404 as an expired one — never
 * a distinguishing error — so this endpoint can't be used to probe whether
 * a signature is "close" to valid.
 *
 * Response: 200 { collaboratorName, coupleNames, permissions, email }
 *        or 404 { error: 'This invite has expired or is invalid.' }
 *        or 410 { error, expired: true } for a genuine invite more than 7 days old
 *
 * Required env var: BASE44_ADMIN_KEY.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyInvite, isInviteExpired, INVITE_EXPIRED_MESSAGE } from './_lib/collaboratorInviteToken.js';
import { inviteStanding } from './_lib/collaboratorInvites.js';

import { coupleDisplayName } from './_lib/coupleNames.js';
import { TOO_MANY_TRIES, DID_NOT_GO_THROUGH } from './_lib/calmErrors.js';
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
    return res.status(429).json({ error: TOO_MANY_TRIES });
  }

  const token = sanitizeString(req.query?.token || '');
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[collaborator-lookup] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const payload = verifyInvite(token);
  if (!payload || !payload.ownerUserId || !payload.email) {
    return res.status(404).json({ error: 'This invite has expired or is invalid.' });
  }
  if (isInviteExpired(payload)) {
    return res.status(410).json({ error: INVITE_EXPIRED_MESSAGE, expired: true });
  }

  try {
    // A link a resend replaced, or one the owner removed, gets the same 404
    // as an invalid one.
    if (await inviteStanding(payload, token, BASE44_ADMIN_KEY) === 'stale') {
      return res.status(404).json({ error: 'This invite has expired or is invalid.' });
    }
    const weddingQuery = encodeURIComponent(JSON.stringify({ created_by_id: payload.ownerUserId }));
    const weddingRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`, {
      headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    });
    const weddings = weddingRes.ok ? unwrapList(await weddingRes.json()).filter(w => !w.is_test) : [];
    const wedding = weddings.length > 0
      ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;
    const coupleNames = coupleDisplayName(wedding);

    return res.status(200).json({
      collaboratorName: payload.name || '',
      coupleNames,
      permissions: payload.permissions || {},
      email: payload.email,
    });
  } catch (err) {
    console.error('[collaborator-lookup] Error:', err.message);
    return res.status(500).json({ error: DID_NOT_GO_THROUGH });
  }
}
