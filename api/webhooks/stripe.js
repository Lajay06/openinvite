/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY      — Stripe secret key
 *   STRIPE_WEBHOOK_SECRET  — from `stripe listen` output or Stripe Dashboard → Webhooks
 *   RESEND_API_KEY         — Resend API key for sending emails
 *   BASE44_ADMIN_KEY       — Base44 app admin API key (server-only). Required to
 *                            write User.plan; see api/_lib/base44Admin.js for why
 *                            this needs an admin credential rather than the
 *                            regular entities client.
 *   VITE_STRIPE_PRO_PRICE_ID / VITE_STRIPE_ULTRA_PRICE_ID — same price IDs the
 *                            frontend and create-checkout-session.js use, for
 *                            mapping a completed session back to a plan tier.
 *
 * Events handled:
 *   checkout.session.completed → writes User.plan + planActivatedAt, then
 *                                 sends a purchase confirmation email.
 *
 * Signature verification note:
 *   Vercel auto-parses JSON request bodies, consuming the raw stream.
 *   We attempt to read the raw body from the stream first; if already consumed,
 *   we fall back to JSON.stringify(req.body). For exact signature matching,
 *   test with `stripe listen --forward-to` (see README).
 *
 *   Signature verification is only skipped outside production (no
 *   STRIPE_WEBHOOK_SECRET set, for local dev without `stripe listen`). In
 *   production, a missing secret or signature header fails the request
 *   closed (400) rather than silently trusting an unverified payload — this
 *   endpoint can grant paid plan tiers, so an unverified request must never
 *   be treated as real, the same fail-closed rule already applied to
 *   Turnstile verification (api/_lib/security.js).
 *
 * Response status contract for a paid checkout.session.completed:
 *   200 — plan written (or already matched an existing plan — idempotent
 *         replay is success, not failure). A 200 tells Stripe "delivered,
 *         don't retry."
 *   5xx — the session was paid but activation did NOT happen: BASE44_ADMIN_KEY
 *         missing, or the Base44 write itself failed/threw. Returning 200 here
 *         would silently strand a paying customer with no plan and no retry;
 *         5xx makes Stripe retry over its ~3-day window instead. Search
 *         "[stripe-webhook] ACTIVATION FAILED" in logs for either case.
 *   The confirmation email is deliberately NOT part of this contract — a
 *   failed/unsendable email still returns 200, since the plan itself did
 *   activate and email is non-critical.
 */

import Stripe from 'stripe';
import { Resend } from 'resend';
import { purchaseConfirmationEmail } from '../emails/purchase-confirmation.js';
import { resolvePlanFromPriceId } from '../_lib/planPricing.js';
import { getBase44User, writeBase44UserPlan } from '../_lib/base44Admin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Openinvite <hello@openinvite.com.au>';

// Reads the raw request body as a Buffer. Vercel may have already consumed
// the stream for JSON bodies — getRawBody returns '' in that case and we
// fall back to re-stringifying the parsed body.
function getRawBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(Buffer.alloc(0)));
  });
}

/**
 * All the business logic for a checkout.session.completed event, once
 * Stripe has already given us the verified session (network call to Stripe
 * lives in the handler below — this function takes no live dependency on
 * Stripe itself, only on the injectable Base44/email calls, so tests can
 * exercise the full status-code contract without hitting either network).
 *
 * @returns {Promise<{status: number, body: object}>}
 */
