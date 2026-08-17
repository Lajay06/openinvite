/**
 * GET/PUT /api/my-wedding-details
 *
 * Authenticated endpoint (the couple's own Base44 session) backing
 * src/lib/resolveMyWedding.js's getMyWeddingDetails() — the single
 * client-side chokepoint every dashboard page reads WeddingDetails
 * through. Exists because fix/weddingdetails-field-encryption (Step 2a)
 * moves a handful of WeddingDetails fields to AES-256-GCM ciphertext
 * (api/_lib/questionnaireCrypto.js) — decrypting needs BASE44_ADMIN_KEY, a
 * server-only secret the browser can never hold, so the raw client
 * `base44.entities.WeddingDetails.filter(...)` call getMyWeddingDetails()
 * used to make can no longer return usable values for those fields.
 *
 * ENCRYPTED_FIELDS below lists every field this endpoint knows how to
 * decrypt on read / encrypt on write. Step 2a shipped `budget` and
 * `contactPerson`; Step 2b completed the set with `emergencyContacts`,
 * `dayVendorContacts`, `celebrant` and `license`, migrating their writer
 * pages (EmergencyContact.jsx, CeremonyDetails.jsx) off direct
 * base44.entities.WeddingDetails writes and onto this endpoint's PUT.
 * WRITABLE_FIELDS now equals ENCRYPTED_FIELDS — no encrypted field has a
 * client-side writer any more.
 *
 * Mixed-row safety (hard requirement, every encryption PR): decryptField()
 * below only ever attempts decryption when the stored value is a string —
 * every one of these fields' legacy plaintext shape is an object or array,
 * so `typeof value === 'string'` unambiguously means "already encrypted by
 * this endpoint," and anything else (object, array, null, undefined) is
 * passed through untouched as legacy plaintext. No separate "is this row
 * migrated yet" flag needed. Tested against both an unmigrated real row
 * (plaintext budget/contactPerson) and a freshly-PUT row (ciphertext) —
 * both read back correctly through the same code path.
 *
 * websitePassword is NOT touched by this endpoint — still returned as
 * plaintext, matching today's behavior. Step 2c moves it to a one-way hash
 * with its own comparison flow; that's a couple-facing UX change (a hash
 * can't be shown back to the couple the way a password currently is), not
 * a decrypt-on-read case, so it doesn't belong in this generic list.
 *
 * GET → the full WeddingDetails record for the caller's own wedding (most
 *   recent non-test), with ENCRYPTED_FIELDS decrypted where applicable.
 *   null if the caller has no WeddingDetails yet.
 * PUT body: { field: <name>, value: any }        — one field, or
 *           { fields: { <name>: any, … } }      — several, in one write
 *   → encrypts each value and writes it to the caller's own WeddingDetails
 *   record (creating one if none exists yet, via the CALLER's own token so
 *   Base44 stamps created_by_id correctly — an admin-key create always
 *   stamps "anonymous", never a chosen owner, see BASE44_PLATFORM_NOTES.md).
 *   Response: 200 { id } or 400/401/500 { error }. Every field name is
 *   checked against WRITABLE_FIELDS — this endpoint only ever touches the
 *   specific encrypted fields it owns, never a generic
 *   WeddingDetails.update passthrough. Use the batch form when one page
 *   owns more than one encrypted field: two sequential single-field PUTs on
 *   a first-ever save would create two records.
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token
 * (used for the GET; the PUT/create below use the caller's own forwarded
 * token, since WeddingDetails.update is owner-scoped and WeddingDetails.create
 * would otherwise get stamped to "anonymous" by the admin key).
 */

import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { encryptPayload, decryptPayload } from './_lib/questionnaireCrypto.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

// Fields this endpoint knows how to decrypt on read. Step 2a writes
// ciphertext for budget/contactPerson only — the rest are wired for
// Step 2b's writer-page migrations.
const ENCRYPTED_FIELDS = ['budget', 'contactPerson', 'emergencyContacts', 'dayVendorContacts', 'celebrant', 'license'];
// Fields THIS endpoint is allowed to write. Never a blanket "update
// anything" passthrough. Step 2b completed the set: every field in
// ENCRYPTED_FIELDS is now written as ciphertext through here, and no page
// writes any of them via base44.entities.WeddingDetails directly.
const WRITABLE_FIELDS = ['budget', 'contactPerson', 'emergencyContacts', 'dayVendorContacts', 'celebrant', 'license'];

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function adminFetch(method, path, body) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

