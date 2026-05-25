const Stripe = require('stripe');

// Maps Price IDs back to plan names for metadata / success URL
const PRICE_PLAN_MAP = {
  'price_1TavqVJ4ROjxYxkaoCOUvzS8': 'pro',
  'price_1TavrJJ4ROjxYxkaM6oOwBZz': 'ultra',
};

module.exports = async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Guard: secret key ──────────────────────────────────────────────────
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('[checkout] STRIPE_SECRET_KEY is not set');
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY is not configured on this server' });
  }

  // No apiVersion specified — use the SDK default (2026-04-22.dahlia in v22)
  // Specifying old date-only versions risks rejection on newer SDK releases
  const stripe = new Stripe(stripeSecretKey);

  try {
    // ── Body parsing ───────────────────────────────────────────────────────
    // Vercel auto-parses JSON, but fall back to manual parse in case the
    // raw string body arrives (can happen in some Vercel runtime configs)
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (!body || typeof body !== 'object') body = {};

    const { priceId, userEmail, userId } = body;

    console.log('[checkout] Request — priceId:', priceId, '| email:', userEmail || 'none');

    if (!priceId || typeof priceId !== 'string' || !priceId.startsWith('price_')) {
      return res.status(400).json({
        error: 'priceId is required and must be a valid Stripe Price ID (starts with price_)',
      });
    }

    // ── URLs ───────────────────────────────────────────────────────────────
    // Use the canonical app URL env var, fall back to request origin, then
    // the known production domain
    const APP_URL =
      process.env.VITE_APP_URL ||
      (req.headers.origin && !req.headers.origin.includes('localhost')
        ? req.headers.origin
        : null) ||
      'https://openinvite-pearl.vercel.app';

    const plan = PRICE_PLAN_MAP[priceId] || 'pro';

    // ── Create session ─────────────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/payment-success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/pricing`,
      ...(userEmail ? { customer_email: userEmail } : {}),
      metadata: {
        plan,
        ...(userId ? { userId: String(userId) } : {}),
      },
    });

    console.log('[checkout] Session created:', session.id, '→', session.url);
    return res.status(200).json({ url: session.url, sessionId: session.id });

  } catch (err) {
    // Log full error detail so Vercel function logs show the real cause
    console.error('[checkout] Stripe error:', {
      type: err.type,
      code: err.statusCode,
      message: err.message,
      raw: err.raw,
    });
    return res.status(500).json({
      error: err.message || 'Failed to create checkout session',
      type: err.type || 'unknown_error',
      code: err.statusCode || 500,
    });
  }
};
