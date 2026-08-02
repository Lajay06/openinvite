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
 *   checkout.session.completed WHERE metadata.purchaseType === 'gift'
 *     (PR G4, gifting v2 bridge) → routes to a SEPARATE branch,
 *     handleGiftCheckoutSessionCompleted, below. This branch NEVER writes a
 *     User.plan for anyone — it only mints a one-time Stripe Promotion Code
 *     and records a PlanGift row. The actual plan grant for a gift
 *     recipient happens later, through this SAME EXISTING non-gift branch,
 *     when the recipient redeems that code at their own normal checkout —
 *     writeBase44UserPlan() is called from exactly one place in this file,
 *     unchanged, regardless of whether the plan being granted was gifted.
 *     One small, explicitly-flagged, best-effort addition exists at the
 *     tail of the existing branch's success path: if the completed session
 *     used a promotion code that matches a PlanGift row, that row is marked
 *     redeemed. It is wrapped in try/catch, never affects the response
 *     status, and never runs before the real plan write.
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
import { giftReceiptEmail } from '../emails/gift-receipt.js';
import { giftRevealEmail } from '../emails/gift-reveal.js';
import { resolvePlanFromPriceId } from '../_lib/planPricing.js';
import { getBase44User, writeBase44UserPlan } from '../_lib/base44Admin.js';
import { hashId, encryptString, generateGiftCode } from '../_lib/giftAuth.js';
import { createPlanGift, findPlanGiftBySessionId, findPlanGiftByPromotionCodeId, updatePlanGift } from '../_lib/planGift.js';
import { isValidEmail } from '../_lib/security.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Openinvite <hello@openinvite.com.au>';
// Real, monitored support inbox (not a log line) — where a gift-recipient
// email delivery failure gets surfaced for manual follow-up (PR G4).
const OWNER_ALERT_ADDRESS = 'hello@openinvite.com.au';

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