/** WeddingDetails.create/update with the CALLER's own token — see file header for why. */
async function callerFetch(method, path, callerToken, body) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${callerToken}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

/** Mixed-row-safe: only a string is ever ciphertext this endpoint wrote — see file header. */
function decryptField(value) {
  if (typeof value !== 'string') return value;
  try {
    return decryptPayload(value);
  } catch (err) {
    console.error('[my-wedding-details] Failed to decrypt field, returning as-is:', err.message);
    return value;
  }
}

async function getMyWeddings(callerId) {
  const q = encodeURIComponent(JSON.stringify({ created_by_id: callerId }));
  return unwrapList(await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${q}`))
    .filter(w => !w.is_test);
}

async function getMyWedding(callerId) {
  const weddings = await getMyWeddings(callerId);
  return weddings.length > 0
    ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
    : null;
}

async function handleGet(req, res, caller) {
  // Same "more than one real record" telemetry getMyWeddingDetails() used
  // to log client-side (the "Alex & Sam" incident) — moved server-side,
  // one central place instead of every browser tab independently warning.
  const weddings = await getMyWeddings(caller.id);
  if (weddings.length > 1) {
    console.warn(`[my-wedding-details] user ${caller.id} owns ${weddings.length} non-test WeddingDetails records — resolving to the most recent. ids: ${weddings.map(w => w.id).join(', ')}`);
  }
  const wedding = weddings.length > 0
    ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
    : null;
  if (!wedding) return res.status(200).json(null);

  const decrypted = { ...wedding };
  for (const field of ENCRYPTED_FIELDS) {
    if (field in decrypted) decrypted[field] = decryptField(decrypted[field]);
  }
  return res.status(200).json(decrypted);
}

/**
 * Accepts either shape:
 *   { field: 'budget', value: … }              — single field (Budget.jsx)
 *   { fields: { celebrant: …, license: … } }   — batch (Step 2b writer pages)
 *
 * The batch form exists because a page that owns two encrypted fields must
 * write them in ONE request. Two sequential single-field PUTs on a
 * first-ever save would each find no record and each create one, producing
 * the duplicate-WeddingDetails shape the "Alex & Sam" telemetry in
 * handleGet() exists to catch. One request, one create.
 *
 * Every key is checked against WRITABLE_FIELDS individually — the batch
 * form widens how many fields can be written at once, never which.
 */
function readPutFields(body) {
  if (body?.fields !== undefined) {
    const { fields } = body;
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      return { error: 'fields must be an object of { fieldName: value }' };
    }
    const names = Object.keys(fields);
    if (names.length === 0) return { error: 'fields must name at least one field' };
    const rejected = names.filter(n => !WRITABLE_FIELDS.includes(n));
    if (rejected.length > 0) {
      return { error: `fields may only contain: ${WRITABLE_FIELDS.join(', ')} (rejected: ${rejected.join(', ')})` };
    }
    return { fields };
  }

  const field = body?.field;
  if (!WRITABLE_FIELDS.includes(field)) {
    return { error: `field must be one of: ${WRITABLE_FIELDS.join(', ')}` };
  }
  return { fields: { [field]: body?.value } };
}

async function handlePut(req, res, caller, callerToken) {
  const { fields, error } = readPutFields(req.body);
  if (error) return res.status(400).json({ error });

  const payload = {};
  for (const [name, value] of Object.entries(fields)) {
    payload[name] = encryptPayload(value ?? null);
  }

  const wedding = await getMyWedding(caller.id);
  if (wedding) {
    await callerFetch('PUT', `/apps/${BASE44_APP_ID}/entities/WeddingDetails/${wedding.id}`, callerToken, payload);
    return res.status(200).json({ id: wedding.id });
  }

  const created = await callerFetch('POST', `/apps/${BASE44_APP_ID}/entities/WeddingDetails`, callerToken, payload);
  return res.status(200).json({ id: created.id });
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'my-wedding-details', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[my-wedding-details] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') return await handleGet(req, res, caller);
    if (req.method === 'PUT') {
      const callerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      return await handlePut(req, res, caller, callerToken);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[my-wedding-details] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
