/**
 * tests/persistence/collaborator-invite-resend.mjs
 *
 * ONLY THE NEWEST INVITE LINK WORKS.
 *
 * Item 1b of goals/2026-10-10-collaborators-safe-and-truthful.md, the resend
 * half. Before it, every link ever sent for an owner and email pair verified
 * forever (the expiry half bounded that to 7 days), so a resend could not kill
 * the copy in an old inbox, and removing a pending invite left its link live.
 *
 * The endpoints are DRIVEN over a stubbed in-memory Base44 and a stubbed
 * Resend, so what is asserted is what a request does: which rows are written,
 * with whose token, holding what, and which links are then honored. No
 * credential, no network, no live row. The live round trip of the entity is
 * collaborator-invite-live.mjs, which the owner runs.
 *
 * The plant: an inviteStanding that never says 'stale' turns the "old link is
 * refused" checks red. Proven by hand and recorded in the PR body.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function mockReqRes({ method = 'POST', query = {}, body = {}, token, ip } = {}) {
  const req = {
    method, query, body,
    headers: { 'x-forwarded-for': ip || '203.0.113.61', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  };
  const res = {
    _status: 200, _json: null,
    setHeader() {}, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; },
  };
  return { req, res };
}

const USERS = {
  'tok-owner': { id: 'owner-1', email: 'owner@example.com' },
  'tok-friend': { id: 'collab-1', email: 'friend@example.com' },
  'tok-planner': { id: 'collab-2', email: 'planner@example.com' },
};

function installFake() {
  const invites = [];
  const grants = [];
  const emails = [];
  const log = [];
  const fault = { invitePost: false, invitePut: false };
  let clock = Date.parse('2026-10-11T00:00:00Z');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(typeof url === 'string' ? url : url.url);
    const method = (init.method || 'GET').toUpperCase();
    const headers = init.headers instanceof Headers ? Object.fromEntries(init.headers) : (init.headers || {});
    const bearer = String(headers.Authorization || headers.authorization || '').replace(/^Bearer /, '');
    const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (u.hostname === 'api.resend.com') {
      emails.push(JSON.parse(init.body));
      return json(200, { id: `email-${emails.length}` });
    }
    if (u.hostname !== 'base44.app') throw new Error(`unexpected network call to ${u.hostname}`);
    log.push({ method, path: u.pathname, bearer });
    if (u.pathname.endsWith('/entities/User/me')) return USERS[bearer] ? json(200, USERS[bearer]) : json(401, {});
    if (u.pathname.endsWith('/entities/WeddingDetails')) return json(200, [{ id: 'wedding-1', created_date: '2026-01-01T00:00:00Z', partner1Name: 'Alex' }]);
    if (/\/entities\/Collaborator(\/|$)/.test(u.pathname)) return json(200, { id: 'collab-record-1' });
    const inv = u.pathname.match(/\/entities\/CollaboratorInvite(?:\/([^/]+))?$/);
    if (inv) {
      if (method === 'POST') {
        if (fault.invitePost) return json(500, { error: 'down' });
        const row = { ...JSON.parse(init.body), id: `inv${invites.length + 1}`, created_by_id: USERS[bearer]?.id, created_date: new Date(clock += 1000).toISOString() };
        invites.push(row);
        return json(200, row);
      }
      if (method === 'PUT') {
        if (fault.invitePut) return json(500, { error: 'down' });
        const row = invites.find(r => r.id === inv[1]);
        if (!row || row.created_by_id !== USERS[bearer]?.id) return json(403, { error: 'not creator' });
        Object.assign(row, JSON.parse(init.body));
        return json(200, row);
      }
      const q = JSON.parse(u.searchParams.get('q') || '{}');
      return json(200, invites.filter(r => Object.entries(q).every(([k, v]) => r[k] === v)));
    }
    if (u.pathname.endsWith('/entities/CollaboratorGrant')) {
      if (method === 'POST') { grants.push(JSON.parse(init.body)); return json(200, { id: `g${grants.length}` }); }
      return json(200, []);
    }
    return json(200, []);
  };
  return { invites, grants, emails, log, fault, restore: () => { globalThis.fetch = realFetch; } };
}

export async function runCollaboratorInviteResend() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const prior = { admin: process.env.BASE44_ADMIN_KEY, resend: process.env.RESEND_API_KEY };
  process.env.BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY || 'test-admin-key-not-a-real-credential';
  // Collaborator hashes and invite links use COLLAB_HASH_KEY, never the admin key.
  const priorHashKey = process.env.COLLAB_HASH_KEY;
  process.env.COLLAB_HASH_KEY = '0123456789abcdef'.repeat(4);
  // notify.js and send-collaborator-invite.js build a Resend client at module
  // scope; a module that throws on first evaluation stays failed for the whole
  // process. Placeheld around the imports, as rsvp-confirmation-email.mjs does.
  if (!process.env.RESEND_API_KEY) process.env.RESEND_API_KEY = 're_persistence_suite_placeholder';
  const { hashId } = await import('../../api/_lib/collaboratorAuth.js');
  const { signInvite, INVITE_TTL_MS } = await import('../../api/_lib/collaboratorInviteToken.js');
  const sendHandler = (await import('../../api/send-collaborator-invite.js')).default;
  const lookupHandler = (await import('../../api/collaborator-lookup.js')).default;
  const acceptHandler = (await import('../../api/collaborator-accept.js')).default;
  const revokeHandler = (await import('../../api/collaborator-revoke.js')).default;

  const fake = installFake();
  // Time stands still for the whole run, so every send shares one iat. That
  // is the case that once made a resend's link equal to the old one (CI flake,
  // 2026-10-11): two sends in one millisecond with one payload. With the clock
  // frozen it happens every run, so only the nonce can keep the links apart.
  const realNow = Date.now;
  const frozen = realNow();
  Date.now = () => frozen;
  let ipn = 70;
  const call = async (handler, opts) => { const { req, res } = mockReqRes({ ip: `203.0.113.${ipn++}`, ...opts }); await handler(req, res); return res; };
  const send = (email) => call(sendHandler, { token: 'tok-owner', body: { name: 'Friend', email, permissions: { Schedule: { view: true } }, origin: 'https://openinvite.com.au' } });
  const linkOf = (res) => decodeURIComponent(String(res._json?.acceptUrl || '').split('/collaborate/accept/')[1] || '');
  const lookup = (token) => call(lookupHandler, { method: 'GET', query: { token } });
  const accept = (token, as = 'tok-friend') => call(acceptHandler, { token: as, body: { token } });

  try {
    // ── A SEND RECORDS ONE HASHED ROW, BEFORE THE EMAIL ──────────────────────
    console.log('\n  Every send records one CollaboratorInvite row, hashes only:\n');
    const s1 = await send('Friend@Example.com');
    const link1 = linkOf(s1);
    const row1 = fake.invites[0];
    ok('the first send succeeds and writes one invite row', s1._status === 200 && fake.invites.length === 1 && !!link1, `status ${s1._status}`);
    ok('  written with the owner\'s own token', fake.log.some(l => l.method === 'POST' && l.path.endsWith('/CollaboratorInvite') && l.bearer === 'tok-owner'), 'owner token');
    ok('  status set explicitly to sent', row1?.status === 'sent', row1?.status);
    ok('  every identifying field is the hashId of its value',
       row1?.owner_user_id_hash === hashId('owner-1') && row1?.collaborator_email_hash === hashId('friend@example.com')
       && row1?.wedding_id_hash === hashId('wedding-1') && row1?.invite_token_hash === hashId(link1),
       'owner, email lowercased, wedding, token');
    // Only what the endpoint wrote: id, created_by_id and created_date are the
    // platform's own columns, stamped by the fake as Base44 would.
    const { id: _id, created_by_id: _by, created_date: _at, ...written } = row1 || {};
    const rowText = JSON.stringify(written).toLowerCase();
    ok('  and the row holds no raw email, id or token',
       !rowText.includes('friend@example.com') && !rowText.includes('"owner-1"') && !rowText.includes('wedding-1') && !rowText.includes(link1.toLowerCase().slice(0, 40)),
       'hashes only');
    ok('  expires_at is 7 days after it was signed, resend_count 0',
       Math.abs(new Date(row1?.expires_at).getTime() - Date.now() - INVITE_TTL_MS) < 60_000 && row1?.resend_count === 0,
       `${row1?.expires_at}, ${row1?.resend_count}`);
    const firstInviteWrite = fake.log.findIndex(l => l.method === 'POST' && l.path.endsWith('/CollaboratorInvite'));
    ok('  and the email went out after the row was written', fake.emails.length === 1 && firstInviteWrite > -1, `${fake.emails.length} email`);

    ok('the newest link looks up', (await lookup(link1))._status === 200, 'lookup 200');

    // ── A RESEND KILLS THE OLD LINK ─────────────────────────────────────────
    console.log('\n  A resend supersedes every earlier link:\n');
    const s2 = await send('friend@example.com');
    const link2 = linkOf(s2);
    ok('the resend writes a second row with resend_count 1', fake.invites.length === 2 && fake.invites[1].resend_count === 1, `${fake.invites.length} rows`);
    ok('  and marks the first superseded', fake.invites[0].status === 'superseded', fake.invites[0].status);
    const old = await lookup(link1);
    ok('the old link now looks up as the plain 404', old._status === 404, `status ${old._status}`);
    const oldAccept = await accept(link1);
    ok('  and accepting it is a 404 that writes no grant', oldAccept._status === 404 && fake.grants.length === 0, `status ${oldAccept._status}`);
    ok('the new link looks up', (await lookup(link2))._status === 200, 'lookup 200');
    const newAccept = await accept(link2);
    ok('  and accepting it writes one grant', newAccept._status === 200 && fake.grants.length === 1, `status ${newAccept._status}`);

    // ── THE NEWEST ROW DECIDES EVEN IF THE SUPERSEDE WRITE FAILED ───────────
    fake.fault.invitePut = true;
    const s3 = await send('friend@example.com');
    fake.fault.invitePut = false;
    const link3 = linkOf(s3);
    ok('every send mints a different link, even with the same payload',
       new Set([link1, link2, link3]).size === 3, 'three sends, three links');
    ok('a resend whose supersede write fails still sends', s3._status === 200 && fake.invites[1].status === 'sent', `row 2 still ${fake.invites[1].status}`);
    const prev = await lookup(link2);
    ok('  and the link before it is refused all the same', prev._status === 404,
       `status ${prev._status}, rows ${fake.invites.map(r => `${r.id}:${r.status}:${r.created_date}`).join(' ')}`);
    ok('  while the newest works', (await lookup(link3))._status === 200, 'lookup 200');

    // ── NO ROW, NO EMAIL ────────────────────────────────────────────────────
    fake.fault.invitePost = true;
    const before = fake.emails.length;
    const s4 = await send('friend@example.com');
    fake.fault.invitePost = false;
    ok('if the invite row cannot be written, the send fails and no email goes out',
       s4._status === 500 && fake.emails.length === before, `status ${s4._status}`);

    // ── REMOVING A PENDING INVITE KILLS ITS LINK ────────────────────────────
    console.log('\n  Removing someone who never accepted kills their link:\n');
    const sp = await send('planner@example.com');
    const plannerLink = linkOf(sp);
    const removed = await call(revokeHandler, { token: 'tok-owner', body: { action: 'revoke', email: 'planner@example.com' } });
    const plannerRow = fake.invites.find(r => r.invite_token_hash === hashId(plannerLink));
    ok('the removal succeeds and marks the invite revoked', removed._status === 200 && plannerRow?.status === 'revoked', plannerRow?.status);
    const plannerAccept = await accept(plannerLink, 'tok-planner');
    ok('  and the link is then refused with no grant', plannerAccept._status === 404 && fake.grants.length === 1, `status ${plannerAccept._status}`);

    // ── LEGACY AND TEST ROWS ────────────────────────────────────────────────
    console.log('\n  Links from before this shipped, and test rows:\n');
    const legacy = signInvite({ ownerUserId: 'owner-9', email: 'old@example.com', name: 'Old', permissions: {}, iat: Date.now() - 86_400_000 });
    ok('a link sent before this shipped (no row for its pair) still works inside its 7 days', (await lookup(legacy))._status === 200, 'legacy honored');
    fake.invites.push({
      id: 'test-row', owner_user_id_hash: hashId('owner-1'), collaborator_email_hash: hashId('friend@example.com'),
      invite_token_hash: hashId('something-else'), status: 'sent', is_test: true, created_date: '2099-01-01T00:00:00Z',
    });
    ok('an is_test row is never read, so it cannot kill a real link', (await lookup(link3))._status === 200, 'test row ignored');
  } finally {
    Date.now = realNow;
    fake.restore();
    if (prior.admin === undefined) delete process.env.BASE44_ADMIN_KEY; else process.env.BASE44_ADMIN_KEY = prior.admin;
    if (priorHashKey === undefined) delete process.env.COLLAB_HASH_KEY; else process.env.COLLAB_HASH_KEY = priorHashKey;
    if (prior.resend === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = prior.resend;
  }

  // ── SOURCE PINS ───────────────────────────────────────────────────────────
  const sendSrc = stripComments(read('api/send-collaborator-invite.js'), { trailing: true });
  ok('send records the invite before it emails',
     sendSrc.indexOf('recordInviteSend(') > -1 && sendSrc.indexOf('recordInviteSend(') < sendSrc.indexOf('resend.emails.send('), 'record, then send');
  const lib = stripComments(read('api/_lib/collaboratorInvites.js'), { trailing: true });
  ok('every create sets status explicitly', /status: 'sent',/.test(lib), "status: 'sent'");

  return results;
}
