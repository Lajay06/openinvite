/**
 * tests/persistence/gift-checkout.mjs
 *
 * Covers PR G4 (gifting v2 bridge) — pure-function + mocked-network tests,
 * same convention as stripe-webhook.mjs: no live Base44 or Stripe API
 * calls. Exercises:
 *   - api/_lib/giftAuth.js — HMAC hashing, AES-256-GCM round-trip, the
 *     human-readable code generator's format.
 *   - api/_lib/planGift.js — the admin-key REST request shapes (URL,
 *     method, body), including the read-merge-write update path.
 *   - api/create-checkout-session.js's buildCheckoutSessionParams — gift
 *     mode produces the right metadata/custom_fields/URLs, non-gift mode
 *     is byte-for-byte unaffected.
 *   - api/webhooks/stripe.js's handleGiftCheckoutSessionCompleted — the
 *     full status-code contract (mirrors stripe-webhook.mjs's own
 *     handleCheckoutSessionCompleted contract tests), and the small,
 *     explicitly-flagged best-effort redemption-tracking tail appended to
 *     the EXISTING (non-gift) branch.
 */

import { hashId, encryptString, decryptString, generateGiftCode } from '../../api/_lib/giftAuth.js';
import { createPlanGift, findPlanGiftBySessionId, findPlanGiftByPromotionCodeId, updatePlanGift } from '../../api/_lib/planGift.js';
import { pass, fail } from './_shared.mjs';

