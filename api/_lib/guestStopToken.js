/**
 * api/_lib/guestStopToken.js
 *
 * THE LINK IN A GUEST'S EMAIL FOOTER, SIGNED.
 *
 * Item 6 of goals/2026-10-09-reply-lifecycle.md. A guest can ask not to be
 * emailed about this wedding again, from a link in any email we sent them, with
 * no login.
 *
 * ── WHY THIS IS A SIBLING OF stopEmailsToken.js AND NOT A REUSE OF IT ─────
 *
 * That file signs a USER id and the endpoint behind it clears
 * User.lifecycleEmails. This signs a GUEST id and clears
 * Guest.email_opt_out. The two id spaces are different, and a token that
 * verified in both would mean a guest's footer link could silence a couple's
 * own account mail, or the reverse. Same construction, same secret, separate
 * scope, and neither endpoint will accept the other's token because the body
 * it decodes is looked up in a different entity.
 *
 * A bare id would be an open door: anyone who learned a guest id, or
 * incremented one, could opt somebody else out of mail they wanted. The id
 * travels in the clear here too, because the endpoint has to know whose flag to
 * set, but it travels WITH a signature over it.
 *
 * ── THE SECRET IS BASE44_ADMIN_KEY, AND NO NEW ONE IS CREATED ─────────────
 *
 * The goal says the same helper family as the retention stop link, and that
 * family uses BASE44_ADMIN_KEY for the same reason: a link that must resolve
 * without a session. api/_lib/collaboratorInviteToken.js and
 * api/_lib/calendarFeedToken.js do the same.
 *
 * Rotating BASE44_ADMIN_KEY therefore invalidates every stop link already
 * mailed. That is the trade those three already accept, and the failure mode is
 * a dead link that says so, not a silent wrong answer.
 *
 * READ AT CALL TIME, NOT AT MODULE LOAD, which stopEmailsToken.js learned the
 * hard way: a module-scope env read fixes the secret for every later importer
 * in the same process, and a serverless instance that starts before its
 * environment is populated keeps an empty key for its whole life. The symptom
 * is every stop link silently refusing.
 *
 * ── FORMAT ───────────────────────────────────────────────────────────────
 *
 *   base64url(guestId) + "." + base64url(HMAC-SHA256(base64url(guestId)))
 *
 * One URL-path-safe segment, so it drops into /guest-stop-emails/<token> with
 * no encoding. The signature is over the ENCODED body, so there is no question
 * of how the id was serialized before it was signed.
 */

import crypto from 'crypto';

const secret = () => process.env.BASE44_ADMIN_KEY || '';

/**
 * @param {string} guestId the Base44 Guest id this link belongs to
 * @returns {string} the token for /guest-stop-emails/<token>
 */
export function signGuestStopToken(guestId) {
  const id = String(guestId || '');
  if (!id) throw new Error('Refusing to sign a guest stop token with no guest id.');
  const body = Buffer.from(id, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * @returns {string|null} the guest id, or null when the token is malformed OR
 *   the signature does not verify. CALLERS MUST TREAT BOTH THE SAME: a response
 *   that distinguished "not a token" from "wrong signature" would tell an
 *   attacker which half of their guess was right.
 */
export function verifyGuestStopToken(token) {
  // NO SECRET, NO VERIFICATION. With an empty key the HMAC is still
  // computable, so every token would verify against it and the signature would
  // mean nothing at all. Refuse instead.
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
 * The full URL for a guest-facing email footer.
 *
 * @param {string} guestId
 * @param {string} [appUrl] defaults to the deployment's own app URL
 */
export function guestStopEmailsUrl(guestId, appUrl = process.env.VITE_APP_URL || 'https://openinvite.com.au') {
  return `${appUrl}/guest-stop-emails/${signGuestStopToken(guestId)}`;
}