// Stripe Checkout custom fields (text type) come back as
// { key, type: 'text', text: { value } | null } — null when an optional
// field was left blank. Trimmed, never assumed non-empty.
function getCustomFieldValue(session, key) {
  const field = (session.custom_fields || []).find((f) => f.key === key);
  const value = field?.text?.value;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Internal alert — not customer-facing. Sent to the real, monitored support
 * inbox (not just a Vercel log line) when a gift's recipient email could
 * not be sent, so a human can follow up. Failure here is logged only; it
 * must never affect the webhook's response, since the buyer's own receipt
 * (which always sends, and always includes the code as a fallback) is what
 * actually keeps the gift from being stranded.
 */
async function sendOwnerGiftAlert({ sendEmail, sessionId, plan, code, reason }) {
  try {
    await sendEmail({
      from: FROM,
      to: OWNER_ALERT_ADDRESS,
      subject: `[Action needed] Gift recipient email failed to send`,
      html: `<p>A gift purchase (${plan}, session ${sessionId}) could not be emailed to its recipient.</p>
<p>Reason: ${reason}</p>
<p>Redemption code: <strong>${code}</strong></p>
<p>The buyer's own receipt still includes this code as a fallback, but consider following up directly.</p>`,
    });
  } catch (err) {
    console.error('[stripe-webhook] Owner gift alert email also failed to send:', err.message);
  }
}

/**
 * All the business logic for a GIFT-MODE checkout.session.completed event
 * (PR G4, gifting v2 bridge) — metadata.purchaseType === 'gift'. This
 * function NEVER writes a User.plan for anyone; it only mints a one-time
 * redemption code and records a PlanGift row. See this file's header
 * comment for how the actual grant happens later, through the existing,
 * unmodified handleCheckoutSessionCompleted below.
 *
 * stripeImpl is injectable (defaults to the module's real Stripe client)
 * so this stays testable the same way the rest of this file is — the only
 * difference from handleCheckoutSessionCompleted is that gift creation
 * itself genuinely needs live Stripe calls (minting a coupon + promotion
 * code), which is exactly why this whole branch needs its own live
 * test-mode evidence run before merge.
 *
 * @returns {Promise<{status: number, body: object}>}
 */
export async function handleGiftCheckoutSessionCompleted(verifiedSession, {
  adminKey = process.env.BASE44_ADMIN_KEY,
  fetchImpl,
  stripeImpl = stripe,
  sendEmail = (opts) => resend.emails.send(opts),
} = {}) {
  const sessionPriceId = verifiedSession.line_items?.data?.[0]?.price?.id;
  let plan = resolvePlanFromPriceId(sessionPriceId);
  if (!plan) {
    const metadataPlan = verifiedSession.metadata?.plan;
    if (metadataPlan === 'pro' || metadataPlan === 'ultra') plan = metadataPlan;
  }

  console.log('[stripe-webhook] gift checkout.session.completed:', {
    sessionId: verifiedSession.id,
    plan: plan || '(unresolved)',
  });

  if (!plan) {
    console.error(
      '[stripe-webhook] PAID GIFT SESSION — could not resolve a plan tier from price ID or metadata:',
      { sessionId: verifiedSession.id, sessionPriceId, metadata: verifiedSession.metadata },
      '— gift NOT created. Needs manual review.',
    );
    return { status: 200, body: { received: true } };
  }

  if (!adminKey) {
    console.error(
      '[stripe-webhook] GIFT ACTIVATION FAILED — BASE44_ADMIN_KEY not set, cannot record gift:',
      { sessionId: verifiedSession.id, plan },
    );
    return { status: 500, body: { error: 'Server misconfiguration: BASE44_ADMIN_KEY not set' } };
  }

  // ── Idempotency ──────────────────────────────────────────────────────────
  // Stripe may redeliver this event. If a PlanGift already exists for this
  // session, a real coupon/promotion code was already minted — never mint
  // a second one or re-send either email on a replay.
  const existingGift = await findPlanGiftBySessionId(verifiedSession.id, adminKey, fetchImpl);
  if (existingGift) {
    console.log('[stripe-webhook] Gift already created — skipping duplicate event:', { sessionId: verifiedSession.id });
    return { status: 200, body: { received: true } };
  }

  const buyerEmail = verifiedSession.customer_email || verifiedSession.customer_details?.email || '';
  const buyerName = verifiedSession.customer_details?.name || '';
  const buyerUserId = verifiedSession.client_reference_id || null;

  const recipientEmailRaw = getCustomFieldValue(verifiedSession, 'recipient_email');
  const recipientNoteRaw = getCustomFieldValue(verifiedSession, 'recipient_note');
  // Stripe's custom fields are plain text with no built-in email format
  // enforcement — validated here before this value is ever treated as a
  // real, sendable address.
  const recipientEmailValid = !!(recipientEmailRaw && isValidEmail(recipientEmailRaw));

  // ── Mint a one-time, single-use, tier-scoped redemption code ───────────
  let coupon, promotionCode, code;
  try {
    // Scopes the 100%-off discount to the gifted tier's own Stripe Product
    // only — without this, a Pro-gift code could be pasted against an
    // Ultra checkout for a free upgrade. Confirmed working against a real
    // Stripe test-mode call (live evidence run, PR G4) — applies_to on
    // Coupon.create is accepted as written here.
    const price = sessionPriceId ? await stripeImpl.prices.retrieve(sessionPriceId) : null;
    const productId = typeof price?.product === 'string' ? price.product : price?.product?.id;

    coupon = await stripeImpl.coupons.create({
      percent_off: 100,
      duration: 'once',
      name: `Gift — ${plan} — ${verifiedSession.id.slice(-8)}`,
      ...(productId ? { applies_to: { products: [productId] } } : {}),
    });

    code = generateGiftCode();
    // promotionCodes.create's real (current API version) shape nests the
    // coupon reference under `promotion: { type: 'coupon', coupon }` — a
    // flat top-level `coupon` field (what the API looked like from memory)
    // is rejected with "Received unknown parameter: coupon". Caught and
    // fixed via the required live test-mode evidence run before merge.
    promotionCode = await stripeImpl.promotionCodes.create({
      promotion: { type: 'coupon', coupon: coupon.id },
      code,
      max_redemptions: 1,
      metadata: { plan_gift_session: verifiedSession.id, plan },
    });
  } catch (err) {
    console.error(
      '[stripe-webhook] GIFT ACTIVATION FAILED — Stripe coupon/promotion code creation failed:',
      { sessionId: verifiedSession.id, plan, error: err.message },
      '— needs manual review.',
    );
    return { status: 502, body: { error: 'Failed to create gift code — will retry' } };
  }

  const record = {
    stripe_session_id: verifiedSession.id,
    plan,
    currency: verifiedSession.currency || '',
    amount_cents: verifiedSession.amount_total ?? 0,
    buyer_user_id_hash: buyerUserId ? hashId(buyerUserId) : null,
    buyer_email_enc: buyerEmail ? encryptString(buyerEmail) : null,
    buyer_name_enc: buyerName ? encryptString(buyerName) : null,
    recipient_email_enc: encryptString(recipientEmailRaw || ''),
    recipient_note_enc: recipientNoteRaw ? encryptString(recipientNoteRaw) : null,
    promotion_code_id: promotionCode.id,
    promotion_code_display: code,
    coupon_id: coupon.id,
    recipient_email_sent: false,
    status: 'purchased',
    purchased_at: new Date().toISOString(),
  };

  const createResult = await createPlanGift(record, adminKey, fetchImpl);
  if (!createResult.ok) {
    console.error(
      '[stripe-webhook] GIFT ACTIVATION FAILED — PlanGift create failed:',
      { sessionId: verifiedSession.id, plan, status: createResult.status, body: createResult.body },
      '— needs manual review.',
    );
    return { status: 502, body: { error: 'Failed to record gift — will retry' } };
  }

  // ── Recipient reveal email — best-effort, never blocks the response ────
  let recipientEmailSent = false;
  let recipientEmailError = null;
  if (recipientEmailValid) {
    try {
      const { html } = giftRevealEmail({ plan, code, note: recipientNoteRaw, buyerLabel: buyerName || null });
      const result = await sendEmail({
        from: FROM,
        to: recipientEmailRaw,
        subject: `You've been gifted Openinvite ${plan === 'ultra' ? 'Ultra' : 'Pro'}`,
        html,
      });
      recipientEmailSent = true;
      console.log('[stripe-webhook] Gift reveal email sent to recipient:', '| id:', result?.data?.id);
    } catch (err) {
      recipientEmailError = `send failed: ${err.message}`.slice(0, 200);
      console.error('[stripe-webhook] Gift reveal email failed to send:', err.message);
    }
  } else {
    recipientEmailError = 'recipient email missing or invalid format';
    console.warn('[stripe-webhook] Gift recipient email missing/invalid — buyer fallback code is the only delivery:', { sessionId: verifiedSession.id });
  }

  if (!recipientEmailSent) {
    await sendOwnerGiftAlert({ sendEmail, sessionId: verifiedSession.id, plan, code, reason: recipientEmailError });
  }

  if (recipientEmailSent || recipientEmailError) {
    const updateResult = await updatePlanGift(createResult.id, { recipient_email_sent: recipientEmailSent, recipient_email_error: recipientEmailError }, adminKey, fetchImpl);
    if (!updateResult.ok) {
      console.error('[stripe-webhook] Could not record recipient email delivery status on PlanGift (non-fatal):', updateResult.body);
    }
  }

  // ── Buyer receipt — always sent, includes the code as a fallback ───────
  if (buyerEmail) {
    try {
      const html = giftReceiptEmail({ plan, recipientEmail: recipientEmailRaw || '(not provided)', code, recipientEmailSent });
      const result = await sendEmail({
        from: FROM,
        to: buyerEmail,
        subject: `Your Openinvite ${plan === 'ultra' ? 'Ultra' : 'Pro'} gift is confirmed`,
        html,
      });
      console.log('[stripe-webhook] Gift receipt email sent to buyer:', '| id:', result?.data?.id);
    } catch (err) {
      // Non-critical, same convention as the existing purchase-confirmation
      // path: the gift itself is already fully recorded and (if valid)
      // already delivered to the recipient — a failed receipt email alone
      // never turns this into a retry.
      console.error('[stripe-webhook] Gift receipt email failed (gift already recorded, not retrying for this):', err.message);
    }
  } else {
    console.warn('[stripe-webhook] No buyer email on gift session:', verifiedSession.id);
  }

  return { status: 200, body: { received: true } };
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
        subject: `You're on Openinvite ${planLabel}: payment confirmed`,
        html: purchaseConfirmationEmail({ plan, email }),
      });
      console.log('[stripe-webhook] Purchase email sent to:', email, '| id:', result?.data?.id);
    } catch (err) {
      console.error('[stripe-webhook] Confirmation email failed (plan already activated, not retrying for this):', err.message);
    }
  } else {
    console.warn('[stripe-webhook] No email address on session:', verifiedSession.id);
  }

  // ── Gift redemption tracking (PR G4) — best-effort, pure reporting ─────
  // Runs only AFTER the real plan write above already succeeded. Never
  // throws out of this function, never changes the response status, never
  // affects whether the recipient got their plan — that already happened
  // via the exact same writeBase44UserPlan() call every purchase uses.
  // This only marks a PlanGift row 'redeemed' for visibility, if this
  // session happens to have used one of its promotion codes. The exact
  // field path for reading an applied discount's promotion code was not
  // verified against a live call before writing this — the live test-mode
  // evidence run must confirm it actually finds the code on a real gift
  // redemption; a miss here just means the PlanGift row stays 'purchased'
  // (cosmetic-only staleness), it can never re-grant or block a plan.
  try {
    const discounts = verifiedSession.total_details?.breakdown?.discounts || [];
    for (const d of discounts) {
      const promoRef = d?.discount?.promotion_code;
      const promotionCodeId = typeof promoRef === 'string' ? promoRef : promoRef?.id;
      if (!promotionCodeId) continue;
      const gift = await findPlanGiftByPromotionCodeId(promotionCodeId, adminKey, fetchImpl);
      if (gift && gift.status !== 'redeemed') {
        await updatePlanGift(gift.id, {
          status: 'redeemed',
          redeemed_at: new Date().toISOString(),
          redeemed_user_id_hash: userId ? hashId(userId) : null,
        }, adminKey, fetchImpl);
        console.log('[stripe-webhook] Gift marked redeemed:', { planGiftId: gift.id, promotionCodeId });
      }
    }
  } catch (err) {
    console.warn('[stripe-webhook] Gift redemption tracking failed (non-fatal, plan already granted):', err.message);
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
        // total_details.breakdown.discounts (PR G4) is used only by the
        // best-effort gift-redemption-tracking tail in
        // handleCheckoutSessionCompleted — widened here rather than a
        // second retrieve call, since Stripe allows requesting it alongside
        // line_items in one round trip.
        const verifiedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items', 'total_details.breakdown.discounts'],
        });

        // Gift-mode purchases route to a completely separate branch that
        // never writes a User.plan — see this file's header comment and
        // handleGiftCheckoutSessionCompleted's own docstring.
        const { status, body } = verifiedSession.metadata?.purchaseType === 'gift'
          ? await handleGiftCheckoutSessionCompleted(verifiedSession)
          : await handleCheckoutSessionCompleted(verifiedSession);
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
