/**
 * GET /api/cron/send-onboarding-emails
 *
 * Vercel Cron — runs daily at 09:00 UTC (schedule defined in vercel.json).
 *
 * Each run:
 *   1. Fetches all Base44 users via the admin REST API.
 *   2. Identifies users who signed up in the day-3 window (72–96 h ago)
 *      and sends the "Have you tried Ava yet?" email.
 *   3. Identifies users who signed up in the day-7 window (168–192 h ago)
 *      and sends the "Your free trial has 7 days left" email.
 *   4. Skips users already on a paid plan (plan === 'pro' | 'ultra').
 *   5. Logs a per-run summary and returns it as JSON.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REQUIRED ENV VARS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   CRON_SECRET        — Vercel injects this automatically. The cron
 *                        invocation sends  Authorization: Bearer {CRON_SECRET}.
 *                        Add it to Vercel project settings → Environment Variables
 *                        if you need to call the endpoint manually too.
 *
 *   BASE44_ADMIN_KEY   — A server-side-only Base44 token with read access to
 *                        all User entities in the app. Obtain from the Base44
 *                        dashboard → Settings → API Keys → Service Account.
 *                        Add to Vercel project settings → Environment Variables
 *                        (do NOT prefix with VITE_ — it must stay server-only).
 *
 *   RESEND_API_KEY     — Resend API key (already configured).
 *   VITE_BASE44_APP_ID — Base44 app ID (already configured).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EMAIL SEQUENCE OVERVIEW
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   Day 0   onboarding-day1  "Welcome to Openinvite 🎉"
 *           Triggered on signup via POST /api/on-signup.
 *
 *   Day 3   onboarding-day3  "Have you tried Ava yet? 👋"
 *           Sent by THIS cron to users whose created_date is 72–96 h ago.
 *
 *   Day 7   onboarding-day7  "Your free trial has 7 days left ⏰"
 *           Sent by THIS cron to users whose created_date is 168–192 h ago.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TIMING WINDOW RATIONALE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   The cron runs once per day (09:00 UTC). Using a 24-hour window means
 *   every user will be matched by exactly one daily run, regardless of what
 *   time of day they signed up. No user is emailed twice; no user is skipped
 *   as long as the cron runs at least once per day.
 *
 *   Day 3 window : 72 h ≤ age < 96 h   (signed up between 3–4 days ago)
 *   Day 7 window : 168 h ≤ age < 192 h (signed up between 7–8 days ago)
 */

import { Resend } from 'resend';
import { onboardingDay3Email } from '../emails/onboarding-day3.js';
import { onboardingDay7Email } from '../emails/onboarding-day7.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);

const BASE44_API    = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

const FROM = 'Openinvite <hello@openinvite.com.au>';

// 24-hour windows (in hours) — ensures each user matches exactly one run
const DAY3_MIN_H = 72;  // 3 days
const DAY3_MAX_H = 96;  // 4 days
const DAY7_MIN_H = 168; // 7 days
const DAY7_MAX_H = 192; // 8 days

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if `createdDate` falls within [minHours, maxHours) ago.
 * @param {string|null|undefined} createdDate  ISO-8601 date string from Base44
 * @param {number} minHours
 * @param {number} maxHours
 */
function isInWindow(createdDate, minHours, maxHours) {
  if (!createdDate) return false;
  const ageHours = (Date.now() - new Date(createdDate).getTime()) / 3_600_000;
  return ageHours >= minHours && ageHours < maxHours;
}

/** Returns true for users who are already on a paid plan — skip them. */
function isPaid(user) {
  return user.plan === 'pro' || user.plan === 'ultra';
}

/**
 * Fetch all User entities from Base44 via the admin REST API.
 * Handles both plain-array and envelope responses.
 *
 * @returns {Promise<Array>}
 * @throws  {Error} if BASE44_ADMIN_KEY is missing or the API call fails
 */
