/**
 * GET /api/dev-send-test-g3-emails
 *
 * TEMPORARY, one-off endpoint — sends every brand + wedding-invitation email
 * template as a real send, so PR G3's changes (colour logo mark, corrected
 * Pro/Ultra plan copy, no emojis) can be reviewed as a user would actually
 * see them before merge, matching the PR B4 email-audit verification
 * pattern.
 *
 * Delete this file (and DEV_G3_SECRET from Vercel's Preview env) once the
 * preview send it exists for is confirmed — it has no reason to reach
 * production and must not be merged to main.
 *
 * Auth: DEV_G3_SECRET, a dedicated one-off secret generated specifically for
 * this endpoint and added to Vercel's Preview environment only (not
 * Production, not CRON_SECRET or any other existing secret).
 */

import { Resend } from 'resend';
import { onboardingDay1Email } from './emails/onboarding-day1.js';
import { onboardingDay3Email } from './emails/onboarding-day3.js';
import { onboardingDay7Email } from './emails/onboarding-day7.js';
import { purchaseConfirmationEmail } from './emails/purchase-confirmation.js';
import { renderInvitationEmail } from '../src/lib/emailTemplate.js';

const FROM = 'Openinvite <hello@openinvite.com.au>';
const TEST_RECIPIENT = 'la.jay06+g3emailaudit@gmail.com';

export default async function handler(req, res) {
  if (req.query.secret !== process.env.DEV_G3_SECRET) {
    return res.status(404).json({ error: 'Not found' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const results = [];

  const sends = [
    {
      key: 'onboarding-day1',
      subject: 'Welcome to Openinvite. Let\'s plan your perfect wedding',
      html: onboardingDay1Email({ email: TEST_RECIPIENT, name: 'Jamie' }),
    },
    {
      key: 'onboarding-day3',
      subject: 'Have you tried Ava yet?',
      html: onboardingDay3Email({ email: TEST_RECIPIENT, name: 'Jamie' }),
    },
    {
      key: 'onboarding-day7',
      subject: 'Your free trial has 7 days left',
      html: onboardingDay7Email({ email: TEST_RECIPIENT, name: 'Jamie' }),
    },
    {
      key: 'purchase-confirmation-pro',
      subject: "You're on Openinvite Pro: payment confirmed",
      html: purchaseConfirmationEmail({ email: TEST_RECIPIENT, plan: 'pro', name: 'Jamie' }),
    },
    {
      key: 'purchase-confirmation-ultra',
      subject: "You're on Openinvite Ultra: payment confirmed",
      html: purchaseConfirmationEmail({ email: TEST_RECIPIENT, plan: 'ultra', name: 'Jamie' }),
    },
    {
      key: 'invite',
      subject: "You're invited to Jamie & Alex's wedding",
      html: renderInvitationEmail({
        universeId: 'paris',
        type: 'invite',
        guestName: 'Sam Guest',
        coupleNames: 'Jamie & Alex',
        events: [{ name: 'Ceremony', date: '2026-11-14', startTime: '4:00 PM', venue: 'Le Marais Garden' }],
        rsvpUrl: 'https://openinvite.com.au/rsvp/test',
      }),
    },
  ];

  for (const s of sends) {
    try {
      const result = await resend.emails.send({ from: FROM, to: TEST_RECIPIENT, subject: s.subject, html: s.html });
      results.push({ key: s.key, sent: true, id: result.data?.id });
    } catch (err) {
      results.push({ key: s.key, sent: false, error: err.message });
    }
  }

  return res.status(200).json({ recipient: TEST_RECIPIENT, results });
}
