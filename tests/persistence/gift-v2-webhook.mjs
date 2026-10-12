/**
 * tests/persistence/gift-v2-webhook.mjs
 *
 * A PAID V2 GIFT IS RECORDED ONCE, ENCRYPTED UNDER APP_ENC_KEY, AND REACHES
 * BOTH INBOXES ONCE. goals/2026-10-11-gifting-v2.md, item 7 (HELD,
 * Payments-Change): api/_lib/giftV2Purchase.js and its route in
 * api/webhooks/stripe.js. No network: PlanGift is an in-memory store,
 * the draft reader and the mailer are stubs, Stripe is never called.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const KEYS = { APP_ENC_KEY: 'e'.repeat(64), APP_HASH_KEY: 'h'.repeat(64), VITE_STRIPE_ULTRA_PRICE_ID: 'price_1GuardUltraTest00' };

const DRAFT = {
  plan: 'ultra', names: 'Isla and Theo', email: 'isla.and.theo@example.com', giver: 'Sam', note: 'With love',
  noteStyle: 'plain', headlineKey: 'for_you', photoId: 'DTS_UNWRAPPED_Franco_Dupuy_Photos_ID13773_dfzkub', when: 'now',
};

/** A PlanGift table as Base44's REST answers it, with an optional failing PUT. */
function store({ failPut = 0 } = {}) {
  const rows = new Map();
  let n = 0;
  let putFailures = failPut;
  const json = (body, ok = true, status = 200) => ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) });
  const fetchImpl = async (url, opts = {}) => {
    const method = opts.method || 'GET';
    if (method === 'GET' && /PlanGift\?q=/.test(url)) {
      const q = JSON.parse(decodeURIComponent(url.split('q=')[1].split('&')[0]));
      return json([...rows.values()].filter((r) => r.stripe_session_id === q.stripe_session_id));
    }
    if (method === 'POST') { n += 1; const id = `pg${String(n).padStart(6, '0')}`; rows.set(id, { ...JSON.parse(opts.body), id }); return json({ id }); }
    const id = url.split('/').pop();
    if (method === 'GET') return json(rows.get(id) || null, rows.has(id), rows.has(id) ? 200 : 404);
    if (method === 'PUT') {
      if (putFailures > 0) { putFailures -= 1; return json({ error: 'down' }, false, 500); }
      rows.set(id, { ...JSON.parse(opts.body), id }); return json({});
    }
    return json(null, false, 400);
  };
  return { rows, fetchImpl };
}

