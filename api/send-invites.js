/**
 * POST /api/send-invites
 *
 * Sends wedding invitations or RSVP reminders in batch using Resend's batch API.
 *
 * Body:
 *   {
 *     type: 'invite' | 'reminder',
 *     guests: [{ email: string, name: string, rsvpUrl: string }],
 *     wedding: { coupleName: string, weddingDate: string, venue: string },
 *     customSubject?: string,   // merge tags: [Guest name], [Wedding date], [Couple names]
 *     customBody?: string,      // merge tags: [Guest name], [Wedding date], [Couple names], [RSVP link]
 *   }
 */

import { Resend } from 'resend';
import {
  applyCors,
  checkRateLimit,
  getClientIp,
  isValidEmail,
  sanitizeString,
} from './_lib/security.js';
import { weddingInviteEmail } from './emails/wedding-invite.js';
import { weddingReminderEmail } from './emails/wedding-reminder.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Openinvite <hello@openinvite.com.au>';

function replaceMergeTags(str, guestName, coupleName, dateStr, rsvpUrl) {
  const firstName = guestName ? guestName.split(' ')[0] : 'Guest';
  return str
    .replace(/\[Guest name\]/gi, firstName)
    .replace(/\[Wedding date\]/gi, dateStr || '')
    .replace(/\[Couple names\]/gi, coupleName || '')
    .replace(/\[RSVP link\]/gi, rsvpUrl || '');
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'invites', 20, 60_000);
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  try {
    const { type = 'invite', guests = [], wedding = {}, customSubject, customBody } = req.body || {};

    if (!Array.isArray(guests) || guests.length === 0) {
      return res.status(400).json({ error: 'guests array is required and must not be empty' });
    }
    if (guests.length > 200) {
      return res.status(400).json({ error: 'Maximum 200 guests per batch' });
    }

    const coupleName = sanitizeString(wedding.coupleName) || '';
    const weddingDate = sanitizeString(wedding.weddingDate) || '';
    const venue = sanitizeString(wedding.venue) || '';
    const isReminder = type === 'reminder';

    const dateStr = weddingDate
      ? new Date(weddingDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const validGuests = guests.filter(g => g.email && isValidEmail(g.email) && g.rsvpUrl);

    if (validGuests.length === 0) {
      return res.status(400).json({ error: 'No guests with valid email addresses and RSVP links' });
    }

    const defaultSubject = isReminder
      ? `Reminder: RSVP to ${coupleName || 'the wedding'}`
      : `You're invited — ${coupleName || 'a wedding'}`;

    const batch = validGuests.map(g => {
      const guestName = sanitizeString(g.name) || '';
      const rsvpUrl = g.rsvpUrl;

      const subject = customSubject
        ? replaceMergeTags(sanitizeString(customSubject), guestName, coupleName, dateStr, rsvpUrl)
        : defaultSubject;

      const processedBody = customBody
        ? replaceMergeTags(sanitizeString(customBody), guestName, coupleName, dateStr, rsvpUrl)
        : null;

      const html = isReminder
        ? weddingReminderEmail({ guestName, coupleName, weddingDate, rsvpUrl, customBody: processedBody })
        : weddingInviteEmail({ guestName, coupleName, weddingDate, venue, rsvpUrl, customBody: processedBody });

      return { from: FROM, to: g.email, subject, html };
    });

    const result = await resend.batch.send(batch);

    console.log(`[send-invites] Sent ${batch.length} ${type}(s) | ids:`, result?.data?.map(d => d.id));

    return res.status(200).json({
      sent: batch.length,
      skipped: guests.length - validGuests.length,
    });
  } catch (err) {
    console.error('[send-invites] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
