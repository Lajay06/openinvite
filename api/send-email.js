/**
 * POST /api/send-email
 *
 * Generic transactional email sender.
 *
 * Required env vars:
 *   RESEND_API_KEY — from resend.com (Resend → API Keys)
 *
 * Body:
 *   { type|template: string, to: string, data: object }
 *
 *   `type` and `template` are interchangeable — `template` takes priority.
 *
 * Available types / templates:
 *   welcome                → { name?: string }
 *   purchase-confirmation  → { plan: 'pro' | 'ultra', name?: string }
 *   onboarding-day1        → { name?: string }  — welcome + 3 first steps
 *   onboarding-day3        → { name?: string }  — introduce Ava
 *   onboarding-day7        → { name?: string }  — trial ending nudge
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ONBOARDING EMAIL SEQUENCE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Day 0  — onboarding-day1
 *           Subject: "Welcome to Openinvite 🎉 — let's plan your perfect wedding"
 *           Trigger: immediately on signup / onboarding completion
 *           Endpoint: POST /api/on-signup  (or POST /api/send-email with template: 'onboarding-day1')
 *
 *  Day 3  — onboarding-day3
 *           Subject: "Have you tried Ava yet? 👋"
 *           Trigger: scheduled 3 days after signup (manual send or cron)
 *           Endpoint: POST /api/send-email with template: 'onboarding-day3'
 *
 *  Day 7  — onboarding-day7
 *           Subject: "Your free trial has 7 days left ⏰"
 *           Trigger: scheduled 7 days after signup (trial has 7 days left)
 *           Endpoint: POST /api/send-email with template: 'onboarding-day7'
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Resend } from 'resend';
import { welcomeEmail } from './emails/welcome.js';
import { purchaseConfirmationEmail } from './emails/purchase-confirmation.js';
import { onboardingDay1Email } from './emails/onboarding-day1.js';
import { onboardingDay3Email } from './emails/onboarding-day3.js';
import { onboardingDay7Email } from './emails/onboarding-day7.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Openinvite <hello@openinvite.com.au>';

const TEMPLATES = {
  // ── Legacy / general ────────────────────────────────────────────────────
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

  // ── Onboarding sequence ──────────────────────────────────────────────────
  'onboarding-day1': {
    subject: () => 'Welcome to Openinvite 🎉 — let\'s plan your perfect wedding',
    html: ({ to, data }) => onboardingDay1Email({ email: to, name: data?.name }),
  },
  'onboarding-day3': {
    subject: () => 'Have you tried Ava yet? 👋',
    html: ({ to, data }) => onboardingDay3Email({ email: to, name: data?.name }),
  },
  'onboarding-day7': {
    subject: () => 'Your free trial has 7 days left ⏰',
    html: ({ to, data }) => onboardingDay7Email({ email: to, name: data?.name }),
  },
};

export default async function handler(req, res) {
  console.log('[send-email] invoked, key present:', !!process.env.RESEND_API_KEY);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, template, to, data = {} } = req.body || {};

    // `template` takes priority; `type` kept for backward compatibility
    const templateKey = template || type;

    if (!templateKey || !to) {
      return res.status(400).json({ error: '"template" (or "type") and "to" are required' });
    }

    const tmpl = TEMPLATES[templateKey];
    if (!tmpl) {
      return res.status(400).json({
        error: `Unknown template "${templateKey}". Valid templates: ${Object.keys(TEMPLATES).join(', ')}`,
      });
    }

    const subject = tmpl.subject({ data });
    const html = tmpl.html({ to, data });

    const result = await resend.emails.send({ from: FROM, to, subject, html });

    console.log('[send-email] Sent:', templateKey, '→', to, '| id:', result.data?.id);
    return res.status(200).json({ sent: true, id: result.data?.id });
  } catch (err) {
    console.error('[send-email] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
