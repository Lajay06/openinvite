/**
 * tests/persistence/checkout-error-handling.mjs
 *
 * Covers the AUDIT_2026-07.md fix: PlanSelection.jsx's in-app upgrade path
 * (the checkout flow reachable from Account.jsx/CouplesStudio.jsx) used to
 * swallow every failure into an empty catch — the button just stopped
 * spinning with zero user feedback. startCheckout (src/lib/checkoutSession.js,
 * extracted from PlanSelection.jsx so it's testable without a JSX render
 * pipeline) now mirrors Pricing.jsx's already-shipped error handling.
 *
 * Each assertion forces a real failure mode via injected fakes (doFetch,
 * resolveUser, redirect) and confirms setCheckoutError is called with a
 * distinct, non-empty message for that mode — no live network/Base44 calls.
 */

import { pass, fail } from './_shared.mjs';
import { startCheckout } from '../../src/lib/checkoutSession.js';

function fakeSetters() {
  const state = { loadingPlan: 'unset', checkoutError: 'unset', redirectedTo: null };
  return {
    state,
    setLoadingPlan: (v) => { state.loadingPlan = v; },
    setCheckoutError: (v) => { state.checkoutError = v; },
    redirect: (url) => { state.redirectedTo = url; },
  };
}

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

function htmlResponse(status, text) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => 'text/html' },
    text: async () => text,
  };
}

export async function runCheckoutErrorHandling() {
  const results = [];

  console.log('\n  Checkout error handling — every failure path forced, real function under test:\n');

  // ── 1. Network error (fetch itself throws) ──────────────────────────────
  {
    const { state, setLoadingPlan, setCheckoutError, redirect } = fakeSetters();
    await startCheckout('pro', setLoadingPlan, setCheckoutError, {
      resolveUser: async () => ({ email: 'test@example.com', id: 'user-1' }),
      doFetch: async () => { throw new TypeError('Failed to fetch'); },
      redirect,
    });
    const ok = typeof state.checkoutError === 'string' && state.checkoutError.length > 0
      && state.checkoutError.toLowerCase().includes('network');
    results.push(ok
      ? pass('Network error → visible, network-specific checkoutError', state.checkoutError)
      : fail('Network error → visible, network-specific checkoutError', 'a network-related message', state.checkoutError));
    results.push(state.loadingPlan === null
      ? pass('Network error → loadingPlan reset to null (spinner stops)', 'null')
      : fail('Network error → loadingPlan reset to null (spinner stops)', null, state.loadingPlan));
    results.push(state.redirectedTo === null
      ? pass('Network error → never redirects', 'null')
      : fail('Network error → never redirects', null, state.redirectedTo));
  }

  // ── 2. Non-JSON response (e.g. a Vite dev 404 / stray HTML page) ────────
  {
    const { state, setLoadingPlan, setCheckoutError, redirect } = fakeSetters();
    await startCheckout('pro', setLoadingPlan, setCheckoutError, {
      resolveUser: async () => ({ email: 'test@example.com', id: 'user-1' }),
      doFetch: async () => htmlResponse(404, '<html>Not Found</html>'),
      redirect,
    });
    const ok = typeof state.checkoutError === 'string' && state.checkoutError.length > 0;
    results.push(ok
      ? pass('Non-JSON 404 response → visible checkoutError', state.checkoutError)
      : fail('Non-JSON 404 response → visible checkoutError', 'a non-empty message', state.checkoutError));
    results.push(state.redirectedTo === null
      ? pass('Non-JSON 404 response → never redirects', 'null')
      : fail('Non-JSON 404 response → never redirects', null, state.redirectedTo));
  }

  // ── 3. API returns 200 but with an error body (no url, no data.error) ───
  {
    const { state, setLoadingPlan, setCheckoutError, redirect } = fakeSetters();
    await startCheckout('pro', setLoadingPlan, setCheckoutError, {
      resolveUser: async () => ({ email: 'test@example.com', id: 'user-1' }),
      doFetch: async () => jsonResponse(400, { error: 'priceId does not match a configured plan' }),
      redirect,
    });
    results.push(state.checkoutError === 'priceId does not match a configured plan'
      ? pass('API-returned error → checkoutError shows the real server message', state.checkoutError)
      : fail('API-returned error → checkoutError shows the real server message', 'priceId does not match a configured plan', state.checkoutError));
  }

  // ── 4. Unexpected exception (e.g. res.json() itself throws) ─────────────
  {
    const { state, setLoadingPlan, setCheckoutError, redirect } = fakeSetters();
    await startCheckout('ultra', setLoadingPlan, setCheckoutError, {
      resolveUser: async () => ({ email: 'test@example.com', id: 'user-1' }),
      doFetch: async () => ({
        status: 200, ok: true,
        headers: { get: () => 'application/json' },
        json: async () => { throw new SyntaxError('Unexpected token in JSON'); },
      }),
      redirect,
    });
    const ok = typeof state.checkoutError === 'string' && state.checkoutError.length > 0;
    results.push(ok
      ? pass('Unexpected exception → visible fallback checkoutError', state.checkoutError)
      : fail('Unexpected exception → visible fallback checkoutError', 'a non-empty message', state.checkoutError));
  }

  // ── 5. Happy path — confirm success still works and clears any prior error ──
  {
    const { state, setLoadingPlan, setCheckoutError, redirect } = fakeSetters();
    setCheckoutError('stale error from a previous attempt');
    await startCheckout('pro', setLoadingPlan, setCheckoutError, {
      resolveUser: async () => ({ email: 'test@example.com', id: 'user-1' }),
      doFetch: async () => jsonResponse(200, { url: 'https://checkout.stripe.com/c/pay/cs_test_abc' }),
      redirect,
    });
    results.push(state.redirectedTo === 'https://checkout.stripe.com/c/pay/cs_test_abc'
      ? pass('Happy path → redirects to the real Stripe URL', state.redirectedTo)
      : fail('Happy path → redirects to the real Stripe URL', 'https://checkout.stripe.com/c/pay/cs_test_abc', state.redirectedTo));
    results.push(state.checkoutError === null
      ? pass('Happy path → clears any stale checkoutError from a prior attempt', 'null')
      : fail('Happy path → clears any stale checkoutError from a prior attempt', null, state.checkoutError));
  }

  // ── 6. Auth resolution failing must not block checkout (guest fallback) ──
  {
    const { state, setLoadingPlan, setCheckoutError, redirect } = fakeSetters();
    await startCheckout('pro', setLoadingPlan, setCheckoutError, {
      resolveUser: async () => { throw new Error('not logged in'); },
      doFetch: async () => jsonResponse(200, { url: 'https://checkout.stripe.com/c/pay/cs_test_guest' }),
      redirect,
    });
    results.push(state.redirectedTo === 'https://checkout.stripe.com/c/pay/cs_test_guest'
      ? pass('Auth resolution failure → still proceeds to checkout as guest', state.redirectedTo)
      : fail('Auth resolution failure → still proceeds to checkout as guest', 'https://checkout.stripe.com/c/pay/cs_test_guest', state.redirectedTo));
  }

  return results;
}
