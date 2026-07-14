/**
 * tests/persistence/stripe-webhook.mjs
 *
 * Covers feat/payment-complete: price→tier mapping, Stripe signature
 * verification, and the Base44 admin write path the checkout.session.completed
 * handler (api/webhooks/stripe.js) uses to write User.plan.
 *
 * Pure-function + mocked-network tests — no live Base44 or Stripe API calls,
 * no auth needed. Signature verification is tested against the real `stripe`
 * package (constructEvent is pure crypto, no network), so that assertion
 * exercises real library behaviour, not a reimplementation of it.
 */

import Stripe from 'stripe';
import { resolvePlanFromPriceId } from '../../api/_lib/planPricing.js';
import { getBase44User, writeBase44UserPlan } from '../../api/_lib/base44Admin.js';
import { pass, fail } from './_shared.mjs';

const PRO_PRICE_ID = 'price_TEST_PRO_1234567890';
const ULTRA_PRICE_ID = 'price_TEST_ULTRA_1234567890';

export async function runStripeWebhook() {
  const results = [];
  const restore = {
    pro: process.env.VITE_STRIPE_PRO_PRICE_ID,
    ultra: process.env.VITE_STRIPE_ULTRA_PRICE_ID,
  };
  process.env.VITE_STRIPE_PRO_PRICE_ID = PRO_PRICE_ID;
  process.env.VITE_STRIPE_ULTRA_PRICE_ID = ULTRA_PRICE_ID;

  console.log('\n  Stripe webhook — price ID → plan tier mapping:\n');

  results.push(resolvePlanFromPriceId(PRO_PRICE_ID) === 'pro'
    ? pass('resolvePlanFromPriceId — Pro price ID resolves to \'pro\'', 'pro')
    : fail('resolvePlanFromPriceId — Pro price ID resolves to \'pro\'', 'pro', resolvePlanFromPriceId(PRO_PRICE_ID)));

  // The literal string every gating check in the app compares against
  // (AuthContext.jsx → StudioGuestSuite.jsx:87-88, Account.jsx:65,
  // Layout.jsx:304-305) — this is the "a paid Ultra user resolves as Ultra"
  // guarantee: the webhook's resolved value must be the exact string those
  // checks test for, not just "truthy" or a differently-cased/spelled tier.
  const ultraResolved = resolvePlanFromPriceId(ULTRA_PRICE_ID);
  results.push(ultraResolved === 'ultra'
    ? pass('resolvePlanFromPriceId — Ultra price ID resolves to the exact gating literal \'ultra\'', ultraResolved)
    : fail('resolvePlanFromPriceId — Ultra price ID resolves to the exact gating literal \'ultra\'', 'ultra', ultraResolved));

  results.push(resolvePlanFromPriceId('price_unknown_never_configured') === null
    ? pass('resolvePlanFromPriceId — unrecognised price ID resolves to null, never a guessed tier', 'null')
    : fail('resolvePlanFromPriceId — unrecognised price ID resolves to null, never a guessed tier', 'null', resolvePlanFromPriceId('price_unknown_never_configured')));

  results.push(resolvePlanFromPriceId(null) === null && resolvePlanFromPriceId(undefined) === null
    ? pass('resolvePlanFromPriceId — null/undefined priceId resolves to null, not a throw', 'null')
    : fail('resolvePlanFromPriceId — null/undefined priceId resolves to null, not a throw', 'null', 'threw or returned non-null'));

  process.env.VITE_STRIPE_PRO_PRICE_ID = restore.pro;
  process.env.VITE_STRIPE_ULTRA_PRICE_ID = restore.ultra;

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

  return results;
}