async function fetchAllUsers() {
  if (!BASE44_ADMIN_KEY) {
    throw new Error(
      'BASE44_ADMIN_KEY env var is not set. ' +
      'Add a Base44 service-account token to Vercel project settings ' +
      '(Settings → Environment Variables) to enable cron-based emails.'
    );
  }

  const url = `${BASE44_API}/apps/${BASE44_APP_ID}/entities/User?limit=1000&sort=-created_date`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Base44 API responded ${res.status}: ${body.slice(0, 200)}`);
  }

  const payload = await res.json();

  // Normalise: Base44 may return a plain array or { data: [...] } / { results: [...] }
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data))    return payload.data;
  if (Array.isArray(payload.results)) return payload.results;

  console.warn('[cron] Unexpected Base44 response shape:', JSON.stringify(payload).slice(0, 200));
  return [];
}

/**
 * Send a single onboarding email, catching individual failures so one bad
 * address doesn't abort the whole run.
 *
 * @param {string}   to
 * @param {string}   name
 * @param {string}   subject
 * @param {Function} htmlFn   — template function: ({ email, name }) => html string
 * @returns {{ ok: boolean, id?: string, error?: string }}
 */
async function sendEmail(to, name, subject, htmlFn) {
  try {
    const html   = htmlFn({ email: to, name: name || '' });
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    return { ok: true, id: result.data?.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const runAt = new Date().toISOString();
  console.log('[cron/send-onboarding-emails] run started at', runAt);

  // Vercel Cron always uses GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Auth: verify CRON_SECRET ───────────────────────────────────────────────
  // Vercel automatically adds  Authorization: Bearer {CRON_SECRET}  to every
  // cron invocation. We also honour manual calls that supply the same secret.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth  = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (token !== cronSecret) {
      console.warn('[cron] Rejected — invalid or missing Authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    // No secret configured — allow in dev; warn loudly
    console.warn('[cron] CRON_SECRET not set — skipping auth check (dev/preview only)');
  }

  // ── Fetch all users ────────────────────────────────────────────────────────
  let allUsers;
  try {
    allUsers = await fetchAllUsers();
    console.log(`[cron] Fetched ${allUsers.length} user(s) from Base44`);
  } catch (err) {
    console.error('[cron] Could not fetch users:', err.message);
    return res.status(500).json({ error: err.message });
  }

  // ── Per-run counters ───────────────────────────────────────────────────────
  const tally = {
    day3: { sent: 0, skipped_paid: 0, failed: 0, no_email: 0 },
    day7: { sent: 0, skipped_paid: 0, failed: 0, no_email: 0 },
  };

  // ── Process each user ──────────────────────────────────────────────────────
  for (const user of allUsers) {
    const email = user.email;
    const name  = user.full_name || '';

    if (!email) {
      // Users without email addresses can't receive email — skip silently
      tally.day3.no_email++;
      tally.day7.no_email++;
      continue;
    }

    // ── Day-3 email ──────────────────────────────────────────────────────────
    if (isInWindow(user.created_date, DAY3_MIN_H, DAY3_MAX_H)) {
      if (isPaid(user)) {
        console.log(`[cron] day3 skip (paid plan: ${user.plan}): ${email}`);
        tally.day3.skipped_paid++;
      } else {
        const r = await sendEmail(
          email, name,
          'Have you tried Ava yet? 👋',
          onboardingDay3Email
        );
        if (r.ok) {
          console.log(`[cron] day3 sent → ${email} | id: ${r.id}`);
          tally.day3.sent++;
        } else {
          console.error(`[cron] day3 failed → ${email} | ${r.error}`);
          tally.day3.failed++;
        }
      }
    }

    // ── Day-7 email ──────────────────────────────────────────────────────────
    if (isInWindow(user.created_date, DAY7_MIN_H, DAY7_MAX_H)) {
      if (isPaid(user)) {
        console.log(`[cron] day7 skip (paid plan: ${user.plan}): ${email}`);
        tally.day7.skipped_paid++;
      } else {
        const r = await sendEmail(
          email, name,
          'Your free trial has 7 days left ⏰',
          onboardingDay7Email
        );
        if (r.ok) {
          console.log(`[cron] day7 sent → ${email} | id: ${r.id}`);
          tally.day7.sent++;
        } else {
          console.error(`[cron] day7 failed → ${email} | ${r.error}`);
          tally.day7.failed++;
        }
      }
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('[cron] Run complete:', JSON.stringify({ runAt, tally }));

  return res.status(200).json({
    ok:    true,
    runAt,
    users: allUsers.length,
    tally,
  });
}
