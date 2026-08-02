/**
 * GET /api/dev-send-test-onboarding
 *
 * TEMPORARY, one-off endpoint — sends both real onboarding-cron emails
 * (day3 "Have you tried Ava yet?" and day7 "Your free trial has 7 days
 * left") to a fixed test recipient, so the send path can be verified end
 * to end. Every production run of send-onboarding-emails.js checked so far
 * (2026-07-21 through 2026-08-01) shows sent:0 for both templates — no real
 * account has ever fallen in a matching window since the cron's 2026-07-20
 * fix (PR #184), so the Resend send path for these two templates has never
 * actually been exercised. This endpoint calls the same template functions
 * and the same Resend client directly, bypassing the window/user-matching
 * logic (already covered by the 12 boundary-condition unit tests in
 * tests/persistence/onboarding-cron-window.mjs) to isolate and confirm just
 * the render+send path.
 *
 * Same pattern as PR #185's api/dev-send-test-digest.js. Delete this file
 * (and DEV_ONBOARDING_SECRET from Vercel's Preview environment) once the
 * send is confirmed — it has no reason to reach production and must not be
 * merged to main.
 *
 * Auth: DEV_ONBOARDING_SECRET, a dedicated one-off secret generated
 * specifically for this endpoint and added to Vercel's Preview environment
 * only (not Production, not CRON_SECRET or any other existing secret).
 */

import { Resend } from 'resend';
import { onboardingDay3Email } from './emails/onboarding-day3.js';
import { onboardingDay7Email } from './emails/onboarding-day7.js';

const FROM = 'Openinvite <hello@openinvite.com.au>';
const TEST_RECIPIENT = 'jaygalaxy23+onboardtest@gmail.com';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  const devSecret = process.env.DEV_ONBOARDING_SECRET;
  if (!devSecret) {
    return res.status(500).json({ error: 'DEV_ONBOARDING_SECRET not set' });
  }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (token !== devSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not set' });
  }

  const results = {};

  try {
    const day3Html = onboardingDay3Email({ email: TEST_RECIPIENT, name: 'Jay' });
    const day3 = await resend.emails.send({
      from: FROM, to: TEST_RECIPIENT,
      subject: 'Have you tried Ava yet? 👋', html: day3Html,
    });
    results.day3 = day3.error
      ? { ok: false, error: day3.error.message || String(day3.error) }
      : { ok: true, resendId: day3.data?.id };
  } catch (err) {
    results.day3 = { ok: false, error: err.message };
  }

  try {
    const day7Html = onboardingDay7Email({ email: TEST_RECIPIENT, name: 'Jay' });
    const day7 = await resend.emails.send({
      from: FROM, to: TEST_RECIPIENT,
      subject: 'Your free trial has 7 days left ⏰', html: day7Html,
    });
    results.day7 = day7.error
      ? { ok: false, error: day7.error.message || String(day7.error) }
      : { ok: true, resendId: day7.data?.id };
  } catch (err) {
    results.day7 = { ok: false, error: err.message };
  }

  const ok = results.day3.ok && results.day7.ok;
  console.log(`[dev-send-test-onboarding] ${ok ? 'SUCCESS' : 'FAILURE'} —`, JSON.stringify(results));
  return res.status(ok ? 200 : 500).json({ ok, to: TEST_RECIPIENT, results });
}
