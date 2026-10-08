/**
 * tests/persistence/retention-test-route.mjs
 *
 * THE TEST SEND GOES TO ONE ADDRESS, AND THE DRY MODE SENDS NOTHING.
 *
 * Item 4 of goals/2026-10-08-retention-emails.md. The goal's guard section
 * does not name a case for item 4, so these are the two properties the item
 * itself turns on: "a cron-safe dry mode that renders both emails for a named
 * account WITHOUT SENDING", and a send mode whose destination is
 * "the only permitted test address".
 *
 * Both are driven through the real handler with a stubbed mailer, because the
 * question is what the handler DOES. A source read would pass on a dry mode
 * that rendered and then sent anyway.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const PERMITTED = 'la.jay06+notiftest01@gmail.com';

export async function runRetentionTestRoute() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // Resend constructs at module scope and throws without a key, so one is
  // placeheld exactly as the other email guards do it. Never a credential.
  const prior = { resend: process.env.RESEND_API_KEY, cron: process.env.CRON_SECRET, admin: process.env.BASE44_ADMIN_KEY };
  process.env.RESEND_API_KEY = 're_placeholder_not_a_real_key';
  process.env.CRON_SECRET = 'test-cron-secret-not-a-real-credential';
  process.env.BASE44_ADMIN_KEY = 'test-admin-key-not-a-real-credential';

  const { default: handler } = await import(`../../api/retention-test.js?k=${Math.random()}`);

  /** Capture every send the handler attempts, and answer each one as ok. */
  const sends = [];
  const resendModule = await import('resend');
  const realSend = resendModule.Resend.prototype.emails;
  // The Resend client builds `emails` as an own property per instance, so the
  // prototype is not where the stub belongs. The instance inside the handler
  // module is not reachable from here either, so the send is intercepted at
  // the network boundary instead, which is where it actually leaves.
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('api.resend.com')) {
      sends.push(JSON.parse(init?.body || '{}'));
      return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ id: 'stub' }), text: async () => '{}' };
    }
    // A single-record User read, for the named-account case.
    if (u.includes('/entities/User/')) {
      return { ok: true, status: 200, json: async () => ({ id: 'u-real', full_name: 'Ada Lovelace', created_date: '2026-09-18T03:00:00.000Z' }) };
    }
    return { ok: false, status: 404, text: async () => 'not stubbed' };
  };

  const makeRes = () => {
    const out = { status: null, body: null };
    return { out, status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  };

  const call = async ({ method = 'POST', body, auth = 'test-cron-secret-not-a-real-credential' } = {}) => {
    sends.length = 0;
    const res = makeRes();
    await handler({ method, body, headers: auth ? { authorization: `Bearer ${auth}` } : {} }, res);
    return { ...res.out, sends: [...sends] };
  };

  // ── DRY MODE RENDERS BOTH AND SENDS NOTHING ─────────────────────────────
  const dry = await call({ body: { mode: 'dry' } });
  ok('dry mode answers 200', dry.status === 200, String(dry.status));
  ok('  and renders both emails', dry.body?.emails?.length === 2,
     dry.body?.emails?.map(e => e.key).join(', '));
  // EVERY DEREFERENCE IS GUARDED, and that is not defensiveness for its own
  // sake. The first version read `dry.body.emails.every(...)` directly, and
  // when a plant made the dry branch fall through to the send path, `emails`
  // was undefined and this line THREW. The guard crashed instead of failing,
  // which the suite reports as a crashed module rather than as the specific
  // broken property, and it meant the most important assertion in this file,
  // the one below about sending nothing, never ran and had never been proved
  // to bite. A guard that cannot survive the failure it is looking for is not
  // testing for it.
  ok('  with an html and a text part each',
     Array.isArray(dry.body?.emails) && dry.body.emails.every(e => e.html?.length > 500 && e.text?.length > 300),
     'both parts');
  ok('  and SENDS NOTHING', dry.sends.length === 0 && dry.body?.sent === false, `${dry.sends.length} send(s)`);
  ok('  defaulting to a sample when no account is named', dry.body?.source === 'sample', String(dry.body?.source));
  // A MODE NOBODY ASKED FOR IS DRY. An unknown mode must not fall through to
  // sending, which is the one direction a default must never go.
  const odd = await call({ body: { mode: 'something-else' } });
  ok('an unrecognized mode is treated as dry', odd.body?.mode === 'dry' && odd.sends.length === 0, 'no send');
  const noMode = await call({ body: {} });
  ok('  and so is no mode at all', noMode.body?.mode === 'dry' && noMode.sends.length === 0, 'no send');

  // ── A NAMED ACCOUNT IS RESOLVED, AND A MISSING ONE SAYS SO ──────────────
  const named = await call({ body: { mode: 'dry', userId: 'u-real' } });
  ok('a named account is rendered from its own record', named.body?.source === 'account', String(named.body?.source));
  ok('  and its name reaches the greeting',
     !!named.body?.emails?.[0]?.html?.includes('Hi Ada,'), 'Hi Ada,');

  // ── SEND MODE GOES TO EXACTLY ONE ADDRESS ───────────────────────────────
  const sent = await call({ body: { mode: 'send' } });
  ok('send mode answers 200', sent.status === 200, String(sent.status));
  ok('  and sends exactly two emails', sent.sends.length === 2, `${sent.sends.length} send(s)`);
  const recipients = [...new Set(sent.sends.flatMap(s => [].concat(s.to || [])))];
  ok('  both to the one permitted address',
     recipients.length === 1 && recipients[0] === PERMITTED, recipients.join(', '));
  ok('  marked as a test in the subject',
     sent.sends.every(s => String(s.subject).startsWith('[test] ')), 'prefixed');
  ok('  with the reply-to the goal specifies',
     sent.sends.every(s => (s.reply_to || s.replyTo) === 'hello@openinvite.com.au'), 'hello@');
  ok('  and the response names where it went', sent.body?.to === PERMITTED, sent.body?.to);

  // ── THE ADDRESS IS NOT A PARAMETER ──────────────────────────────────────
  //
  // The worst thing this endpoint could become is a way to send branded mail
  // to an arbitrary address. A `to` in the body must be ignored entirely.
  const hijack = await call({ body: { mode: 'send', to: 'someone-else@example.com', userId: 'u-real' } });
  const hijacked = hijack.sends.flatMap(s => [].concat(s.to || []));
  ok('a `to` in the request body is ignored',
     hijacked.length > 0 && hijacked.every(a => a === PERMITTED), hijacked.join(', '));
  const src = stripComments(read('api/retention-test.js'));
  ok('  because the address is a literal, not read from the request',
     /const TEST_ADDRESS = 'la\.jay06\+notiftest01@gmail\.com';/.test(src)
     && !/body\.to|req\.body\.to/.test(src), 'hardcoded');

  // ── IT WRITES NOTHING, EVER ─────────────────────────────────────────────
  //
  // Not a retentionEmails stamp, not lifecycleEmails. The account whose data
  // was borrowed for a render must be left exactly as it was, or a test send
  // would consume a real couple's nudge.
  ok('the route never writes to an account',
     !/method: 'PUT'|method: "PUT"|mergeRetentionFlag|lifecycleEmails/.test(src), 'no write path');

  // ── AUTH ────────────────────────────────────────────────────────────────
  const noAuth = await call({ body: { mode: 'send' }, auth: null });
  ok('no Authorization header is rejected, and sends nothing',
     noAuth.status === 401 && noAuth.sends.length === 0, `${noAuth.status}, ${noAuth.sends.length} send(s)`);
  const wrongAuth = await call({ body: { mode: 'send' }, auth: 'wrong' });
  ok('  and so is the wrong secret', wrongAuth.status === 401 && wrongAuth.sends.length === 0, String(wrongAuth.status));
  const getReq = await call({ method: 'GET', body: { mode: 'send' } });
  ok('a GET is refused and sends nothing',
     getReq.status === 405 && getReq.sends.length === 0, String(getReq.status));
  ok('the secret is never accepted from the query string',
     !/req\.query/.test(src), 'header only, so it stays out of logs and history');
  ok('  and it fails closed in production when CRON_SECRET is unset',
     /VERCEL_ENV === 'production'[\s\S]{0,200}return res\.status\(401\)/.test(src), 'refuses to run');

  // ── IT DOES NOT TOUCH THE CRON ──────────────────────────────────────────
  //
  // A dry flag inside the cron would have put a "do not actually send" branch
  // in the file whose job is sending, and it would have collided with item 2.
  ok('the route renders through the same module the cron sends from',
     /from '\.\/_lib\/retentionEmails\.js'/.test(src), 'one template module');
  ok('  and the cron has no dry or test mode of its own',
     !/dry|notiftest/i.test(stripComments(read('api/cron/send-onboarding-emails.js'))), 'untouched');

  globalThis.fetch = realFetch;
  void realSend;
  for (const [k, v] of Object.entries({ RESEND_API_KEY: prior.resend, CRON_SECRET: prior.cron, BASE44_ADMIN_KEY: prior.admin })) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }

  return results;
}
