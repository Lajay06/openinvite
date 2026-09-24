/**
 * tests/persistence/send-invites-result-shape.mjs
 *
 * THE INVITATION ENDPOINT ANSWERS FOR WHAT IT ACTUALLY DID.
 *
 * ── WHAT WAS WRONG ─────────────────────────────────────────────────────────
 *
 * api/send-invites.js:170 read the batch result as
 *
 *     result?.data?.map(d => d.id)
 *
 * and resend@6 returns `{ data: { data: [{id}] }, error }` — `data` is an
 * object WRAPPING the array. `.map` is not a function, the TypeError reached
 * the handler's catch, and the endpoint answered 500.
 *
 * It was never a regression. The line is byte-identical to the repository's
 * first commit, and `package.json` has declared `resend: ^6.12.3` since the
 * same commit. Every couple who pressed Send got this.
 *
 * ── AND THE SEND HAD ALREADY HAPPENED ──────────────────────────────────────
 *
 * `resend.batch.send(batch)` is the line above it. So the guests received
 * their invitations, the couple was told the send failed, and
 * SendInvitesModal's `if (!res.ok) throw` aborted before `invite_sent_at` was
 * written — leaving the dashboard showing them unsent, so every retry posted
 * another copy to the same people. A cosmetic failure after a real side effect
 * is not cosmetic.
 *
 * ── WHY THIS DRIVES THE REAL HANDLER ───────────────────────────────────────
 *
 * A guard asserting the SHAPE of the fix would pass on a handler that had been
 * rewritten around it. This calls the exported handler with a stubbed Resend
 * through the `deps` seam the module already offers (the same pattern
 * api/webhooks/stripe.js uses), so what is measured is the endpoint's real
 * status codes and real body.
 */
import { pass, fail } from './_shared.mjs';

/** The narrowest req/res pair the handler needs. */
function harness(body) {
  const res = {
    statusCode: null, payload: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(p) { this.payload = p; return this; },
  };
  const req = {
    method: 'POST',
    headers: { authorization: 'Bearer not-a-real-token', origin: 'https://openinvite.com.au' },
    socket: { remoteAddress: `10.0.0.${Math.floor(Math.random() * 250) + 1}` },
    body,
  };
  return { req, res };
}

const GUESTS = [{ name: 'Ada Guest', email: 'guest@example.com', rsvpUrl: 'https://openinvite.com.au/r/abc' }];
const BODY = {
  type: 'invite',
  guests: GUESTS,
  // websiteEnabled and slug are preconditions now, not decoration: the
  // endpoint refuses to mail links to an unpublished site, so a fixture that
  // is testing the RESULT SHAPE has to be a couple who could legitimately
  // send. See tests/persistence/invite-entrance-and-publish-gate.mjs.
  wedding: { coupleNames: 'Smoke & Alias', weddingDate: '2027-05-01', venue: 'A hall', slug: 'smoke-and-alias', websiteEnabled: true },
  universeId: 'paris',
};

/** Everything except the Resend call is stubbed to succeed. */
const deps = (sendBatch) => ({
  sendBatch,
  verifyUser: async () => ({ id: 'caller-1', email: 'couple@example.com' }),
  fetchOwned: async () => new Set(['guest@example.com']),
  adminKey: 'not-a-real-admin-key',
});

export async function runSendInvitesResultShape() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const { default: handler } = await import('../../api/send-invites.js');
  check('the endpoint is callable with its seams stubbed', typeof handler === 'function', `${handler.length} declared arg(s)`);

  // Log lines are part of what is being asserted — "no ids returned" must
  // appear rather than an exception — so they are captured, not silenced.
  const logged = [];
  const realLog = console.log, realErr = console.error;
  const capture = () => {
    console.log = (...a) => logged.push(a.map(String).join(' '));
    console.error = (...a) => logged.push(a.map(String).join(' '));
  };
  const release = () => { console.log = realLog; console.error = realErr; };

  const call = async (sendBatch) => {
    const { req, res } = harness(BODY);
    logged.length = 0;
    capture();
    try { await handler(req, res, deps(sendBatch)); } finally { release(); }
    return { res, log: logged.join('\n') };
  };

  // ── 1. the shape resend@6 actually returns ────────────────────────────────
  let sent = null;
  const nested = await call(async (b) => { sent = b; return { data: { data: [{ id: 'e-1' }, { id: 'e-2' }] }, error: null }; });
  check('the real resend@6 shape answers 200', nested.res.statusCode === 200, `HTTP ${nested.res.statusCode} ${JSON.stringify(nested.res.payload)}`);
  check('  and it actually built a batch to send', Array.isArray(sent) && sent.length === 1 && sent[0].to === 'guest@example.com',
    `${sent?.length} message(s), to ${sent?.[0]?.to}`);
  check('  and the ids were read, not crashed on', /e-1/.test(nested.log), nested.log.split('\n').find((l) => /ids:/.test(l)) || '(no ids line)');

  // ── 2. the flat shape still works ─────────────────────────────────────────
  const flat = await call(async () => ({ data: [{ id: 'e-9' }], error: null }));
  check('the older flat shape also answers 200', flat.res.statusCode === 200, `HTTP ${flat.res.statusCode}`);
  check('  and reads its ids too', /e-9/.test(flat.log), 'an SDK bump cannot resurrect this');

  // ── 3. nothing after the send may throw ───────────────────────────────────
  for (const [name, shape] of [
    ['no data at all', { data: null, error: null }],
    ['data is a string', { data: 'ok', error: null }],
    ['data.data is not an array', { data: { data: { id: 'x' } }, error: null }],
    ['nothing at all', undefined],
  ]) {
    const odd = await call(async () => shape);
    check(`  a batch result with ${name} still answers 200`, odd.res.statusCode === 200,
      `HTTP ${odd.res.statusCode} — the send already happened, so the couple is told so`);
    check(`    and says so in the log rather than throwing`, /no ids returned/.test(odd.log),
      odd.log.split('\n').find((l) => /ids:/.test(l)) || '(no ids line)');
  }

  // ── 4. a refused batch is 502, and claims nothing ─────────────────────────
  const refused = await call(async () => ({ data: null, error: { message: 'You can only send 100 emails per batch', name: 'validation_error' } }));
  check('a provider error is 502, not 200', refused.res.statusCode === 502, `HTTP ${refused.res.statusCode}`);
  check('  and carries the provider\'s own message', /100 emails per batch/.test(refused.res.payload?.error || ''),
    refused.res.payload?.error);
  check('  and states that nothing was accepted', refused.res.payload?.accepted === false && refused.res.payload?.sent === 0,
    JSON.stringify(refused.res.payload));
  check('    so no "sent" count can be read as a send', !(refused.res.payload?.sent > 0), 'sent: 0');

  return results;
}
