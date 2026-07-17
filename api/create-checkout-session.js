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
    const { priceId, userId, userEmail, email } = req.body || {};
    const customerEmail = (userEmail || email || '').trim();

    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    // Required — this is the only reliable, tamper-resistant link between
    // the Stripe session and the Base44 User record the webhook must credit.
    // Without it, a completed payment would have no way to reach a plan.
    if (!userId) {
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

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // No top-level `currency` — Stripe infers it from the referenced
      // Price object itself, and errors if a top-level currency were passed
      // that didn't match ("The price specified only supports `usd`. This
      // doesn't match the expected currency: `aud`.", confirmed empirically
      // via the Stripe CLI while adding USD prices). priceId can now resolve
      // to either an AUD or a USD price, so hardcoding one here would break
      // checkout for whichever currency wasn't hardcoded.
      payment_method_types: getPaymentMethodTypes(currency),
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { plan },
      // client_reference_id is how the webhook knows WHOSE User record to
      // credit — Stripe echoes it back untouched on the completed session,
      // so it can't be tampered with in transit the way a client-trusted
      // field could be.
      ...(userId ? { client_reference_id: userId } : {}),
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      success_url: `${appUrl}/payment-success?plan=${plan}&checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    });

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
