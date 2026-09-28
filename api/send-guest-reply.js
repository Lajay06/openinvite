/**
 * POST /api/send-guest-reply
 *
 * PR4b: delivers a couple's reply to a GuestMessage (Messages page) to the
 * guest's real inbox via Resend — before this endpoint existed, "reply"
 * only wrote the reply text onto the GuestMessage record itself (visible
 * next time the guest happened to log back in), the guest was never
 * actually notified. Same Resend/FROM setup as api/send-invites.js and
 * api/send-collaborator-invite.js, template styled like the weekly digest
 * (src/lib/guestReplyEmailTemplate.js).
 *
 * This endpoint only sends the email — it does not write to Base44. The
 * caller (Messages.jsx) still owns writing reply/replied/reply_sent_at
 * onto the GuestMessage record with its own bearer token, exactly as
 * before, right after this call succeeds.
 *
 * Body: { guestEmail, guestName, originalMessage, replyText }
 *   coupleNames is accepted for compatibility and IGNORED — the names are
 *   resolved server-side from the caller's own wedding (see below).
 * Response: 200 { sent: true }
 */

import { Resend } from 'resend';
import { applyCors, checkRateLimit, getClientIp, isValidEmail, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { renderGuestReplyEmail } from '../src/lib/guestReplyEmailTemplate.js';
import { coupleDisplayName } from './_lib/coupleNames.js';
import { adminList } from './_lib/base44Entities.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPPORT_ADDRESS = 'hello@openinvite.com.au';

/**
 * The caller's own wedding, for the names that go on the email.
 *
 * Same resolution as api/guest-notes.js and api/song-request-review.js — newest
 * first when an account somehow holds more than one. Fails soft to null: a
 * missing wedding must not stop a reply the couple has already written.
 */
async function getMyWedding(callerId) {
  try {
    const weddings = (await adminList('WeddingDetails', { created_by_id: callerId })).filter(w => !w.is_test);
    return weddings.length > 0
      ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;
  } catch (err) {
    console.warn('[send-guest-reply] Could not resolve the wedding for the names:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'guest-reply', 30, 60_000);
  res.setHeader('X-RateLimit-Limit', '30');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  // coupleNames is DELIBERATELY not destructured: the page still sends it and
  // the server no longer reads it. See the resolution note below.
  const { guestEmail, guestName, originalMessage, replyText } = req.body || {};

  const cleanEmail = sanitizeString(guestEmail || '').trim();
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'A valid guest email is required.' });
  }
  const cleanReply = sanitizeString(replyText || '').trim();
  if (!cleanReply) {
    return res.status(400).json({ error: 'Reply text is required.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[send-guest-reply] RESEND_API_KEY env var is not set');
    return res.status(500).json({ error: 'Email sending is not configured.' });
  }

  try {
    // THE NAMES ARE RESOLVED HERE, NOT TAKEN FROM THE BODY.
    //
    // Messages.jsx sent Invitation.couple_names, which is a DIFFERENT RECORD
    // from the wedding: a couple with names on WeddingDetails and no Invitation
    // row sent an empty string, and the template's 'The couple' fallback then
    // reached a real guest in the subject, the eyebrow and the footer at once.
    // Owner live pass, 2026-09-28.
    //
    // coupleDisplayName carries the fallback chain the client had no access to
    // (couple1Name/couple2Name first, the legacy coupleNames string second), so
    // this resolves names for weddings the old path could not.
    //
    // THE BODY'S coupleNames IS NOW IGNORED, and that is the point: a
    // guest-facing From name supplied by the caller is a name the server did not
    // verify, on an endpoint that mails someone else. Same construction as
    // api/send-invites.js:188 and api/rsvp-submit.js:295.
    const wedding = await getMyWedding(caller.id);
    const cleanCoupleNames = coupleDisplayName(wedding) || '';

    const { subject, html } = renderGuestReplyEmail({
      guestName: sanitizeString(guestName) || 'there',
      coupleNames: cleanCoupleNames,
      originalMessage: sanitizeString(originalMessage) || '',
      replyText: cleanReply,
    });

    // Guest-facing from-name is the couple's own names (email branding
    // audit) — address stays on the verified sending domain regardless.
    // reply-to is the caller's own verified email (they ARE the wedding
    // owner, authenticated above), so a further guest reply reaches the
    // couple directly, not the support inbox.
    const fromName = cleanCoupleNames || 'Openinvite';
    const from = `${fromName} <${SUPPORT_ADDRESS}>`;
    const replyTo = caller.email || SUPPORT_ADDRESS;

    const { error } = await resend.emails.send({ from, to: cleanEmail, replyTo, subject, html });
    if (error) throw new Error(error.message || 'Resend send failed');

    console.log(`[send-guest-reply] Sent reply to ${cleanEmail}`);
    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('[send-guest-reply] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
