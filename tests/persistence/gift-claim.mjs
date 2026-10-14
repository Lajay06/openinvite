/**
 * tests/persistence/gift-claim.mjs
 *
 * A GIFT IS CLAIMED ONCE, BY THE PLAN RULES, AND A CHANGED ADDRESS KILLS THE
 * OLD LINK. goals/2026-10-11-gifting-v2.md, item 8 (HELD): api/gift-link.js
 * and api/_lib/giftClaim.js, plus the two client changes it needs. No
 * network: PlanGift and User are in-memory, the mailer is a stub.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const KEYS = { APP_ENC_KEY: 'e'.repeat(64), APP_HASH_KEY: 'h'.repeat(64) };

function mockRes() {
  return { statusCode: 0, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
}

/** PlanGift and User tables as Base44's REST answers single-record reads and writes. */
function backend({ failUserPut = false } = {}) {
  const tables = { PlanGift: new Map(), User: new Map() };
  const json = (body, ok = true, status = 200) => ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) });
  const fetchImpl = async (url, opts = {}) => {
    const m = /\/entities\/(PlanGift|User)\/([^/?]+)/.exec(url);
    if (!m) return json(null, false, 404);
    const [, table, id] = m;
    const method = opts.method || 'GET';
    if (method === 'GET') return tables[table].has(id) ? json(tables[table].get(id)) : json(null, false, 404);
    if (method === 'PUT') {
      if (table === 'User' && failUserPut) return json({ error: 'down' }, false, 500);
      tables[table].set(id, { ...(tables[table].get(id) || {}), ...JSON.parse(opts.body), id });
      return json({});
    }
    return json(null, false, 400);
  };
  return { tables, fetchImpl };
}

