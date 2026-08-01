/**
 * src/lib/checkoutSession.js
 *
 * Shared checkout-session-creation logic for ChoosePlan.jsx and Account.jsx
 * (the in-app upgrade path) — mirrors the error-handling pattern already
 * shipped in Pricing.jsx's own startCheckout, extracted here so it's
 * unit-testable without a JSX/React render pipeline (this file has no JSX,
 * so it can be imported directly by a plain Node test).
 *
 * Every failure path sets a distinct, user-visible checkoutError message
 * via the injected setter — network error, a non-JSON response (e.g. a
 * Vite dev 404), an API-returned error, or an unexpected exception. Success
 * navigates the browser to the Stripe-hosted checkout URL.
 */

// Optional chaining on import.meta.env — Vite injects this at build/dev
// time in the browser, but plain Node (used by tests/persistence/*.mjs to
// import this file directly) leaves import.meta.env undefined, so this
// must degrade to the fallback rather than throw.
const AUD_PRICE_IDS = {
  pro:   import.meta.env?.VITE_STRIPE_PRO_PRICE_ID   || 'price_1TavqVJ4ROjxYxkaoCOUvzS8',
  ultra: import.meta.env?.VITE_STRIPE_ULTRA_PRICE_ID || 'price_1TavrJJ4ROjxYxkaM6oOwBZz',
};
const USD_PRICE_IDS = {
  pro:   import.meta.env?.VITE_STRIPE_PRO_PRICE_ID_USD   || '',
  ultra: import.meta.env?.VITE_STRIPE_ULTRA_PRICE_ID_USD || '',
};

// Canonical display amounts per currency — kept here (not derived from
// Stripe, which has no client-safe way to read a Price's amount without an
// API round trip) so any surface showing "what will this actually charge"
// can stay in sync with resolveCheckoutPriceId's own choice of price ID
// below, rather than a separately-hardcoded number that can drift from it.
export const PLAN_PRICES = {
  usd: { pro: 49, ultra: 99 },
  aud: { pro: 79, ultra: 149 },
};

/**
 * USD-first: prefers the USD Stripe Price for a plan, falling back to AUD
 * only if the USD env var isn't configured yet — e.g. before
 * VITE_STRIPE_PRO_PRICE_ID_USD / VITE_STRIPE_ULTRA_PRICE_ID_USD have been
 * set in Vercel. This is a defensive "never send Stripe an empty priceId"
 * guard, not an expected steady-state path — the merge for this PR is
 * gated on those two env vars actually being set first.
 *
 * @param {'pro'|'ultra'} plan
 * @returns {{ priceId: string, currency: 'usd'|'aud' }}
 */
export function resolveCheckoutPriceId(plan) {
  const usdId = USD_PRICE_IDS[plan];
  if (usdId) return { priceId: usdId, currency: 'usd' };
  return { priceId: AUD_PRICE_IDS[plan], currency: 'aud' };
}

/**
 * @param {'pro'|'ultra'} plan
 * @param {(plan: string|null) => void} setLoadingPlan
 * @param {(msg: string|null) => void} setCheckoutError
 * @param {{ resolveUser?: () => Promise<{email?:string,id?:string}>, doFetch?: typeof fetch, redirect?: (url: string) => void, logPrefix?: string }} [deps] — injectable for tests
 */
export async function startCheckout(plan, setLoadingPlan, setCheckoutError, deps = {}) {
  const {
    resolveUser = async () => (await import('@/api/base44Client')).base44.auth.me(),
    doFetch = (...args) => fetch(...args),
    redirect = (url) => { window.location.href = url; },
    logPrefix = '[ChoosePlan checkout]',
  } = deps;

  const { priceId } = resolveCheckoutPriceId(plan);
  setLoadingPlan(plan);
  setCheckoutError(null);

  try {
    let userEmail = '';
    let userId = '';
    try {
      const me = await resolveUser();
      userEmail = me?.email || '';
      userId = me?.id || '';
    } catch (authErr) {
      console.warn(`${logPrefix} Could not resolve user — continuing as guest:`, authErr);
    }

    let res;
    try {
      res = await doFetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userEmail, userId }),
      });
    } catch (networkErr) {
      console.error(`${logPrefix} Network error — is the API reachable?`, networkErr);
      setCheckoutError('Network error: could not reach the checkout server. Please try again.');
      return;
    }

    // Safely parse — response may be HTML (Vite dev 404) rather than JSON
    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.error(`${logPrefix} Non-JSON response received:`, text.slice(0, 300));
      setCheckoutError(
        res.status === 404
          ? 'Checkout API not found. This works on Vercel: run `vercel dev` to test locally.'
          : `Server error ${res.status}. Please try again.`
      );
      return;
    }

    if (data.url) {
      redirect(data.url);
    } else {
      const rawMsg = data.error || 'Checkout session could not be created.';
      console.error(`${logPrefix} API returned error:`, rawMsg, '| type:', data.type, '| code:', data.code);
      // The backend's "userId is required" is a real, correct guard (see
      // api/create-checkout-session.js) — no account means no checkout,
      // full stop. Now that every logged-out entry point routes through
      // /register first (Pricing.jsx, ChoosePlan.jsx), this should only
      // ever surface here as a defensive fallback — translate it to
      // something a visitor can act on instead of the raw backend string.
      const msg = rawMsg === 'userId is required'
        ? 'Create an account to check out — head to signup first.'
        : rawMsg;
      setCheckoutError(msg);
    }
  } catch (err) {
    console.error(`${logPrefix} Unexpected error:`, err);
    setCheckoutError('Something went wrong. Please try again.');
  } finally {
    setLoadingPlan(null);
  }
}
