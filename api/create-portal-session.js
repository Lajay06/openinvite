import Stripe from 'stripe';
import { applyCors } from './_lib/security.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // ── CORS ────────────────────────────────────────────────────────────────────
  if (applyCors(req, res)) return; // handled OPTIONS preflight

  console.log('[portal] invoked, key present:', !!process.env.STRIPE_SECRET_KEY);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerId } = req.body || {};

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://openinvite.com.au/account',
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[portal] Stripe error:', {
      message: err.message,
      type: err.type,
      code: err.code,
      statusCode: err.statusCode,
    });
    return res.status(500).json({ error: err.message });
  }
}
