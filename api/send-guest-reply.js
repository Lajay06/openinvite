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
 * Body: { guestEmail, guestName, originalMessage, replyText, coupleNames }
 * Response: 200 { sent: true }
 */

import { Resend } from 'resend';
import { applyCors, checkRateLimit, getClientIp, isValidEmail, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { renderGuestReplyEmail } from '../src/lib/guestReplyEmailTemplate.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Openinvite <hello@openinvite.com.au>';

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

  const { guestEmail, guestName, originalMessage, replyText, coupleNames } = req.body || {};

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
    const { subject, html } = renderGuestReplyEmail({
      guestName: sanitizeString(guestName) || 'there',
      coupleNames: sanitizeString(coupleNames) || '',
      originalMessage: sanitizeString(originalMessage) || '',
      replyText: cleanReply,
    });

    const { error } = await resend.emails.send({ from: FROM, to: cleanEmail, subject, html });
    if (error) throw new Error(error.message || 'Resend send failed');

    console.log(`[send-guest-reply] Sent reply to ${cleanEmail}`);
    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('[send-guest-reply] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
