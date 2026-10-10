/**
 * api/resend-webhook.js
 *
 * WHEN AN INVITATION BOUNCES, THE COUPLE GETS TOLD.
 *
 * ── WHY THIS IS NOT IN api/webhooks/ ───────────────────────────────────────
 *
 * It looks like it belongs there, and it does not. api/webhooks/ is the
 * PAYMENTS webhook directory: scripts/check-payments-freeze.mjs freezes the
 * whole directory on the premise that a new file in it is a new payment
 * webhook, which is what makes a careless edit near the money impossible
 * rather than merely discouraged. This endpoint takes no money and writes one
 * field on one guest row, so it would have had to be excused by a passphrase
 * that says "I am deliberately changing payments" and, in CI, by a
 * Payments-Change trailer that would sit in this repository's log forever
 * saying something untrue.
 *
 * Owner ruling, 2026-10-10: the premise stands, and a non-payments webhook
 * lives at the api/ root. The directory stays payments-only and the freeze was
 * not touched.
 *
 * Item 1 of goals/2026-10-10-bounces-and-notes.md. Resend posts here for
 * every subscribed event; this endpoint stamps Guest.email_bounce when an
 * invitation or a reminder bounced PERMANENTLY, and returns 200 to everything
 * else so Resend does not retry an event we simply do not act on.
 *
 * ── WHY bodyParser IS OFF, AND WHY THAT IS THE WHOLE POINT ─────────────────
 *
 * A Svix signature is an HMAC over the EXACT BYTES of the request body. Vercel
 * parses a JSON body by default, which consumes the stream, so a handler that
 * reads req.body has already lost the thing it needs to verify. The sibling
 * webhook in this repo, api/webhooks/stripe.js, has no bodyParser config and
 * falls back to re-stringifying the parsed body: that happens to match for
 * compact JSON and cannot be relied on, because JSON.stringify is not a
 * byte-for-byte inverse of a parse. Vercel's own documented form for a Node
 * function that verifies a signature is the config export below, so this
 * endpoint uses it and reads the raw bytes itself.
 *
 * Stripe's file is frozen under CLAUDE.md and is not touched here.
 *
 * ── WHAT IS NEVER LOGGED ───────────────────────────────────────────────────
 *
 * Not the secret, not the signature, not the request body, not an address and
 * not a guest or owner id. A rejected delivery is reported by its SHAPE, which
 * is the only part of it we trust: an attacker chooses the body, so a body in
 * a log line is an attacker choosing what lands in our logs. The guard asserts
 * this by capturing console output and looking for the fixture's own strings.
 *
 * ── THE TWO TAG SHAPES ARE NOT THE SAME SHAPE ──────────────────────────────
 *
 * Resend's send API takes tags as an ARRAY of name and value pairs, and this
 * webhook receives them as an OBJECT keyed by name (data.tags is
 * Record<string, string> in the installed SDK's types). Item 2 sets them on
 * the way out; this file reads them on the way back in. Matching a bounce to a
 * guest goes through those tags and never through the address, so no address
 * is ever searched for, stored, or written.
 *
 * ── AT LEAST ONCE MEANS TWICE, SOMETIMES ───────────────────────────────────
 *
 * Resend delivers at least once, so the same bounce can arrive twice. The
 * write is idempotent on email_id: a second delivery for an email_id already
 * on the guest is a 200 that writes nothing. That also makes the 500 below
 * safe, which is the point of returning one: a Base44 failure SHOULD be
 * retried, and the retry cannot double-stamp.
 */
import { Resend } from 'resend';
import { adminGetOne, adminUpdate, hasAdminKey } from './_lib/base44Entities.js';

export const config = { api: { bodyParser: false } };

const LOG = '[resend-webhook]';

/**
 * How old a delivery may be. Svix enforces the same five minutes inside
 * verify, and this endpoint checks it anyway: the tolerance is the SDK's to
 * change and the window is ours to state, and checking it first gives the
 * rejection its own log line instead of one shared with every bad signature.
 *
 * Checking an unverified header is safe here because it can only ever cause a
 * rejection. The timestamp is part of the signed string, so a forged one
 * fails verification one step later.
 */
const REPLAY_WINDOW_SECONDS = 5 * 60;

/** How much of a provider's bounce message is kept. */
const DETAIL_LIMIT = 200;

/**
 * Resend's rule for a tag value: ASCII letters, numbers, underscores and
 * dashes, up to 256 characters. Applied on the way in as well as on the way
 * out, because a value that could not have been sent could not have come back
 * from a send of ours.
 */
const TAG_VALUE = /^[A-Za-z0-9_-]{1,256}$/;

