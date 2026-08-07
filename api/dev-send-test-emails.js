/**
 * GET /api/dev-send-test-emails
 *
 * TEMPORARY, one-off endpoint — sends real test copies of every template
 * whose rendered output changed in the email-branding copy-fix PR (emoji
 * removal, "Powered by Openinvite" footer casing, Ava pronoun rewrite), to
 * a hardcoded test recipient, so the change can be reviewed inbox-side on a
 * real Preview deployment before merge — subject-line rendering, image
 * loading, spam-folder behaviour, mobile client quirks — none of which the
 * static HTML render used for the earlier review step can show.
 *
 * Same pattern as api/dev-send-test-digest.js (temporary, secret-gated,
 * deleted after use — has no reason to reach production and must not be
 * merged to main).
 *
 * Delete this file (and DEV_EMAIL_TEST_SECRET from Vercel's Preview
 * environment) once the preview send it exists for is confirmed.
 *
 * Auth: DEV_EMAIL_TEST_SECRET, a dedicated one-off secret generated
 * specifically for this endpoint and added to Vercel's Preview environment
 * only (not Production, not CRON_SECRET/DEV_DIGEST_SECRET or any other
 * existing secret).
 */

import { Resend } from 'resend';
import { onboardingDay3Email } from './emails/onboarding-day3.js';
import { renderGuestReplyEmail } from '../src/lib/guestReplyEmailTemplate.js';
import { renderInvitationEmail } from '../src/lib/emailTemplate.js';

const FROM = 'Openinvite <hello@openinvite.com.au>';
const TEST_RECIPIENT = 'la.jay06@gmail.com';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  const devSecret = process.env.DEV_EMAIL_TEST_SECRET;
  if (!devSecret) {
    return res.status(500).json({ error: 'DEV_EMAIL_TEST_SECRET not set' });
  }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (token !== devSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not set' });
  }

  const sends = [
    {
      key: 'onboarding-day3',
      subject: '[TEST] Have you tried Ava yet?',
      html: onboardingDay3Email({ name: 'Sam Taylor', email: TEST_RECIPIENT }),
    },
    {
      key: 'guest-reply',
      ...(() => {
        const { subject, html } = renderGuestReplyEmail({
          guestName: 'Jamie Rivera',
          coupleNames: 'Alex & Sam',
          originalMessage: 'Hi! Quick question — is the reception wheelchair accessible?',
          replyText: 'Hi Jamie, yes — the venue has a ramp at the main entrance and an accessible restroom. See you there!',
        });
        return { subject: `[TEST] ${subject}`, html };
      })(),
    },
    {
      key: 'guest-invite',
      html: renderInvitationEmail({
        universeId: 'london',
        type: 'invite',
        guestName: 'Jamie Rivera',
        coupleNames: 'Alex & Sam',
        events: [{ name: 'Ceremony', date: '2026-11-14', startTime: '2:00 PM', venue: "St. Mary's Chapel" }],
        rsvpUrl: 'https://openinvite.com.au/rsvp/example-token',
      }).html,
      subject: "[TEST] You're invited",
    },
    {
      key: 'guest-thank-you',
      html: renderInvitationEmail({
        universeId: 'london',
        type: 'thank_you_attending',
        guestName: 'Jamie Rivera',
        coupleNames: 'Alex & Sam',
      }).html,
      subject: '[TEST] Thank you',
    },
  ];

  const results = [];
  for (const s of sends) {
    try {
      const { data, error } = await resend.emails.send({ from: FROM, to: TEST_RECIPIENT, subject: s.subject, html: s.html });
      if (error) {
        console.error(`[dev-send-test-emails] ${s.key} — Resend error:`, error.message || error);
        results.push({ key: s.key, ok: false, error: error.message || String(error) });
      } else {
        console.log(`[dev-send-test-emails] ${s.key} — sent to ${TEST_RECIPIENT} | resend id: ${data?.id}`);
        results.push({ key: s.key, ok: true, resendId: data?.id });
      }
    } catch (err) {
      console.error(`[dev-send-test-emails] ${s.key} — FAILURE:`, err.message);
      results.push({ key: s.key, ok: false, error: err.message });
    }
  }

  const allOk = results.every(r => r.ok);
  return res.status(allOk ? 200 : 500).json({ ok: allOk, to: TEST_RECIPIENT, results });
}
