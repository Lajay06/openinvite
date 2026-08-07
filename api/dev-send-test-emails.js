/**
 * GET /api/dev-send-test-emails
 *
 * TEMPORARY, one-off endpoint — sends real test emails demonstrating the
 * guest-facing from-name/reply-to change (email branding audit, PR 2).
 * Unlike PR 1's copy fixes, this change is entirely envelope-level (the
 * From display name and Reply-To header) — nothing in the HTML body
 * differs, so a static HTML render can't show it at all. This is the only
 * way to actually see "From: Alex & Sam <hello@openinvite.com.au>" and
 * confirm hitting Reply routes to the couple's own address, not support.
 *
 * Same pattern as api/dev-send-test-digest.js / the PR 1 version of this
 * file: temporary, secret-gated, deleted after use — has no reason to
 * reach production and must not be merged to main.
 *
 * Delete this file (and DEV_EMAIL_TEST_SECRET from Vercel's Preview
 * environment) once the preview send it exists for is confirmed.
 *
 * Auth: DEV_EMAIL_TEST_SECRET, same dedicated secret as PR 1's version of
 * this endpoint (re-add it to Vercel's Preview environment if it was
 * already removed after PR 1 merged). Accepted as an Authorization: Bearer
 * header or a ?secret= query param (Vercel's deployment-protection SSO
 * wall blocks a bare curl from ever reaching this handler regardless of
 * header — a browser already signed in to Vercel clears that wall, a
 * script can't).
 *
 * ?replyTestTo=<email> — the address the test emails' Reply-To is set to,
 * so hitting "Reply" in the received test email proves the mechanism
 * actually routes correctly. Defaults to TEST_RECIPIENT (reply to yourself).
 */

import { Resend } from 'resend';
import { renderInvitationEmail } from '../src/lib/emailTemplate.js';
import { renderGuestReplyEmail } from '../src/lib/guestReplyEmailTemplate.js';

const SUPPORT_ADDRESS = 'hello@openinvite.com.au';
const TEST_RECIPIENT = 'la.jay06@gmail.com';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  const devSecret = process.env.DEV_EMAIL_TEST_SECRET;
  if (!devSecret) {
    return res.status(500).json({ error: 'DEV_EMAIL_TEST_SECRET not set' });
  }
  const auth = req.headers.authorization || '';
  const headerToken = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  const queryToken = req.query?.secret;
  if (headerToken !== devSecret && queryToken !== devSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not set' });
  }

  const coupleNames = 'Alex & Sam';
  const replyTo = (typeof req.query?.replyTestTo === 'string' && req.query.replyTestTo) || TEST_RECIPIENT;
  const from = `${coupleNames} <${SUPPORT_ADDRESS}>`;

  const invite = renderInvitationEmail({
    universeId: 'london',
    type: 'invite',
    guestName: 'Jamie Rivera',
    coupleNames,
    events: [{ name: 'Ceremony', date: '2026-11-14', startTime: '2:00 PM', venue: "St. Mary's Chapel" }],
    rsvpUrl: 'https://openinvite.com.au/rsvp/example-token',
  });

  const reply = renderGuestReplyEmail({
    guestName: 'Jamie Rivera',
    coupleNames,
    originalMessage: 'Hi! Quick question — is the reception wheelchair accessible?',
    replyText: 'Hi Jamie, yes — the venue has a ramp at the main entrance and an accessible restroom. See you there!',
  });

  const sends = [
    { key: 'guest-invite', subject: `[TEST — from/reply-to] ${invite.text.split('\n')[0]}`, html: invite.html },
    { key: 'guest-reply', subject: `[TEST — from/reply-to] ${reply.subject}`, html: reply.html },
  ];

  const results = [];
  for (const s of sends) {
    try {
      const { data, error } = await resend.emails.send({ from, to: TEST_RECIPIENT, replyTo, subject: s.subject, html: s.html });
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
  return res.status(allOk ? 200 : 500).json({ ok: allOk, from, replyTo, to: TEST_RECIPIENT, results });
}
