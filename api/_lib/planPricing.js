/**
 * Server-side Stripe price ID → plan tier mapping. One implementation used
 * by both api/create-checkout-session.js (to set session.metadata.plan at
 * creation time) and api/webhooks/stripe.js (to re-derive the tier from the
 * verified session's actual line items) — so the two can never drift, and
 * neither ever has to trust a client-supplied plan string.
 *
 * Multi-currency pricing: AUD stays $79 Pro / $149 Ultra (VITE_STRIPE_PRO_
 * PRICE_ID / VITE_STRIPE_ULTRA_PRICE_ID, unchanged). USD is $59 Pro / $79
 * Ultra, on separate Stripe Price objects attached to the SAME two products
 * (VITE_STRIPE_PRO_PRICE_ID_USD / VITE_STRIPE_ULTRA_PRICE_ID_USD) — four
 * known price IDs total, each mapping to exactly one tier. The tamper-proof
 * property this whole module exists for still holds with four IDs instead
 * of two: tier comes only from which of these four specific price IDs was
 * actually purchased, never a client-supplied currency or plan string.
 *
 * Reads the same env vars the frontend already uses (src/pages/Pricing.jsx,
 * PlanSelection.jsx) — the VITE_ prefix only controls client bundling,
 * Vercel functions can read them same as any other env var.
 */

/**
 * @param {string|null|undefined} priceId
 * @returns {'pro'|'ultra'|null} null when priceId doesn't match any of the
 *   four configured prices — callers must treat this as "unknown", never guess.
 */
export function resolvePlanFromPriceId(priceId) {
  if (!priceId) return null;
  const proPriceIdAud = process.env.VITE_STRIPE_PRO_PRICE_ID;
  const ultraPriceIdAud = process.env.VITE_STRIPE_ULTRA_PRICE_ID;
  const proPriceIdUsd = process.env.VITE_STRIPE_PRO_PRICE_ID_USD;
  const ultraPriceIdUsd = process.env.VITE_STRIPE_ULTRA_PRICE_ID_USD;

  if (ultraPriceIdAud && priceId === ultraPriceIdAud) return 'ultra';
  if (proPriceIdAud && priceId === proPriceIdAud) return 'pro';
  if (ultraPriceIdUsd && priceId === ultraPriceIdUsd) return 'ultra';
  if (proPriceIdUsd && priceId === proPriceIdUsd) return 'pro';
  return null;
}

/**
 * @param {string|null|undefined} priceId
 * @returns {'aud'|'usd'|null} null when priceId doesn't match any of the
 *   four configured prices. Used only to decide Stripe request params that
 *   vary by currency (payment_method_types — Afterpay/Clearpay is AUD-only
 *   on this account) — never used for tier/entitlement decisions, which
 *   stay on resolvePlanFromPriceId above.
 */
export function resolveCurrencyFromPriceId(priceId) {
  if (!priceId) return null;
  const proPriceIdAud = process.env.VITE_STRIPE_PRO_PRICE_ID;
  const ultraPriceIdAud = process.env.VITE_STRIPE_ULTRA_PRICE_ID;
  const proPriceIdUsd = process.env.VITE_STRIPE_PRO_PRICE_ID_USD;
  const ultraPriceIdUsd = process.env.VITE_STRIPE_ULTRA_PRICE_ID_USD;

  if (priceId === proPriceIdAud || priceId === ultraPriceIdAud) return 'aud';
  if (priceId === proPriceIdUsd || priceId === ultraPriceIdUsd) return 'usd';
  return null;
}
