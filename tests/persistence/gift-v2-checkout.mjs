/**
 * tests/persistence/gift-v2-checkout.mjs
 *
 * V2 GIFT CHECKOUT: NO CUSTOM FIELDS, THE DRAFT HELD SERVER SIDE, V1 UNTOUCHED.
 * goals/2026-10-11-gifting-v2.md, item 6 (HELD, Payments-Change). No network:
 * Base44 is a stub, Stripe is never reached.
 */
import { pass, fail } from './_shared.mjs';

const KEYS = { APP_ENC_KEY: 'e'.repeat(64), APP_HASH_KEY: 'h'.repeat(64), STRIPE_SECRET_KEY: 'sk_test_guard', VITE_STRIPE_ULTRA_PRICE_ID: 'price_1GuardUltraTest00' };

function mockRes() {
  return { statusCode: 0, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
}

const GOOD = {
  names: 'Isla and Theo', email: 'isla.and.theo@example.com', giver: 'Sam', note: 'With love', noteStyle: 'plain',
  headlineKey: 'nice_start', photoId: 'DTS_UNWRAPPED_Franco_Dupuy_Photos_ID13773_dfzkub', when: 'now',
};

export async function runGiftV2Checkout() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Gifting v2 item 6, checkout:\n');
  const saved = Object.fromEntries(Object.keys({ ...KEYS, GIFTING_V2: 1, BASE44_ADMIN_KEY: 1, VERCEL_ENV: 1 }).map((k) => [k, process.env[k]]));
  Object.assign(process.env, KEYS);
  try {
    const co = await import('../../api/create-checkout-session.js');
    const drafts = await import('../../api/_lib/giftDrafts.js');
    const { decryptPayload } = await import('../../api/_lib/questionnaireCrypto.js');
    const { hmacHex } = await import('../../api/_lib/appKeys.js');

    // ── the session ─────────────────────────────────────────────────────
    const now = new Date('2026-11-01T10:00:00Z');
    const p = co.buildGiftV2SessionParams({ priceId: 'price_x', plan: 'ultra', currency: 'usd', userId: '', customerEmail: '', appUrl: 'https://openinvite.com.au', giftDraftId: 'draft123', now });
    check('a v2 session carries no Stripe custom fields', !('custom_fields' in p));
    check('  and its metadata is the plan, gift, gift_version 2 and the draft id, nothing personal',
      JSON.stringify(p.metadata) === JSON.stringify({ plan: 'ultra', purchaseType: 'gift', gift_version: '2', gift_draft_id: 'draft123' }));
    check('  it closes at 55 minutes, inside the draft\'s 60', p.expires_at === Math.floor(now.getTime() / 1000) + 55 * 60 && drafts.DRAFT_TTL_MS === 60 * 60 * 1000);
    check('  and Stripe returns the giver to /gift, with the draft id for the done page\'s names', p.success_url === 'https://openinvite.com.au/gift?paid=1&draft=draft123&session_id={CHECKOUT_SESSION_ID}' && p.cancel_url === 'https://openinvite.com.au/gift?checkout=cancelled');
    {
      const { readFileSync } = await import('node:fs');
      const src = readFileSync(new URL('../../api/create-checkout-session.js', import.meta.url), 'utf8');
      const tokens = await import('../../api/_lib/giftTokens.js');
      // Owner ruling 2026-10-14: a preview deploy returns the giver to itself;
      // production keeps appUrl exactly as before.
      check('on a preview deploy Stripe returns the giver to that deploy; production keeps appUrl',
        /const giftAppUrl = process\.env\.VERCEL_ENV === 'preview' \? giftOrigin\(process\.env\) : appUrl;/.test(src) && /appUrl: giftAppUrl, giftDraftId: draft\.id/.test(src)
          && tokens.giftOrigin({ VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'openinvite-git-gift-test-x.vercel.app' }) === 'https://openinvite-git-gift-test-x.vercel.app'
          && tokens.giftOrigin({ VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'evil.example.com' }) !== 'https://evil.example.com');
    }
    const v1 = co.buildCheckoutSessionParams({ priceId: 'price_x', plan: 'ultra', currency: 'usd', userId: '', customerEmail: '', isGift: true, appUrl: 'https://openinvite.com.au' });
    check('v1 gift sessions are unchanged: both custom fields, the v1 metadata', v1.custom_fields?.length === 2 && JSON.stringify(v1.metadata) === JSON.stringify({ plan: 'ultra', purchaseType: 'gift' }));

    // ── the draft ───────────────────────────────────────────────────────
    check('a complete draft passes', drafts.validateGiftDraft(GOOD).ok);
    const bad = [['names', { names: '' }], ['email', { email: 'not-an-address' }], ['giver', { giver: ' ' }], ['note', { note: 'x'.repeat(601) }],
      ['noteStyle', { noteStyle: 'comic' }], ['headlineKey', { headlineKey: 'other' }], ['photoId', { photoId: 'someone_elses_photo' }],
      ['when', { when: 'later' }], ['date', { when: 'date', date: '2026-10-01', timezone: 'Australia/Sydney' }], ['timezone', { when: 'date', date: '2026-12-01', timezone: 'not a zone;' }]];
    const failures = bad.filter(([field, patch]) => drafts.validateGiftDraft({ ...GOOD, ...patch }, { today: now }).error !== field).map(([f]) => f);
    check('each wrong field is refused by name', failures.length === 0, failures.join(',') || `${bad.length} cases`);
    const dated = drafts.validateGiftDraft({ ...GOOD, when: 'date', date: '2026-12-01', timezone: 'Australia/Sydney' }, { today: now });
    check('a dated send keeps its date and the browser zone', dated.ok && dated.value.date === '2026-12-01' && dated.value.timezone === 'Australia/Sydney');

    let posted = null;
    const created = await drafts.createGiftDraft(drafts.validateGiftDraft(GOOD).value, {
      plan: 'pro', userId: 'user42', isTest: true, adminKey: 'admin', now,
      fetchImpl: async (url, opts) => { posted = { url, body: JSON.parse(opts.body), auth: opts.headers.Authorization }; return { ok: true, json: async () => ({ id: 'draft999' }) }; },
    });
    check('the draft is written to GiftDraft through the admin key', created.ok && created.id === 'draft999' && /\/entities\/GiftDraft$/.test(posted.url) && posted.auth === 'Bearer admin');
    // THE CIPHERTEXT IS NOT SEARCHED. A regex over the whole body matched the
    // random base64 of draft_enc now and then (the flaw lane A measured in
    // gift-v2-webhook.mjs: about 0.78% of runs). Only the fields that are not
    // ciphertext are searched, for the draft's exact values; that draft_enc
    // is ciphertext is checked by decrypting it, below.
    const plainFields = Object.entries(posted.body).filter(([k]) => k !== 'draft_enc').map(([, v]) => JSON.stringify(v ?? ''));
    const secrets = [GOOD.email, GOOD.names, GOOD.giver, GOOD.note].filter(Boolean);
    check('  as ciphertext only: no address, name or note in the clear',
      plainFields.every((f) => secrets.every((v) => !f.includes(v))) && typeof posted.body.draft_enc === 'string' && secrets.every((v) => !posted.body.draft_enc.includes(v))
        && Object.keys(posted.body).sort().join(',') === 'buyer_user_id_hash,draft_enc,expires_at,is_test');
    check('  which decrypts under APP_ENC_KEY to the draft and the server\'s plan', decryptPayload(posted.body.draft_enc).email === GOOD.email && decryptPayload(posted.body.draft_enc).plan === 'pro');
    check('  expiring in 60 minutes, the buyer as an APP_HASH_KEY HMAC, is_test carried',
      posted.body.expires_at === new Date(now.getTime() + 3600e3).toISOString() && posted.body.buyer_user_id_hash === hmacHex('user42') && posted.body.is_test === true);
    const row = { draft_enc: posted.body.draft_enc, expires_at: posted.body.expires_at, is_test: true };
    const readOk = await drafts.readGiftDraft('draft999', { adminKey: 'admin', now, fetchImpl: async () => ({ ok: true, json: async () => row }) });
    const readLate = await drafts.readGiftDraft('draft999', { adminKey: 'admin', now: new Date(now.getTime() + 3601e3), fetchImpl: async () => ({ ok: true, json: async () => row }) });
    check('the webhook can read a live draft back, and an expired one is refused', readOk.ok && readOk.draft.names === GOOD.names && readOk.isTest && readLate.reason === 'expired');

    // ── the endpoint's gates (all answer before Stripe is reached) ──────
    const body = { priceId: 'price_1GuardUltraTest00', giftMode: true, giftVersion: 2, giftDraft: GOOD };
    delete process.env.GIFTING_V2;
    process.env.VERCEL_ENV = 'production';
    let res = mockRes();
    await co.default({ method: 'POST', headers: {}, body, socket: {} }, res);
    check('with gifting v2 off a v2 checkout is refused', res.statusCode === 404, String(res.statusCode));
    process.env.GIFTING_V2 = '1';
    res = mockRes();
    await co.default({ method: 'POST', headers: {}, body: { ...body, giftDraft: { ...GOOD, email: 'nope' } }, socket: {} }, res);
    check('with it on, a bad draft is refused by field, before anything is written', res.statusCode === 400 && /giftDraft\.email/.test(res.body?.error || ''), JSON.stringify(res.body));
    delete process.env.VERCEL_ENV;

    // ── the page's call ─────────────────────────────────────────────────
    const { startGiftV2Checkout } = await import('../../src/lib/checkoutSession.js');
    let sent = null;
    const out = await startGiftV2Checkout({ ...GOOD, plan: 'ultra', step: 3, when: 'date', date: '2026-12-01' }, 'Australia/Sydney', {
      resolveUser: async () => ({ id: 'user42', email: 'sam@example.com' }),
      doFetch: async (url, opts) => { sent = { url, body: JSON.parse(opts.body) }; return { headers: { get: () => 'application/json' }, json: async () => ({ url: 'https://checkout.stripe.com/x' }) }; },
    });
    check('the pay button sends the draft, gift version 2 and the zone, and follows the URL',
      out.url === 'https://checkout.stripe.com/x' && sent.url === '/api/create-checkout-session' && sent.body.giftVersion === 2 && sent.body.giftMode === true
        && sent.body.giftDraft.timezone === 'Australia/Sydney' && !('step' in sent.body.giftDraft) && !('plan' in sent.body.giftDraft));
  } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
  return r;
}
