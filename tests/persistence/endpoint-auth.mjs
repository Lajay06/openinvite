/**
 * tests/persistence/endpoint-auth.mjs
 *
 * Covers the fix/endpoint-auth rejections (SECURITY_AUDIT.md criticals):
 * send-invites.js / send-email.js / create-portal-session.js require an
 * authenticated Base44 session and never trust a client-supplied identity
 * (guest ownership, Stripe customerId); Turnstile-checked endpoints fail
 * closed when TURNSTILE_SECRET_KEY is unset.
 *
 * Imports _shared.mjs FIRST so its .env.local side-effect (populating
 * process.env) runs before any api/*.js module-level env reads.
 */

import { pass, fail } from './_shared.mjs';
import { verifyBase44User, fetchOwnedGuestEmails, filterGuestsByOwnership } from '../../api/_lib/auth.js';
import { verifyTurnstileToken } from '../../api/_lib/security.js';
import sendInvitesHandler from '../../api/send-invites.js';
import sendEmailHandler from '../../api/send-email.js';
import createPortalSessionHandler from '../../api/create-portal-session.js';

const EMAIL = process.env.BASE44_TEST_EMAIL;
const PASS_ENV = process.env.BASE44_TEST_PASSWORD;
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE = 'https://base44.app/api';

/** Minimal Vercel-shaped req/res mock — handlers only touch this surface. */
function mockReqRes({ method = 'POST', headers = {}, body = {} } = {}) {
  const req = { method, headers: { 'x-forwarded-for': '203.0.113.1', ...headers }, body };
  const res = {
    _status: 200,
    _json: null,
    _headers: {},
    setHeader(k, v) { this._headers[k] = v; },
    status(code) { this._status = code; return this; },
    json(obj) { this._json = obj; return this; },
    end() { return this; },
  };
  return { req, res };
}

