/**
 * tests/persistence/collaborator-invite-host.mjs
 *
 * THE ACCEPT LINK IN AN INVITE EMAIL ALWAYS POINTS AT THE APP.
 *
 * Item 1c of goals/2026-10-10-collaborators-safe-and-truthful.md. Before it,
 * api/send-collaborator-invite.js built the accept URL from req.body.origin,
 * so any signed-in caller could send a real Openinvite email whose button
 * carried a genuine signed invite to a host of their choosing.
 *
 * The send handler is DRIVEN over a stubbed Base44 and a stubbed Resend, with
 * origin set to another host, and the link in the response and in the email
 * that went out are both read. The plant restores req.body.origin; proven red
 * by hand and recorded in the PR body.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

export async function runCollaboratorInviteHost() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const prior = { admin: process.env.BASE44_ADMIN_KEY, resend: process.env.RESEND_API_KEY, app: process.env.VITE_APP_URL };
  process.env.BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY || 'test-admin-key-not-a-real-credential';
  // Invite links are signed with COLLAB_HASH_KEY, never the admin key.
  const priorHashKey = process.env.COLLAB_HASH_KEY;
  process.env.COLLAB_HASH_KEY = '0123456789abcdef'.repeat(4);
  // send-collaborator-invite.js builds a Resend client at module scope; a
  // module that throws on first evaluation stays failed for the process.
  if (!process.env.RESEND_API_KEY) process.env.RESEND_API_KEY = 're_persistence_suite_placeholder';
  const sendHandler = (await import('../../api/send-collaborator-invite.js')).default;

  const emails = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(typeof url === 'string' ? url : url.url);
    const headers = init.headers instanceof Headers ? Object.fromEntries(init.headers) : (init.headers || {});
    const bearer = String(headers.Authorization || headers.authorization || '').replace(/^Bearer /, '');
    const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (u.hostname === 'api.resend.com') { emails.push(JSON.parse(init.body)); return json(200, { id: 'e1' }); }
    if (u.hostname !== 'base44.app') throw new Error(`unexpected network call to ${u.hostname}`);
    if (u.pathname.endsWith('/entities/User/me')) return bearer === 'tok-owner' ? json(200, { id: 'owner-1', email: 'owner@example.com' }) : json(401, {});
    if (u.pathname.endsWith('/entities/WeddingDetails')) return json(200, [{ id: 'wedding-1', created_date: '2026-01-01T00:00:00Z' }]);
    if ((init.method || 'GET') === 'POST') return json(200, { id: 'row-1' });
    return json(200, []);
  };

  const send = async (body, ip) => {
    const req = { method: 'POST', query: {}, body, headers: { 'x-forwarded-for': ip, authorization: 'Bearer tok-owner' } };
    const res = { _status: 200, _json: null, setHeader() {}, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; } };
    await sendHandler(req, res);
    return res;
  };
  const base = { name: 'Friend', email: 'friend@example.com', permissions: { Schedule: { view: true } } };

  try {
    console.log('\n  The accept link is always on the app host:\n');
    process.env.VITE_APP_URL = 'https://openinvite.com.au';
    const evil = await send({ ...base, origin: 'https://attacker.example' }, '203.0.113.91');
    const link = String(evil._json?.acceptUrl || '');
    ok('a send with origin set to another host still succeeds', evil._status === 200, `status ${evil._status}`);
    ok('  and its link is on the app host', link.startsWith('https://openinvite.com.au/collaborate/accept/'), link.slice(0, 48));
    const html = String(emails[0]?.html || '');
    ok('  the email that went out carries the app host and never the supplied one',
       html.includes('https://openinvite.com.au/collaborate/accept/') && !html.includes('attacker.example'), 'email body');

    const none = await send(base, '203.0.113.92');
    ok('a send with no origin at all is accepted, since origin is no longer read',
       none._status === 200 && String(none._json?.acceptUrl || '').startsWith('https://openinvite.com.au/'), `status ${none._status}`);

    process.env.VITE_APP_URL = 'https://preview.example.vercel.app/';
    const preview = await send({ ...base, origin: 'https://attacker.example' }, '203.0.113.93');
    ok('VITE_APP_URL decides the host, read at call time, without a doubled slash',
       String(preview._json?.acceptUrl || '').startsWith('https://preview.example.vercel.app/collaborate/accept/'), String(preview._json?.acceptUrl || '').slice(0, 52));

    delete process.env.VITE_APP_URL;
    const fallback = await send(base, '203.0.113.94');
    ok('with VITE_APP_URL unset it falls back to https://openinvite.com.au',
       String(fallback._json?.acceptUrl || '').startsWith('https://openinvite.com.au/collaborate/accept/'), 'fallback');
  } finally {
    globalThis.fetch = realFetch;
    for (const [k, env] of [['admin', 'BASE44_ADMIN_KEY'], ['resend', 'RESEND_API_KEY'], ['app', 'VITE_APP_URL']]) {
      if (prior[k] === undefined) delete process.env[env]; else process.env[env] = prior[k];
    }
    if (priorHashKey === undefined) delete process.env.COLLAB_HASH_KEY; else process.env.COLLAB_HASH_KEY = priorHashKey;
  }

  const sendSrc = stripComments(read('api/send-collaborator-invite.js'), { trailing: true });
  ok('the send endpoint never reads origin from the request', !/\borigin\b/.test(sendSrc), 'no origin');
  const modal = stripComments(read('src/components/layout/CollaborateModal.jsx'), { trailing: true });
  ok('and the modal no longer sends it', !/window\.location\.origin/.test(modal), 'no origin sent');

  return results;
}
