/**
 * GET /api/cron/check-activation-mismatch
 *
 * Vercel Cron — runs every 15 minutes (schedule in vercel.json). Independent
 * safety net on top of api/webhooks/stripe.js's own "[stripe-webhook]
 * ACTIVATION FAILED" logging: re-derives, from Stripe itself, every
 * checkout.session.completed event in the last ~20 minutes (a 5-minute
 * overlap over the 15-minute schedule, so a slow/delayed cron tick can
 * never leave a gap between windows), resolves which plan tier and which
 * Base44 user each paid session should have activated (same resolution the
 * webhook uses: price ID first, session.metadata.plan fallback), and checks
 * whether that user's actual User.plan matches. Any mismatch — the write
 * never happened, the webhook was never delivered, the wrong plan landed,
 * whatever the cause — gets emailed to hello@ so a human looks at it within
 * minutes of the failure, not whenever someone happens to grep Vercel logs.
 *
 * Scope: non-gift purchases only (metadata.purchaseType !== 'gift'). Gift
 * checkouts never write a User.plan directly (see
 * handleGiftCheckoutSessionCompleted's docstring) and already have their own
 * synchronous alert path (sendOwnerGiftAlert, also to hello@) for a failed
 * PlanGift write — duplicating that here would just double-alert the same
 * failure.
 *
 * This is a recency check, not an indefinite watchdog: a session that
 * ages out of the ~20-minute window without ever being fixed stops
 * appearing here. That's deliberate — its "[stripe-webhook] ACTIVATION
 * FAILED" log line is still there for as long as Vercel retains logs, and
 * Stripe itself keeps retrying a 5xx webhook response for ~3 days. This
 * cron's job is the fast, proactive nudge in the first ~20 minutes; those
 * two existing mechanisms are what carry a not-yet-fixed failure beyond
 * that.
 *
 * Live evidence run (2026-08-03, test mode): created a real Stripe Checkout
 * Session with a deliberately nonexistent client_reference_id, then ran
 * stripe.events.list({type, created:{gte}}) (the one Stripe call this file
 * introduces that no other endpoint in this codebase already uses),
 * stripe.checkout.sessions.retrieve(id, {expand:['line_items']}) (already
 * proven in api/webhooks/stripe.js, re-confirmed here), and a real
 * getBase44User() lookup against that nonexistent id — confirmed it
 * resolves the price id to 'pro' and returns null, i.e. a genuine mismatch
 * by this file's own comparison. Also ran the full handler() end-to-end
 * against the real account with no CRON_SECRET set (dev/preview path) —
 * clean 200 with 0 events in the (real, empty) window. The alert-email
 * send itself was NOT exercised by a real mismatch in this run (none
 * existed in the live window); it reuses the same resend.emails.send()
 * call already proven elsewhere in this codebase (purchase-confirmation,
 * sendOwnerGiftAlert), just with a new HTML body.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY   — Stripe secret key
 *   BASE44_ADMIN_KEY    — to read each candidate user's actual plan
 *   RESEND_API_KEY      — to send the alert email
 *   CRON_SECRET         — Vercel injects this automatically; see the
 *                         auth block below for the fail-closed rule.
 */

import Stripe from 'stripe';
import { Resend } from 'resend';
import { resolvePlanFromPriceId } from '../_lib/planPricing.js';
import { getBase44User } from '../_lib/base44Admin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Openinvite <hello@openinvite.com.au>';
const ALERT_ADDRESS = 'hello@openinvite.com.au';

// Cron runs every 15 minutes (vercel.json); the extra 5 minutes of overlap
// guards against a delayed tick ever leaving an uncovered gap between runs.
const WINDOW_SECONDS = 20 * 60;

// Defensive cap only — normal checkout volume in a 20-minute window is
// nowhere near this. If it's ever hit, that's itself worth knowing about,
// so it's logged rather than silently truncated.
const MAX_EVENTS_SCANNED = 500;

/**
 * @returns {Promise<{sessionId: string, userId: string|null, email: string|null,
 *   expectedPlan: 'pro'|'ultra', actualPlan: string|null, createdAt: string}|null>}
 *   null means "not a checkable candidate" (gift mode, unresolved plan, or
 *   no client_reference_id — all of these are already logged loudly by the
 *   webhook itself at the moment they happen, so silently skipping them
 *   here is not a silent failure, just not this cron's job to re-report).
 */
