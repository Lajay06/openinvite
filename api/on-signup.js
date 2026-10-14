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
 *  Day 0  — onboarding-day1  "Welcome to Openinvite"
 *           Triggered automatically via this endpoint on signup.
 *
 *  Day 3  — onboarding-day3  "Have you tried Ava yet?"
 *           Send manually via POST /api/send-email or schedule via a cron job:
 *           { template: 'onboarding-day3', to: '<email>', data: { name: '<name>' } }
 *
 *  Day 7  — onboarding-day7  "Your free trial has 7 days left"
 *           Send manually via POST /api/send-email or schedule via a cron job:
 *           { template: 'onboarding-day7', to: '<email>', data: { name: '<name>' } }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Resend } from 'resend';
import { onboardingDay1Email } from './emails/onboarding-day1.js';
import { getTrialStatus } from '../src/lib/trialStatus.js';
import { checkRateLimit, getClientIp } from './_lib/security.js';
import { TOO_MANY_TRIES } from './_lib/calmErrors.js';

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
    return res.status(429).json({ error: TOO_MANY_TRIES });
  }

  const { email, name, token } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: '"email" is required' });
  }

  // Verify the caller is a real authenticated user
  const user = await verifyUser(token);
  if (!user) {
    // A CODE, NOT A SENTENCE. Owner ruling 2026-10-13: Base44's signup hook is
    // the only caller, so there is no person to read a line here.
    return res.status(401).json({ code: 'UNAUTHORIZED' });
  }

  // A GIFTED ACCOUNT IS NOT ON A TRIAL AND IS NOT WELCOMED AS ONE.
  //
  // Owner ruling 2026-10-14. Someone handed a gift gets lane B's gift welcome
  // instead, so sending this one as well would be two welcomes, one of them
  // announcing a trial they are not on.
  //
  // planSource is a declared User field (base44/entities/User.jsonc, enum
  // purchase|gift|comp, no default) and api/_lib/giftClaim.js writes "gift" in
  // the same write that changes the plan. The claim then routes an unfinished
  // account to /onboarding, which is what calls this route, so the value is
  // already on the record by the time this runs.
  //
  // A CODE, NOT A SENTENCE, and 200 rather than an error: nothing went wrong,
  // and the only caller is a hook with no person reading it.
  if (user.planSource === 'gift') {
    console.log('[on-signup] Gifted account, no trial welcome sent');
    return res.status(200).json({ sent: false, code: 'GIFT_ACCOUNT' });
  }

  // Use the verified user's email and name as the source of truth
  const verifiedEmail = user.email || email;
  const verifiedName = user.full_name || name || '';

  // THE OPENING LINE FOLLOWS THE ACCOUNT, not the assumption that a new signup
  // is always on a trial. getTrialStatus is the one definition of that, and it
  // already answers false for a paid plan.
  const { trialActive } = getTrialStatus(user);

  try {
    // ONE WELCOME PER ACCOUNT, ENFORCED AT RESEND. This route is not
    // idempotent by itself and the rate limit is per IP, so two calls from the
    // same onboarding (a retry, a double submit) sent two emails. The key is
    // the account, so the second call is answered from the first send.
    // Same construction as api/cron/send-gift-reveals.js.
    const result = await resend.emails.send({
      from: FROM,
      to: verifiedEmail,
      subject: 'Welcome to Openinvite. Let\'s plan your perfect wedding',
      html: onboardingDay1Email({
        email: verifiedEmail, name: verifiedName, onTrial: trialActive, plan: user.plan,
      }),
    }, { idempotencyKey: `welcome-${user.id}` });

    console.log('[on-signup] Welcome email sent to:', verifiedEmail, '| id:', result.data?.id);
    return res.status(200).json({ sent: true, id: result.data?.id });
  } catch (err) {
    console.error('[on-signup] Error sending welcome email:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
