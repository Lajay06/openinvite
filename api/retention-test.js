/**
 * POST /api/retention-test
 *
 * RENDER BOTH RETENTION EMAILS, OR SEND THEM TO THE ONE PERMITTED ADDRESS.
 *
 * Item 4 of goals/2026-10-08-retention-emails.md: "a cron-safe dry mode that
 * renders both emails for a named account without sending, and one owner-only
 * route that sends both to la.jay06+notiftest01 (the only permitted test
 * address)."
 *
 * Body: { mode: 'dry' | 'send', userId?: string }
 *
 *   dry   renders both and returns them. Sends nothing, writes nothing.
 *   send  renders both and sends them to the permitted address. Still writes
 *         nothing: no retentionEmails stamp, no lifecycleEmails change, no
 *         trace on the account whose data was borrowed for the render.
 *
 * ── WHY IT DOES NOT TOUCH THE CRON ─────────────────────────────────────────
 *
 * A dry flag on api/cron/send-onboarding-emails.js would have been the obvious
 * place, and it would have put a "do not actually send" branch inside the file
 * whose whole job is sending. It also would have collided with item 2's PR,
 * which is held. This endpoint imports the same template module the cron does,
 * so what it renders is what the cron would send, and it cannot change the
 * cron's behavior by existing.
 *
 * ── WHO MAY CALL IT ────────────────────────────────────────────────────────
 *
 * Authorization: Bearer <CRON_SECRET>, the same server-only secret the cron
 * itself is called with, and it FAILS CLOSED in production when that is unset.
 * The secret is not accepted in the query string: a URL carrying it would end
 * up in browser history, proxy logs and a screenshot. That is why the owner
 * triggers this with curl and a header rather than by opening a link.
 *
 * ── THE ADDRESS IS NOT A PARAMETER ─────────────────────────────────────────
 *
 * TEST_ADDRESS below is a literal. A `to` field in the request body would make
 * this endpoint a way to send Openinvite-branded mail to anyone who learned
 * the secret, which is a different and much worse thing than a test harness.
 */

import { Resend } from 'resend';
import { getBase44User } from './_lib/base44Admin.js';
import { renderBothRetentionEmails, RETENTION_REPLY_TO } from './_lib/retentionEmails.js';
import { stopEmailsUrl } from './_lib/stopEmailsToken.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Openinvite <hello@openinvite.com.au>';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

/** The only address this endpoint will ever send to. Not configurable. */
const TEST_ADDRESS = 'la.jay06+notiftest01@gmail.com';

/**
 * What to render when no account is named.
 *
 * The dry mode is useful before any account is in the state these emails are
 * about, which is most of the time, so a named account is optional. The sample
 * is obviously a sample: nobody should mistake this output for a real couple's
 * mail, and the placeholder id makes the stop link resolve to nothing.
 */
const SAMPLE = {
  id: 'sample-account-not-a-real-id',
  full_name: 'Ada Lovelace',
  created_date: '2026-09-18T03:00:00.000Z',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── AUTH, THE SAME SHAPE THE CRON USES, AND IT FAILS CLOSED ─────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (token !== cronSecret) {
      console.warn('[retention-test] rejected, invalid or missing Authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    console.error('[retention-test] refusing to run in production, CRON_SECRET is not set');
    return res.status(401).json({ error: 'CRON_SECRET is required in production' });
  } else {
    console.warn('[retention-test] CRON_SECRET not set, skipping auth (dev or preview only)');
  }

  const body = (typeof req.body === 'object' && req.body) || {};
  const mode = body.mode === 'send' ? 'send' : 'dry';
  const userId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : null;

  // ── THE ACCOUNT THE RENDER IS FOR ───────────────────────────────────────
  let account = SAMPLE;
  let source = 'sample';
  if (userId) {
    if (!BASE44_ADMIN_KEY) {
      return res.status(500).json({ error: 'Server not configured' });
    }
    const user = await getBase44User(userId, BASE44_ADMIN_KEY);
    if (!user) {
      // SAID PLAINLY, because the owner is the only caller and a silent
      // fallback to the sample would look like a successful render of a real
      // account that does not exist.
      return res.status(404).json({ error: 'No such account' });
    }
    account = user;
    source = 'account';
  }

  let emails;
  try {
    emails = renderBothRetentionEmails({
      name: account.full_name,
      createdDate: account.created_date,
      stopUrl: stopEmailsUrl(account.id),
    });
  } catch (err) {
    console.error('[retention-test] render failed:', err.message);
    return res.status(500).json({ error: `Render failed: ${err.message}` });
  }

  if (mode === 'dry') {
    // NOTHING IS SENT AND NOTHING IS WRITTEN. The whole point of the mode.
    console.log(`[retention-test] dry render of ${emails.length} email(s) from the ${source}`);
    return res.status(200).json({
      mode: 'dry',
      sent: false,
      source,
      emails: emails.map(e => ({ key: e.key, subject: e.subject, html: e.html, text: e.text, headers: e.headers })),
    });
  }

  // ── SEND, TO ONE ADDRESS ────────────────────────────────────────────────
  const results = [];
  for (const email of emails) {
    try {
      await resend.emails.send({
        from: FROM,
        to: TEST_ADDRESS,
        replyTo: RETENTION_REPLY_TO,
        subject: `[test] ${email.subject}`,
        html: email.html,
        text: email.text,
        headers: email.headers,
      });
      results.push({ key: email.key, ok: true });
    } catch (err) {
      console.error(`[retention-test] send failed for ${email.key}: ${err.message}`);
      results.push({ key: email.key, ok: false, error: err.message });
    }
  }

  const ok = results.every(r => r.ok);
  console.log(`[retention-test] sent ${results.filter(r => r.ok).length}/${results.length} to the test address`);
  // THE ADDRESS IS ECHOED so the owner can see at a glance that it went where
  // it was supposed to, and because there is exactly one it can be, this
  // reveals nothing a reader of this file does not already know.
  return res.status(ok ? 200 : 502).json({ mode: 'send', to: TEST_ADDRESS, source, results });
}
