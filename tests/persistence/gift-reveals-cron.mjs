/**
 * tests/persistence/gift-reveals-cron.mjs
 *
 * THE SCHEDULED REVEAL SENDS WHAT IS DUE, ONCE, AND SAYS NOTHING ABOUT WHO.
 * goals/2026-10-11-gifting-v2.md, item 4: api/cron/send-gift-reveals.js and
 * the token module it rebuilds claim links with, api/_lib/giftTokens.js.
 * No network: Base44 and Resend are stubs, and decryption is a stub.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const KEY = 'a'.repeat(64);

function mockRes() {
  return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
}

export async function runGiftRevealsCron() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Gifting v2 item 4, the scheduled reveal:\n');
  const saved = process.env.APP_HASH_KEY;
  process.env.APP_HASH_KEY = KEY;
  try {
    const tokens = await import('../../api/_lib/giftTokens.js');
    const cron = await import('../../api/cron/send-gift-reveals.js');

    // ── tokens ──────────────────────────────────────────────────────────
    const t1 = tokens.giftToken('claim', 'gift123abc', 1);
    check('a claim token verifies to its gift id', tokens.verifyGiftToken('claim', t1) === 'gift123abc', t1.slice(0, 20));
    check('  but not as an edit token', tokens.verifyGiftToken('edit', t1) === null);
    check('  and a changed character does not verify', tokens.verifyGiftToken('claim', `${t1.slice(0, -1)}${t1.endsWith('A') ? 'B' : 'A'}`) === null);
    check('  nor a token for another gift with this signature', tokens.verifyGiftToken('claim', t1.replace('gift123abc', 'gift123abd')) === null);
    const t3 = tokens.giftToken('claim', 'gift123abc', 3);
    check('the current token is rebuilt from the stored hash, whatever its version',
      tokens.currentToken('claim', { id: 'gift123abc', claim_token_hash: tokens.giftTokenHash(t3) }) === t3);
    check('  and is null when no version matches, or there is no hash',
      tokens.currentToken('claim', { id: 'gift123abc', claim_token_hash: 'f'.repeat(64) }) === null && tokens.currentToken('claim', { id: 'gift123abc' }) === null);
    check('the stored hash is not the token', tokens.giftTokenHash(t1) !== t1 && /^[0-9a-f]{64}$/.test(tokens.giftTokenHash(t1)));
    delete process.env.APP_HASH_KEY;
    let threw = false;
    try { tokens.giftToken('claim', 'gift123abc', 1); } catch { threw = true; }
    check('with no APP_HASH_KEY a token cannot be made', threw);
    process.env.APP_HASH_KEY = KEY;
    const src = readFileSync(resolve(ROOT, 'api/_lib/giftTokens.js'), 'utf8');
    check('tokens are keyed through appKeys, never BASE44_ADMIN_KEY', /from '\.\/appKeys\.js'/.test(src) && !/process\.env\.BASE44_ADMIN_KEY/.test(src));

    // ── where the links point (owner ruling 2026-10-13) ─────────────────
    check('in production a gift link is always www.openinvite.com.au',
      tokens.giftOrigin({ VERCEL_ENV: 'production', VERCEL_BRANCH_URL: 'x.vercel.app' }) === 'https://www.openinvite.com.au' && tokens.giftOrigin({}) === 'https://www.openinvite.com.au');
    check('on a preview it is that deployment\'s own branch address, then its own host',
      tokens.giftOrigin({ VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'openinvite-git-gift-test-team.vercel.app', VERCEL_URL: 'openinvite-abc-team.vercel.app' }) === 'https://openinvite-git-gift-test-team.vercel.app'
        && tokens.giftOrigin({ VERCEL_ENV: 'preview', VERCEL_URL: 'openinvite-abc-team.vercel.app' }) === 'https://openinvite-abc-team.vercel.app');
    check('  and anything that is not a vercel.app host falls back to production', tokens.giftOrigin({ VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'evil.example.com' }) === 'https://www.openinvite.com.au');

    // ── what is due ─────────────────────────────────────────────────────
    const now = new Date('2026-11-01T10:00:00Z');
    const past = (h) => new Date(now.getTime() - h * 3600e3).toISOString();
    const base = { version: 2, plan: 'ultra', is_test: false };
    const rows = [
      { ...base, id: 'due000001', send_at: past(0.5) },
      { ...base, id: 'due000002', send_at: past(30) },
      { ...base, id: 'sent00001', send_at: past(2), sent_at: past(1) },
      { ...base, id: 'claimed01', send_at: past(2), claimed_at: past(1) },
      { ...base, id: 'future001', send_at: past(-2) },
      { ...base, id: 'testrow01', send_at: past(2), is_test: true },
      { ...base, id: 'version11', send_at: past(2), version: 1 },
      { ...base, id: 'nowgift01', send_at: null },
    ];
    const due = cron.dueReveals(rows, now).map((g) => g.id);
    check('due: version 2, send_at passed, not sent, not claimed, not a test, oldest first',
      due.join(',') === 'due000002,due000001', due.join(','));
    const many = Array.from({ length: 60 }, (_, i) => ({ ...base, id: `bulk${String(i).padStart(5, '0')}`, send_at: past(60 - i) }));
    check(`at most ${cron.MAX_PER_RUN} per run`, cron.dueReveals(many, now).length === 50 && cron.MAX_PER_RUN === 50);

    // ── the gate ────────────────────────────────────────────────────────
    const on = { CRON_SECRET: 's3cret', GIFTING_V2: '1', BASE44_ADMIN_KEY: 'admin', RESEND_API_KEY: 'x' };
    let res = mockRes(); await cron.default({ method: 'POST', headers: {} }, res, { env: on });
    check('GET only', res.statusCode === 405);
    res = mockRes(); await cron.default({ method: 'GET', headers: { authorization: 'Bearer nope' } }, res, { env: on });
    check('the wrong bearer is refused', res.statusCode === 401);
    res = mockRes(); await cron.default({ method: 'GET', headers: {} }, res, { env: { VERCEL_ENV: 'production', GIFTING_V2: '1' } });
    check('production with no CRON_SECRET refuses to run', res.statusCode === 500);
    let read = false;
    res = mockRes(); await cron.default({ method: 'GET', headers: { authorization: 'Bearer s3cret' } }, res,
      { env: { ...on, GIFTING_V2: undefined, VERCEL_ENV: 'production' }, fetch: async () => { read = true; return { ok: true, json: async () => [] }; } });
    check('with gifting v2 off it does nothing, not even a read', res.statusCode === 200 && res.body?.skipped && !read);

    // ── a run ───────────────────────────────────────────────────────────
    const claimHash = (id) => tokens.giftTokenHash(tokens.giftToken('claim', id, 1));
    const stored = [
      { ...base, id: 'gifta0001', send_at: past(1), claim_token_hash: claimHash('gifta0001'), recipient_email_enc: 'enc:couple-a@example.com', recipient_names_enc: 'enc:Isla and Theo', buyer_name_enc: 'enc:Sam', recipient_note_enc: 'enc:With love', note_style: 'plain', headline_key: 'for_you', photo_key: 'DTS_UNWRAPPED_Franco_Dupuy_Photos_ID13773_dfzkub' },
      { ...base, id: 'giftb0002', plan: 'pro', send_at: past(3), claim_token_hash: claimHash('giftb0002'), recipient_email_enc: 'enc:couple-b@example.com', recipient_names_enc: 'enc:Mia and Ren', buyer_name_enc: 'enc:Jo', recipient_note_enc: 'enc:Enjoy', note_style: 'serif', headline_key: 'sorted', photo_key: 'DTS_UNWRAPPED_Franco_Dupuy_Photos_ID13773_dfzkub' },
      { ...base, id: 'giftc0003', send_at: past(2), recipient_email_enc: 'enc:couple-c@example.com' },
      { ...base, id: 'giftd0004', send_at: past(4), sent_at: past(3), recipient_email_enc: 'enc:couple-d@example.com' },
    ];
    const puts = [];
    const fetchStub = async (url, opts = {}) => {
      if (!opts.method) {
        if (/\/PlanGift\?/.test(url)) return { ok: true, json: async () => stored };
        const id = url.split('/').pop();
        return { ok: true, json: async () => stored.find((g) => g.id === id) };
      }
      puts.push({ url, body: JSON.parse(opts.body) });
      return { ok: true, json: async () => ({}) };
    };
    const sends = [];
    const resend = { emails: { send: async (email, options) => { sends.push({ email, options }); return { error: null }; } } };
    const logs = [];
    const realLog = console.log;
    console.log = (...a) => { logs.push(a.join(' ')); };
    res = mockRes();
    try {
      await cron.default({ method: 'GET', headers: { authorization: 'Bearer s3cret' } }, res,
        { env: on, fetch: fetchStub, resend, now: () => now, decrypt: (b) => (b ? String(b).replace(/^enc:/, '') : null) });
    } finally { console.log = realLog; }
    check('a run sends the two due gifts that have a claim link, oldest first',
      sends.map((s) => s.email.to).join(',') === 'couple-b@example.com,couple-a@example.com', sends.map((s) => s.email.to).join(','));
    check('  and counts the one with no claim hash instead of sending it', res.body?.noToken === 1 && res.body?.sent === 2 && res.body?.due === 3, JSON.stringify(res.body));
    check('  each send is idempotent on the gift id', sends.map((s) => s.options?.idempotencyKey).join(',') === 'gift-reveal-giftb0002,gift-reveal-gifta0001');
    check('  each carries its own current claim link',
      sends.every((s, i) => s.email.html.includes(`/gift/claim/${tokens.giftToken('claim', i === 0 ? 'giftb0002' : 'gifta0001', 1)}`)));
    check('  tagged as a gift reveal, with the gift\'s subject', sends.every((s) => s.email.tags?.[0]?.value === 'gift_reveal') && sends[0].email.subject === 'Jo gifted you Openinvite Pro');
    check('  and stamps sent_at on exactly those two',
      puts.length === 2 && puts.every((p) => p.body.sent_at === now.toISOString()) && puts.map((p) => p.url.split('/').pop()).join(',') === 'giftb0002,gifta0001');
    check('the run logs counts, never an address or a name',
      logs.length === 1 && !/@|Isla|Theo|Mia|Ren|Sam|\bJo\b/.test(logs.join(' ')), logs.join(' ').slice(0, 100));

    // ── a failed send is not stamped ────────────────────────────────────
    puts.length = 0;
    const failing = { emails: { send: async () => ({ error: { message: 'down' } }) } };
    res = mockRes();
    console.log = () => {};
    try {
      await cron.default({ method: 'GET', headers: { authorization: 'Bearer s3cret' } }, res,
        { env: on, fetch: fetchStub, resend: failing, now: () => now, decrypt: (b) => (b ? String(b).replace(/^enc:/, '') : null) });
    } finally { console.log = realLog; }
    check('a send Resend refuses is counted and not stamped, so the next run tries again', res.body?.failed === 2 && puts.length === 0);

    const vercel = JSON.parse(readFileSync(resolve(ROOT, 'vercel.json'), 'utf8'));
    check('vercel.json runs it hourly, on the hour', (vercel.crons || []).some((c) => c.path === '/api/cron/send-gift-reveals' && c.schedule === '0 * * * *'));
  } finally {
    if (saved === undefined) delete process.env.APP_HASH_KEY; else process.env.APP_HASH_KEY = saved;
  }
  return r;
}
