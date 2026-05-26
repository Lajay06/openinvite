/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY      — Stripe secret key
 *   STRIPE_WEBHOOK_SECRET  — from `stripe listen` output or Stripe Dashboard → Webhooks
 *   RESEND_API_KEY         — Resend API key for sending emails
 *
 * Events handled:
 *   checkout.session.completed → sends purchase confirmation email
 *
 * Signature verification note:
 *   Vercel auto-parses JSON request bodies, consuming the raw stream.
 *   We attempt to read the raw body from the stream first; if already consumed,
 *   we fall back to JSON.stringify(req.body). For exact signature matching,
 *   test with `stripe listen --forward-to` (see README).
 */

import Stripe from 'stripe';
import { Resend } from 'resend';
import { purchaseConfirmationEmail } from '../emails/purchase-confirmation.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Openinvite <hello@openinvite.com.au>';

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
    } else {
      // No secret set (local dev without stripe listen) — use parsed body directly
      console.warn('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
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

        // Verify the session is real by re-fetching from Stripe
        // This is a secondary guard when raw-body signature verification isn't possible
        const verifiedSession = await stripe.checkout.sessions.retrieve(session.id);

        const email =
          verifiedSession.customer_email ||
          verifiedSession.customer_details?.email;

        const plan = verifiedSession.metadata?.plan || 'pro';
        const planLabel = plan === 'ultra' ? 'Ultra' : 'Pro';

        console.log('[stripe-webhook] checkout.session.completed:', {
          sessionId: verifiedSession.id,
          email: email || '(none)',
          plan,
        });

        if (email) {
          const result = await resend.emails.send({
            from: FROM,
            to: email,
            subject: `You're on Openinvite ${planLabel} — payment confirmed`,
            html: purchaseConfirmationEmail({ plan, email }),
          });
          console.log('[stripe-webhook] Purchase email sent to:', email, '| id:', result.data?.id);
        } else {
          console.warn('[stripe-webhook] No email address on session:', verifiedSession.id);
        }
        break;
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
