/**
 * tests/persistence/stripe-webhook.mjs
 *
 * Covers feat/payment-complete and the multi-currency-pricing follow-up:
 * price→tier and price→currency mapping across all four (AUD+USD) known
 * prices, the AUD/USD-conditional payment_method_types Afterpay/Clearpay
 * fix, Stripe signature verification, and the Base44 admin write path the
 * checkout.session.completed handler (api/webhooks/stripe.js) uses to
 * write User.plan.
 *
 * Pure-function + mocked-network tests — no live Base44 or Stripe API calls,
 * no auth needed. Signature verification is tested against the real `stripe`
 * package (constructEvent is pure crypto, no network), so that assertion
 * exercises real library behaviour, not a reimplementation of it.
 */

import Stripe from 'stripe';
import { resolvePlanFromPriceId, resolveCurrencyFromPriceId } from '../../api/_lib/planPricing.js';
import { getBase44User, writeBase44UserPlan } from '../../api/_lib/base44Admin.js';
import { pass, fail } from './_shared.mjs';

const PRO_PRICE_ID = 'price_TEST_PRO_1234567890';
const ULTRA_PRICE_ID = 'price_TEST_ULTRA_1234567890';
const PRO_PRICE_ID_USD = 'price_TEST_PRO_USD_1234567890';
const ULTRA_PRICE_ID_USD = 'price_TEST_ULTRA_USD_1234567890';

