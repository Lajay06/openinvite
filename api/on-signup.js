/**
 * POST /api/on-signup
 *
 * Fires immediately when a new user completes signup / onboarding.
 * Sends the day-0 welcome email (onboarding-day1 template).
 *
 * Required env vars:
 *   RESEND_API_KEY — Resend API key
 *   VITE_BASE44_APP_ID — Base44 app ID (used to verify the caller's identity)
 *
 * Body:
 *   { email: string, name?: string, token: string }
 *
 *   `token` — the user's Base44 access token (from localStorage 'base44_access_token').
 *             Used to verify the caller is a real authenticated user before sending.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO TRIGGER THIS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Call from the frontend immediately after onboarding completes
 * (e.g. inside saveOnboarding() in src/pages/Onboarding.jsx):
 *
 *   const token = localStorage.getItem('base44_access_token') || '';
 *   await fetch('/api/on-signup', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       email: user.email,
 *       name: user.full_name || '',
 *       token,
 *     }),
 *   });
 *
 * The endpoint is idempotent-safe — it always sends the email when called,
 * so guard the call in the frontend with `!user.onboardingCompleted`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FULL ONBOARDING EMAIL SEQUENCE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Day 0  — onboarding-day1  "Welcome to Openinvite 🎉"
 *           Triggered automatically via this endpoint on signup.
 *
 *  Day 3  — onboarding-day3  "Have you tried Ava yet? 👋"
 *           Send manually via POST /api/send-email or schedule via a cron job:
 *           { template: 'onboarding-day3', to: '<email>', data: { name: '<name>' } }
 *
 *  Day 7  — onboarding-day7  "Your free trial has 7 days left ⏰"
 *           Send manually via POST /api/send-email or schedule via a cron job:
 *           { template: 'onboarding-day7', to: '<email>', data: { name: '<name>' } }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Resend } from 'resend';
import { onboardingDay1Email } from './emails/onboarding-day1.js';
import { checkRateLimit, getClientIp } from './_lib/security.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_API = 'https://base44.app/api';
const FROM = 'Openinvite <hello@openinvite.com.au>';

/**
 * Verify the request comes from a real authenticated Base44 user.
 * Returns the user object if valid, null otherwise.
 */
async function verifyUser(token) {
  if (!token) return null;
  try {
    const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/User/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  console.log('[on-signup] invoked');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate limiting: 5 requests/min per IP ───────────────────────────────
  // Not idempotent (always sends the email when called) and hits Base44 +
  // Resend on every request, so a valid-but-repeated call still costs real
  // API calls and mail credits.
  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'on-signup', 5);
  res.setHeader('X-RateLimit-Limit', '5');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    console.warn('[on-signup] Rate limited:', ip);
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  const { email, name, token } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: '"email" is required' });
  }

  // Verify the caller is a real authenticated user
  const user = await verifyUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized — invalid or missing token' });
  }

  // Use the verified user's email and name as the source of truth
  const verifiedEmail = user.email || email;
  const verifiedName = user.full_name || name || '';

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: verifiedEmail,
      subject: 'Welcome to Openinvite 🎉 — let\'s plan your perfect wedding',
      html: onboardingDay1Email({ email: verifiedEmail, name: verifiedName }),
    });

    console.log('[on-signup] Welcome email sent to:', verifiedEmail, '| id:', result.data?.id);
    return res.status(200).json({ sent: true, id: result.data?.id });
  } catch (err) {
    console.error('[on-signup] Error sending welcome email:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
