/**
 * src/lib/currencyPricing.js
 *
 * Shared checkout-currency logic for Pricing.jsx and PlanSelection.jsx —
 * one source of truth so the two pages can never disagree about which
 * price ID or which displayed amount goes with AUD vs USD.
 *
 * This is deliberately separate from src/contexts/CurrencyContext.jsx,
 * which is a much broader *display* currency preference (18 currencies,
 * live exchange-rate conversion, used for showing budget amounts etc.
 * throughout the dashboard). Checkout can only ever charge in a currency
 * Stripe has a real Price object for — today that's exactly AUD or USD —
 * so a User.currency of anything other than the literal string 'USD'
 * (including AUD, or any of CurrencyContext's other 16 currencies) maps to
 * AUD here. This is a deliberate narrowing, not a bug: flagged explicitly
 * in case a user's broader display-currency preference (e.g. GBP) is ever
 * expected to steer checkout currency too — it doesn't today, because
 * there is no GBP price to check out with.
 */

export const PLAN_PRICES = {
  AUD: { pro: 79, ultra: 149 },
  USD: { pro: 59, ultra: 79 },
};

export const PRICE_IDS = {
  AUD: {
    pro:   import.meta.env.VITE_STRIPE_PRO_PRICE_ID   || 'price_1TavqVJ4ROjxYxkaoCOUvzS8',
    ultra: import.meta.env.VITE_STRIPE_ULTRA_PRICE_ID || 'price_1TavrJJ4ROjxYxkaM6oOwBZz',
  },
  USD: {
    pro:   import.meta.env.VITE_STRIPE_PRO_PRICE_ID_USD   || '',
    ultra: import.meta.env.VITE_STRIPE_ULTRA_PRICE_ID_USD || '',
  },
};

/** @returns {'USD'|'AUD'} the checkout currency for a logged-in user — only an exact 'USD' preference maps to USD, everything else defaults to AUD. */
export function currencyForUser(user) {
  return user?.currency === 'USD' ? 'USD' : 'AUD';
}

/**
 * Resolves the default checkout currency for an ANONYMOUS visitor via
 * /api/geo-currency (Vercel's x-vercel-ip-country header, US → USD, else
 * AUD). Never throws — falls back to AUD on any network/parse failure so
 * the pricing page always has a sensible default to render immediately.
 */
export async function currencyFromGeoIp() {
  try {
    const res = await fetch('/api/geo-currency');
    if (!res.ok) return 'AUD';
    const data = await res.json();
    return data.currency === 'USD' ? 'USD' : 'AUD';
  } catch {
    return 'AUD';
  }
}

/** "$59 USD" / "$79 AUD" — explicit currency code, zero ambiguity. */
export function formatPlanPrice(currency, plan) {
  const amount = PLAN_PRICES[currency]?.[plan];
  return `$${amount} ${currency}`;
}
