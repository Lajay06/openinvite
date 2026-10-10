/**
 * tests/persistence/resend-bounce-webhook.mjs
 *
 * THE BOUNCE WEBHOOK ACCEPTS WHAT RESEND SIGNED, AND NOTHING ELSE.
 *
 * Item 1 of goals/2026-10-10-bounces-and-notes.md. api/webhooks/resend.js is a
 * PUBLIC endpoint that writes to a guest record, so the signature is the only
 * thing standing between a stranger and a stamp on someone's guest list. That
 * is what most of this file is about.
 *
 * ── WHY THE FIXTURES ARE SIGNED BY HAND ────────────────────────────────────
 *
 * The endpoint verifies through resend.webhooks.verify, which is a wrapper
 * around Svix. This guard does NOT import Svix to build its fixtures: it signs
 * them with node:crypto against the documented scheme, an HMAC-SHA256 over
 * id.timestamp.body keyed by the decoded secret. So the two sides of every
 * check are independent, and a signed fixture proves the endpoint accepts a
 * real Resend delivery rather than proving the SDK agrees with itself.
 *
 * ── WHAT A PLANT HAS TO BREAK ──────────────────────────────────────────────
 *
 * Dropping the verify call makes the unsigned, wrong-signature, wrong-secret
 * and tampered-body deliveries all succeed, and four checks go red. Weakening
 * the window, the owner check, the Permanent match or the idempotency check
 * each has its own check too. Proved red before this file was trusted; the
 * plants are listed in the PR body.
 *
 * ── THE LOG CHECKS ARE NOT DECORATION ──────────────────────────────────────
 *
 * The goal's rule is that a failed verification gets 401 and NO LOG OF ITS
 * BODY, and the standing instruction is that a secret or a signature is never
 * printed. An attacker picks the body, so a body in a log line is an attacker
 * choosing what goes in our logs. Every delivery below runs with console
 * captured, and the end of the file asserts the secret, the signature and the
 * fixture's own address never appear in anything the endpoint printed.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pass, fail, stripComments } from './_shared.mjs';
import handler, {
  config,
  isWithinReplayWindow,
  readTagIds,
  sanitizeDetail,
  isPermanentBounce,
  bounceStamp,
} from '../../api/webhooks/resend.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SOURCE = 'api/webhooks/resend.js';

/** A signing secret in Resend's own format. Fixture only, and never sent. */
const SECRET = `whsec_${Buffer.from('resend-bounce-guard-fixture-secret').toString('base64')}`;
const OTHER_SECRET = `whsec_${Buffer.from('a-completely-different-fixture').toString('base64')}`;

const GUEST_ID = 'guest_fixture_1';
const OWNER_ID = 'owner_fixture_1';
const OTHER_OWNER_ID = 'owner_fixture_2';
const EMAIL_ID = 'email_fixture_1';
const EVENT_AT = '2026-10-10T09:00:00.000Z';

/**
 * THE CLOCK IS THE REAL ONE, ON PURPOSE.
 *
 * Svix enforces its own five minute tolerance inside verify, against the
 * process clock, and it cannot be told otherwise. A fixture signed at a
 * hardcoded instant therefore verifies on the day it is written and fails
 * every day after, which is how the first version of this file behaved: 35
 * checks red, all of them reading "signature verification failed". So the
 * deliveries are signed now, and NOW is injected into the endpoint so its own
 * window check and the signature agree. EVENT_AT stays fixed because the
 * stamp's time is asserted, not verified.
 */
const NOW = new Date();

/** The address in the fixture. It must never reach a log line or a record. */
const ADDRESS = 'bounced-fixture@example.test';

/** Everything the endpoint printed, across every delivery in this file. */
const ALL_LOGS = [];
/** Every signature this file produced, so the end can prove none was logged. */
const ALL_SIGNATURES = [];

/** The Svix signature header for a payload, built from the documented scheme. */
function sign(secret, id, timestamp, payload) {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const mac = crypto.createHmac('sha256', key)
    .update(`${id}.${timestamp}.${payload}`)
    .digest('base64');
  const header = `v1,${mac}`;
  ALL_SIGNATURES.push(mac);
  return header;
}