/**
 * The webhook verifier.
 *
 * resend.webhooks.verify is a purely local check: it builds a Svix Webhook
 * from the signing secret and compares an HMAC. It reaches no API and needs no
 * API key. The SDK refuses to construct without one, though, so the client is
 * built at CALL TIME with the real key when the process has one and a
 * placeholder when it does not. The placeholder never leaves this process
 * because no request is made with it, and building at call time is what lets
 * the guard exercise the real verification path with no secrets present.
 */
function verifier() {
  return new Resend(process.env.RESEND_API_KEY || 're_verify_only').webhooks;
}

/** The request body as the bytes that were signed, or an empty buffer. */
export async function readRawBody(req) {
  const chunks = [];
  try {
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
    }
  } catch {
    return Buffer.alloc(0);
  }
  return Buffer.concat(chunks);
}

/**
 * The three Svix headers, as strings.
 *
 * Node lowercases header names and may hand back an array for a repeated one,
 * so both are normalized here rather than at three call sites.
 */
export function svixHeaders(headers = {}) {
  const one = (name) => {
    const value = headers[name];
    if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
    return typeof value === 'string' ? value : '';
  };
  return {
    id: one('svix-id'),
    timestamp: one('svix-timestamp'),
    signature: one('svix-signature'),
  };
}

/**
 * Whether a delivery is inside the replay window.
 *
 * Both directions. A timestamp far in the future is as much of a replay signal
 * as one far in the past, and a clock that disagrees by an hour is not
 * something to accept quietly in either sign.
 */
export function isWithinReplayWindow(timestamp, nowMs = Date.now()) {
  if (typeof timestamp !== 'string' || !/^\d+$/.test(timestamp.trim())) return false;
  const seconds = Number(timestamp.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) return false;
  return Math.abs(Math.floor(nowMs / 1000) - seconds) <= REPLAY_WINDOW_SECONDS;
}

/**
 * The guest and owner ids from the event's tags, or null.
 *
 * Null for a missing tag, a non-string tag, a tag that breaks Resend's own
 * character rule, and for tags that arrived as an array rather than an object.
 * The caller logs and drops: an event we cannot attribute is not an event we
 * guess at.
 */
export function readTagIds(tags) {
  if (!tags || typeof tags !== 'object' || Array.isArray(tags)) return null;
  const clean = (value) => (typeof value === 'string' && TAG_VALUE.test(value) ? value : '');
  const guestId = clean(tags.guest_id);
  const ownerId = clean(tags.owner_id);
  if (!guestId || !ownerId) return null;
  return { guestId, ownerId };
}

/**
 * A provider's bounce message, trimmed to something storable with no address
 * in it.
 *
 * The schema's description promises detail carries no email address, and a
 * real bounce message usually names the recipient: "The email account that you
 * tried to reach does not exist" arrives with the address quoted in it. So the
 * address is replaced rather than hoped about. Replaced, not deleted, because
 * a sentence with a hole in it reads as corruption and the couple is going to
 * see this.
 */
