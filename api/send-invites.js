/**
 * POST /api/send-invites
 *
 * Sends wedding invitations or RSVP reminders in batch using Resend's batch API.
 *
 * Body:
 *   {
 *     type: 'invite' | 'reminder',
 *     guests: [{ email: string, name: string, rsvpUrl: string }],
 *     wedding: { coupleName: string, weddingDate: string, venue: string }
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
    const { type = 'invite', guests = [], wedding = {} } = req.body || {};

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
    const subject = isReminder
      ? `Reminder: RSVP to ${coupleName || 'the wedding'}`
      : `You're invited — ${coupleName || 'a wedding'}`;

    const validGuests = guests.filter(g => g.email && isValidEmail(g.email) && g.rsvpUrl);

    if (validGuests.length === 0) {
      return res.status(400).json({ error: 'No guests with valid email addresses and RSVP links' });
    }

    const batch = validGuests.map(g => {
      const guestName = sanitizeString(g.name) || '';
      const rsvpUrl = g.rsvpUrl;
      const html = isReminder
        ? weddingReminderEmail({ guestName, coupleName, weddingDate, rsvpUrl })
        : weddingInviteEmail({ guestName, coupleName, weddingDate, venue, rsvpUrl });

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