export async function runStripeWebhook() {
  const results = [];
  const restore = {
    pro: process.env.VITE_STRIPE_PRO_PRICE_ID,
    ultra: process.env.VITE_STRIPE_ULTRA_PRICE_ID,
    proUsd: process.env.VITE_STRIPE_PRO_PRICE_ID_USD,
    ultraUsd: process.env.VITE_STRIPE_ULTRA_PRICE_ID_USD,
  };
  process.env.VITE_STRIPE_PRO_PRICE_ID = PRO_PRICE_ID;
  process.env.VITE_STRIPE_ULTRA_PRICE_ID = ULTRA_PRICE_ID;
  process.env.VITE_STRIPE_PRO_PRICE_ID_USD = PRO_PRICE_ID_USD;
  process.env.VITE_STRIPE_ULTRA_PRICE_ID_USD = ULTRA_PRICE_ID_USD;

  console.log('\n  Stripe webhook — price ID → plan tier mapping (AUD + USD, four known prices):\n');

  results.push(resolvePlanFromPriceId(PRO_PRICE_ID) === 'pro'
    ? pass('resolvePlanFromPriceId — AUD Pro price ID resolves to \'pro\'', 'pro')
    : fail('resolvePlanFromPriceId — AUD Pro price ID resolves to \'pro\'', 'pro', resolvePlanFromPriceId(PRO_PRICE_ID)));

  // The literal string every gating check in the app compares against
  // (AuthContext.jsx → StudioGuestSuite.jsx:87-88, Account.jsx:65,
  // Layout.jsx:304-305) — this is the "a paid Ultra user resolves as Ultra"
  // guarantee: the webhook's resolved value must be the exact string those
  // checks test for, not just "truthy" or a differently-cased/spelled tier.
  const ultraResolved = resolvePlanFromPriceId(ULTRA_PRICE_ID);
  results.push(ultraResolved === 'ultra'
    ? pass('resolvePlanFromPriceId — AUD Ultra price ID resolves to the exact gating literal \'ultra\'', ultraResolved)
    : fail('resolvePlanFromPriceId — AUD Ultra price ID resolves to the exact gating literal \'ultra\'', 'ultra', ultraResolved));

  results.push(resolvePlanFromPriceId(PRO_PRICE_ID_USD) === 'pro'
    ? pass('resolvePlanFromPriceId — USD Pro price ID resolves to \'pro\'', 'pro')
    : fail('resolvePlanFromPriceId — USD Pro price ID resolves to \'pro\'', 'pro', resolvePlanFromPriceId(PRO_PRICE_ID_USD)));

  const ultraUsdResolved = resolvePlanFromPriceId(ULTRA_PRICE_ID_USD);
  results.push(ultraUsdResolved === 'ultra'
    ? pass('resolvePlanFromPriceId — USD Ultra price ID resolves to the exact gating literal \'ultra\'', ultraUsdResolved)
    : fail('resolvePlanFromPriceId — USD Ultra price ID resolves to the exact gating literal \'ultra\'', 'ultra', ultraUsdResolved));

  results.push(resolvePlanFromPriceId('price_unknown_never_configured') === null
    ? pass('resolvePlanFromPriceId — unrecognised price ID resolves to null, never a guessed tier', 'null')
    : fail('resolvePlanFromPriceId — unrecognised price ID resolves to null, never a guessed tier', 'null', resolvePlanFromPriceId('price_unknown_never_configured')));

  results.push(resolvePlanFromPriceId(null) === null && resolvePlanFromPriceId(undefined) === null
    ? pass('resolvePlanFromPriceId — null/undefined priceId resolves to null, not a throw', 'null')
    : fail('resolvePlanFromPriceId — null/undefined priceId resolves to null, not a throw', 'null', 'threw or returned non-null'));

  console.log('\n  Stripe webhook — price ID → currency mapping:\n');

  results.push(resolveCurrencyFromPriceId(PRO_PRICE_ID) === 'aud' && resolveCurrencyFromPriceId(ULTRA_PRICE_ID) === 'aud'
    ? pass('resolveCurrencyFromPriceId — AUD Pro/Ultra price IDs resolve to \'aud\'', 'aud')
    : fail('resolveCurrencyFromPriceId — AUD Pro/Ultra price IDs resolve to \'aud\'', 'aud', `${resolveCurrencyFromPriceId(PRO_PRICE_ID)}, ${resolveCurrencyFromPriceId(ULTRA_PRICE_ID)}`));

  results.push(resolveCurrencyFromPriceId(PRO_PRICE_ID_USD) === 'usd' && resolveCurrencyFromPriceId(ULTRA_PRICE_ID_USD) === 'usd'
    ? pass('resolveCurrencyFromPriceId — USD Pro/Ultra price IDs resolve to \'usd\'', 'usd')
    : fail('resolveCurrencyFromPriceId — USD Pro/Ultra price IDs resolve to \'usd\'', 'usd', `${resolveCurrencyFromPriceId(PRO_PRICE_ID_USD)}, ${resolveCurrencyFromPriceId(ULTRA_PRICE_ID_USD)}`));

  results.push(resolveCurrencyFromPriceId('price_unknown_never_configured') === null && resolveCurrencyFromPriceId(null) === null
    ? pass('resolveCurrencyFromPriceId — unrecognised/null priceId resolves to null, not a guess', 'null')
    : fail('resolveCurrencyFromPriceId — unrecognised/null priceId resolves to null, not a guess', 'null', 'non-null'));

  console.log('\n  Stripe checkout — payment_method_types is currency-conditional (the Afterpay/Clearpay fix):\n');

  // api/create-checkout-session.js constructs `new Stripe(...)` at module
  // scope (same reason api/webhooks/stripe.js is dynamically imported
  // below) — it throws synchronously on an empty key, so a placeholder is
  // needed before the first import, same pattern as the Stripe/Resend keys
  // further down this file. Only imported once; reused for the rejection-
  // path test later in this function too (ES modules cache on re-import).
  const priorStripeKeyForCheckout = process.env.STRIPE_SECRET_KEY;
  if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = 'sk_test_persistence_suite_placeholder';
  const { default: createCheckoutSessionHandler, getPaymentMethodTypes } = await import('../../api/create-checkout-session.js');
  process.env.STRIPE_SECRET_KEY = priorStripeKeyForCheckout;

  // The actual bug this suite guards against: this account's Afterpay/
  // Clearpay only supports AUD. Before this fix, payment_method_types was a
  // hardcoded ['card','afterpay_clearpay','klarna'] regardless of session
  // currency — a USD session requesting afterpay_clearpay could fail
  // outright. Now: AUD keeps all three, USD gets card only.
  const audMethods = getPaymentMethodTypes('aud');
  results.push(audMethods.includes('card') && audMethods.includes('afterpay_clearpay')
    ? pass('getPaymentMethodTypes(\'aud\') — includes afterpay_clearpay', JSON.stringify(audMethods))
    : fail('getPaymentMethodTypes(\'aud\') — includes afterpay_clearpay', 'includes afterpay_clearpay', JSON.stringify(audMethods)));

  const usdMethods = getPaymentMethodTypes('usd');
  results.push(usdMethods.includes('card') && !usdMethods.includes('afterpay_clearpay') && !usdMethods.includes('klarna')
    ? pass('getPaymentMethodTypes(\'usd\') — card only, no afterpay_clearpay/klarna', JSON.stringify(usdMethods))
    : fail('getPaymentMethodTypes(\'usd\') — card only, no afterpay_clearpay/klarna', '["card"]', JSON.stringify(usdMethods)));

  // Unknown/unset currency must fail closed toward the more restrictive
  // list (no Afterpay), not fail open — same posture as every other
  // "don't guess, don't assume the permissive case" rule in this codebase.
  results.push(!getPaymentMethodTypes(null).includes('afterpay_clearpay') && !getPaymentMethodTypes(undefined).includes('afterpay_clearpay')
    ? pass('getPaymentMethodTypes — unknown currency fails closed (no afterpay_clearpay), not open', 'card only')
    : fail('getPaymentMethodTypes — unknown currency fails closed (no afterpay_clearpay), not open', 'card only', JSON.stringify([getPaymentMethodTypes(null), getPaymentMethodTypes(undefined)])));

  console.log('\n  create-checkout-session — still rejects any price ID outside the known set of four:\n');

  {
    const mockReqRes = (body) => {
      const req = { method: 'POST', headers: {}, body };
      const res = {
        _status: 200, _json: null,
        setHeader() { return this; },
        status(code) { this._status = code; return this; },
        json(obj) { this._json = obj; return this; },
      };
      return { req, res };
    };

    // A well-formed but unrecognised price ID (right shape — isValidPriceId
    // is /^price_[A-Za-z0-9]+$/, no underscores allowed — so this exercises
    // rejection by resolvePlanFromPriceId returning null, not a rejection at
    // the format-validation step, which would be a different, weaker claim
    // than "not one of the four configured prices"). Confirms the new
    // currency-resolution step added ahead of the Stripe call didn't
    // accidentally bypass this existing rejection.
    const { req, res } = mockReqRes({ priceId: 'price_AttackerSupplied1234567890xyz', userId: 'user_test' });
    await createCheckoutSessionHandler(req, res);
    results.push(res._status === 400
      ? pass('create-checkout-session — unrecognised (but well-formed) priceId is rejected with 400', '400')
      : fail('create-checkout-session — unrecognised (but well-formed) priceId is rejected with 400', 400, res._status));
  }

  // Deliberately not testing "a known USD price passes validation" the same
  // way — past the 400 check, the real handler goes on to call the live
  // Stripe API (stripe.checkout.sessions.create), which would create a real
  // (if harmless, test-mode) Stripe session as a side effect of running this
  // suite. The getPaymentMethodTypes assertions above already cover the
  // currency-conditional logic without touching the network; this section
  // only needs the rejection path, which never reaches Stripe.

  process.env.VITE_STRIPE_PRO_PRICE_ID = restore.pro;
  process.env.VITE_STRIPE_ULTRA_PRICE_ID = restore.ultra;
  process.env.VITE_STRIPE_PRO_PRICE_ID_USD = restore.proUsd;
  process.env.VITE_STRIPE_ULTRA_PRICE_ID_USD = restore.ultraUsd;

  console.log('\n  Stripe webhook — signature verification (real `stripe` package, no mocking):\n');

  const webhookSecret = 'whsec_test_secret_for_persistence_suite_only';
  const stripe = new Stripe('sk_test_not_a_real_key_pure_local_verification_only');
  const payload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed', data: { object: { id: 'cs_test' } } });

  let validEventParsed = false;
  try {
    const validSig = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
    const event = stripe.webhooks.constructEvent(payload, validSig, webhookSecret);
    validEventParsed = event?.type === 'checkout.session.completed';
  } catch {
    validEventParsed = false;
  }
  results.push(validEventParsed
    ? pass('stripe.webhooks.constructEvent — a correctly signed event verifies and parses', 'checkout.session.completed')
    : fail('stripe.webhooks.constructEvent — a correctly signed event verifies and parses', 'checkout.session.completed', 'threw or did not parse'));

  let forgedEventRejected = false;
  try {
    // Forged signature header — not derived from the payload/secret at all.
    stripe.webhooks.constructEvent(payload, 't=1,v1=0000000000000000000000000000000000000000000000000000000000000000', webhookSecret);
    forgedEventRejected = false; // should have thrown
  } catch {
    forgedEventRejected = true;
  }
  results.push(forgedEventRejected
    ? pass('stripe.webhooks.constructEvent — a forged/invalid signature is rejected (throws)', 'threw as expected')
    : fail('stripe.webhooks.constructEvent — a forged/invalid signature is rejected (throws)', 'throws', 'did not throw — forged event accepted'));

  let tamperedPayloadRejected = false;
  try {
    const validSig = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
    // Same signature, but the payload is altered after signing — must fail,
    // proving the check covers payload integrity, not just header shape.
    const tamperedPayload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed', data: { object: { id: 'cs_ATTACKER_SUBSTITUTED' } } });
    stripe.webhooks.constructEvent(tamperedPayload, validSig, webhookSecret);
    tamperedPayloadRejected = false;
  } catch {
    tamperedPayloadRejected = true;
  }
  results.push(tamperedPayloadRejected
    ? pass('stripe.webhooks.constructEvent — payload tampered after signing is rejected', 'threw as expected')
    : fail('stripe.webhooks.constructEvent — payload tampered after signing is rejected', 'throws', 'did not throw — tampered payload accepted'));

  console.log('\n  Stripe webhook — Base44 admin write path (mocked fetch, no live app):\n');

  // writeBase44UserPlan — verifies the request shape (URL, method, body) and
  // correctly reports ok:true on a 200.
  {
    let capturedUrl = null;
    let capturedInit = null;
    const fakeFetch = async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return { ok: true, status: 200 };
    };
    const result = await writeBase44UserPlan({
      userId: 'user_123', plan: 'ultra', planActivatedAt: '2026-01-01T00:00:00.000Z',
      adminKey: 'test_admin_key', fetchImpl: fakeFetch,
    });
    const urlOk = capturedUrl?.includes('/entities/User/user_123') && capturedUrl?.includes('api_key=test_admin_key');
    const bodyOk = JSON.parse(capturedInit?.body || '{}');
    results.push(result.ok === true && urlOk && capturedInit?.method === 'PUT' && bodyOk.plan === 'ultra' && bodyOk.planActivatedAt === '2026-01-01T00:00:00.000Z'
      ? pass('writeBase44UserPlan — PUTs to the User entity with plan + planActivatedAt', JSON.stringify(bodyOk))
      : fail('writeBase44UserPlan — PUTs to the User entity with plan + planActivatedAt', '{plan:"ultra",...}', JSON.stringify({ url: capturedUrl, init: capturedInit })));
  }

  // writeBase44UserPlan — a non-ok response is reported as a failure, not
  // silently swallowed (the "webhook failure → logged, not silently lost"
  // requirement — the caller must be able to tell it failed).
  {
    const failingFetch = async () => ({ ok: false, status: 403, text: async () => 'forbidden' });
    const result = await writeBase44UserPlan({
      userId: 'user_123', plan: 'ultra', planActivatedAt: 'x', adminKey: 'bad_key', fetchImpl: failingFetch,
    });
    results.push(result.ok === false && result.status === 403
      ? pass('writeBase44UserPlan — a non-ok Base44 response is reported as a failure, not swallowed', 'ok:false, status:403')
      : fail('writeBase44UserPlan — a non-ok Base44 response is reported as a failure, not swallowed', 'ok:false, status:403', JSON.stringify(result)));
  }

  // getBase44User — used for idempotency (skip re-applying an already-set plan).
  {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ id: 'user_123', plan: 'ultra' }) });
    const user = await getBase44User('user_123', 'test_admin_key', fakeFetch);
    results.push(user?.plan === 'ultra'
      ? pass('getBase44User — reads back the current plan for the idempotency check', 'ultra')
      : fail('getBase44User — reads back the current plan for the idempotency check', 'ultra', JSON.stringify(user)));
  }

  {
    const fakeFetch = async () => ({ ok: false, status: 404 });
    const user = await getBase44User('user_missing', 'test_admin_key', fakeFetch);
    results.push(user === null
      ? pass('getBase44User — a failed lookup returns null, not a throw', 'null')
      : fail('getBase44User — a failed lookup returns null, not a throw', 'null', JSON.stringify(user)));
  }

  console.log('\n  Stripe webhook — activation status-code contract (a paid session that fails to activate must NOT return 200):\n');

  // api/webhooks/stripe.js constructs `new Stripe(...)` / `new Resend(...)` at
  // module scope — Resend's constructor throws synchronously on an empty key,
  // so this suite must not depend on .env.local happening to already have
  // real-looking values (a fresh clone/CI won't). Set safe placeholders first
  // if nothing's already there, then dynamically import so evaluation happens
  // after the env is guaranteed non-empty.
  const priorStripeKey = process.env.STRIPE_SECRET_KEY;
  const priorResendKey = process.env.RESEND_API_KEY;
  if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = 'sk_test_persistence_suite_placeholder';
  if (!process.env.RESEND_API_KEY) process.env.RESEND_API_KEY = 're_persistence_suite_placeholder';
  const { handleCheckoutSessionCompleted } = await import('../../api/webhooks/stripe.js');
  process.env.STRIPE_SECRET_KEY = priorStripeKey;
  process.env.RESEND_API_KEY = priorResendKey;

  function makeSession({ priceId = ULTRA_PRICE_ID, userId = 'user_activation_test', email = 'buyer@example.com' } = {}) {
    return {
      id: 'cs_test_activation',
      customer_email: email,
      customer_details: { email },
      client_reference_id: userId,
      metadata: {},
      line_items: { data: [{ price: { id: priceId } }] },
    };
  }

  // Every scenario below needs VITE_STRIPE_ULTRA_PRICE_ID set so the session's
  // price ID actually resolves to a plan — otherwise handleCheckoutSessionCompleted
  // exits at the "!plan" branch (unchanged, still 200) before ever reaching the
  // adminKey/write logic this section is testing.
  process.env.VITE_STRIPE_PRO_PRICE_ID = PRO_PRICE_ID;
  process.env.VITE_STRIPE_ULTRA_PRICE_ID = ULTRA_PRICE_ID;

  // 1. Missing admin key on a paid session → 5xx, not 200.
  {
    const { status } = await handleCheckoutSessionCompleted(makeSession(), { adminKey: '' });
    results.push(status >= 500 && status < 600
      ? pass('handleCheckoutSessionCompleted — paid session + missing admin key → 5xx (Stripe will retry)', `status ${status}`)
      : fail('handleCheckoutSessionCompleted — paid session + missing admin key → 5xx (Stripe will retry)', '5xx', `status ${status}`));
  }

  // 2. Base44 write itself fails (existing plan differs, so idempotency
  // doesn't short-circuit; the PUT then comes back non-ok) → 5xx, not 200.
  {
    const fetchImpl = async (url, init) => {
      if (!init || init.method === undefined) return { ok: true, json: async () => ({ id: 'user_activation_test', plan: 'free' }) };
      return { ok: false, status: 500, text: async () => 'base44 down' };
    };
    const { status } = await handleCheckoutSessionCompleted(makeSession(), { adminKey: 'test_admin_key', fetchImpl });
    results.push(status >= 500 && status < 600
      ? pass('handleCheckoutSessionCompleted — paid session + Base44 write failure → 5xx (Stripe will retry)', `status ${status}`)
      : fail('handleCheckoutSessionCompleted — paid session + Base44 write failure → 5xx (Stripe will retry)', '5xx', `status ${status}`));
  }

  // 3. Successful write → 2xx.
  {
    const fetchImpl = async (url, init) => {
      if (!init || init.method === undefined) return { ok: true, json: async () => ({ id: 'user_activation_test', plan: 'free' }) };
      return { ok: true, status: 200 };
    };
    const { status } = await handleCheckoutSessionCompleted(makeSession(), { adminKey: 'test_admin_key', fetchImpl });
    results.push(status >= 200 && status < 300
      ? pass('handleCheckoutSessionCompleted — paid session + successful write → 2xx', `status ${status}`)
      : fail('handleCheckoutSessionCompleted — paid session + successful write → 2xx', '2xx', `status ${status}`));
  }

  // 4. Idempotent replay (plan already matches) → 2xx, and — the stronger
  // assertion — the write is never even attempted (a replay must not risk
  // bumping planActivatedAt to a later, wrong timestamp).
  {
    let putCalled = false;
    const fetchImpl = async (url, init) => {
      if (!init || init.method === undefined) return { ok: true, json: async () => ({ id: 'user_activation_test', plan: 'ultra' }) };
      putCalled = true;
      return { ok: true, status: 200 };
    };
    const { status } = await handleCheckoutSessionCompleted(makeSession(), { adminKey: 'test_admin_key', fetchImpl });
    results.push(status >= 200 && status < 300 && !putCalled
      ? pass('handleCheckoutSessionCompleted — idempotent replay (plan already matches) → 2xx, write skipped', `status ${status}, PUT called: ${putCalled}`)
      : fail('handleCheckoutSessionCompleted — idempotent replay (plan already matches) → 2xx, write skipped', '2xx, PUT not called', `status ${status}, PUT called: ${putCalled}`));
  }

  // 5. Successful write but the confirmation email throws → still 2xx. This
  // is the one that would have broken before handleCheckoutSessionCompleted
  // wrapped the email send in its own try/catch — previously an email throw
  // would have bubbled to the handler's outer catch and returned 500,
  // wrongly coupling a non-critical email failure to the activation result.
  {
    const fetchImpl = async (url, init) => {
      if (!init || init.method === undefined) return { ok: true, json: async () => ({ id: 'user_activation_test', plan: 'free' }) };
      return { ok: true, status: 200 };
    };
    const sendEmail = async () => { throw new Error('Resend is down'); };
    const { status } = await handleCheckoutSessionCompleted(makeSession(), { adminKey: 'test_admin_key', fetchImpl, sendEmail });
    results.push(status >= 200 && status < 300
      ? pass('handleCheckoutSessionCompleted — successful write + failing email → still 2xx (email is non-critical)', `status ${status}`)
      : fail('handleCheckoutSessionCompleted — successful write + failing email → still 2xx (email is non-critical)', '2xx', `status ${status}`));
  }

  process.env.VITE_STRIPE_PRO_PRICE_ID = restore.pro;
  process.env.VITE_STRIPE_ULTRA_PRICE_ID = restore.ultra;

  return results;
}