async function checkSessionForMismatch(session, adminKey, fetchImpl) {
  if (session.metadata?.purchaseType === 'gift') return null;
  if (session.payment_status !== 'paid') return null;

  let full;
  try {
    full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] });
  } catch (err) {
    console.error('[cron/check-activation-mismatch] Could not retrieve session (skipped):', session.id, err.message);
    return null;
  }

  const sessionPriceId = full.line_items?.data?.[0]?.price?.id;
  let expectedPlan = resolvePlanFromPriceId(sessionPriceId);
  if (!expectedPlan) {
    const metadataPlan = full.metadata?.plan;
    if (metadataPlan === 'pro' || metadataPlan === 'ultra') expectedPlan = metadataPlan;
  }
  if (!expectedPlan) return null;

  const userId = full.client_reference_id;
  if (!userId) return null;

  const user = await getBase44User(userId, adminKey, fetchImpl);
  const actualPlan = user?.plan ?? null;
  if (actualPlan === expectedPlan) return null; // activated correctly — no mismatch

  return {
    sessionId: full.id,
    userId,
    email: full.customer_email || full.customer_details?.email || null,
    expectedPlan,
    actualPlan,
    createdAt: new Date(full.created * 1000).toISOString(),
  };
}

function renderAlertEmail(mismatches) {
  const rows = mismatches.map((m) => `
    <tr>
      <td>${m.sessionId}</td>
      <td>${m.email || '(unknown)'}</td>
      <td>${m.expectedPlan}</td>
      <td>${m.actualPlan || '(none)'}</td>
      <td>${m.createdAt}</td>
    </tr>`).join('');

  return `
    <p><strong>${mismatches.length}</strong> paid checkout session${mismatches.length === 1 ? '' : 's'}
    in the last ~20 minutes did not result in the expected plan activation.</p>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><th>Session</th><th>Email</th><th>Expected plan</th><th>Actual plan</th><th>Checkout completed</th></tr>
      ${rows}
    </table>
    <p>Search Vercel function logs for each session ID and for
    "[stripe-webhook] ACTIVATION FAILED" around the same timestamp to find
    the root cause. If Base44 was down or BASE44_ADMIN_KEY was briefly
    misconfigured, Stripe's own webhook retries (~3 days) may resolve this
    on their own — but a paying customer is currently without their plan,
    so don't assume that without checking.</p>`;
}

export default async function handler(req, res) {
  const runAt = new Date().toISOString();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (token !== cronSecret) {
      console.warn('[cron/check-activation-mismatch] Rejected — invalid or missing Authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    // Fail closed in production — same rule every other cron and the
    // Stripe webhook itself already apply. Vercel injects CRON_SECRET
    // automatically for its own scheduled invocations; a production
    // deployment missing it is a config error, not a reason to proceed.
    console.error('[cron/check-activation-mismatch] Refusing to run in production — CRON_SECRET is not set');
    return res.status(401).json({ error: 'CRON_SECRET is required in production' });
  } else {
    console.warn('[cron/check-activation-mismatch] CRON_SECRET not set — skipping auth check (dev/preview only)');
  }

  const adminKey = process.env.BASE44_ADMIN_KEY;
  if (!adminKey) {
    console.error('[cron/check-activation-mismatch] FAILURE — BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const sinceUnix = Math.floor(Date.now() / 1000) - WINDOW_SECONDS;

  const mismatches = [];
  let scanned = 0;
  let capped = false;

  try {
    const events = stripe.events.list({
      type: 'checkout.session.completed',
      created: { gte: sinceUnix },
      limit: 100,
    });

    for await (const event of events) {
      scanned++;
      if (scanned > MAX_EVENTS_SCANNED) {
        capped = true;
        console.warn('[cron/check-activation-mismatch] Hit MAX_EVENTS_SCANNED cap — some events in this window were not checked:', { scanned });
        break;
      }
      const result = await checkSessionForMismatch(event.data.object, adminKey);
      if (result) mismatches.push(result);
    }
  } catch (err) {
    console.error('[cron/check-activation-mismatch] FAILURE — could not list/check Stripe events:', err.message);
    return res.status(500).json({ ok: false, runAt, error: err.message });
  }

  for (const m of mismatches) {
    console.error('[cron/check-activation-mismatch] ACTIVATION FAILED — paid session without matching plan:', m);
  }

  if (mismatches.length > 0) {
    try {
      const result = await resend.emails.send({
        from: FROM,
        to: ALERT_ADDRESS,
        subject: `[Action needed] ${mismatches.length} activation mismatch${mismatches.length === 1 ? '' : 'es'} detected`,
        html: renderAlertEmail(mismatches),
      });
      console.log('[cron/check-activation-mismatch] Alert email sent:', '| id:', result?.data?.id);
    } catch (err) {
      // The mismatches are already logged loudly above regardless of
      // whether this email sends — a failed alert email must never be the
      // only record of a real activation failure.
      console.error('[cron/check-activation-mismatch] Alert email failed to send (mismatches still logged above):', err.message);
    }
  }

  return res.status(200).json({ ok: true, runAt, scanned, capped, mismatches: mismatches.length });
}
