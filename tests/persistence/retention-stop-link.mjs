/**
 * tests/persistence/retention-stop-link.mjs
 *
 * A COUPLE CAN STOP THESE EMAILS, AND NOBODY ELSE CAN STOP THEM FOR THEM.
 *
 * Item 3 of goals/2026-10-08-retention-emails.md, whose guard line reads:
 * "Stop link: a tampered token changes nothing; a valid token sets the flag
 * once."
 *
 * ── THE ENDPOINT IS DRIVEN, NOT GREPPED ────────────────────────────────────
 *
 * api/stop-emails.js is imported and called with a stubbed fetch, so what is
 * asserted is what the handler DOES: which status it answers, whether it wrote
 * anything, and exactly what body it sent to Base44. A source read would pass
 * on a handler that verified the token and then wrote regardless, which is the
 * failure that matters here.
 *
 * The one thing a credential-free guard cannot do is prove the real Base44
 * write lands. What it can prove, and does, is that the request is a PUT to
 * the one account the token names, carrying one field and one value.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

export async function runRetentionStopLink() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // The token module reads BASE44_ADMIN_KEY at import, so it is placeheld
  // exactly as the other admin-key guards do it. Never a real credential.
  const priorKey = process.env.BASE44_ADMIN_KEY;
  process.env.BASE44_ADMIN_KEY = 'test-admin-key-not-a-real-credential';
  process.env.VITE_APP_URL = 'https://openinvite.com.au';

  const { signStopToken, verifyStopToken, stopEmailsUrl } =
    await import(`../../api/_lib/stopEmailsToken.js?k=${Math.random()}`);

  // ── THE TOKEN IS NOT A BARE ID ──────────────────────────────────────────
  const token = signStopToken('user-abc-123');
  ok('a stop token is signed, not a bare id',
     token.includes('.') && token !== 'user-abc-123' && token.split('.').length === 2,
     'body.signature');
  ok('  and it round-trips to the id it was made from',
     verifyStopToken(token) === 'user-abc-123', 'user-abc-123');
  ok('  and signing with no id refuses',
     (() => { try { signStopToken(''); return false; } catch { return true; } })(), 'throws');

  // ── A TAMPERED TOKEN VERIFIES AS NOTHING ────────────────────────────────
  const [body, sig] = token.split('.');
  const otherId = Buffer.from('user-someone-else', 'utf8').toString('base64url');
  const tampered = [
    ['the signature changed', `${body}.${sig.slice(0, -2)}xy`],
    ['the body swapped for another id', `${otherId}.${sig}`],
    ['the signature dropped', body],
    ['an extra segment', `${body}.${sig}.${sig}`],
    ['empty', ''],
    ['a bare id, which is what the goal bars', 'user-abc-123'],
  ];
  for (const [what, bad] of tampered) {
    ok(`  a token with ${what} verifies as nothing`, verifyStopToken(bad) === null, 'null');
  }
  // THE EMPTY-SECRET CASE, which is the one that would make every signature
  // meaningless rather than merely wrong.
  process.env.BASE44_ADMIN_KEY = '';
  const { verifyStopToken: verifyNoSecret } = await import(`../../api/_lib/stopEmailsToken.js?k=${Math.random()}`);
  ok('  and with no secret configured, nothing verifies at all',
     verifyNoSecret(token) === null, 'refuses rather than trusting an empty key');
  process.env.BASE44_ADMIN_KEY = 'test-admin-key-not-a-real-credential';

  ok('the stop URL is the public route plus the token',
     stopEmailsUrl('user-abc-123') === `https://openinvite.com.au/stop-emails/${token}`, '/stop-emails/<token>');

  // ── THE ENDPOINT, DRIVEN ────────────────────────────────────────────────
  const { default: handler } = await import(`../../api/stop-emails.js?k=${Math.random()}`);

  /** A res that records instead of responding. */
  const makeRes = () => {
    const out = { status: null, body: null };
    return {
      out,
      status(c) { out.status = c; return this; },
      json(b) { out.body = b; return this; },
    };
  };

  const run = async ({ method = 'POST', body: reqBody, writeOk = true }) => {
    const calls = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return { ok: writeOk, status: writeOk ? 200 : 500, text: async () => 'stub' };
    };
    const res = makeRes();
    try {
      await handler({ method, body: reqBody, headers: {} }, res);
    } finally {
      globalThis.fetch = realFetch;
    }
    return { ...res.out, calls };
  };

  // A VALID TOKEN SETS THE FLAG, ONCE.
  const good = await run({ body: { token } });
  ok('a valid token answers 200', good.status === 200, JSON.stringify(good.body));
  ok('  and writes exactly once', good.calls.length === 1, `${good.calls.length} write(s)`);
  ok('  with a PUT', good.calls[0]?.init?.method === 'PUT', good.calls[0]?.init?.method);
  ok('  to the account the token names',
     good.calls[0]?.url.includes('/entities/User/user-abc-123'), 'the signed id, not one from the body');
  ok('  setting one field to false and nothing else',
     good.calls[0]?.init?.body === JSON.stringify({ lifecycleEmails: false }),
     good.calls[0]?.init?.body);
  ok('  and returns no user record to the caller',
     JSON.stringify(good.body) === JSON.stringify({ ok: true }), '{ ok: true }');

  // A TAMPERED TOKEN CHANGES NOTHING. The whole point of the item.
  for (const [what, bad] of tampered) {
    const r = await run({ body: { token: bad } });
    ok(`a token with ${what} writes nothing`, r.calls.length === 0 && r.status === 404,
       `${r.status}, ${r.calls.length} write(s)`);
  }
  const noBody = await run({ body: undefined });
  ok('no body at all writes nothing', noBody.calls.length === 0 && noBody.status === 404,
     `${noBody.status}, ${noBody.calls.length} write(s)`);

  // ── A FAILED WRITE IS NOT REPORTED AS DONE ──────────────────────────────
  //
  // The page says "Done. No more of these from us." on a 200. Answering 200
  // over a failed write is the one outcome worse than an error: the couple
  // stops looking and the mail keeps coming.
  const failed = await run({ body: { token }, writeOk: false });
  ok('a failed Base44 write answers 502, not 200', failed.status === 502, String(failed.status));

  // ── A GET DOES NOT WRITE, WHICH IS WHAT STOPS LINK SCANNERS ─────────────
  const got = await run({ method: 'GET', body: { token } });
  ok('a GET is refused and writes nothing', got.status === 405 && got.calls.length === 0,
     `${got.status}, ${got.calls.length} write(s)`);
  const pageSrc = stripComments(read('src/pages/StopEmails.jsx'));
  ok('  and the page is what POSTs, so a prefetch cannot unsubscribe anyone',
     /method: 'POST'/.test(pageSrc) && /\/api\/stop-emails/.test(pageSrc), 'the write is in JS');

  // ── THE PAGE SAYS THE OWNER'S LINE, AND ONLY WHEN IT IS TRUE ────────────
  ok('the page says the goal\'s line verbatim',
     pageSrc.includes('Done. No more of these from us.'), 'exact');
  ok('  gated on the request having succeeded',
     /state === 'done' && 'Done\. No more of these from us\.'/.test(pageSrc)
     || /state === 'done'[\s\S]{0,60}Done\. No more of these from us\./.test(pageSrc),
     'rendered only in the done state');
  ok('  and a failure does not claim to be done',
     /state === 'failed'/.test(pageSrc) && /Nothing was changed/.test(pageSrc), 'says so plainly');
  ok('  and it requires no login',
     !/useAuth|base44\.auth|AuthContext/.test(pageSrc), 'no session read');

  // ── THE PUBLIC ROUTE ────────────────────────────────────────────────────
  const app = stripComments(read('src/App.jsx'));
  ok('the route exists', /path="\/stop-emails\/:token"/.test(app), '/stop-emails/:token');
  ok('  and is outside the auth gate', /startsWith\('\/stop-emails\/'\)/.test(app), 'in the public prefix list');

  // ── THE ACCOUNT SWITCH ──────────────────────────────────────────────────
  const account = stripComments(read('src/pages/Account.jsx'));
  ok('the Account page offers the switch, worded as the goal asks',
     account.includes('Emails when I have gone quiet'), 'exact label');
  ok('  through the same updateMe path as dateFormat',
     /updateMe\(\{ lifecycleEmails: value \}\)/.test(account), 'updateMe');
  ok('  mirrored into the oi_user cache like dateFormat',
     /oi_user[\s\S]{0,200}lifecycleEmails: value/.test(account), 'cache kept in step');
  ok('  defaulting to on for an account that never set it',
     /user\?\.lifecycleEmails !== false/.test(account), 'absent reads as true');
  // NOT A notification_prefs KEY. If it were, in_app_only would silently
  // disable it and the stop endpoint would need a read-modify-write.
  ok('  and it is a top-level field, not a fifth notification_prefs key',
     !/notification_prefs[\s\S]{0,120}lifecycleEmails/.test(account)
     && !/lifecycleEmails[\s\S]{0,120}notification_prefs:/.test(account), 'separate save path');

  // ── NO NEW SECRET ───────────────────────────────────────────────────────
  const tokenSrc = stripComments(read('api/_lib/stopEmailsToken.js'));
  const envNames = [...tokenSrc.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map(m => m[1]);
  ok('the token uses an existing server secret and introduces none',
     envNames.every(n => ['BASE44_ADMIN_KEY', 'VITE_APP_URL'].includes(n)), envNames.join(', '));
  ok('  with the same HMAC construction as the collaborator invite token',
     /createHmac\('sha256', SECRET\)/.test(tokenSrc) && /timingSafeEqual/.test(tokenSrc),
     'sha256 + timingSafeEqual');

  // ── THE ENDPOINT CANNOT BE TALKED INTO WRITING ANYTHING ELSE ────────────
  const apiSrc = stripComments(read('api/stop-emails.js'));
  ok('the written field and value are literals, not taken from the request',
     /JSON\.stringify\(\{ lifecycleEmails: false \}\)/.test(apiSrc), 'one field, one value');
  ok('  and the flag is never set back to true here',
     !/lifecycleEmails: true/.test(apiSrc), 're-enabling is signed-in only');

  if (priorKey === undefined) delete process.env.BASE44_ADMIN_KEY;
  else process.env.BASE44_ADMIN_KEY = priorKey;

  return results;
}
