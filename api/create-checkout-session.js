import Stripe from 'stripe';
import {
  applyCors,
  checkRateLimit,
  getClientIp,
  isValidPriceId,
} from './_lib/security.js';
import { resolvePlanFromPriceId } from './_lib/planPricing.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

    const appUrl = process.env.VITE_APP_URL || 'https://openinvite.com.au';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'aud',
      payment_method_types: [
        'card',
        'afterpay_clearpay',
        'klarna',
      ],
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
