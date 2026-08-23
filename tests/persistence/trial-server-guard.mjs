/**
 * Server-side trial enforcement (TT-2).
 *
 * Before this, NO mutating endpoint consulted plan or trial state: an expired
 * account could write freely from the console. A UI lock is not a lock.
 *
 * These call the REAL endpoint handlers with a stubbed identity, so they prove
 * the guard is wired into the request path -- not merely that the guard
 * function works in isolation. Both directions are demonstrated: expired is
 * rejected, active and paid proceed. A guard only counts once it has been
 * shown to fail.
 */
import { pass, fail } from './_shared.mjs';
import { TRIAL_EXPIRED_CODE } from '../../api/_lib/trialGuard.js';

const DAY = 86400000;
const ago = (d) => new Date(Date.now() - d * DAY).toISOString();

const EXPIRED = { id: 'u1', email: 'a@b.c', plan: 'free', trialStartedAt: ago(30) };
const ACTIVE  = { id: 'u2', email: 'a@b.c', plan: 'free', trialStartedAt: ago(2) };
const PAID    = { id: 'u3', email: 'a@b.c', plan: 'pro',  created_date: ago(400) };

function mockRes() {
  const r = { statusCode: null, body: null, headers: {} };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; r.ended = true; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.end = () => { r.ended = true; return r; };
  return r;
}

// my-wedding-details returns 500 "Server not configured" when
// BASE44_ADMIN_KEY is absent, BEFORE it reaches the trial guard -- correct
// behaviour (a misconfigured server is a 500 regardless of trial state), but
// it means the credential-free CI run never exercised the guard while a local
// run with the key set did. Caught by CI, not locally. A placeholder value is
// enough: nothing here makes a real Base44 call.
process.env.BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY || 'test-placeholder-not-a-real-key';

/** Stubs the User/me lookup verifyBase44User performs, and nothing else. */
async function callHandler(modPath, user, method) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('/entities/User/me')) {
      return { ok: true, status: 200, json: async () => user, text: async () => JSON.stringify(user) };
    }
    // Any further call means the guard let the request through.
    return { ok: true, status: 200, json: async () => ({ data: [] }), text: async () => '{"data":[]}' };
  };
  try {
    const mod = await import(modPath);
    const req = { method, headers: { authorization: 'Bearer test-token' }, query: {}, body: {} };
    const res = mockRes();
    await mod.default(req, res);
    return res;
  } finally {
    globalThis.fetch = realFetch;
  }
}

const ENDPOINTS = [
  ['my-guests', '../../api/my-guests.js'],
  ['my-wedding-details', '../../api/my-wedding-details.js'],
  ['my-guest-links', '../../api/my-guest-links.js'],
];

export async function runTrialServerGuard() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Server-side trial enforcement — the guard shown to fail:\n');

  for (const [name, path] of ENDPOINTS) {
    // REJECTED: an expired trial attempting a write
    const rejected = await callHandler(path, EXPIRED, 'POST');
    check(`${name}: expired trial + POST is REJECTED`,
      rejected.statusCode === 403 && rejected.body?.code === TRIAL_EXPIRED_CODE,
      `${rejected.statusCode} ${rejected.body?.code ?? ''}`);

    // ACCEPTED: the same write from an active trial must NOT hit the guard
    const active = await callHandler(path, ACTIVE, 'POST');
    check(`  ${name}: active trial + POST passes the guard`,
      active.body?.code !== TRIAL_EXPIRED_CODE, `code ${active.body?.code ?? 'none'}`);

    // ACCEPTED: paid
    const paid = await callHandler(path, PAID, 'POST');
    check(`  ${name}: paid Pro + POST passes the guard`,
      paid.body?.code !== TRIAL_EXPIRED_CODE, `code ${paid.body?.code ?? 'none'}`);

    // READS always allowed -- exports depend on this
    const read = await callHandler(path, EXPIRED, 'GET');
    check(`  ${name}: expired trial + GET is ALLOWED (exports are pure reads)`,
      read.body?.code !== TRIAL_EXPIRED_CODE, `code ${read.body?.code ?? 'none'}`);
  }

  return results;
}
