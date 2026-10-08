/**
 * api/_lib/stopEmailsToken.js
 *
 * THE LINK IN THE FOOTER, SIGNED.
 *
 * Item 3 of goals/2026-10-08-retention-emails.md: "The token is HMAC of the
 * user id with an existing server secret; never a bare id."
 *
 * A bare id would be an open door. Anyone who learned another account's id,
 * or who incremented their own, could silence someone else's mail. The id
 * travels in the clear here too, because the stop endpoint needs to know whose
 * flag to clear, but it travels WITH a signature over it, and the endpoint
 * refuses anything whose signature does not verify.
 *
 * ── THE SECRET IS BASE44_ADMIN_KEY, AND NO NEW ONE IS CREATED ──────────────
 *
 * The goal says to use an existing server secret and to stop and ask if there
 * is none. There is one, and there is already a precedent for exactly this
 * use: api/_lib/collaboratorInviteToken.js signs an invite payload with
 * BASE44_ADMIN_KEY as the HMAC key, for the same reason (a link that must
 * resolve without a session). This file follows it deliberately rather than
 * inventing a second convention.
 *
 * Rotating BASE44_ADMIN_KEY therefore invalidates every stop link already
 * mailed. That is the same trade collaboratorInviteToken and
 * calendarFeedToken already accept, and the failure mode is a dead link that
 * says so, not a silent wrong answer.
 *
 * ── FORMAT ─────────────────────────────────────────────────────────────────
 *
 *   base64url(userId) + "." + base64url(HMAC-SHA256(base64url(userId)))
 *
 * One URL-path-safe segment, so it drops into /stop-emails/<token> without
 * encoding. The signature is over the ENCODED body, not the raw id, so there
 * is no question of how the id was serialized before it was signed.
 */

import crypto from 'crypto';

/**
 * READ AT CALL TIME, NOT AT MODULE LOAD.
 *
 * This was `const SECRET = process.env.BASE44_ADMIN_KEY || ''`, evaluated once
 * when the module was first imported. Item 2 made the cron import this file,
 * and that exposed the problem: whichever guard imported the cron first fixed
 * the secret for every later importer in the same process, so a guard that set
 * the key and then exercised the endpoint got a module instance holding an
 * empty secret and every token failed to verify.
 *
 * A test artefact is the cheap version of the real hazard. A module-scope env
 * read also means a serverless instance that starts before its environment is
 * populated keeps the wrong value for its whole life, and the symptom is every
 * stop link silently 404ing. Reading per call costs nothing and cannot go
 * stale.
 */
const secret = () => process.env.BASE44_ADMIN_KEY || '';

/**
 * @param {string} userId the Base44 User id this link belongs to
 * @returns {string} the token for /stop-emails/<token>
 */
export function signStopToken(userId) {
  const id = String(userId || '');
  if (!id) throw new Error('Refusing to sign a stop token with no user id.');
  const body = Buffer.from(id, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * @returns {string|null} the user id, or null when the token is malformed OR
 *   the signature does not verify. CALLERS MUST TREAT BOTH THE SAME: a
 *   response that distinguishes "not a token" from "wrong signature" tells an
 *   attacker which half of their guess was right.
 */
export function verifyStopToken(token) {
  // NO SECRET, NO VERIFICATION. With SECRET as '' the HMAC is still
  // computable, so every token would verify against an empty key and the
  // signature would mean nothing. Refuse instead.
  const key = secret();
  if (!key) return null;

  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = crypto.createHmac('sha256', key).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  // LENGTH FIRST, because timingSafeEqual throws on a length mismatch rather
  // than returning false, and a throw here would be a 500 where a 404 belongs.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const id = Buffer.from(body, 'base64url').toString('utf8');
    return id || null;
  } catch {
    return null;
  }
}

/**
 * The full URL that goes in an email footer and in the List-Unsubscribe header.
 *
 * @param {string} userId
 * @param {string} [appUrl] defaults to the deployment's own app URL
 */
export function stopEmailsUrl(userId, appUrl = process.env.VITE_APP_URL || 'https://openinvite.com.au') {
  return `${appUrl}/stop-emails/${signStopToken(userId)}`;
}
