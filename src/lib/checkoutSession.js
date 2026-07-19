/**
 * src/lib/checkoutSession.js
 *
 * Shared checkout-session-creation logic for PlanSelection.jsx (in-app
 * upgrade path) — mirrors the error-handling pattern already shipped in
 * Pricing.jsx's own startCheckout, extracted here so it's unit-testable
 * without a JSX/React render pipeline (this file has no JSX, so it can be
 * imported directly by a plain Node test).
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
const PRICE_IDS = {
  pro:   import.meta.env?.VITE_STRIPE_PRO_PRICE_ID   || 'price_1TavqVJ4ROjxYxkaoCOUvzS8',
  ultra: import.meta.env?.VITE_STRIPE_ULTRA_PRICE_ID || 'price_1TavrJJ4ROjxYxkaM6oOwBZz',
};

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
    logPrefix = '[PlanSelection checkout]',
  } = deps;

  const priceId = PRICE_IDS[plan];
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
      const msg = data.error || 'Checkout session could not be created.';
      console.error(`${logPrefix} API returned error:`, msg, '| type:', data.type, '| code:', data.code);
      setCheckoutError(msg);
    }
  } catch (err) {
    console.error(`${logPrefix} Unexpected error:`, err);
    setCheckoutError('Something went wrong. Please try again.');
  } finally {
    setLoadingPlan(null);
  }
}