/** A request whose body is the exact bytes, as a stream the handler can read. */
function request(payload, headers, method) {
  return {
    method,
    headers,
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(payload, 'utf8');
    },
  };
}

function response() {
  const out = { statusCode: 0, body: null };
  out.status = (code) => { out.statusCode = code; return out; };
  out.json = (body) => { out.body = body; return out; };
  return out;
}

/** A permanent bounce for the fixture guest, as Resend shapes the event. */
function bounced(over = {}, dataOver = {}) {
  return {
    type: 'email.bounced',
    created_at: EVENT_AT,
    ...over,
    data: {
      created_at: EVENT_AT,
      email_id: EMAIL_ID,
      from: 'Openinvite <hello@openinvite.com.au>',
      to: [ADDRESS],
      subject: 'You are invited',
      tags: { guest_id: GUEST_ID, owner_id: OWNER_ID },
      bounce: {
        type: 'Permanent',
        subType: 'General',
        message: `The email account that you tried to reach, ${ADDRESS}, does not exist.`,
      },
      ...dataOver,
    },
  };
}

/**
 * One delivery to the endpoint, with console captured and the record layer
 * stubbed. Returns the status, the body, every write it attempted, and every
 * line it printed.
 */
async function deliver(event, opts = {}) {
  const {
    secret = SECRET,
    signWith = secret,
    envSecret = SECRET,
    id = 'msg_fixture_1',
    timestamp,
    signature,
    method = 'POST',
    body,
    guest = { id: GUEST_ID, created_by_id: OWNER_ID },
    hasKey = true,
    now = NOW,
  } = opts;

  const signedPayload = typeof event === 'string' ? event : JSON.stringify(event);
  const sentPayload = body === undefined ? signedPayload : body;
  const ts = timestamp === undefined ? String(Math.floor(now.getTime() / 1000)) : timestamp;

  const headers = {};
  if (id) headers['svix-id'] = id;
  if (ts) headers['svix-timestamp'] = ts;
  const sig = signature === undefined ? sign(signWith, id, ts, signedPayload) : signature;
  if (sig) headers['svix-signature'] = sig;

  const writes = [];
  const res = response();
  const lines = [];
  const realLog = console.log;
  const realError = console.error;
  console.log = (...args) => lines.push(args.join(' '));
  console.error = (...args) => lines.push(args.join(' '));

  const priorEnv = process.env.RESEND_WEBHOOK_SECRET;
  if (envSecret === null) delete process.env.RESEND_WEBHOOK_SECRET;
  else process.env.RESEND_WEBHOOK_SECRET = envSecret;

  try {
    await handler(request(sentPayload, headers, method), res, {
      now: () => now,
      hasKey: () => hasKey,
      getGuest: async (gid) => (guest && gid === guest.id ? guest : null),
      updateGuest: async (gid, patch) => { writes.push({ gid, patch }); },
    });
  } finally {
    console.log = realLog;
    console.error = realError;
    if (priorEnv === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
    else process.env.RESEND_WEBHOOK_SECRET = priorEnv;
  }

  ALL_LOGS.push(...lines);
  return { status: res.statusCode, body: res.body, writes, logs: lines, payload: sentPayload };
}

export async function runResendBounceWebhook() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const source = stripComments(fs.readFileSync(path.join(ROOT, SOURCE), 'utf8'));

  // ── 1. THE RAW BYTES ARE THE ONES THAT GET VERIFIED ─────────────────────
  //
  // Vercel parses a JSON body by default, which consumes the stream, and an
  // HMAC over a re-stringified body is an HMAC over different bytes. The
  // config export is what keeps the stream intact, so it is asserted on the
  // loaded module rather than on the text: a config object that is present but
  // misspelled would pass a grep and fail here.
  ok('the endpoint turns body parsing off', config?.api?.bodyParser === false,
     JSON.stringify(config));
  ok('  and reads the body as bytes, not as req.body',
     /for await \(const chunk of req\)/.test(source) && !/req\.body/.test(source),
     'stream only');
  ok('  with no re-stringify fallback, which cannot satisfy a byte signature',
     !/JSON\.stringify\(\s*req\.body/.test(source), 'absent');

  // The secret must be read inside the handler. A module-scope read is
  // captured at cold start, so setting it in Vercel would not reach a warm
  // instance. Asserted by indentation: a read at column zero is module scope.
  const moduleScopeRead = source.split('\n').some(
    (l) => /RESEND_WEBHOOK_SECRET/.test(l) && !/^\s/.test(l));
  ok('the webhook secret is read at call time, not at module scope',
     !moduleScopeRead, moduleScopeRead ? 'found a module-scope read' : 'inside the handler');
  ok('verification goes through the installed SDK, not a hand-rolled HMAC',
     /\.verify\(\s*\{/.test(source) && /webhookSecret/.test(source)
       && !/createHmac/.test(source),
     'resend.webhooks.verify');

  // ── 2. A REAL DELIVERY IS ACCEPTED ──────────────────────────────────────

  const good = await deliver(bounced());
  ok('a correctly signed permanent bounce is accepted', good.status === 200, String(good.status));
  ok('  and stamps exactly one guest', good.writes.length === 1 && good.writes[0].gid === GUEST_ID,
     `${good.writes.length} write(s)`);
  ok('  and reports that it stamped', good.body?.outcome === 'stamped', String(good.body?.outcome));

  // ── 3. ANYTHING NOT SIGNED BY RESEND IS 401 AND WRITES NOTHING ──────────
  //
  // The four checks a plant that drops the verify call has to get past.

  const unsigned = await deliver(bounced(), { signature: '', id: '', timestamp: '' });
  ok('an unsigned delivery is refused', unsigned.status === 401, String(unsigned.status));
  ok('  and writes nothing', unsigned.writes.length === 0, `${unsigned.writes.length} write(s)`);

  const wrongSig = await deliver(bounced(), { signature: 'v1,bm90YXNpZ25hdHVyZQ==' });
  ok('a wrong signature is refused', wrongSig.status === 401, String(wrongSig.status));
  ok('  and writes nothing', wrongSig.writes.length === 0, `${wrongSig.writes.length} write(s)`);

  const wrongSecret = await deliver(bounced(), { signWith: OTHER_SECRET });
  ok('a signature from another secret is refused', wrongSecret.status === 401, String(wrongSecret.status));
  ok('  and writes nothing', wrongSecret.writes.length === 0, `${wrongSecret.writes.length} write(s)`);

  // The body is signed one way and sent another, so this is the check that
  // says the signature covers the EXACT BYTES and not merely the event.
  const tampered = await deliver(bounced(), {
    body: JSON.stringify(bounced({}, { tags: { guest_id: GUEST_ID, owner_id: OTHER_OWNER_ID } })),
  });
  ok('a body changed after signing is refused', tampered.status === 401, String(tampered.status));
  ok('  and writes nothing', tampered.writes.length === 0, `${tampered.writes.length} write(s)`);

  const noSecret = await deliver(bounced(), { envSecret: null });
  ok('with no RESEND_WEBHOOK_SECRET set, a signed delivery is still refused',
     noSecret.status === 401 && noSecret.writes.length === 0, String(noSecret.status));

  const emptyBody = await deliver(bounced(), { body: '' });
  ok('an empty body is refused rather than treated as an event',
     emptyBody.status === 401 && emptyBody.writes.length === 0, String(emptyBody.status));

  // ── 4. THE REPLAY WINDOW ────────────────────────────────────────────────

  const secondsNow = Math.floor(NOW.getTime() / 1000);
  const fresh = await deliver(bounced(), { timestamp: String(secondsNow - 4 * 60) });
  ok('a delivery four minutes old is accepted', fresh.status === 200, String(fresh.status));
  // REFUSED BY OUR GATE, AND THE LOG LINE IS HOW WE KNOW. Svix would also
  // reject a stale delivery, so a 401 alone would pass against an endpoint
  // that had no window check of its own. Our gate runs before verify and says
  // which one it was.
  const WINDOW_LINE = '[resend-webhook] FAILURE: delivery is outside the five minute window';
  const stale = await deliver(bounced(), { timestamp: String(secondsNow - 6 * 60) });
  ok('a delivery six minutes old is refused by this endpoint, before the SDK sees it',
     stale.status === 401 && stale.writes.length === 0 && stale.logs.includes(WINDOW_LINE),
     stale.logs.join(' | '));
  const future = await deliver(bounced(), { timestamp: String(secondsNow + 6 * 60) });
  ok('  and so is one six minutes in the future',
     future.status === 401 && future.writes.length === 0 && future.logs.includes(WINDOW_LINE),
     future.logs.join(' | '));
  const notANumber = await deliver(bounced(), { timestamp: 'yesterday' });
  ok('  and a timestamp that is not a number',
     notANumber.status === 401 && notANumber.logs.includes(WINDOW_LINE),
     notANumber.logs.join(' | '));

  ok('the window is five minutes exactly, not a minute more',
     isWithinReplayWindow(String(secondsNow - 300), NOW.getTime())
       && !isWithinReplayWindow(String(secondsNow - 301), NOW.getTime()),
     '300 in, 301 out');
  ok('  and an empty or missing timestamp is outside it',
     !isWithinReplayWindow('', NOW.getTime()) && !isWithinReplayWindow(undefined, NOW.getTime()),
     'rejected');

  // ── 5. POST ONLY ────────────────────────────────────────────────────────

  const get = await deliver(bounced(), { method: 'GET' });
  ok('GET is not allowed', get.status === 405, String(get.status));
  ok('  and writes nothing', get.writes.length === 0, `${get.writes.length} write(s)`);

  // ── 6. EVERY OTHER EVENT IS A COUNTED 200 ───────────────────────────────
  //
  // 200 rather than 404, because Resend retries anything else and a retry loop
  // over an event we have decided not to act on is noise forever.

  for (const type of ['email.delivered', 'email.sent', 'email.complained', 'email.opened']) {
    const other = await deliver(bounced({ type }));
    ok(`${type} is accepted and ignored`,
       other.status === 200 && other.body?.outcome === 'ignored_type' && other.writes.length === 0,
       `${other.status} / ${other.body?.outcome}`);
    ok(`  and one log line names the type`,
       other.logs.filter((l) => l.includes(type)).length === 1,
       other.logs.join(' | ') || 'nothing logged');
  }

  const noType = await deliver(bounced({ type: undefined }));
  ok('an event with no type is ignored, not guessed at',
     noType.status === 200 && noType.writes.length === 0, String(noType.body?.outcome));

  // ── 7. ONLY A PERMANENT BOUNCE STAMPS ──────────────────────────────────
  //
  // Matched against Resend's word, which is "Temporary", not this goal's word,
  // which is "transient". A check written against the ruling's vocabulary
  // would have stamped nothing at all.

  for (const type of ['Temporary', 'Transient', 'permanent', 'PERMANENT', undefined]) {
    const soft = await deliver(bounced({}, {
      bounce: { type, subType: 'General', message: 'Mailbox full.' },
    }));
    ok(`a bounce of type ${JSON.stringify(type)} does not stamp`,
       soft.status === 200 && soft.writes.length === 0 && soft.body?.outcome === 'not_permanent',
       `${soft.status} / ${soft.body?.outcome}`);
  }
  ok('  and only the exact word is permanent',
     isPermanentBounce({ type: 'Permanent' })
       && !isPermanentBounce({ type: 'permanent' })
       && !isPermanentBounce({ type: 'Permanent ' })
       && !isPermanentBounce(undefined),
     'equality, not a prefix');

  // ── 8. NO TAGS MEANS NO GUESS ───────────────────────────────────────────
  //
  // Matching is by tag and never by address, so an untagged event is dropped.
  // Everything sent before item 2 lands is untagged, which makes this the
  // ordinary case for a while rather than an edge case.

  const noTags = await deliver(bounced({}, { tags: undefined }));
  ok('a bounce with no tags is dropped',
     noTags.status === 200 && noTags.writes.length === 0 && noTags.body?.outcome === 'no_tags',
     String(noTags.body?.outcome));
  const halfTags = await deliver(bounced({}, { tags: { guest_id: GUEST_ID } }));
  ok('  and so is one with only a guest id', halfTags.writes.length === 0,
     String(halfTags.body?.outcome));

  // The send API takes an ARRAY of name and value pairs and the webhook
  // returns an OBJECT keyed by name. A reader written for the wrong one of
  // those finds nothing, so the wrong shape must drop rather than throw.
  const arrayTags = await deliver(bounced({}, {
    tags: [{ name: 'guest_id', value: GUEST_ID }, { name: 'owner_id', value: OWNER_ID }],
  }));
  ok('  and tags in the send side array shape are dropped, not read',
     arrayTags.status === 200 && arrayTags.writes.length === 0, String(arrayTags.body?.outcome));

  ok('a tag that breaks Resend\'s character rule is refused',
     readTagIds({ guest_id: 'has a space', owner_id: OWNER_ID }) === null
       && readTagIds({ guest_id: `g${'x'.repeat(256)}`, owner_id: OWNER_ID }) === null,
     'null');
  ok('  and a well formed pair is read',
     readTagIds({ guest_id: GUEST_ID, owner_id: OWNER_ID })?.guestId === GUEST_ID,
     GUEST_ID);

  // ── 9. THE OWNER BOUNDARY ───────────────────────────────────────────────
  //
  // The endpoint is public, so the owner id in the signed event is what scopes
  // the write. A guest belonging to another account and a guest that does not
  // exist return the SAME outcome, so no response distinguishes them.

  const foreign = await deliver(bounced(), {
    guest: { id: GUEST_ID, created_by_id: OTHER_OWNER_ID },
  });
  ok('a guest on another account is not stamped',
     foreign.status === 200 && foreign.writes.length === 0, `${foreign.writes.length} write(s)`);
  const missing = await deliver(bounced(), { guest: null });
  ok('  and a guest that does not exist is not stamped',
     missing.status === 200 && missing.writes.length === 0, `${missing.writes.length} write(s)`);
  ok('  and the two are reported identically, so no answer confirms an id',
     foreign.body?.outcome === missing.body?.outcome
       && foreign.body?.outcome === 'not_this_owner',
     String(foreign.body?.outcome));

  // ── 10. WHAT GETS WRITTEN ───────────────────────────────────────────────

  const stamp = good.writes[0]?.patch?.email_bounce || {};
  ok('the patch writes email_bounce and nothing else',
     Object.keys(good.writes[0]?.patch || {}).join(',') === 'email_bounce',
     Object.keys(good.writes[0]?.patch || {}).join(',') || 'nothing');
  ok('  with exactly the four sub-properties the schema declares',
     Object.keys(stamp).sort().join(',') === 'at,detail,email_id,kind',
     Object.keys(stamp).sort().join(','));
  ok('  kind is the one enum value', stamp.kind === 'permanent', String(stamp.kind));
  ok('  email_id is the provider message id', stamp.email_id === EMAIL_ID, String(stamp.email_id));
  ok('  at is the time of the event, not the time of the delivery',
     stamp.at === EVENT_AT, String(stamp.at));

  // The schema's description promises detail carries no address, and a real
  // bounce message quotes the recipient, so this is the check that keeps the
  // promise rather than the comment that claims it.
  ok('  detail carries no address at all',
     typeof stamp.detail === 'string' && !stamp.detail.includes('@')
       && !stamp.detail.includes(ADDRESS) && !stamp.detail.includes('bounced-fixture'),
     stamp.detail);
  ok('  and still reads as a sentence', /does not exist/.test(stamp.detail || ''), stamp.detail);

  const undated = await deliver(bounced({ created_at: null }));
  ok('an event with no usable created_at falls back to now, not to the epoch',
     undated.writes[0]?.patch?.email_bounce?.at === NOW.toISOString(),
     String(undated.writes[0]?.patch?.email_bounce?.at));

  const long = sanitizeDetail(`${'x'.repeat(400)} ${ADDRESS}`);
  ok('a long provider message is truncated', long.length === 200 && long.endsWith('...'),
     `${long.length} chars`);
  ok('  and a plain message survives unchanged',
     sanitizeDetail('Mailbox does not exist.') === 'Mailbox does not exist.',
     sanitizeDetail('Mailbox does not exist.'));
  ok('  and every address shape is masked',
     ['a@b.co', 'first.last+tag@sub.example.com', '<x@y.test>'].every(
       (a) => !sanitizeDetail(`Rejected for ${a} today`).includes('@')),
     'masked');
  ok('  and an absent message is an empty string, never the word undefined',
     bounceStamp({ data: { bounce: { type: 'Permanent' } } }).detail === '',
     JSON.stringify(bounceStamp({ data: { bounce: { type: 'Permanent' } } }).detail));

  // ── 11. AT LEAST ONCE MEANS TWICE, SOMETIMES ────────────────────────────

  const stamped = { id: GUEST_ID, created_by_id: OWNER_ID, email_bounce: { email_id: EMAIL_ID } };
  const again = await deliver(bounced(), { guest: stamped });
  ok('a second delivery of the same bounce writes nothing',
     again.status === 200 && again.writes.length === 0
       && again.body?.outcome === 'already_stamped',
     `${again.status} / ${again.body?.outcome}`);
  const later = await deliver(bounced({}, { email_id: 'email_fixture_2' }), { guest: stamped });
  ok('  but a later bounce with a new message id is recorded',
     later.writes.length === 1, `${later.writes.length} write(s)`);

  // ── 12. A MISSING ADMIN KEY IS A 500, NOT A SILENT 200 ──────────────────
  //
  // 500 so Resend retries: the bounce is real and the only thing wrong is our
  // configuration. A 200 here would discard it.

  const noKey = await deliver(bounced(), { hasKey: false });
  ok('with no admin key the delivery is a 500, so Resend retries it',
     noKey.status === 500 && noKey.writes.length === 0, String(noKey.status));
  ok('  and it says so with the sibling FAILURE shape',
     noKey.logs.some((l) => l === '[resend-webhook] FAILURE: BASE44_ADMIN_KEY is not set'),
     noKey.logs.join(' | '));

  // ── 13. NOTHING PRIVATE WAS EVER PRINTED ────────────────────────────────
  //
  // Across every delivery above. The goal's rule is 401 and no log of the
  // body; the standing instruction is that a secret and a signature are never
  // printed. Asserted on what the endpoint actually printed, because a
  // promise in a comment is not a property.

  const printed = ALL_LOGS.join('\n');
  ok(`nothing printed carries the signing secret (${ALL_LOGS.length} lines checked)`,
     !printed.includes(SECRET) && !printed.includes(OTHER_SECRET)
       && !printed.includes('whsec_'),
     'clean');
  ok('  nor any signature',
     !ALL_SIGNATURES.some((s) => printed.includes(s)) && !printed.includes('v1,'),
     `${ALL_SIGNATURES.length} signature(s) checked`);
  ok('  nor the address in the body',
     !printed.includes(ADDRESS) && !printed.includes('bounced-fixture'), 'clean');
  ok('  nor the body itself',
     !printed.includes('"email.bounced"') && !printed.includes('You are invited'), 'clean');
  ok('  nor a guest or owner id',
     !printed.includes(GUEST_ID) && !printed.includes(OWNER_ID)
       && !printed.includes(OTHER_OWNER_ID),
     'clean');
  ok('  and every failure line uses the agreed shape with a colon',
     printed.split('\n').filter((l) => l.includes('FAILURE'))
       .every((l) => /^\[resend-webhook\] FAILURE: .+$/.test(l)),
     printed.split('\n').filter((l) => l.includes('FAILURE')).length + ' line(s)');

  return results;
}
