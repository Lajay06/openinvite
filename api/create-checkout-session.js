import Stripe from 'stripe';
import {
  applyCors,
  checkRateLimit,
  getClientIp,
  isValidPriceId,
} from './_lib/security.js';

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

    // ── Validate priceId format ────────────────────────────────────────────
    if (!isValidPriceId(priceId)) {
      console.warn('[checkout] Invalid priceId format:', priceId);
      return res.status(400).json({ error: 'Invalid priceId format' });
    }

    const plan = priceId === process.env.VITE_STRIPE_PRO_PRICE_ID ? 'pro' : 'ultra';
    console.log('[checkout] resolved plan:', plan, '| priceId:', priceId);

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
      ...(userId ? { client_reference_id: userId } : {}),
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      success_url: `${process.env.VITE_APP_URL || 'https://openinvite.com.au'}/dashboard?checkout=success`,
      cancel_url: `${process.env.VITE_APP_URL || 'https://openinvite.com.au'}/pricing?checkout=cancelled`,
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