export async function runGiftCheckout() {
  const results = [];

  console.log('\n  Gift checkout — giftAuth.js hashing/encryption:\n');

  process.env.BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY || 'test_admin_key_for_gift_checkout_suite';

  const hashed = hashId('user_123');
  results.push(typeof hashed === 'string' && hashed.length === 64 && hashed !== 'user_123'
    ? pass('hashId — produces a 64-char hex HMAC digest, never the raw value', hashed.slice(0, 12) + '…')
    : fail('hashId — produces a 64-char hex HMAC digest, never the raw value', '64-char hex', hashed));

  results.push(hashId(null) === null && hashId(undefined) === null && hashId('') === null
    ? pass('hashId — null/undefined/empty input resolves to null, not a throw', 'null')
    : fail('hashId — null/undefined/empty input resolves to null, not a throw', 'null', 'threw or returned non-null'));

  const plaintext = 'gift-recipient@example.com';
  const ciphertext = encryptString(plaintext);
  results.push(typeof ciphertext === 'string' && ciphertext !== plaintext
    ? pass('encryptString — never returns the plaintext value itself', 'ciphertext !== plaintext')
    : fail('encryptString — never returns the plaintext value itself', 'ciphertext !== plaintext', ciphertext));

  const decrypted = decryptString(ciphertext);
  results.push(decrypted === plaintext
    ? pass('decryptString — round-trips encryptString\'s own output back to the original plaintext', plaintext)
    : fail('decryptString — round-trips encryptString\'s own output back to the original plaintext', plaintext, decrypted));

  let tamperedThrew = false;
  try {
    const buf = Buffer.from(ciphertext, 'base64');
    buf[buf.length - 1] ^= 0xff; // flip the last ciphertext byte
    decryptString(buf.toString('base64'));
  } catch {
    tamperedThrew = true;
  }
  results.push(tamperedThrew
    ? pass('decryptString — a tampered ciphertext fails the GCM auth tag check (throws), never returns garbage plaintext', 'threw as expected')
    : fail('decryptString — a tampered ciphertext fails the GCM auth tag check (throws), never returns garbage plaintext', 'throws', 'did not throw'));

  results.push(decryptString(null) === null
    ? pass('decryptString — null/empty input resolves to null, not a throw', 'null')
    : fail('decryptString — null/empty input resolves to null, not a throw', 'null', 'threw or returned non-null'));

  const codes = new Set(Array.from({ length: 200 }, () => generateGiftCode()));
  const formatOk = [...codes].every(c => /^GIFT-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(c));
  results.push(formatOk && codes.size === 200
    ? pass('generateGiftCode — matches GIFT-XXXX-XXXX format (no 0/O/1/I) and 200 calls produce 200 unique codes', codes.values().next().value)
    : fail('generateGiftCode — matches GIFT-XXXX-XXXX format (no 0/O/1/I) and 200 calls produce 200 unique codes', 'all unique, format matches', `${codes.size}/200 unique, format ok: ${formatOk}`));

  console.log('\n  Gift checkout — planGift.js admin-key REST request shapes (mocked fetch):\n');

  {
    let capturedUrl, capturedInit;
    const fakeFetch = async (url, init) => {
      capturedUrl = url; capturedInit = init;
      return { ok: true, json: async () => ({ id: 'plangift_new_123' }) };
    };
    const result = await createPlanGift({ stripe_session_id: 'cs_test_1', plan: 'pro' }, 'admin_key', fakeFetch);
    const bodyOk = JSON.parse(capturedInit?.body || '{}');
    results.push(result.ok === true && result.id === 'plangift_new_123' && capturedUrl?.includes('/entities/PlanGift') && capturedInit?.method === 'POST' && bodyOk.plan === 'pro'
      ? pass('createPlanGift — POSTs to the PlanGift entity with the given record', JSON.stringify(bodyOk))
      : fail('createPlanGift — POSTs to the PlanGift entity with the given record', '{plan:"pro",...}', JSON.stringify({ url: capturedUrl, init: capturedInit, result })));
  }

  {
    const failingFetch = async () => ({ ok: false, status: 403, text: async () => 'forbidden' });
    const result = await createPlanGift({ stripe_session_id: 'cs_test_2' }, 'bad_key', failingFetch);
    results.push(result.ok === false && result.status === 403
      ? pass('createPlanGift — a non-ok Base44 response is reported as a failure, not swallowed', 'ok:false, status:403')
      : fail('createPlanGift — a non-ok Base44 response is reported as a failure, not swallowed', 'ok:false, status:403', JSON.stringify(result)));
  }

  {
    const fakeFetch = async (url) => {
      const q = decodeURIComponent(url.split('q=')[1]?.split('&')[0] || '{}');
      const parsed = JSON.parse(q);
      return { ok: true, json: async () => (parsed.stripe_session_id === 'cs_findme' ? [{ id: 'plangift_found', stripe_session_id: 'cs_findme' }] : []) };
    };
    const found = await findPlanGiftBySessionId('cs_findme', 'admin_key', fakeFetch);
    const notFound = await findPlanGiftBySessionId('cs_other', 'admin_key', fakeFetch);
    results.push(found?.id === 'plangift_found' && notFound === null
      ? pass('findPlanGiftBySessionId — finds a matching row by exact session id, null when none matches', 'plangift_found / null')
      : fail('findPlanGiftBySessionId — finds a matching row by exact session id, null when none matches', 'plangift_found / null', `${found?.id} / ${notFound}`));
  }

  {
    const fakeFetch = async (url) => {
      const q = decodeURIComponent(url.split('q=')[1]?.split('&')[0] || '{}');
      const parsed = JSON.parse(q);
      return { ok: true, json: async () => (parsed.promotion_code_id === 'promo_abc' ? [{ id: 'plangift_promo_match', promotion_code_id: 'promo_abc' }] : []) };
    };
    const found = await findPlanGiftByPromotionCodeId('promo_abc', 'admin_key', fakeFetch);
    results.push(found?.id === 'plangift_promo_match'
      ? pass('findPlanGiftByPromotionCodeId — finds the gift a given Promotion Code id belongs to', 'plangift_promo_match')
      : fail('findPlanGiftByPromotionCodeId — finds the gift a given Promotion Code id belongs to', 'plangift_promo_match', found?.id));
  }

  {
    // Read-merge-write: updatePlanGift must fetch the current record first
    // and PUT the FULL merged object, never just the patch fields alone —
    // this is the safety property that avoids silently wiping
    // recipient_email_enc/promotion_code_display/etc. if a bare PUT of a
    // partial object turns out to be a full replace on this entity.
    const currentRecord = { id: 'plangift_merge_test', stripe_session_id: 'cs_1', plan: 'ultra', recipient_email_enc: 'CIPHERTEXT_MUST_SURVIVE', status: 'purchased' };
    let putBody = null;
    const fakeFetch = async (url, init) => {
      if (!init || init.method === undefined) return { ok: true, json: async () => currentRecord };
      putBody = JSON.parse(init.body);
      return { ok: true };
    };
    const result = await updatePlanGift('plangift_merge_test', { status: 'redeemed', redeemed_at: '2026-01-01T00:00:00.000Z' }, 'admin_key', fakeFetch);
    results.push(result.ok === true && putBody?.recipient_email_enc === 'CIPHERTEXT_MUST_SURVIVE' && putBody?.status === 'redeemed' && putBody?.stripe_session_id === 'cs_1'
      ? pass('updatePlanGift — read-merge-write preserves every existing field while applying the patch', JSON.stringify(putBody))
      : fail('updatePlanGift — read-merge-write preserves every existing field while applying the patch', 'merged object with recipient_email_enc intact', JSON.stringify(putBody)));
  }

  console.log('\n  Gift checkout — create-checkout-session.js buildCheckoutSessionParams (gift mode vs. normal, no live Stripe call):\n');

  const priorStripeKey = process.env.STRIPE_SECRET_KEY;
  if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = 'sk_test_persistence_suite_placeholder';
  const { buildCheckoutSessionParams } = await import('../../api/create-checkout-session.js');
  process.env.STRIPE_SECRET_KEY = priorStripeKey;

  {
    const normalParams = buildCheckoutSessionParams({ priceId: 'price_x', plan: 'pro', currency: 'usd', userId: 'user_1', customerEmail: 'a@example.com', isGift: false, appUrl: 'https://openinvite.com.au' });
    results.push(normalParams.metadata.purchaseType === undefined && !normalParams.custom_fields && normalParams.success_url.includes('/payment-success')
      ? pass('buildCheckoutSessionParams — normal mode has no purchaseType metadata, no custom_fields, the existing success_url', 'unaffected')
      : fail('buildCheckoutSessionParams — normal mode has no purchaseType metadata, no custom_fields, the existing success_url', 'unaffected', JSON.stringify(normalParams)));
  }

  {
    const giftParams = buildCheckoutSessionParams({ priceId: 'price_y', plan: 'ultra', currency: 'usd', userId: null, customerEmail: '', isGift: true, appUrl: 'https://openinvite.com.au' });
    const fieldKeys = (giftParams.custom_fields || []).map(f => f.key);
    results.push(
      giftParams.metadata.purchaseType === 'gift'
      && fieldKeys.includes('recipient_email') && fieldKeys.includes('recipient_note')
      && giftParams.custom_fields.find(f => f.key === 'recipient_email').optional === false
      && giftParams.custom_fields.find(f => f.key === 'recipient_note').optional === true
      && giftParams.success_url.includes('/gift/success')
      && giftParams.cancel_url.includes('/gifting')
      && !('client_reference_id' in giftParams)
        ? pass('buildCheckoutSessionParams — gift mode adds purchaseType metadata + two custom fields (email required, note optional), gift URLs, no client_reference_id when no userId', 'all correct')
        : fail('buildCheckoutSessionParams — gift mode adds purchaseType metadata + two custom fields (email required, note optional), gift URLs, no client_reference_id when no userId', 'all correct', JSON.stringify(giftParams)));
  }

  {
    // A logged-in buyer's userId IS still threaded through in gift mode —
    // useful for PlanGift.buyer_user_id_hash, just never required.
    const giftParamsWithUser = buildCheckoutSessionParams({ priceId: 'price_z', plan: 'pro', currency: 'usd', userId: 'user_buyer', customerEmail: '', isGift: true, appUrl: 'https://openinvite.com.au' });
    results.push(giftParamsWithUser.client_reference_id === 'user_buyer'
      ? pass('buildCheckoutSessionParams — gift mode still sets client_reference_id when a buyer IS logged in', 'user_buyer')
      : fail('buildCheckoutSessionParams — gift mode still sets client_reference_id when a buyer IS logged in', 'user_buyer', giftParamsWithUser.client_reference_id));
  }

  console.log('\n  Gift checkout — create-checkout-session.js rejects gift mode without a valid plan the same way normal mode does:\n');

  {
    const priorKey = process.env.STRIPE_SECRET_KEY;
    if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = 'sk_test_persistence_suite_placeholder';
    const { default: createCheckoutSessionHandler } = await import('../../api/create-checkout-session.js');
    process.env.STRIPE_SECRET_KEY = priorKey;

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

    // Gift mode with NO userId must NOT be rejected for that reason (the
    // one real behavior change to this endpoint) — but an unrecognised
    // price is still rejected exactly like normal mode.
    const { req, res } = mockReqRes({ priceId: 'price_AttackerSupplied1234567890xyz', giftMode: true });
    await createCheckoutSessionHandler(req, res);
    results.push(res._status === 400 && res._json?.error !== 'userId is required'
      ? pass('create-checkout-session — gift mode with no userId is NOT rejected for missing userId; still rejects an unrecognised price', `400: ${res._json?.error}`)
      : fail('create-checkout-session — gift mode with no userId is NOT rejected for missing userId; still rejects an unrecognised price', '400, error !== "userId is required"', `${res._status}: ${res._json?.error}`));
  }

  {
    const priorKey = process.env.STRIPE_SECRET_KEY;
    if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = 'sk_test_persistence_suite_placeholder';
    const { default: createCheckoutSessionHandler } = await import('../../api/create-checkout-session.js');
    process.env.STRIPE_SECRET_KEY = priorKey;

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

    // Normal (non-gift) mode with no userId is UNCHANGED — still a hard 400.
    const { req, res } = mockReqRes({ priceId: 'price_AttackerSupplied1234567890xyz' });
    await createCheckoutSessionHandler(req, res);
    results.push(res._status === 400 && res._json?.error === 'userId is required'
      ? pass('create-checkout-session — normal (non-gift) mode still requires userId, unaffected by the gift-mode change', '400: userId is required')
      : fail('create-checkout-session — normal (non-gift) mode still requires userId, unaffected by the gift-mode change', '400: userId is required', `${res._status}: ${res._json?.error}`));
  }

  console.log('\n  Gift checkout — handleGiftCheckoutSessionCompleted status-code contract (mocked Stripe + Base44, no live network):\n');

  const priorStripeKey2 = process.env.STRIPE_SECRET_KEY;
  const priorResendKey2 = process.env.RESEND_API_KEY;
  if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = 'sk_test_persistence_suite_placeholder';
  if (!process.env.RESEND_API_KEY) process.env.RESEND_API_KEY = 're_persistence_suite_placeholder';
  const { handleGiftCheckoutSessionCompleted, handleCheckoutSessionCompleted } = await import('../../api/webhooks/stripe.js');
  process.env.STRIPE_SECRET_KEY = priorStripeKey2;
  process.env.RESEND_API_KEY = priorResendKey2;

  const priorProId = process.env.VITE_STRIPE_PRO_PRICE_ID;
  const priorUltraId = process.env.VITE_STRIPE_ULTRA_PRICE_ID;
  process.env.VITE_STRIPE_PRO_PRICE_ID = 'price_TEST_PRO_GIFT';
  process.env.VITE_STRIPE_ULTRA_PRICE_ID = 'price_TEST_ULTRA_GIFT';

  function makeGiftSession({ priceId = 'price_TEST_PRO_GIFT', recipientEmail = 'recipient@example.com', recipientNote = null, buyerEmail = 'buyer@example.com' } = {}) {
    return {
      id: 'cs_test_gift',
      customer_email: buyerEmail,
      customer_details: { email: buyerEmail, name: 'Jamie Buyer' },
      client_reference_id: null,
      metadata: { purchaseType: 'gift', plan: 'pro' },
      line_items: { data: [{ price: { id: priceId } }] },
      currency: 'usd',
      amount_total: 4900,
      custom_fields: [
        { key: 'recipient_email', type: 'text', text: { value: recipientEmail } },
        ...(recipientNote ? [{ key: 'recipient_note', type: 'text', text: { value: recipientNote } }] : []),
      ],
    };
  }

  const fakeStripeImpl = {
    prices: { retrieve: async () => ({ id: 'price_TEST_PRO_GIFT', product: 'prod_pro_test' }) },
    coupons: { create: async () => ({ id: 'coupon_test_123' }) },
    promotionCodes: { create: async () => ({ id: 'promo_test_123' }) },
  };

  // 0. promotionCodes.create is called with the coupon nested under
  // promotion: { type: 'coupon', coupon }, NOT a flat top-level `coupon`
  // field — a real Stripe API 400 ("Received unknown parameter: coupon")
  // caught by the required live test-mode evidence run before merge.
  // Locked in here so it can't silently regress back to the wrong shape.
  {
    let capturedArgs = null;
    const trackedStripeImpl = {
      prices: { retrieve: async () => ({ id: 'price_TEST_PRO_GIFT', product: 'prod_pro_test' }) },
      coupons: { create: async () => ({ id: 'coupon_shape_test' }) },
      promotionCodes: { create: async (args) => { capturedArgs = args; return { id: 'promo_shape_test' }; } },
    };
    const fetchImpl = async (url, init) => {
      if (!init || init.method === undefined) return { ok: true, json: async () => [] };
      if (init.method === 'POST') return { ok: true, json: async () => ({ id: 'plangift_shape_test' }) };
      return { ok: true };
    };
    await handleGiftCheckoutSessionCompleted(makeGiftSession(), { adminKey: 'test_admin_key', fetchImpl, stripeImpl: trackedStripeImpl, sendEmail: async () => ({ data: {} }) });
    results.push(capturedArgs?.promotion?.coupon === 'coupon_shape_test' && capturedArgs?.promotion?.type === 'coupon' && !('coupon' in capturedArgs)
      ? pass('handleGiftCheckoutSessionCompleted — promotionCodes.create nests the coupon under promotion:{type,coupon}, matching the real Stripe API shape', JSON.stringify(capturedArgs?.promotion))
      : fail('handleGiftCheckoutSessionCompleted — promotionCodes.create nests the coupon under promotion:{type,coupon}, matching the real Stripe API shape', "{promotion:{type:'coupon',coupon:'coupon_shape_test'}}", JSON.stringify(capturedArgs)));
  }

  // 1. Missing admin key → 5xx.
  {
    const { status } = await handleGiftCheckoutSessionCompleted(makeGiftSession(), { adminKey: '', stripeImpl: fakeStripeImpl });
    results.push(status >= 500 && status < 600
      ? pass('handleGiftCheckoutSessionCompleted — missing admin key → 5xx (Stripe will retry)', `status ${status}`)
      : fail('handleGiftCheckoutSessionCompleted — missing admin key → 5xx (Stripe will retry)', '5xx', `status ${status}`));
  }

  // 2. Idempotent replay (a PlanGift already exists for this session) → 2xx,
  // and — the stronger assertion — Stripe is never called a second time.
  {
    let stripeCalled = false;
    const trackedStripeImpl = {
      prices: { retrieve: async () => { stripeCalled = true; return fakeStripeImpl.prices.retrieve(); } },
      coupons: { create: async () => { stripeCalled = true; return fakeStripeImpl.coupons.create(); } },
      promotionCodes: { create: async () => { stripeCalled = true; return fakeStripeImpl.promotionCodes.create(); } },
    };
    const fetchImpl = async () => ({ ok: true, json: async () => [{ id: 'existing_gift', stripe_session_id: 'cs_test_gift' }] });
    const { status } = await handleGiftCheckoutSessionCompleted(makeGiftSession(), { adminKey: 'test_admin_key', fetchImpl, stripeImpl: trackedStripeImpl });
    results.push(status >= 200 && status < 300 && !stripeCalled
      ? pass('handleGiftCheckoutSessionCompleted — idempotent replay (gift already exists) → 2xx, no new Stripe coupon/code minted', `status ${status}, Stripe called: ${stripeCalled}`)
      : fail('handleGiftCheckoutSessionCompleted — idempotent replay (gift already exists) → 2xx, no new Stripe coupon/code minted', '2xx, Stripe not called', `status ${status}, Stripe called: ${stripeCalled}`));
  }

  // 3. Stripe coupon/promotion-code creation throws → 502 (never silently
  // 200 a paid gift that has no redeemable code).
  {
    const throwingStripeImpl = {
      prices: { retrieve: async () => ({ id: 'price_TEST_PRO_GIFT', product: 'prod_pro_test' }) },
      coupons: { create: async () => { throw new Error('Stripe is down'); } },
      promotionCodes: { create: async () => ({ id: 'promo_never_reached' }) },
    };
    const fetchImpl = async () => ({ ok: true, json: async () => [] }); // no existing gift
    const { status } = await handleGiftCheckoutSessionCompleted(makeGiftSession(), { adminKey: 'test_admin_key', fetchImpl, stripeImpl: throwingStripeImpl });
    results.push(status >= 500 && status < 600
      ? pass('handleGiftCheckoutSessionCompleted — Stripe coupon/promo code creation fails → 5xx (will retry)', `status ${status}`)
      : fail('handleGiftCheckoutSessionCompleted — Stripe coupon/promo code creation fails → 5xx (will retry)', '5xx', `status ${status}`));
  }

  // 4. PlanGift create fails → 502.
  {
    const fetchImpl = async (url, init) => {
      if (!init || init.method === undefined) return { ok: true, json: async () => [] }; // no existing gift
      return { ok: false, status: 500, text: async () => 'base44 down' }; // create fails
    };
    const { status } = await handleGiftCheckoutSessionCompleted(makeGiftSession(), { adminKey: 'test_admin_key', fetchImpl, stripeImpl: fakeStripeImpl });
    results.push(status >= 500 && status < 600
      ? pass('handleGiftCheckoutSessionCompleted — PlanGift row create fails → 5xx (will retry)', `status ${status}`)
      : fail('handleGiftCheckoutSessionCompleted — PlanGift row create fails → 5xx (will retry)', '5xx', `status ${status}`));
  }

  // 5. Full success path with a VALID recipient email → 2xx, both emails
  // attempted, recipient send marked sent, buyer receipt always sent.
  {
    let recipientEmailSentTo = null;
    let buyerEmailSentTo = null;
    const sendEmail = async ({ to }) => {
      if (to === 'recipient@example.com') recipientEmailSentTo = to;
      if (to === 'buyer@example.com') buyerEmailSentTo = to;
      return { data: { id: 'resend_test_id' } };
    };
    let createdRecord = null;
    const fetchImpl = async (url, init) => {
      if (!init || init.method === undefined) return { ok: true, json: async () => [] }; // no existing gift
      if (init.method === 'POST') { createdRecord = JSON.parse(init.body); return { ok: true, json: async () => ({ id: 'plangift_success' }) }; }
      return { ok: true }; // the recipient_email_sent status PUT
    };
    const { status } = await handleGiftCheckoutSessionCompleted(makeGiftSession({ recipientNote: 'Congrats!' }), { adminKey: 'test_admin_key', fetchImpl, stripeImpl: fakeStripeImpl, sendEmail });
    results.push(status >= 200 && status < 300 && recipientEmailSentTo === 'recipient@example.com' && buyerEmailSentTo === 'buyer@example.com' && createdRecord?.plan === 'pro' && createdRecord?.promotion_code_display
      ? pass('handleGiftCheckoutSessionCompleted — full success: PlanGift created, recipient reveal + buyer receipt both sent', `status ${status}`)
      : fail('handleGiftCheckoutSessionCompleted — full success: PlanGift created, recipient reveal + buyer receipt both sent', '2xx, both emails sent, PlanGift created', JSON.stringify({ status, recipientEmailSentTo, buyerEmailSentTo, createdRecord })));
  }

  // 6. Invalid/missing recipient email → gift still created (buyer has the
  // fallback code), owner alert sent, buyer receipt still sent, recipient
  // reveal NOT sent.
  {
    let recipientEmailAttempted = false;
    let ownerAlertSent = false;
    let buyerReceiptSent = false;
    const sendEmail = async ({ to }) => {
      if (to === 'recipient@example.com') recipientEmailAttempted = true;
      if (to === 'hello@openinvite.com.au') ownerAlertSent = true;
      if (to === 'buyer@example.com') buyerReceiptSent = true;
      return { data: { id: 'resend_test_id' } };
    };
    const fetchImpl = async (url, init) => {
      if (!init || init.method === undefined) return { ok: true, json: async () => [] };
      if (init.method === 'POST') return { ok: true, json: async () => ({ id: 'plangift_no_recipient' }) };
      return { ok: true };
    };
    const { status } = await handleGiftCheckoutSessionCompleted(makeGiftSession({ recipientEmail: 'not-an-email' }), { adminKey: 'test_admin_key', fetchImpl, stripeImpl: fakeStripeImpl, sendEmail });
    results.push(status >= 200 && status < 300 && !recipientEmailAttempted && ownerAlertSent && buyerReceiptSent
      ? pass('handleGiftCheckoutSessionCompleted — invalid recipient email: gift still created, owner alerted (not just a log line), buyer receipt still sent, no send attempted to the bad address', `status ${status}`)
      : fail('handleGiftCheckoutSessionCompleted — invalid recipient email: gift still created, owner alerted (not just a log line), buyer receipt still sent, no send attempted to the bad address', 'owner alerted, buyer receipt sent, no recipient send', JSON.stringify({ status, recipientEmailAttempted, ownerAlertSent, buyerReceiptSent })));
  }

  // 7. Recipient email valid but Resend itself throws on that send → owner
  // alert still fires, buyer receipt still sent, response still 2xx (the
  // gift and its fallback code are already safely recorded).
  {
    let ownerAlertSent = false;
    let buyerReceiptSent = false;
    const sendEmail = async ({ to }) => {
      if (to === 'recipient@example.com') throw new Error('Resend rejected this address');
      if (to === 'hello@openinvite.com.au') { ownerAlertSent = true; return { data: {} }; }
      if (to === 'buyer@example.com') { buyerReceiptSent = true; return { data: {} }; }
      return { data: {} };
    };
    const fetchImpl = async (url, init) => {
      if (!init || init.method === undefined) return { ok: true, json: async () => [] };
      if (init.method === 'POST') return { ok: true, json: async () => ({ id: 'plangift_send_fails' }) };
      return { ok: true };
    };
    const { status } = await handleGiftCheckoutSessionCompleted(makeGiftSession(), { adminKey: 'test_admin_key', fetchImpl, stripeImpl: fakeStripeImpl, sendEmail });
    results.push(status >= 200 && status < 300 && ownerAlertSent && buyerReceiptSent
      ? pass('handleGiftCheckoutSessionCompleted — Resend throws on a valid recipient address: owner still alerted, buyer receipt still sent, still 2xx', `status ${status}`)
      : fail('handleGiftCheckoutSessionCompleted — Resend throws on a valid recipient address: owner still alerted, buyer receipt still sent, still 2xx', '2xx, owner alerted, buyer receipt sent', JSON.stringify({ status, ownerAlertSent, buyerReceiptSent })));
  }

  console.log('\n  Gift checkout — the existing (non-gift) branch\'s small, flagged redemption-tracking tail:\n');

  function makeNormalSessionWithDiscount({ promotionCodeId = 'promo_test_123' } = {}) {
    return {
      id: 'cs_test_redemption',
      customer_email: 'redeemer@example.com',
      customer_details: { email: 'redeemer@example.com' },
      client_reference_id: 'user_redeemer',
      metadata: {},
      line_items: { data: [{ price: { id: 'price_TEST_PRO_GIFT' } }] },
      total_details: { breakdown: { discounts: [{ discount: { promotion_code: promotionCodeId } }] } },
    };
  }

  // 8. A normal (non-gift) purchase whose session used a promotion code
  // matching a PlanGift row → that row gets marked redeemed, AFTER the
  // real plan write already succeeded — and the response is still 2xx.
  {
    let putBodyForGift = null;
    const fetchImpl = async (url, init) => {
      if (url.includes('/entities/User/')) {
        if (!init || init.method === undefined) return { ok: true, json: async () => ({ id: 'user_redeemer', plan: 'free' }) };
        return { ok: true, status: 200 }; // plan write succeeds
      }
      if (url.includes('/entities/PlanGift')) {
        if (!init || init.method === undefined) {
          if (url.includes('promotion_code_id')) return { ok: true, json: async () => [{ id: 'plangift_to_redeem', status: 'purchased' }] };
          return { ok: true, json: async () => ({ id: 'plangift_to_redeem', status: 'purchased' }) }; // fetch-before-update
        }
        putBodyForGift = JSON.parse(init.body);
        return { ok: true };
      }
      return { ok: true, json: async () => ({}) };
    };
    const { status } = await handleCheckoutSessionCompleted(makeNormalSessionWithDiscount(), { adminKey: 'test_admin_key', fetchImpl });
    results.push(status >= 200 && status < 300 && putBodyForGift?.status === 'redeemed' && !!putBodyForGift?.redeemed_at && putBodyForGift?.redeemed_user_id_hash === hashId('user_redeemer')
      ? pass('handleCheckoutSessionCompleted — a redemption using a gift\'s promotion code marks that PlanGift redeemed, after the real plan grant', `status ${status}`)
      : fail('handleCheckoutSessionCompleted — a redemption using a gift\'s promotion code marks that PlanGift redeemed, after the real plan grant', 'status redeemed, hash matches', JSON.stringify({ status, putBodyForGift })));
  }

  // 9. A normal purchase with NO discounts at all → the tail is a complete
  // no-op, no PlanGift lookups happen, still 2xx. (Guards against the tail
  // accidentally firing on every ordinary purchase.)
  {
    let planGiftLookupAttempted = false;
    const fetchImpl = async (url, init) => {
      if (url.includes('/entities/PlanGift')) planGiftLookupAttempted = true;
      if (!init || init.method === undefined) return { ok: true, json: async () => ({ id: 'user_redeemer', plan: 'free' }) };
      return { ok: true, status: 200 };
    };
    const plainSession = { id: 'cs_no_discount', customer_email: 'x@example.com', customer_details: { email: 'x@example.com' }, client_reference_id: 'user_x', metadata: {}, line_items: { data: [{ price: { id: 'price_TEST_PRO_GIFT' } }] } };
    const { status } = await handleCheckoutSessionCompleted(plainSession, { adminKey: 'test_admin_key', fetchImpl });
    results.push(status >= 200 && status < 300 && !planGiftLookupAttempted
      ? pass('handleCheckoutSessionCompleted — a normal purchase with no discounts never touches PlanGift at all', `status ${status}, PlanGift lookup attempted: ${planGiftLookupAttempted}`)
      : fail('handleCheckoutSessionCompleted — a normal purchase with no discounts never touches PlanGift at all', 'no PlanGift lookup', `status ${status}, PlanGift lookup attempted: ${planGiftLookupAttempted}`));
  }

  // 10. The redemption-tracking tail throwing/erroring never turns a
  // successful plan grant into a failed response — the real activation
  // already happened and must not be undone by a reporting-only failure.
  {
    const fetchImpl = async (url, init) => {
      if (url.includes('/entities/User/')) {
        if (!init || init.method === undefined) return { ok: true, json: async () => ({ id: 'user_redeemer', plan: 'free' }) };
        return { ok: true, status: 200 };
      }
      if (url.includes('/entities/PlanGift')) throw new Error('PlanGift lookup exploded');
      return { ok: true, json: async () => ({}) };
    };
    const { status } = await handleCheckoutSessionCompleted(makeNormalSessionWithDiscount(), { adminKey: 'test_admin_key', fetchImpl });
    results.push(status >= 200 && status < 300
      ? pass('handleCheckoutSessionCompleted — redemption-tracking tail throwing never downgrades an already-successful plan grant to a failure', `status ${status}`)
      : fail('handleCheckoutSessionCompleted — redemption-tracking tail throwing never downgrades an already-successful plan grant to a failure', '2xx', `status ${status}`));
  }

  process.env.VITE_STRIPE_PRO_PRICE_ID = priorProId;
  process.env.VITE_STRIPE_ULTRA_PRICE_ID = priorUltraId;

  return results;
}
