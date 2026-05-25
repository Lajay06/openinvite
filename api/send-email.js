/**
 * POST /api/send-email
 *
 * Generic transactional email sender.
 *
 * Required env vars:
 *   RESEND_API_KEY — from resend.com (Resend → API Keys)
 *
 * Body:
 *   { type: 'welcome' | 'purchase-confirmation', to: string, data: object }
 *
 * `data` shape per type:
 *   welcome                → { name?: string }
 *   purchase-confirmation  → { plan: 'pro' | 'ultra', name?: string }
 */

import { Resend } from 'resend';
import { welcomeEmail } from './emails/welcome.js';
import { purchaseConfirmationEmail } from './emails/purchase-confirmation.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Openinvite <lajay@openinvite.com.au>';

const TEMPLATES = {
  welcome: {
    subject: () => 'Welcome to Openinvite — your free trial has started',
    html: ({ to, data }) => welcomeEmail({ email: to, name: data?.name }),
  },
  'purchase-confirmation': {
    subject: ({ data }) =>
      `You're on Openinvite ${data?.plan === 'ultra' ? 'Ultra' : 'Pro'} — payment confirmed`,
    html: ({ to, data }) =>
      purchaseConfirmationEmail({ email: to, plan: data?.plan || 'pro', name: data?.name }),
  },
};

export default async function handler(req, res) {
  console.log('[send-email] invoked, key present:', !!process.env.RESEND_API_KEY);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, to, data = {} } = req.body || {};

    if (!type || !to) {
      return res.status(400).json({ error: '"type" and "to" are required' });
    }

    const template = TEMPLATES[type];
    if (!template) {
      return res.status(400).json({
        error: `Unknown email type "${type}". Valid types: ${Object.keys(TEMPLATES).join(', ')}`,
      });
    }

    const subject = template.subject({ data });
    const html = template.html({ to, data });

    const result = await resend.emails.send({ from: FROM, to, subject, html });

    console.log('[send-email] Sent:', type, '→', to, '| id:', result.data?.id);
    return res.status(200).json({ sent: true, id: result.data?.id });
  } catch (err) {
    console.error('[send-email] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
