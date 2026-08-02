import Stripe from 'stripe';
import {
  applyCors,
  checkRateLimit,
  getClientIp,
  isValidPriceId,
} from './_lib/security.js';
import { resolvePlanFromPriceId, resolveCurrencyFromPriceId } from './_lib/planPricing.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Afterpay/Clearpay on this (Australian) Stripe account only supports AUD —
// requesting it on a USD session can fail the session outright. Klarna is
// AU-available in AUD; left off the USD list rather than assumed safe,
// since it hasn't been verified against this account's USD Klarna
// availability. card is the only method guaranteed to work in both.
// Exported for direct unit testing — this must never regress to a
// currency-blind array again without a test catching it.
export function getPaymentMethodTypes(currency) {
  return currency === 'aud' ? ['card', 'afterpay_clearpay', 'klarna'] : ['card'];
}

/**
 * Builds the params object passed to stripe.checkout.sessions.create(...).
 * Extracted as its own pure function (PR G4) so the gift-mode branching —
 * metadata.purchaseType, the two Stripe custom fields, the gift-specific
 * success/cancel URLs — is unit-testable without a live Stripe network
 * call, same "exported for direct unit testing" convention this file
 * already applies to getPaymentMethodTypes above.
 */
export function buildCheckoutSessionParams({ priceId, plan, currency, userId, customerEmail, isGift, appUrl }) {
  return {
    mode: 'payment',
    payment_method_types: getPaymentMethodTypes(currency),
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: isGift ? { plan, purchaseType: 'gift' } : { plan },
    ...(userId ? { client_reference_id: userId } : {}),
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    ...(isGift ? {
      custom_fields: [
        {
          key: 'recipient_email',
          label: { type: 'custom', custom: "Recipient's email" },
          type: 'text',
          text: { minimum_length: 5, maximum_length: 200 },
          optional: false,
        },
        {
          key: 'recipient_note',
          label: { type: 'custom', custom: 'A personal note (optional)' },
          type: 'text',
          text: { maximum_length: 500 },
          optional: true,
        },
      ],
    } : {}),
    success_url: isGift
      ? `${appUrl}/gift/success?session_id={CHECKOUT_SESSION_ID}`
      : `${appUrl}/payment-success?plan=${plan}&checkout=success`,
    cancel_url: isGift
      ? `${appUrl}/gifting?checkout=cancelled`
      : `${appUrl}/pricing?checkout=cancelled`,
  };
}

export default async function handler(req, res) {
  // ── CORS ────────────────────────────────────────────────────────────────────
  if (applyCors(req, res)) return; // handled OPTIONS preflight

  console.log('[checkout] invoked, key present:', !!process.env.STRIPE_SECRET_KEY);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate limiting: 10 requests/min per IP ──────────────────────────────────
  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'checkout', 10);
  res.setHeader('X-RateLimit-Limit', '10');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    console.warn('[checkout] Rate limited:', ip);
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  try {
    const { priceId, userId, userEmail, email, giftMode } = req.body || {};
    const customerEmail = (userEmail || email || '').trim();
    const isGift = giftMode === true;

    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    // Required for a normal self-purchase — this is the only reliable,
    // tamper-resistant link between the Stripe session and the Base44 User
    // record the webhook must credit. Without it, a completed payment
    // would have no way to reach a plan.
    //
    // NOT required in gift mode (PR G4): the buyer isn't the one receiving
    // the plan, and gifting doesn't require the buyer to have an Openinvite
    // account at all — nothing about the buyer's own account is touched by
    // this purchase. The webhook's gift-mode branch never writes a plan for
    // anyone off this session; see api/webhooks/stripe.js.
    if (!userId && !isGift) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // ── Validate priceId format ────────────────────────────────────────────
    if (!isValidPriceId(priceId)) {
      console.warn('[checkout] Invalid priceId format:', priceId);
      return res.status(400).json({ error: 'Invalid priceId format' });
    }

    // ── Resolve to a known plan — reject anything else outright. Silently
    // defaulting an unrecognised priceId to a plan (the previous behaviour:
    // "anything that isn't the Pro price is Ultra") would let a forged or
    // stale price ID buy the wrong tier.
    const plan = resolvePlanFromPriceId(priceId);
    if (!plan) {
      console.warn('[checkout] priceId does not match a known plan:', priceId);
      return res.status(400).json({ error: 'priceId does not match a configured plan' });
    }
    console.log('[checkout] resolved plan:', plan, '| priceId:', priceId);

    // Currency comes from the Price object itself, never a client-supplied
    // field — same tamper-proof property as plan resolution above. Falls
    // back to 'aud' only in the defensive/unreachable case where plan
    // resolved but currency somehow didn't (both derive from the same four
    // configured price IDs, so in practice this never disagrees) — 'aud'
    // matches this account's pre-multi-currency default, not a guess.
    const currency = resolveCurrencyFromPriceId(priceId) || 'aud';
    console.log('[checkout] resolved currency:', currency, '| priceId:', priceId);

    const appUrl = process.env.VITE_APP_URL || 'https://openinvite.com.au';

    // No top-level `currency` — Stripe infers it from the referenced Price
    // object itself, and errors if a top-level currency were passed that
    // didn't match ("The price specified only supports `usd`. This doesn't
    // match the expected currency: `aud`.", confirmed empirically via the
    // Stripe CLI while adding USD prices). priceId can now resolve to
    // either an AUD or a USD price, so hardcoding one here would break
    // checkout for whichever currency wasn't hardcoded.
    //
    // allow_promotion_codes surfaces Stripe's own "Add promotion code"
    // field on the hosted checkout page — the one mechanism for both
    // marketing discount codes and gift/comp codes. A discount never
    // changes which price ID Stripe records on the completed session, so
    // plan/currency resolution above and the webhook's own resolution are
    // both unaffected regardless of what code (if any) gets applied here.
    // This is also the exact field the RECIPIENT of a gift uses to redeem
    // the one-time code from a gift-mode purchase (PR G4) — through this
    // same normal, non-gift checkout path.
    //
    // Gift mode collects who the plan is for right here on the buyer's own
    // hosted checkout page (custom_fields) — no separate "send" step or
    // page on our side. Stripe's custom fields are plain text with no
    // built-in email format enforcement; the webhook's gift branch
    // validates the value before treating it as a real address.
    const session = await stripe.checkout.sessions.create(
      buildCheckoutSessionParams({ priceId, plan, currency, userId, customerEmail, isGift, appUrl })
    );

    return res.status(200).json({ url: session.url });
  } catch (err) {
    // Log full error detail — visible in Vercel function logs
    console.error('[checkout] Stripe error:', {
      message: err.message,
      type: err.type,          // e.g. 'StripeInvalidRequestError'
      code: err.code,          // e.g. 'resource_missing'
      statusCode: err.statusCode,
      priceId: req.body?.priceId,
    });
    return res.status(500).json({ error: err.message });
  }
}
