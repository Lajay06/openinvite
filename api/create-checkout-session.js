const Stripe = require('stripe');

// Price IDs come from env vars; hardcoded values are the fallback safety net.
const PRICE_IDS = {
  pro:   process.env.VITE_STRIPE_PRO_PRICE_ID   || 'price_1TavqVJ4ROjxYxkaoCOUvzS8',
  ultra: process.env.VITE_STRIPE_ULTRA_PRICE_ID || 'price_1TavrJJ4ROjxYxkaM6oOwBZz',
};

const VALID_PLANS = new Set(Object.keys(PRICE_IDS));

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

  try {
    const { plan, userEmail, userId } = req.body || {};

    if (!plan || !VALID_PLANS.has(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be "pro" or "ultra".' });
    }

    const priceId = PRICE_IDS[plan];
    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://openinvite.com.au';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/payment-success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      ...(userEmail ? { customer_email: userEmail } : {}),
      metadata: {
        plan,
        ...(userId ? { userId } : {}),
      },
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
};
