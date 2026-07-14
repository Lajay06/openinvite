/**
 * Server-side Stripe price ID → plan tier mapping. One implementation used
 * by both api/create-checkout-session.js (to set session.metadata.plan at
 * creation time) and api/webhooks/stripe.js (to re-derive the tier from the
 * verified session's actual line items) — so the two can never drift, and
 * neither ever has to trust a client-supplied plan string.
 *
 * Reads the same VITE_STRIPE_PRO_PRICE_ID / VITE_STRIPE_ULTRA_PRICE_ID env
 * vars the frontend already uses (src/pages/Pricing.jsx, PlanSelection.jsx)
 * — the VITE_ prefix only controls client bundling, Vercel functions can
 * read them same as any other env var.
 */

/**
 * @param {string|null|undefined} priceId
 * @returns {'pro'|'ultra'|null} null when priceId doesn't match either
 *   configured price — callers must treat this as "unknown", never guess.
 */
export function resolvePlanFromPriceId(priceId) {
  if (!priceId) return null;
  const proPriceId = process.env.VITE_STRIPE_PRO_PRICE_ID;
  const ultraPriceId = process.env.VITE_STRIPE_ULTRA_PRICE_ID;
  if (ultraPriceId && priceId === ultraPriceId) return 'ultra';
  if (proPriceId && priceId === proPriceId) return 'pro';
  return null;
}
