import Stripe from 'stripe';
import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // ── CORS ────────────────────────────────────────────────────────────────────
  if (applyCors(req, res)) return; // handled OPTIONS preflight

  console.log('[portal] invoked, key present:', !!process.env.STRIPE_SECRET_KEY);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate limiting: 10 requests/min per IP ──────────────────────────────
  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'portal-session', 10);
  res.setHeader('X-RateLimit-Limit', '10');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    console.warn('[portal] Rate limited:', ip);
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  // ── Auth: customerId is derived from the verified caller, never trusted
  // from the client body — a client-supplied customerId would let anyone
  // who knows/guesses another user's Stripe customer id open THEIR billing
  // portal (view/change payment methods, cancel their subscription).
  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const customerId = caller.stripeCustomerId;
  if (!customerId) {
    return res.status(400).json({ error: 'No billing account found for this user.' });
  }

  try {
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