async function loginRealToken() {
  const res = await fetch(`${BASE}/apps/${APP_ID}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS_ENV }),
  });
  const data = await res.json();
  return data.access_token;
}

export async function runEndpointAuth() {
  const results = [];

  // ── Handler-level rejections: no Authorization header → 401 ────────────────
  console.log('\n  Endpoint-auth rejections — no session token:\n');
  {
    const { req, res } = mockReqRes({ body: { guests: [{ email: 'x@example.com', rsvpUrl: 'https://x', name: 'X' }], wedding: {} } });
    await sendInvitesHandler(req, res);
    results.push(res._status === 401
      ? pass('send-invites.js — no Authorization header', `401 ${JSON.stringify(res._json)}`)
      : fail('send-invites.js — no Authorization header', 401, res._status));
  }
  {
    const { req, res } = mockReqRes({ body: { template: 'welcome', to: 'x@example.com' } });
    await sendEmailHandler(req, res);
    results.push(res._status === 401
      ? pass('send-email.js — no Authorization header', `401 ${JSON.stringify(res._json)}`)
      : fail('send-email.js — no Authorization header', 401, res._status));
  }
  {
    const { req, res } = mockReqRes({ body: {} });
    await createPortalSessionHandler(req, res);
    results.push(res._status === 401
      ? pass('create-portal-session.js — no Authorization header', `401 ${JSON.stringify(res._json)}`)
      : fail('create-portal-session.js — no Authorization header', 401, res._status));
  }

  // ── Handler-level rejection: garbage token → 401 ────────────────────────────
  {
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer not-a-real-token-at-all' },
      body: { guests: [{ email: 'x@example.com', rsvpUrl: 'https://x', name: 'X' }], wedding: {} },
    });
    await sendInvitesHandler(req, res);
    results.push(res._status === 401
      ? pass('send-invites.js — garbage bearer token', `401 ${JSON.stringify(res._json)}`)
      : fail('send-invites.js — garbage bearer token', 401, res._status));
  }

  // ── create-portal-session.js never trusts a client-supplied customerId ──────
  // Even with a garbage token (401 before reaching the Stripe call), assert
  // the response never echoes back or otherwise honours a client-supplied
  // customerId — the field is dropped from the request handling entirely.
  {
    const { req, res } = mockReqRes({ body: { customerId: 'cus_attacker_supplied_id' } });
    await createPortalSessionHandler(req, res);
    const echoesCustomerId = JSON.stringify(res._json || {}).includes('cus_attacker_supplied_id');
    results.push(res._status === 401 && !echoesCustomerId
      ? pass('create-portal-session.js — client-supplied customerId ignored pre-auth', '401, not echoed')
      : fail('create-portal-session.js — client-supplied customerId ignored pre-auth', '401, not echoed', `${res._status}, echoed=${echoesCustomerId}`));
  }

  // ── Turnstile fails closed when the secret env var is unset ────────────────
  console.log('\n  Turnstile fail-closed behavior:\n');
  {
    const saved = process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    try {
      const result = await verifyTurnstileToken('any-token', '203.0.113.1', '[test]');
      results.push(result.success === false
        ? pass('verifyTurnstileToken — fails closed when TURNSTILE_SECRET_KEY unset', 'success:false')
        : fail('verifyTurnstileToken — fails closed when TURNSTILE_SECRET_KEY unset', false, result.success));
    } finally {
      if (saved !== undefined) process.env.TURNSTILE_SECRET_KEY = saved;
    }
  }

  // ── filterGuestsByOwnership — pure ownership-filtering logic ────────────────
  console.log('\n  Guest ownership filtering (send-invites.js):\n');
  {
    const owned = new Set(['owned-guest@example.com', 'caller@example.com']);
    const submitted = [
      { email: 'owned-guest@example.com', name: 'Real guest' },
      { email: 'stranger@example.com', name: 'Not this couple\'s guest' },
      { email: 'CALLER@EXAMPLE.COM', name: 'Case-insensitive match' },
    ];
    const filtered = filterGuestsByOwnership(submitted, owned);
    results.push(filtered.length === 2 && filtered.some(g => g.email === 'owned-guest@example.com') && filtered.some(g => g.email === 'CALLER@EXAMPLE.COM')
      ? pass('filterGuestsByOwnership — keeps owned, drops stranger, case-insensitive', `${filtered.length} kept`)
      : fail('filterGuestsByOwnership — keeps owned, drops stranger, case-insensitive', '2 kept (owned + caller)', `${filtered.length} kept`));
  }

  // ── End-to-end with a REAL token: verifyBase44User resolves the real user ──
  if (EMAIL && PASS_ENV) {
    console.log('\n  verifyBase44User — real token resolution:\n');
    try {
      const token = await loginRealToken();
      const { req } = mockReqRes({ headers: { authorization: `Bearer ${token}` } });
      const user = await verifyBase44User(req);
      results.push(user?.email?.toLowerCase() === EMAIL.toLowerCase()
        ? pass('verifyBase44User — resolves the real authenticated user', user?.email)
        : fail('verifyBase44User — resolves the real authenticated user', EMAIL, user?.email));

      const { req: badReq } = mockReqRes({ headers: { authorization: 'Bearer totally-invalid' } });
      const noUser = await verifyBase44User(badReq);
      results.push(noUser === null
        ? pass('verifyBase44User — invalid token resolves null', 'null')
        : fail('verifyBase44User — invalid token resolves null', null, noUser));

      // send-invites.js end-to-end: a real session, but guests[] contains only
      // an email that isn't one of this account's own Guest records → 403,
      // never silently sent.
      const { req: siReq, res: siRes } = mockReqRes({
        headers: { authorization: `Bearer ${token}` },
        body: {
          guests: [{ email: '__definitely_not_a_real_guest__@example.com', name: 'Nobody', rsvpUrl: 'https://x' }],
          wedding: { coupleName: 'Test Couple' },
        },
      });
      await sendInvitesHandler(siReq, siRes);
      results.push(siRes._status === 403
        ? pass('send-invites.js — real session, non-owned guest → 403', `403 ${JSON.stringify(siRes._json)}`)
        : fail('send-invites.js — real session, non-owned guest → 403', 403, siRes._status));
    } catch (err) {
      console.log(`  ❌ FAIL  verifyBase44User real-token tests — error: ${err.message}`);
      results.push(false, false, false);
    }
  } else {
    console.log('\n  (skipping real-token tests — BASE44_TEST_EMAIL/PASSWORD not set)\n');
  }

  return results;
}