export async function runGiftV2Webhook() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Gifting v2 item 7, the webhook\'s v2 branch:\n');
  const saved = Object.fromEntries(Object.keys(KEYS).map((k) => [k, process.env[k]]));
  Object.assign(process.env, KEYS);
  const realLog = console.log;
  const realErr = console.error;
  try {
    const v2 = await import('../../api/_lib/giftV2Purchase.js');
    const { decryptGiftField } = await import('../../api/_lib/giftCrypto.js');
    const tokens = await import('../../api/_lib/giftTokens.js');
    const quiet = () => { console.log = () => {}; console.error = () => {}; };
    const loud = () => { console.log = realLog; console.error = realErr; };

    const session = (over = {}) => ({
      id: 'cs_test_v2gift', livemode: false, currency: 'usd', amount_total: 9900,
      customer_details: { email: 'sam@example.com', name: 'Sam Stripe' }, client_reference_id: 'user42',
      line_items: { data: [{ price: { id: 'price_1GuardUltraTest00' } }] },
      metadata: { plan: 'ultra', purchaseType: 'gift', gift_version: '2', gift_draft_id: 'draft1' }, ...over,
    });
    const now = new Date('2026-11-01T10:00:00Z');
    const run = async (st, sess, { draft = { ok: true, draft: DRAFT, isTest: true }, sends = [], failSend = false } = {}) => {
      quiet();
      try {
        return await v2.handleGiftV2CheckoutSessionCompleted(sess, {
          adminKey: 'admin', fetchImpl: st.fetchImpl, now: () => now, readDraft: async () => draft,
          sendEmail: async (email, options) => { sends.push({ email, options }); return { error: failSend && email.to !== 'hello@openinvite.com.au' ? { message: 'down' } : null }; },
        });
      } finally { loud(); }
    };

    check('a session is v2 only with purchaseType gift AND gift_version 2',
      v2.isGiftV2Session(session()) && !v2.isGiftV2Session(session({ metadata: { purchaseType: 'gift', plan: 'ultra' } })) && !v2.isGiftV2Session(session({ metadata: { plan: 'ultra' } })));

    // ── a gift that goes now ────────────────────────────────────────────
    const st = store();
    const sends = [];
    let out = await run(st, session(), { sends });
    const [row] = [...st.rows.values()];
    check('one PlanGift row, version 2, 200 to Stripe', out.status === 200 && st.rows.size === 1 && row.version === 2 && row.plan === 'ultra');
    check('  no coupon and no promotion code', !('coupon_id' in row) && !('promotion_code_id' in row) && !('promotion_code_display' in row));
    check('  every personal field is ciphertext that opens under APP_ENC_KEY',
      decryptGiftField(row.recipient_email_enc) === DRAFT.email && decryptGiftField(row.recipient_names_enc) === DRAFT.names
        && decryptGiftField(row.recipient_note_enc) === DRAFT.note && decryptGiftField(row.buyer_name_enc) === DRAFT.giver
        && decryptGiftField(row.buyer_email_enc) === 'sam@example.com' && !/isla|Theo|Sam|With love|example\.com/i.test(JSON.stringify(row)));
    let frozenOpens = true;
    try { const { decryptString } = await import('../../api/_lib/giftAuth.js'); decryptString(row.recipient_email_enc); } catch { frozenOpens = false; }
    check('  and not under the frozen cipher', frozenOpens === false);
    check('  the choices plain, the buyer an APP_HASH_KEY HMAC, a test session marked is_test',
      row.headline_key === 'for_you' && row.photo_key === DRAFT.photoId && row.note_style === 'plain' && /^[0-9a-f]{64}$/.test(row.buyer_user_id_hash) && row.is_test === true);
    check('  only the hashes of the claim and edit tokens are stored',
      row.claim_token_hash === tokens.giftTokenHash(tokens.giftToken('claim', row.id, 1)) && row.edit_token_hash === tokens.giftTokenHash(tokens.giftToken('edit', row.id, 1))
        && !JSON.stringify(row).includes(tokens.giftToken('claim', row.id, 1)));
    const reveal = sends.find((s) => s.email.tags?.[0]?.value === 'gift_reveal');
    const confirm = sends.find((s) => s.email.tags?.[0]?.value === 'gift_confirmation');
    check('the couple get the reveal at their address, idempotent on the gift, with the claim link',
      reveal?.email.to === DRAFT.email && reveal.options?.idempotencyKey === `gift-reveal-${row.id}` && reveal.email.html.includes(`/gift/claim/${tokens.giftToken('claim', row.id, 1)}`));
    check('  and sent_at is stamped', !!st.rows.get(row.id).sent_at);
    check('the giver gets the confirmation at Stripe\'s address, idempotent, with the edit link',
      confirm?.email.to === 'sam@example.com' && confirm.options?.idempotencyKey === `gift-confirm-${row.id}` && confirm.email.html.includes(`/gift/edit/${tokens.giftToken('edit', row.id, 1)}`));
    check('two emails, nobody else', sends.length === 2);

    // ── a replay ────────────────────────────────────────────────────────
    const before = sends.length;
    out = await run(st, session(), { sends });
    check('a redelivery of the same session writes nothing and sends nothing', out.status === 200 && st.rows.size === 1 && sends.length === before);

    // ── a gift on a date ────────────────────────────────────────────────
    const st2 = store();
    const sends2 = [];
    await run(st2, session({ id: 'cs_test_dated' }), { sends: sends2, draft: { ok: true, draft: { ...DRAFT, when: 'date', date: '2026-12-01', timezone: 'Australia/Sydney' }, isTest: true } });
    const [row2] = [...st2.rows.values()];
    check('a dated gift is stamped with 9 am where the couple are, and not sent',
      row2.send_at === '2026-11-30T22:00:00.000Z' && !row2.sent_at && !sends2.some((s) => s.email.tags?.[0]?.value === 'gift_reveal'));
    check('  the giver is told the date', sends2.length === 1 && sends2[0].email.text.includes('December 1, 2026'));
    check('9 am follows each zone\'s own offset', v2.nineAmIn('2026-12-01', 'America/New_York') === '2026-12-01T14:00:00.000Z' && v2.nineAmIn('2026-07-01', 'Europe/London') === '2026-07-01T08:00:00.000Z');

    // ── drafts that cannot be used ──────────────────────────────────────
    const st3 = store();
    const sends3 = [];
    out = await run(st3, session({ id: 'cs_test_expired' }), { sends: sends3, draft: { ok: false, reason: 'expired' } });
    check('an expired draft is refused: no row, 200, and the support inbox is told',
      out.status === 200 && st3.rows.size === 0 && sends3.length === 1 && sends3[0].email.to === 'hello@openinvite.com.au' && /expired/.test(sends3[0].email.html));
    const st4 = store();
    out = await run(st4, session({ id: 'cs_test_missing' }), { draft: { ok: false, reason: 'missing' } });
    check('a draft not found yet answers 502 so Stripe retries, writing nothing', out.status === 502 && st4.rows.size === 0);

    // ── a delivery that dies halfway ────────────────────────────────────
    const st5 = store({ failPut: 1 });
    const sends5 = [];
    out = await run(st5, session({ id: 'cs_test_resume' }), { sends: sends5 });
    check('if the token hashes cannot be stored, 502 and nothing sent', out.status === 502 && st5.rows.size === 1 && sends5.length === 0);
    out = await run(st5, session({ id: 'cs_test_resume' }), { sends: sends5 });
    const [row5] = [...st5.rows.values()];
    check('  and the redelivery finishes it: same row, hashes stored, both emails',
      out.status === 200 && st5.rows.size === 1 && !!row5.claim_token_hash && !!row5.sent_at && sends5.length === 2);

    // ── the route ───────────────────────────────────────────────────────
    const hook = readFileSync(resolve(ROOT, 'api/webhooks/stripe.js'), 'utf8');
    check('the webhook routes v2 first, then v1 gifts and purchases as before',
      /isGiftV2Session\(verifiedSession\)\s*\?\s*await handleGiftV2CheckoutSessionCompleted\(verifiedSession[\s\S]*?:\s*verifiedSession\.metadata\?\.purchaseType === 'gift'\s*\?\s*await handleGiftCheckoutSessionCompleted\(verifiedSession\)\s*:\s*await handleCheckoutSessionCompleted\(verifiedSession\)/.test(hook));
    const cron = readFileSync(resolve(ROOT, 'api/cron/send-gift-reveals.js'), 'utf8');
    check('the hourly cron opens v2 rows with the same APP_ENC_KEY cipher', /from '\.\.\/_lib\/giftCrypto\.js'/.test(cron) && !/giftAuth/.test(cron));
  } finally {
    console.log = realLog; console.error = realErr;
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
  return r;
}
