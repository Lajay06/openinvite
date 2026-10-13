/**
 * tests/persistence/collaborator-login-routing.mjs
 *
 * A COLLABORATOR-ONLY ACCOUNT SIGNING IN WITHOUT THE LINK GOES TO THE WEDDING
 * IT HELPS WITH; ALL REVOKED, IT GETS THE PLAN PAGE.
 *
 * Item 4's stop condition, owner ruling 2026-10-13:
 *   1. An active accepted grant: straight into the collaborator view of the
 *      most recently accepted wedding, writing nothing.
 *   2. Every grant revoked: the normal plan page.
 *   3. More than one active grant: the most recent wins.
 *   4. Account: "Planning a wedding of your own? Start here.", only for an
 *      account with an active grant that has not done the plan step.
 * How: CollaboratorGrant.owner_id_enc, the owner's id under APP_ENC_KEY,
 * written at accept. Never COLLAB_HASH_KEY: one key per job.
 *
 * DRIVEN: the encryption, mostRecentCollaboration over a stubbed Base44, the
 * context endpoint's no-owner answer, fetchMyCollaboration and the landing
 * URL. STATIC, comments stripped: the accept write, ChoosePlan's routing and
 * the Account line.
 *
 * The plants, proven by hand and recorded in the PR body: mostRecentCollaboration
 * ignoring a revoke turns the all-revoked branch red; encryptOwnerId keyed on
 * COLLAB_HASH_KEY turns the key-choice checks red.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => stripComments(fs.readFileSync(path.join(ROOT, p), 'utf8'), { trailing: true });
const HASH_KEY = '0123456789abcdef'.repeat(4);
const ENC_KEY = 'guard-only-enc-key';

export async function runCollaboratorLoginRouting() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const prior = { admin: process.env.BASE44_ADMIN_KEY, hash: process.env.COLLAB_HASH_KEY, enc: process.env.APP_ENC_KEY };
  process.env.BASE44_ADMIN_KEY = 'test-admin-key-not-a-real-credential';
  process.env.COLLAB_HASH_KEY = HASH_KEY;
  process.env.APP_ENC_KEY = ENC_KEY;

  const auth = await import('../../api/_lib/collaboratorAuth.js');
  const { hashId, encryptOwnerId, decryptOwnerId, mostRecentCollaboration } = auth;
  const landing = await import('../../src/lib/collaboratorLanding.js');
  const contextHandler = (await import('../../api/collaborator-context.js')).default;

  const realFetch = globalThis.fetch;
  let grants = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url, 'https://app.example');
    const bearer = String(init.headers?.Authorization || '').replace(/^Bearer /, '');
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.pathname.endsWith('/entities/User/me')) return bearer === 'tok-friend' ? json(200, { id: 'collab-1', email: 'f@example.com' }) : json(401, {});
    if (u.pathname.endsWith('/entities/CollaboratorGrant')) return json(200, grants);
    return json(200, []);
  };
  const ch = () => hashId('collab-1');
  const grant = (owner, created_date, { enc = true, type = 'grant', permissions = { Guests: { view: true } }, is_test = false } = {}) => ({
    owner_user_id_hash: hashId(owner), collaborator_user_id_hash: ch(), event_type: type, permissions, created_date, is_test,
    ...(enc && type === 'grant' ? { owner_id_enc: encryptOwnerId(owner, ch()) } : {}),
  });

  try {
    // ── the key ───────────────────────────────────────────────────────────
    console.log('\n  The owner id is encrypted under APP_ENC_KEY, and only that:\n');
    const enc = encryptOwnerId('owner-1', ch());
    ok('it round-trips', decryptOwnerId(enc, ch()) === 'owner-1', 'owner-1');
    ok('  and the stored value never holds the id in the clear', !enc.includes('owner-1'), enc.slice(0, 12) + '...');
    const aad = ch();
    process.env.COLLAB_HASH_KEY = 'fedcba9876543210'.repeat(4);
    ok('  COLLAB_HASH_KEY changing does not touch it', decryptOwnerId(enc, aad) === 'owner-1', 'hash key is not the cipher key');
    process.env.COLLAB_HASH_KEY = HASH_KEY;
    process.env.APP_ENC_KEY = 'a-different-enc-key';
    ok('  while APP_ENC_KEY changing does', decryptOwnerId(enc, ch()) === null, 'APP_ENC_KEY is the key');
    process.env.APP_ENC_KEY = ENC_KEY;
    ok('a value copied onto another collaborator\'s grant does not decrypt', decryptOwnerId(enc, hashId('collab-9')) === null, 'bound to its row');
    ok('nonsense decrypts to null, never a throw', decryptOwnerId('v1.x.y.z', ch()) === null && decryptOwnerId(null, ch()) === null, 'null');
    const authSrc = read('api/_lib/collaboratorAuth.js');
    const encFn = authSrc.slice(authSrc.indexOf('export function encryptOwnerId('), authSrc.indexOf('export function decryptOwnerId('));
    ok('encryptOwnerId uses encKey() from appKeys.js and no hashing key',
       /import \{ encKey \} from '\.\/appKeys\.js';/.test(authSrc) && /createCipheriv\('aes-256-gcm', encKey\(\), iv\)/.test(encFn) && !/collabHashKey|COLLAB_HASH_KEY|createHmac/.test(encFn), 'one key per job');
    const accept = read('api/collaborator-accept.js');
    ok('accept writes owner_id_enc from encryptOwnerId, and a missing key costs no access',
       /ownerIdEnc = encryptOwnerId\(invite\.ownerUserId, collaboratorHash\)/.test(accept) && /\.\.\.\(ownerIdEnc \? \{ owner_id_enc: ownerIdEnc \} : \{\}\)/.test(accept) && /try \{ ownerIdEnc = encryptOwnerId/.test(accept), 'written at accept');

    // ── the two branches ──────────────────────────────────────────────────
    console.log('\n  Active grant: the wedding. All revoked: nothing. Most recent wins:\n');
    grants = [grant('owner-1', '2026-10-01T00:00:00Z')];
    ok('one active grant: that owner', (await mostRecentCollaboration('collab-1', 'k'))?.ownerUserId === 'owner-1', 'owner-1');
    grants = [grant('owner-1', '2026-10-01T00:00:00Z'), grant('owner-1', '2026-10-02T00:00:00Z', { type: 'revoke' })];
    ok('every grant revoked: none', (await mostRecentCollaboration('collab-1', 'k')) === null, 'null');
    grants = [grant('owner-1', '2026-10-01T00:00:00Z'), grant('owner-2', '2026-10-03T00:00:00Z'), grant('owner-3', '2026-10-05T00:00:00Z'), grant('owner-3', '2026-10-06T00:00:00Z', { type: 'revoke' })];
    ok('two active, one revoked: the most recently accepted active one', (await mostRecentCollaboration('collab-1', 'k'))?.ownerUserId === 'owner-2', 'owner-2');
    grants = [grant('owner-1', '2026-10-01T00:00:00Z'), grant('owner-1', '2026-10-04T00:00:00Z', { enc: false, permissions: { Budget: { view: true } } })];
    const edited = await mostRecentCollaboration('collab-1', 'k');
    ok('a permission edit with no owner_id_enc still counts, with its permissions', edited?.ownerUserId === 'owner-1' && edited?.permissions?.Budget?.view === true, JSON.stringify(edited?.permissions));
    const forged = grant('owner-2', '2026-10-09T00:00:00Z');
    forged.owner_id_enc = encryptOwnerId('owner-666', ch());
    grants = [grant('owner-1', '2026-10-01T00:00:00Z'), forged];
    ok('an owner_id_enc that does not hash back to its row is ignored', (await mostRecentCollaboration('collab-1', 'k'))?.ownerUserId === 'owner-1', 'owner-1, not owner-666');
    grants = [grant('owner-1', '2026-10-01T00:00:00Z', { is_test: true })];
    ok('test rows count for nothing', (await mostRecentCollaboration('collab-1', 'k')) === null, 'null');

    console.log('\n  The endpoint answers without an owner:\n');
    const call = async (q) => {
      const req = { method: 'GET', query: q, headers: { authorization: 'Bearer tok-friend', 'x-forwarded-for': '198.51.100.7' } };
      const res = { _status: 200, _json: null, setHeader() {}, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; } };
      await contextHandler(req, res);
      return res;
    };
    grants = [grant('owner-1', '2026-10-01T00:00:00Z')];
    const yes = await call({});
    ok('collaborator-context with no ownerUserId: the wedding', yes._status === 200 && yes._json?.ownerUserId === 'owner-1', JSON.stringify(yes._json));
    grants = [grant('owner-1', '2026-10-01T00:00:00Z'), grant('owner-1', '2026-10-02T00:00:00Z', { type: 'revoke' })];
    const no = await call({});
    ok('  and all revoked: ownerUserId null, still a 200', no._status === 200 && no._json?.ownerUserId === null, JSON.stringify(no._json));

    // ── the client ────────────────────────────────────────────────────────
    console.log('\n  ChoosePlan and Account:\n');
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ownerUserId: 'owner-1', permissions: { Budget: { view: true } } }) });
    const got = await landing.fetchMyCollaboration('tok');
    ok('fetchMyCollaboration returns the wedding', got?.ownerUserId === 'owner-1', JSON.stringify(got));
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ownerUserId: null }) });
    ok('  null when all revoked', (await landing.fetchMyCollaboration('tok')) === null, 'null');
    globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    ok('  null on an error, so the plan page shows', (await landing.fetchMyCollaboration('tok')) === null, 'null');
    let called = false;
    globalThis.fetch = async () => { called = true; return { ok: true, json: async () => ({}) }; };
    ok('  and no call without a token', (await landing.fetchMyCollaboration(null)) === null && !called, 'no call');
    ok('the landing is the first page the grant can view, with the session',
       landing.collaboratorLandingUrl('owner 1', { Budget: { view: true } }) === '/Budget?collabOwner=owner%201', landing.collaboratorLandingUrl('owner 1', { Budget: { view: true } }));

    const choose = read('src/pages/ChoosePlan.jsx');
    const routing = choose.slice(choose.indexOf("if (!user || !params.has('next'))"), choose.indexOf('}, [isLoadingAuth, user]);'));
    ok('ChoosePlan routes only on the way in from a sign-in, after the plan-step check',
       routing.length > 0 && choose.indexOf("if (!user || !params.has('next'))") > choose.indexOf('if (isPastPlanStep(user)) {'), 'next present');
    ok('  goes to the landing with replace when there is a wedding',
       /if \(mine\) \{\s*navigate\(collaboratorLandingUrl\(mine\.ownerUserId, mine\.permissions\), \{ replace: true \}\);\s*return;/.test(routing), 'collaborator view');
    ok('  shows the plan page otherwise', /setChecking\(false\);\s*\}\);/.test(routing), 'plan page');
    ok('  and writes nothing on the way', !/updateMe|trialStartedAt|plan_step_completed|onboarding/.test(routing), 'no writes');

    const isPast = new Function(`${choose.slice(choose.indexOf('function isPastPlanStep('), choose.indexOf('\n}\n', choose.indexOf('function isPastPlanStep(')) + 2)}\nreturn isPastPlanStep;`)();
    const users = [{}, { plan_step_completed: true }, { onboardingCompleted: true }, { plan: 'pro' }, { plan: 'ultra' }, { plan: 'free' }, null];
    ok('planStepNotDone is exactly the opposite of ChoosePlan\'s isPastPlanStep', users.every(u => landing.planStepNotDone(u) === !isPast(u)), `${users.length} accounts`);

    const account = read('src/pages/Account.jsx');
    ok('Account shows the line only with an active grant and the plan step not done',
       /if \(!user \|\| !planStepNotDone\(user\)\) \{ setHelpsWithAWedding\(false\); return; \}/.test(account) && /setHelpsWithAWedding\(!!mine\)/.test(account) && /\{helpsWithAWedding && \(/.test(account), 'gated');
    ok('  with the owner\'s words, "Start here." linking to /choose-plan',
       landing.START_YOUR_OWN_LEAD === 'Planning a wedding of your own?' && landing.START_YOUR_OWN_LINK === 'Start here.'
       && /<Link to="\/choose-plan"[^>]*>\{START_YOUR_OWN_LINK\}<\/Link>/.test(account), '/choose-plan');
  } finally {
    globalThis.fetch = realFetch;
    for (const [k, env] of [['admin', 'BASE44_ADMIN_KEY'], ['hash', 'COLLAB_HASH_KEY'], ['enc', 'APP_ENC_KEY']]) {
      if (prior[k] === undefined) delete process.env[env]; else process.env[env] = prior[k];
    }
  }

  return results;
}
