import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  console.log('[checkout] invoked, key present:', !!process.env.STRIPE_SECRET_KEY);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'aud',
      payment_method_types: [
        'card',
        'afterpay_clearpay',
        'klarna',
      ],
      line_items: [{ price: priceId, quantity: 1 }],
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