export async function handleCheckoutSessionCompleted(verifiedSession, {
  adminKey = process.env.BASE44_ADMIN_KEY,
  fetchImpl,
  sendEmail = (opts) => resend.emails.send(opts),
} = {}) {
  const email =
    verifiedSession.customer_email ||
    verifiedSession.customer_details?.email;

  // ── Resolve plan tier ──────────────────────────────────────────────────
  // Primary: the actual price ID Stripe recorded on the completed session's
  // line items. Fallback: session.metadata.plan, itself set server-side at
  // checkout-creation time from the same resolver (create-checkout-session.js)
  // — not client-supplied, just a second, slightly less direct derivation of
  // the same fact. If NEITHER resolves, we do not guess: log loudly and skip
  // the write rather than silently defaulting to a tier nobody paid for.
  const sessionPriceId = verifiedSession.line_items?.data?.[0]?.price?.id;
  let plan = resolvePlanFromPriceId(sessionPriceId);
  let planSource = plan ? 'price_id' : null;
  if (!plan) {
    const metadataPlan = verifiedSession.metadata?.plan;
    if (metadataPlan === 'pro' || metadataPlan === 'ultra') {
      plan = metadataPlan;
      planSource = 'metadata_fallback';
    }
  }

  const userId = verifiedSession.client_reference_id;

  console.log('[stripe-webhook] checkout.session.completed:', {
    sessionId: verifiedSession.id,
    email: email || '(none)',
    userId: userId || '(none)',
    plan: plan || '(unresolved)',
    planSource: planSource || '(none)',
  });

  if (!plan) {
    console.error(
      '[stripe-webhook] PAID SESSION — could not resolve a plan tier from price ID or metadata:',
      { sessionId: verifiedSession.id, sessionPriceId, metadata: verifiedSession.metadata, email: email || '(unknown)' },
      '— plan NOT written. Needs manual review.',
    );
    return { status: 200, body: { received: true } };
  }

  if (!userId) {
    console.error(
      '[stripe-webhook] PAID SESSION — client_reference_id missing, cannot identify which user to credit:',
      { sessionId: verifiedSession.id, plan, email: email || '(unknown)' },
      '— plan NOT written. Needs manual review.',
    );
    return { status: 200, body: { received: true } };
  }

  if (!adminKey) {
    console.error(
      '[stripe-webhook] ACTIVATION FAILED — BASE44_ADMIN_KEY not set, cannot write plan:',
      { sessionId: verifiedSession.id, userId, plan },
      '— set BASE44_ADMIN_KEY in Vercel environment variables.',
    );
    // 5xx (not 200): this is a paid session we failed to activate due to
    // server misconfiguration. A 200 here would tell Stripe "delivered,
    // don't retry" and the customer would silently never get their plan.
    // A 5xx makes Stripe retry over its ~3-day window, giving time to fix
    // the env var without losing the event.
    return { status: 500, body: { error: 'Server misconfiguration: BASE44_ADMIN_KEY not set' } };
  }

  // ── Idempotency ──────────────────────────────────────────────────────────
  // Stripe may deliver the same event more than once (retries, duplicate
  // delivery). If the user's plan already matches what this event would set,
  // treat it as already-applied: skip both the write and the confirmation
  // email so a replay can't re-send the email or bump planActivatedAt to a
  // later, wrong timestamp.
  const existingUser = await getBase44User(userId, adminKey, fetchImpl);
  if (existingUser && existingUser.plan === plan) {
    console.log('[stripe-webhook] Plan already applied — skipping duplicate event:', { userId, plan, sessionId: verifiedSession.id });
    return { status: 200, body: { received: true } };
  }

  const planActivatedAt = new Date().toISOString();
  const writeResult = await writeBase44UserPlan({ userId, plan, planActivatedAt, adminKey, fetchImpl });

  if (!writeResult.ok) {
    console.error(
      '[stripe-webhook] ACTIVATION FAILED — Base44 plan write FAILED:',
      { userId, plan, sessionId: verifiedSession.id, status: writeResult.status, body: writeResult.body, error: writeResult.error },
      '— needs manual review.',
    );
    // 5xx so Stripe retries — this is a paid session that isn't activated yet,
    // and the failure (Base44 down, bad key, network blip) is very likely
    // transient and self-heals on retry. Never silently 200 a customer who
    // paid but didn't get their plan.
    return { status: 502, body: { error: 'Failed to activate plan — will retry' } };
  }

  console.log('[stripe-webhook] Base44 plan written:', { userId, plan, planSource, sessionId: verifiedSession.id });

  // ── Send confirmation email ─────────────────────────────────────────────
  // Deliberately NOT part of the status-code contract above: the plan is
  // already activated at this point, so a failed/unsendable email must still
  // return 200 — email is non-critical, and turning this into a 5xx would
  // make Stripe retry an already-successful activation (re-writing
  // planActivatedAt, per the idempotency check above, is harmless, but
  // there's no reason to retry for an email failure specifically).
  const planLabel = plan === 'ultra' ? 'Ultra' : 'Pro';
  if (email) {
    try {
      const result = await sendEmail({
        from: FROM,
        to: email,
        subject: `You're on Openinvite ${planLabel} — payment confirmed`,
        html: purchaseConfirmationEmail({ plan, email }),
      });
      console.log('[stripe-webhook] Purchase email sent to:', email, '| id:', result?.data?.id);
    } catch (err) {
      console.error('[stripe-webhook] Confirmation email failed (plan already activated, not retrying for this):', err.message);
    }
  } else {
    console.warn('[stripe-webhook] No email address on session:', verifiedSession.id);
  }

  return { status: 200, body: { received: true } };
}

export default async function handler(req, res) {
  console.log('[stripe-webhook] invoked, method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Attempt 1: read from stream (works when Vercel hasn't consumed it)
    const rawBuffer = await getRawBody(req);
    const rawBody = rawBuffer.length > 0
      ? rawBuffer
      : JSON.stringify(req.body); // fallback: re-stringify parsed body

    if (webhookSecret && sig) {
      // Strict verification: signature must match
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
      // Fail closed in production — never accept an unverified payload on an
      // endpoint that can grant paid plan tiers.
      console.error('[stripe-webhook] Refusing unverified event in production (missing secret or signature header)');
      return res.status(400).json({ error: 'Webhook signature verification is required in production' });
    } else {
      // No secret set (local dev without stripe listen) — use parsed body directly
      console.warn('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification (non-production only)');
      event = req.body;
    }
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature error: ${err.message}` });
  }

  console.log('[stripe-webhook] Event type:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Re-fetch from Stripe with line_items expanded — a secondary guard
        // when raw-body signature verification isn't possible, and gives us
        // the real purchased price ID for tier mapping (never trust the
        // client for what was purchased — this comes straight from Stripe).
        const verifiedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items'],
        });

        const { status, body } = await handleCheckoutSessionCompleted(verifiedSession);
        return res.status(status).json(body);
      }

      default:
        console.log('[stripe-webhook] Unhandled event type (ignored):', event.type);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] Handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