export function sanitizeDetail(message) {
  const text = String(message ?? '').replace(/\s+/g, ' ').trim();
  const masked = text.replace(/[^\s<>()[\],;:"']+@[^\s<>()[\],;:"']+/g, '[address]');
  if (masked.length <= DETAIL_LIMIT) return masked;
  return `${masked.slice(0, DETAIL_LIMIT - 3)}...`;
}

/**
 * Whether this bounce is the permanent kind.
 *
 * Matched as equality against Resend's exact word. This goal's ruling says
 * "transient bounces are logged and ignored" and Resend's documented value for
 * that case is "Temporary", so the two vocabularies do not line up and a check
 * written against the ruling's word would stamp nothing. Everything that is
 * not exactly "Permanent" is logged as not stamping, which is right for
 * "Temporary", for a value nobody has seen yet, and for a missing field.
 */
export function isPermanentBounce(bounce) {
  return bounce?.type === 'Permanent';
}

/**
 * The email_bounce value for an event. Exactly the four sub-properties the
 * Base44 schema declares, and no fifth: tests/persistence/
 * mirror-declares-the-new-fields.mjs asserts the shape carries no address
 * field, and an unknown field would be silently dropped anyway.
 */
export function bounceStamp(event, now = new Date()) {
  const data = event?.data || {};
  const createdAt = typeof event?.created_at === 'string' ? event.created_at : '';
  const at = new Date(createdAt);
  return {
    at: Number.isNaN(at.getTime()) ? now.toISOString() : at.toISOString(),
    kind: 'permanent',
    detail: sanitizeDetail(data.bounce?.message ?? data.bounce?.subType ?? ''),
    email_id: String(data.email_id ?? ''),
  };
}

/**
 * Stamps one guest, or explains why it did not.
 *
 * Returns an outcome word rather than throwing for the ordinary refusals,
 * because every one of them is a 200: Resend retrying an event we have decided
 * not to act on would be a retry loop over a settled question.
 *
 * THE OWNER CHECK IS THE BOUNDARY. A guest is loaded by id and then matched
 * against the owner id from the same signed event, and a guest that is missing
 * and a guest that belongs to someone else return the SAME outcome. Reporting
 * them differently would confirm that an id exists, which is the reasoning
 * api/guest-note-update.js already uses for the same shape of check.
 */
export async function applyBounce(event, { getGuest, updateGuest, now = new Date() } = {}) {
  const data = event?.data || {};

  if (!isPermanentBounce(data.bounce)) {
    return { outcome: 'not_permanent', kind: String(data.bounce?.type || 'missing') };
  }

  const ids = readTagIds(data.tags);
  if (!ids) return { outcome: 'no_tags' };

  const guest = await getGuest(ids.guestId);
  if (!guest || guest.created_by_id !== ids.ownerId) return { outcome: 'not_this_owner' };

  const emailId = String(data.email_id ?? '');
  if (emailId && guest.email_bounce?.email_id === emailId) return { outcome: 'already_stamped' };

  await updateGuest(ids.guestId, { email_bounce: bounceStamp(event, now) });
  return { outcome: 'stamped' };
}

/**
 * `deps` is for the guard, and only for the guard: Vercel calls the handler
 * with two arguments, so the third is always the default in production. It is
 * the same injection shape api/_lib/guestSafeWedding.js uses for its fetch.
 */
export default async function handler(req, res, deps = {}) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // READ AT CALL TIME, never at module scope. A module-scope read is captured
  // when the function cold-starts, so setting the secret in Vercel would not
  // take effect on a warm instance; it also means this module can be imported
  // by a guard with no secret present.
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error(`${LOG} FAILURE: RESEND_WEBHOOK_SECRET is not set`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = typeof deps.now === 'function' ? deps.now() : new Date();
  const headers = svixHeaders(req.headers);

  if (!isWithinReplayWindow(headers.timestamp, now.getTime())) {
    console.error(`${LOG} FAILURE: delivery is outside the five minute window`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const raw = await readRawBody(req);
  if (raw.length === 0) {
    console.error(`${LOG} FAILURE: request body was empty or unreadable`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let event;
  try {
    event = verifier().verify({
      payload: raw.toString('utf8'),
      headers,
      webhookSecret: secret,
    });
  } catch {
    // The error is deliberately not logged either. Svix's message names which
    // header was wrong, which is a hint handed back to whoever is probing.
    console.error(`${LOG} FAILURE: signature verification failed`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const type = String(event?.type || '');
  if (type !== 'email.bounced') {
    // ONE LINE PER DELIVERY, naming the type, and not a running tally. A
    // module-scope counter would count only the deliveries that happened to
    // land on one warm instance, and a number that is sometimes the truth is
    // worse to read in a log than a line per event.
    console.log(`${LOG} event ignored, type: ${type || 'missing'}`);
    return res.status(200).json({ ok: true, outcome: 'ignored_type' });
  }

  // THE KEY PROBE IS INJECTABLE FOR THE SAME REASON THE READS ARE. The
  // constant behind hasAdminKey is captured when api/_lib/base44Entities.js
  // is first imported, which in the guard suite is whichever guard reaches it
  // first, so a guard that depended on its value would depend on filename
  // order. That ordering trap is written up in tests/persistence/_registry.mjs
  // and it has already cost one red CI run. Production injects nothing and
  // asks the real one.
  const keyPresent = typeof deps.hasKey === 'function' ? deps.hasKey() : hasAdminKey();
  if (!keyPresent) {
    console.error(`${LOG} FAILURE: BASE44_ADMIN_KEY is not set`);
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const verdict = await applyBounce(event, {
      getGuest: deps.getGuest || ((id) => adminGetOne('Guest', id)),
      updateGuest: deps.updateGuest || ((id, patch) => adminUpdate('Guest', id, patch)),
      now,
    });

    // No ids and no addresses in any of these: a bounce log line says what
    // happened, and the couple's Guests page says who it happened to.
    if (verdict.outcome === 'stamped') {
      console.log(`${LOG} permanent bounce stamped on one guest`);
    } else if (verdict.outcome === 'not_permanent') {
      console.log(`${LOG} bounce not stamped, classification: ${verdict.kind}`);
    } else if (verdict.outcome === 'no_tags') {
      console.log(`${LOG} bounce dropped, no usable guest_id and owner_id tags`);
    } else if (verdict.outcome === 'not_this_owner') {
      console.log(`${LOG} bounce dropped, no guest for those tags on that account`);
    } else if (verdict.outcome === 'already_stamped') {
      console.log(`${LOG} bounce already recorded, nothing written`);
    }

    return res.status(200).json({ ok: true, outcome: verdict.outcome });
  } catch (err) {
    // A 500 asks Resend to retry, which is what we want for a Base44 failure,
    // and the idempotency check above is what makes that retry safe.
    console.error(`${LOG} FAILURE: ${err.message}`);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
