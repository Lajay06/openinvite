/**
 * tests/persistence/collaborator-invite-expiry.mjs
 *
 * A COLLABORATOR INVITE WORKS FOR SEVEN DAYS, THEN IT IS DEAD.
 *
 * Item 1b of goals/2026-10-10-collaborators-safe-and-truthful.md, the expiry
 * half (ruled 2026-10-11 to go ahead before the CollaboratorInvite entity).
 * Before it, verifyInvite never read iat: a link from any old email granted
 * access forever.
 *
 * api/collaborator-lookup.js and api/collaborator-accept.js are imported and
 * driven with a stubbed fetch, so what is asserted is what a request DOES. The
 * invite is signed with the same module instance the handlers verify with, so
 * whatever key the run holds, the signature is genuine and only the age varies.
 *
 * The plant: drop the iat check (isInviteExpired always false) and the expired
 * fixture is accepted. Proven by hand on c/collaborator-invite-expiry and
 * recorded in the PR body.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const DAY = 24 * 60 * 60 * 1000;

function mockReqRes({ method = 'GET', query = {}, body = {}, token, ip } = {}) {
  const req = {
    method, query, body,
    headers: { 'x-forwarded-for': ip || '203.0.113.51', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  };
  const res = {
    _status: 200, _json: null,
    setHeader() {}, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; },
  };
  return { req, res };
}

export async function runCollaboratorInviteExpiry() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const priorKey = process.env.BASE44_ADMIN_KEY;
  process.env.BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY || 'test-admin-key-not-a-real-credential';

  // collaborator-accept imports notify.js, which builds a Resend client at
  // module scope and throws with no key. A module that throws on first
  // evaluation stays failed for the whole process, so an unset key here would
  // break every later guard that imports notify.js. Placeheld, as
  // rsvp-confirmation-email.mjs does, and restored after the imports.
  const priorResendKey = process.env.RESEND_API_KEY;
  if (!process.env.RESEND_API_KEY) process.env.RESEND_API_KEY = 're_persistence_suite_placeholder';
  const { signInvite, isInviteExpired, INVITE_TTL_MS, INVITE_EXPIRED_MESSAGE } = await import('../../api/_lib/collaboratorInviteToken.js');
  const lookupHandler = (await import('../../api/collaborator-lookup.js')).default;
  const acceptHandler = (await import('../../api/collaborator-accept.js')).default;
  if (priorResendKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = priorResendKey;

  const grantWrites = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
    if (u.hostname !== 'base44.app') throw new Error(`unexpected network call to ${u.hostname}`);
    if (u.pathname.endsWith('/entities/User/me')) {
      return (init.headers?.Authorization === 'Bearer tok-friend') ? json(200, { id: 'collab-1', email: 'friend@example.com' }) : json(401, {});
    }
    if (u.pathname.endsWith('/entities/CollaboratorGrant') && init.method === 'POST') {
      grantWrites.push(JSON.parse(init.body));
      return json(200, { id: 'g1' });
    }
    return json(200, []);
  };

  try {
    const now = Date.now();
    const invite = (iat) => signInvite({
      ownerUserId: 'owner-1', email: 'friend@example.com', name: 'Friend',
      permissions: { Schedule: { view: true, edit: false } }, ...(iat === undefined ? {} : { iat }),
    });
    const lookup = async (token, ip) => { const { req, res } = mockReqRes({ query: { token }, ip }); await lookupHandler(req, res); return res; };
    const accept = async (token, ip) => { const { req, res } = mockReqRes({ method: 'POST', body: { token }, token: 'tok-friend', ip }); await acceptHandler(req, res); return res; };

    // ── THE RULE ────────────────────────────────────────────────────────────
    console.log('\n  Collaborator invites expire 7 days after signing:\n');
    ok('the window is exactly 7 days', INVITE_TTL_MS === 7 * DAY, `${INVITE_TTL_MS} ms`);
    ok('a minute old: live', !isInviteExpired({ iat: now - 60_000 }, now), 'live');
    ok('6 days 23 hours old: live', !isInviteExpired({ iat: now - 7 * DAY + 3_600_000 }, now), 'live');
    ok('7 days and a minute old: expired', isInviteExpired({ iat: now - 7 * DAY - 60_000 }, now), 'expired');
    ok('no iat at all: expired', isInviteExpired({}, now), 'expired');
    ok('a non-numeric iat: expired', isInviteExpired({ iat: 'yesterday' }, now), 'expired');
    ok('an iat an hour in the future: expired', isInviteExpired({ iat: now + 3_600_000 }, now), 'expired');
    ok('the copy is as ruled', INVITE_EXPIRED_MESSAGE === 'This invite has expired. Ask them to send a new one.', INVITE_EXPIRED_MESSAGE);

    // ── THE ENDPOINTS ───────────────────────────────────────────────────────
    console.log('\n  Lookup and accept refuse an expired invite:\n');
    const fresh = invite(now - DAY);
    const old = invite(now - 8 * DAY);
    const noIat = invite(undefined);

    const fl = await lookup(fresh, '203.0.113.52');
    ok('lookup on a fresh invite: 200', fl._status === 200 && fl._json?.email === 'friend@example.com', `status ${fl._status}`);
    const ol = await lookup(old, '203.0.113.52');
    ok('lookup on an 8-day-old invite: 410 with the ruled words',
       ol._status === 410 && ol._json?.expired === true && ol._json?.error === INVITE_EXPIRED_MESSAGE, `status ${ol._status}`);
    const nl = await lookup(noIat, '203.0.113.52');
    ok('lookup on an invite with no iat: 410', nl._status === 410, `status ${nl._status}`);
    const tl = await lookup(`${old.split('.')[0]}.forged`, '203.0.113.52');
    ok('a tampered invite is still the plain 404, not "expired"', tl._status === 404, `status ${tl._status}`);

    const oa = await accept(old, '203.0.113.53');
    ok('accept on an 8-day-old invite: 410, and no grant is written',
       oa._status === 410 && oa._json?.error === INVITE_EXPIRED_MESSAGE && grantWrites.length === 0, `status ${oa._status}, ${grantWrites.length} writes`);
    const na = await accept(noIat, '203.0.113.53');
    ok('accept on an invite with no iat: 410, and no grant is written', na._status === 410 && grantWrites.length === 0, `status ${na._status}`);
    const fa = await accept(fresh, '203.0.113.53');
    ok('accept on a fresh invite: 200, and one grant is written',
       fa._status === 200 && grantWrites.length === 1 && grantWrites[0].event_type === 'grant', `status ${fa._status}, ${grantWrites.length} writes`);

    // ── EVERY SIGNED INVITE CARRIES AN iat ──────────────────────────────────
    const sendSrc = stripComments(read('api/send-collaborator-invite.js'), { trailing: true });
    // Either form stamps the send time: inline, or one `iat` shared with the
  // CollaboratorInvite row so its expires_at matches the link exactly.
  ok('send-collaborator-invite signs every invite with iat: Date.now()',
     /signInvite\(\{[\s\S]*?iat: Date\.now\(\)/.test(sendSrc)
     || (/const iat = Date\.now\(\);[\s\S]*?const signedInvite = signInvite\(\{[\s\S]*?\biat,[\s\S]*?\}\)/.test(sendSrc)),
     'iat stamped at send');

    // ── THE ACCEPT PAGE SAYS SO ─────────────────────────────────────────────
    const page = stripComments(read('src/pages/CollaboratorAccept.jsx'), { trailing: true });
    ok('the accept page shows the expired state on a 410',
       /res\.status === 410\) \{ setExpired\(true\)/.test(page) && page.includes('This invite has expired.') && page.includes('Ask them to send a new one.'),
       'expired view');
  } finally {
    globalThis.fetch = realFetch;
    if (priorKey === undefined) delete process.env.BASE44_ADMIN_KEY;
    else process.env.BASE44_ADMIN_KEY = priorKey;
  }

  return results;
}