export async function runGiftClaim() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Gifting v2 item 8, the claim endpoint:\n');
  const saved = Object.fromEntries(Object.keys({ ...KEYS, GIFTING_V2: 1, VERCEL_ENV: 1 }).map((k) => [k, process.env[k]]));
  Object.assign(process.env, KEYS);
  try {
    const gc = await import('../../api/_lib/giftClaim.js');
    const tokens = await import('../../api/_lib/giftTokens.js');
    const { encryptGiftField, decryptGiftField } = await import('../../api/_lib/giftCrypto.js');
    const now = new Date('2026-11-01T10:00:00Z');

    // ── the plan rules ──────────────────────────────────────────────────
    const a = (currentPlan, giftPlan, currentExpiresAt) => gc.applyGiftToAccount({ currentPlan, giftPlan, currentExpiresAt, now });
    check('free + Ultra gift: Ultra, 24 months from now', a('free', 'ultra').plan === 'ultra' && a('free', 'ultra').planExpiresAt === '2028-11-01T10:00:00.000Z');
    check('Pro + Pro gift: stays Pro, 24 months added to a term still running', a('pro', 'pro', '2027-05-01T00:00:00.000Z').plan === 'pro' && a('pro', 'pro', '2027-05-01T00:00:00.000Z').planExpiresAt === '2029-05-01T00:00:00.000Z' && !a('pro', 'pro').changed);
    check('Pro + Ultra gift: upgrades and extends', a('pro', 'ultra').plan === 'ultra' && a('pro', 'ultra').changed);
    check('Ultra + Pro gift: refused, more than the gift', a('ultra', 'pro').ok === false && a('ultra', 'pro').reason === 'more_than_gift');
    check('a lapsed term counts from now, not from the past', a('pro', 'pro', '2025-01-01T00:00:00.000Z').planExpiresAt === '2028-11-01T10:00:00.000Z');
    check('months are calendar months (31 January + 1 month is 28 February)', gc.addMonths('2027-01-31T00:00:00.000Z', 1) === '2027-02-28T00:00:00.000Z');

    // ── a gift in the store ─────────────────────────────────────────────
    const seed = (b, over = {}) => {
      const id = over.id || 'giftrow01';
      const row = {
        id, version: 2, plan: 'ultra', buyer_name_enc: encryptGiftField('Sam'), recipient_names_enc: encryptGiftField('Isla and Theo'),
        recipient_email_enc: encryptGiftField('isla@example.com'), recipient_note_enc: encryptGiftField('With love'),
        note_style: 'plain', headline_key: 'for_you', photo_key: 'DTS_UNWRAPPED_Franco_Dupuy_Photos_ID13773_dfzkub',
        claim_token_hash: tokens.giftTokenHash(tokens.giftToken('claim', id, 1)), edit_token_hash: tokens.giftTokenHash(tokens.giftToken('edit', id, 1)), ...over,
      };
      b.tables.PlanGift.set(id, row);
      return { row, claim: tokens.giftToken('claim', id, 1), edit: tokens.giftToken('edit', id, 1) };
    };
    let b = backend();
    let g = seed(b);
    const found = await gc.findGiftByToken('claim', g.claim, { adminKey: 'admin', fetchImpl: b.fetchImpl });
    check('a current claim token opens its gift', found?.id === 'giftrow01');
    check('  an edit token does not open it as a claim, nor a forged one', !(await gc.findGiftByToken('claim', g.edit, { adminKey: 'admin', fetchImpl: b.fetchImpl })) && !(await gc.findGiftByToken('claim', `${g.claim.slice(0, -2)}xx`, { adminKey: 'admin', fetchImpl: b.fetchImpl })));
    const view = gc.giftView(found, 'claim');
    check('the claim view shows the gift, never the couple\'s address', view.giver === 'Sam' && view.names === 'Isla and Theo' && !('email' in view) && gc.giftView(found, 'edit').email === 'isla@example.com');

    // ── a claim ─────────────────────────────────────────────────────────
    b.tables.User.set('user42', { id: 'user42', plan: 'free' });
    let out = await gc.claimGift({ token: g.claim, user: { id: 'user42', plan: 'free' }, adminKey: 'admin', fetchImpl: b.fetchImpl, now });
    const u = b.tables.User.get('user42');
    const claimedRow = b.tables.PlanGift.get('giftrow01');
    check('a claim sets the plan and the term, and sends a new couple to onboarding',
      out.status === 200 && out.body.next === '/onboarding' && out.body.giver === 'Sam' && u.plan === 'ultra' && u.planExpiresAt === '2028-11-01T10:00:00.000Z' && u.planActivatedAt === now.toISOString());
    check('  and stamps the gift claimed by an APP_HASH_KEY HMAC of the user', !!claimedRow.claimed_at && /^[0-9a-f]{64}$/.test(claimedRow.claimed_user_id_hash) && !JSON.stringify(claimedRow).includes('user42'));
    out = await gc.claimGift({ token: g.claim, user: { id: 'user99', plan: 'free' }, adminKey: 'admin', fetchImpl: b.fetchImpl, now });
    check('the same link cannot be claimed again', out.status === 410 && out.body.reason === 'used');
    const onboarded = await gc.claimGift({ token: seed(b, { id: 'giftrow02' }).claim, user: { id: 'user7', plan: 'pro', onboardingCompleted: true }, adminKey: 'admin', fetchImpl: b.fetchImpl, now });
    check('an onboarded couple goes to their daily update instead', onboarded.body.next === '/DailyUpdate');

    // ── planSource (owner ruling 2026-10-13) ────────────────────────────
    // "gift" only when the claim changes the plan, and in the same write that
    // sets it; when only the expiry moves, the write does not carry the field
    // at all, so whatever the account held stands. Read off the request
    // bodies, not the merged row: a store that merges would hide a write of
    // the old value.
    const userPuts = (bk) => {
      const puts = [];
      const inner = bk.fetchImpl;
      bk.fetchImpl = async (url, opts = {}) => {
        if ((opts.method || 'GET') === 'PUT' && /\/entities\/User\//.test(url)) puts.push(JSON.parse(opts.body));
        return inner(url, opts);
      };
      return puts;
    };
    b = backend();
    let puts = userPuts(b);
    b.tables.User.set('user50', { id: 'user50', plan: 'free' });
    await gc.claimGift({ token: seed(b, { id: 'giftrow50' }).claim, user: { id: 'user50', plan: 'free' }, adminKey: 'admin', fetchImpl: b.fetchImpl, now });
    check('a claim that changes the plan writes planSource "gift" in the one write that sets the plan',
      puts.length === 1 && puts[0].planSource === 'gift' && puts[0].plan === 'ultra' && b.tables.User.get('user50').planSource === 'gift', JSON.stringify(puts));
    b = backend();
    puts = userPuts(b);
    b.tables.User.set('user51', { id: 'user51', plan: 'pro', planSource: 'purchase' });
    await gc.claimGift({ token: seed(b, { id: 'giftrow51', plan: 'pro' }).claim, user: { id: 'user51', plan: 'pro', planExpiresAt: '2027-05-01T00:00:00.000Z' }, adminKey: 'admin', fetchImpl: b.fetchImpl, now });
    check('a claim that only moves the expiry does not send planSource, and a purchased plan still reads "purchase"',
      puts.length === 1 && !('planSource' in puts[0]) && puts[0].planExpiresAt === '2029-05-01T00:00:00.000Z' && b.tables.User.get('user51').planSource === 'purchase', JSON.stringify(puts));
    b = backend();
    puts = userPuts(b);
    b.tables.User.set('user52', { id: 'user52', plan: 'pro' });
    await gc.claimGift({ token: seed(b, { id: 'giftrow52', plan: 'pro' }).claim, user: { id: 'user52', plan: 'pro' }, adminKey: 'admin', fetchImpl: b.fetchImpl, now });
    check('  and an account with no planSource keeps none', puts.length === 1 && !('planSource' in puts[0]) && !('planSource' in b.tables.User.get('user52')));

    b = backend();
    g = seed(b, { plan: 'pro' });
    out = await gc.claimGift({ token: g.claim, user: { id: 'u1', plan: 'ultra' }, adminKey: 'admin', fetchImpl: b.fetchImpl, now });
    check('a Pro gift to an Ultra account is refused with the giver named, and stays unclaimed',
      out.status === 409 && out.body.reason === 'more_than_gift' && out.body.giver === 'Sam' && !b.tables.PlanGift.get('giftrow01').claimed_at);

    b = backend({ failUserPut: true });
    g = seed(b);
    out = await gc.claimGift({ token: g.claim, user: { id: 'u2', plan: 'free' }, adminKey: 'admin', fetchImpl: b.fetchImpl, now });
    check('if the plan cannot be written, the claim is undone so the gift is not burned', out.status === 502 && !b.tables.PlanGift.get('giftrow01').claimed_at);

    // ── an edit ─────────────────────────────────────────────────────────
    b = backend();
    g = seed(b, { sent_at: '2026-10-30T09:00:00.000Z' });
    const sends = [];
    const sendEmail = async (email, options) => { sends.push({ email, options }); return { error: null }; };
    out = await gc.editGift({ token: g.edit, email: 'isla@example.com', note: 'With all our love', adminKey: 'admin', fetchImpl: b.fetchImpl, sendEmail });
    check('a note change saves the note and sends nothing', out.body.changed && decryptGiftField(b.tables.PlanGift.get('giftrow01').recipient_note_enc) === 'With all our love' && sends.length === 0);
    out = await gc.editGift({ token: g.edit, email: 'right@example.com', note: 'With all our love', adminKey: 'admin', fetchImpl: b.fetchImpl, sendEmail });
    const v2 = tokens.giftToken('claim', 'giftrow01', 2);
    check('a new address moves the claim link to version 2', b.tables.PlanGift.get('giftrow01').claim_token_hash === tokens.giftTokenHash(v2));
    check('  so the old link no longer opens the gift, and the new one does',
      !(await gc.findGiftByToken('claim', g.claim, { adminKey: 'admin', fetchImpl: b.fetchImpl })) && (await gc.findGiftByToken('claim', v2, { adminKey: 'admin', fetchImpl: b.fetchImpl }))?.id === 'giftrow01');
    check('  and the reveal goes again, to the new address, with the new link, once',
      out.body.resent && sends.length === 1 && sends[0].email.to === 'right@example.com' && sends[0].email.html.includes(`/gift/claim/${v2}`) && sends[0].options.idempotencyKey === 'gift-reveal-giftrow01-v2');
    const sched = backend();
    const gs = seed(sched, { send_at: '2026-12-01T22:00:00.000Z' });
    const sends2 = [];
    await gc.editGift({ token: gs.edit, email: 'new@example.com', note: 'With love', adminKey: 'admin', fetchImpl: sched.fetchImpl, sendEmail: async (e, o) => { sends2.push({ e, o }); return { error: null }; } });
    check('a scheduled gift is not sent early by an edit; the cron sends the new link', sends2.length === 0 && tokens.currentToken('claim', sched.tables.PlanGift.get('giftrow01')) === tokens.giftToken('claim', 'giftrow01', 2));
    const claimedB = backend();
    const gcl = seed(claimedB, { claimed_at: '2026-10-31T00:00:00.000Z' });
    out = await gc.editGift({ token: gcl.edit, email: 'x@example.com', note: 'n', adminKey: 'admin', fetchImpl: claimedB.fetchImpl, sendEmail });
    check('once claimed, nothing can be changed', out.status === 409 && out.body.reason === 'claimed');
    out = await gc.editGift({ token: g.edit, email: 'not-an-address', note: 'n', adminKey: 'admin', fetchImpl: b.fetchImpl, sendEmail });
    check('a bad address is refused', out.status === 400 && out.body.reason === 'email');

    // ── the endpoint ────────────────────────────────────────────────────
    const ep = await import('../../api/gift-link.js');
    let res = mockRes();
    await ep.default({ method: 'GET', headers: {}, query: { token: g.claim }, socket: {} }, res, { env: { BASE44_ADMIN_KEY: 'admin', VERCEL_ENV: 'production' } });
    check('with gifting v2 off the endpoint is not there', res.statusCode === 404);
    const on = { BASE44_ADMIN_KEY: 'admin', GIFTING_V2: '1' };
    res = mockRes();
    await ep.default({ method: 'GET', headers: {}, query: { kind: 'claim', token: 'garbage' }, socket: {} }, res, { env: on, fetch: b.fetchImpl });
    check('an unknown token reads as used, not as not found', res.statusCode === 200 && res.body.status === 'used');
    res = mockRes();
    await ep.default({ method: 'POST', headers: {}, body: { action: 'claim', token: v2 }, socket: {} }, res, { env: on, fetch: b.fetchImpl, verifyUser: async () => null });
    check('a claim with no signed-in user asks for sign in', res.statusCode === 401 && res.body.reason === 'sign_in');

    // ── the client changes ──────────────────────────────────────────────
    const choose = read('src/pages/ChoosePlan.jsx');
    check('ChoosePlan sends a gift claim return straight back, from ?next= or the remembered pending claim, before the picker (owner rulings 2026-10-13)',
      /const giftReturn = isGiftClaimPath\(next\) \? next : \(user \? pendingClaimPath\(\) : null\);\s*if \(user && giftReturn\) \{\s*navigate\(giftReturn, \{ replace: true \}\);\s*return;\s*\}\s*if \(isPastPlanStep\(user\)\)/.test(choose));
    // THE THREE REDIRECTS, IN THE OWNER'S ORDER (2026-10-13): the collaborator
    // invite link, then the gift claim link, then the collaborator-only landing.
    const at = (re) => choose.search(re);
    const invite = at(/if \(isCollaboratorAcceptPath\(next\)\)/);
    const giftAt = at(/if \(user && giftReturn\)/);
    const landing = at(/fetchMyCollaboration\(/);
    check('  in order: invite link, gift claim link, collaborator-only landing', invite > 0 && giftAt > invite && landing > giftAt, `${invite} < ${giftAt} < ${landing}`);
    const onboarding = stripComments(read('src/pages/Onboarding.jsx'));
    check('onboarding shows the landing line once, on its first step', /sessionStorage\.removeItem\(GIFT_LANDING_KEY\)/.test(onboarding) && /giftLanding && currentStepIndex === 0/.test(onboarding));
    const { CLAIM } = await import('../../src/lib/giftingV2.js');
    const { EDIT } = await import('../../src/lib/giftingV2.js');
    check('the retry and saved lines are the owner\'s, verbatim (2026-10-13)',
      CLAIM.retry === 'That did not go through. Try again in a moment.' && EDIT.saved === 'Saved. They will see the change.'
        && EDIT.savedResent === 'Saved. We sent it again to the new address with a fresh link, and the old one no longer works.');
    check('the refusal and the landing line are the goal\'s, verbatim',
      CLAIM.moreThanGift === 'You already have Ultra, which is more than this gift. Reply to this email and we will sort it out with {giver}.' && CLAIM.landing === 'A gift from {giver}. {Plan}, paid for, 24 months.');

    // ── the gift welcome, never the trial one (owner ruling 2026-10-14) ──────
    {
      const sends = [];
      const sendEmail = async (email, options) => { sends.push({ email, options }); return { error: null }; };
      let bw = backend();
      bw.tables.User.set('newbie', { id: 'newbie', plan: 'free' });
      const g1 = seed(bw, { id: 'giftrowW1' });
      const fresh = { id: 'newbie', plan: 'free', email: 'la.jay06+giftclaim02@gmail.com', full_name: 'la.jay06+giftclaim02', onboardingCompleted: false };
      const outW = await gc.claimGift({ token: g1.claim, user: fresh, adminKey: 'admin', fetchImpl: bw.fetchImpl, now, sendEmail, origin: 'https://www.openinvite.com.au' });
      const w = sends[0];
      check('a new account that claims gets the gift welcome, once, idempotent on the gift',
        outW.status === 200 && sends.length === 1 && w.email.subject === 'Your Openinvite Ultra is ready' && w.options?.idempotencyKey === 'gift-welcome-giftrowW1' && w.email.tags?.[0]?.value === 'gift_welcome'
          && w.email.from === 'Openinvite <hello@openinvite.com.au>' && w.email.html.includes('https://www.openinvite.com.au/DailyUpdate'));
      check('  it never mentions a trial, and never greets by the address or its local part',
        !/trial/i.test(w.email.html + w.email.text) && /<h1[^>]*>Welcome\.<\/h1>/.test(w.email.html) && !/Welcome, la\.jay06/.test(w.email.html));
      check('  the owner\'s words: the button, and the Ultra body with the giver named',
        w.email.html.includes('Go to my dashboard') && w.email.text.includes("You're getting this because you opened a gift on Openinvite. Openinvite, Australia.") && w.email.html.includes("It's all switched on.") && w.email.text.includes("Sam gifted you Openinvite Ultra, and it's all switched on. Every guest, every reply, every table, the budget and the Guest Suite, for 24 months. Nothing to pay."));
      const tpl = await import('../../src/lib/giftWelcomeEmail.js');
      const pro = tpl.renderGiftWelcome({ plan: 'pro', giver: 'Sam', fullName: 'Isla Rose', email: 'isla@example.com', dashboardUrl: 'x' });
      check('  Pro says Pro, and a real first name is used',
        pro.subject === 'Your Openinvite Pro is ready' && pro.text.startsWith('Welcome, Isla.') && pro.text.includes('Sam gifted you Openinvite Pro') && !/Guest Suite/.test(pro.html));
      sends.length = 0;
      bw = backend();
      bw.tables.User.set('old', { id: 'old', plan: 'free' });
      await gc.claimGift({ token: seed(bw, { id: 'giftrowW2' }).claim, user: { id: 'old', plan: 'free', email: 'old@example.com', onboardingCompleted: true }, adminKey: 'admin', fetchImpl: bw.fetchImpl, now, sendEmail });
      check('  an account already onboarded is not new, and is not welcomed', sends.length === 0);
      bw = backend();
      bw.tables.User.set('newbie2', { id: 'newbie2', plan: 'free' });
      const realErr = console.error; console.error = () => {};
      const kept = await gc.claimGift({ token: seed(bw, { id: 'giftrowW3' }).claim, user: { ...fresh, id: 'newbie2' }, adminKey: 'admin', fetchImpl: bw.fetchImpl, now, sendEmail: async () => { throw new Error('resend down'); } });
      console.error = realErr;
      check('  a failed welcome never fails the claim', kept.status === 200 && bw.tables.User.get('newbie2').plan === 'ultra');
      const onb = stripComments(readFileSync(resolve(ROOT, 'src/pages/Onboarding.jsx'), 'utf8'));
      check('the trial welcome is never sent to an account whose plan came from a gift, and is sent once per page',
        /if \(!wasAlreadyOnboarded && user\?\.planSource !== 'gift' && !welcomeSentRef\.current\) \{\s*welcomeSentRef\.current = true;/.test(onb));
    }
  } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
  return r;
}

function read(p) { return readFileSync(resolve(ROOT, p), 'utf8'); }
