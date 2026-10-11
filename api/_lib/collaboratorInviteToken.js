/**
 * api/_lib/collaboratorInviteToken.js
 *
 * The accept flow can't look up an invite by id in Base44 at all — the
 * admin key can never read a Collaborator row (owner-scoped RLS, confirmed
 * empirically: a scoped read returns 200/[] and a scoped update returns
 * 403 — the admin key has no session identity to satisfy {{user.id}}).
 * Rather than touch Collaborator's own RLS (audited, untouched, per the
 * approved design), the invite carries everything the accept page needs
 * IN the link itself: a signed, tamper-evident payload verified with
 * BASE44_ADMIN_KEY as the HMAC key. No database read is needed to resolve
 * an invite — only to act on one (see collaboratorAuth.js's CollaboratorGrant).
 *
 * Format: base64url(JSON payload) + "." + HMAC-SHA256 of that string,
 * both base64url so the whole token is a single URL-path-safe segment.
 */

import crypto from 'crypto';

const SECRET = process.env.BASE44_ADMIN_KEY || '';

export function signInvite(payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * @returns {object|null} the decoded payload, or null if the token is
 *   malformed OR the signature doesn't verify (tampered/forged) — callers
 *   must treat both cases identically (same 404), never distinguish.
 */
export function verifyInvite(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/** An invite link works for 7 days from when it was signed. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export const INVITE_EXPIRED_MESSAGE = 'This invite has expired. Ask them to send a new one.';

/**
 * True when a VERIFIED payload is past its 7 days. Checked only after the
 * signature verifies, so saying "expired" rather than "invalid" tells a
 * prober nothing about forging one. A payload with no usable iat, or one
 * signed in the future, counts as expired: neither can be honored safely.
 */
export function isInviteExpired(payload, now = Date.now()) {
  const iat = Number(payload?.iat);
  if (!Number.isFinite(iat) || iat <= 0) return true;
  if (iat > now + CLOCK_SKEW_MS) return true;
  return now - iat > INVITE_TTL_MS;
}
