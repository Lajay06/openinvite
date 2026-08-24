/**
 * POST /api/contact
 *
 * The contact form's send path.
 *
 * WHY THIS EXISTS: src/pages/Contact.jsx had a handleSubmit that called
 * preventDefault, set submitted = true, cleared the fields after three seconds
 * and sent NOTHING. Every visitor who used it was shown a success state and had
 * their message discarded. That is worse than having no form, because a broken
 * form still looks like a channel and people stop looking for another one.
 *
 * It also blocked a line on the new homepage -- "If it ever tells you something
 * that is not true for you, that is a bug, and we want to hear about it" --
 * whose build note says not to ship it unless the feedback has somewhere to
 * land.
 *
 * DESTINATION IS CONFIG, NOT A LITERAL. support@openinvite.com.au does not
 * exist yet; CONTACT_TO_ADDRESS lets that inbox go live by changing an env var
 * rather than shipping a commit. The fallback is the address the rest of the
 * app already sends from, so the endpoint is never silently pointed at nothing.
 *
 * This adds a new endpoint and modifies no existing email file.
 */
import { Resend } from 'resend';
import {
  applyCors,
  checkRateLimit,
  getClientIp,
  isValidEmail,
  sanitizeString,
} from './_lib/security.js';

// Constructed INSIDE the handler, not at module scope: `new Resend(undefined)`
// throws on construction, so a module-scope client makes this file unimportable
// wherever the key is absent -- including CI -- and the missing-key guard below
// would never be reached to explain why.
const FROM = 'Openinvite <hello@openinvite.com.au>';
const TO = process.env.CONTACT_TO_ADDRESS || 'hello@openinvite.com.au';

const TOPICS = new Set([
  'Guest management', 'Budget tracking', 'Universes', 'Ava', 'Pricing', 'Something else',
]);

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // checkRateLimit returns { limited, remaining } -- NOT a boolean.
  const { limited, remaining } = checkRateLimit(getClientIp(req), 'contact', 5);
  res.setHeader('X-RateLimit-Limit', '5');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many messages from this connection. Please try again shortly.' });
  }

  const body = req.body || {};
  const name = sanitizeString(body.name || '', 120).trim();
  const email = String(body.email || '').trim();
  const topic = String(body.topic || '').trim();
  const message = sanitizeString(body.message || '', 5000).trim();

  if (!name || !message) {
    return res.status(400).json({ error: 'Please include your name and a message.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please check your email address.' });
  }
  const safeTopic = TOPICS.has(topic) ? topic : 'Something else';

  // A missing key must not read as a delivered message. Without this the send
  // below throws and we 500 -- correct, but the log would not say why.
  if (!process.env.RESEND_API_KEY) {
    console.error('[contact] RESEND_API_KEY missing; refusing to report success');
    return res.status(500).json({ error: 'Message could not be sent' });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const html =
    `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p>` +
    `<p><strong>Topic:</strong> ${esc(safeTopic)}</p>` +
    `<hr><p style="white-space:pre-wrap">${esc(message)}</p>`;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: TO,
      // So a reply from the inbox goes to the person who wrote in, not to us.
      replyTo: email,
      subject: `Contact form: ${safeTopic} (from ${name})`,
      html,
    });
    // Resend reports delivery failures in the payload as well as by throwing.
    // Treating a returned error as success is exactly the bug being fixed.
    if (result?.error) {
      console.error('[contact] Resend returned an error:', result.error?.message);
      return res.status(502).json({ error: 'Message could not be sent' });
    }
    console.log('[contact] sent |', safeTopic, '| id:', result?.data?.id);
    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('[contact] send failed:', err?.message);
    return res.status(502).json({ error: 'Message could not be sent' });
  }
}
