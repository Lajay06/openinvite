/**
 * GET/POST /api/guest-contact-review
 *
 * Authenticated (the couple's own Base44 session) endpoint backing
 * PendingImportsPanel.jsx / Guests.jsx's Contact Collector review flow.
 *
 * fix/guest-contact-submission-rls (PR 1b): GuestContactSubmission's
 * name/email/phone/mailing_address now live in one AES-256-GCM
 * encrypted_contact_details blob (api/_lib/questionnaireCrypto.js), so the
 * browser can no longer read pending submissions directly via
 * base44.entities.GuestContactSubmission.filter(...) — decrypting needs
 * BASE44_ADMIN_KEY, a server-only secret. This endpoint does that
 * server-side.
 *
 * update/delete RLS on this entity is null (open) — not a choice, a
 * constraint: every row is stamped created_by_id: "anonymous" by Base44
 * itself regardless of what the create call sends (confirmed empirically),
 * so an owner-scoped RLS rule would lock out the real wedding owner too,
 * not just attackers. Ownership is therefore verified here, in application
 * code, before any admin-key write — the same pattern api/collaborator-
 * guests.js already uses for the identical problem on a different entity.
 *
 * GET → { submissions: [{ id, name, email, phone, mailing_address, status,
 *   created_date }] } — decrypted, pending only, for the caller's own
 *   wedding. Empty array if the caller has no wedding yet.
 *
 * POST body: { submissionId: string, action: 'approve'|'merge'|'dismiss',
 *   mergeGuestId?: string (required when action === 'merge') }
 * Response: 200 { ok: true } or 400/401/404 { error: string }
 *
 * Guest.create/Guest.update calls use the CALLER'S OWN forwarded bearer
 * token, never the admin key — Guest.create is open but Guest.update is
 * owner-scoped ({created_by_id: "{{user.id}}"}), which the admin key can
 * never satisfy (no session identity of its own). Using the caller's own
 * token means Base44 stamps/matches ownership correctly, exactly as if
 * the browser had made the call directly.
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { tokenPatch } from './_lib/rsvpTokenCrypto.js';
import { decryptPayload } from './_lib/questionnaireCrypto.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

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

/** Guest.create/Guest.update with the CALLER's own token — never the admin key (see file header). */
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

/** decryptPayload throws on a truncated/tampered blob — treat that as "no data" rather than 500ing the whole request. */
function safeDecrypt(blob) {
  if (!blob) return null;
  try {
    return decryptPayload(blob);
  } catch (err) {
    console.error('[guest-contact-review] Failed to decrypt encrypted_contact_details:', err.message);
    return null;
  }
}

async function getMyWedding(callerId) {
  const q = encodeURIComponent(JSON.stringify({ created_by_id: callerId }));
  const weddings = unwrapList(await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${q}`))
    .filter(w => !w.is_test);
  return weddings.length > 0
    ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
    : null;
}

async function handleGet(req, res, caller) {
  const wedding = await getMyWedding(caller.id);
  if (!wedding?.id) return res.status(200).json({ submissions: [] });

  const q = encodeURIComponent(JSON.stringify({ wedding_id: wedding.id, status: 'pending' }));
  const rows = unwrapList(await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/GuestContactSubmission?q=${q}&limit=1000`))
    .filter(s => !s.is_test);

  const submissions = rows.map(s => {
    const decrypted = safeDecrypt(s.encrypted_contact_details) || {};
    return {
      id: s.id,
      // NOT a Guest-PII reader — do not "fix" this with mergeGuestPii.
      // `decrypted` is a GuestContactSubmission payload, decrypted above by
      // questionnaireCrypto; it is not a Guest row and has no
      // encrypted_guest_pii blob. Unaffected by Track D. Allowlisted in
      // tests/persistence/guest-plaintext-readers.mjs.
      name: decrypted.name || '',
      email: decrypted.email || '',
      phone: decrypted.phone || '',
      mailing_address: decrypted.mailing_address || '',
      status: s.status,
      created_date: s.created_date,
    };
  });

  return res.status(200).json({ submissions });
}

async function handlePost(req, res, caller, callerToken) {
  const submissionId = typeof req.body?.submissionId === 'string' ? req.body.submissionId : '';
  const action = req.body?.action;
  const mergeGuestId = typeof req.body?.mergeGuestId === 'string' ? req.body.mergeGuestId : '';

  if (!submissionId || !['approve', 'merge', 'dismiss'].includes(action)) {
    return res.status(400).json({ error: 'submissionId and a valid action are required' });
  }
  if (action === 'merge' && !mergeGuestId) {
    return res.status(400).json({ error: 'mergeGuestId is required for a merge action' });
  }

  const wedding = await getMyWedding(caller.id);
  if (!wedding?.id) return res.status(404).json({ error: 'No wedding found for this account' });

  // Ownership check — GuestContactSubmission.read is null (open), so
  // fetching by id alone proves nothing; the wedding_id match is what
  // actually verifies this submission belongs to the caller.
  const submission = await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/GuestContactSubmission/${submissionId}`).catch(() => null);
  if (!submission || submission.wedding_id !== wedding.id) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  if (action === 'dismiss') {
    await adminFetch('PUT', `/apps/${BASE44_APP_ID}/entities/GuestContactSubmission/${submissionId}`, { status: 'dismissed' });
    return res.status(200).json({ ok: true });
  }

  const decrypted = safeDecrypt(submission.encrypted_contact_details) || {};

  if (action === 'approve') {
    // Mint the RSVP token with the row, for the same reason api/my-guests.js
    // does: a guest without `rsvp_link_id_enc` cannot be sent their link by
    // api/rsvp-link-request.js and receives the neutral "sent" response with no
    // email. This path creates a Guest directly, bypassing my-guests.js
    // entirely, so it needs its own mint or approved guests arrive tokenless.
    await callerFetch('POST', `/apps/${BASE44_APP_ID}/entities/Guest`, callerToken, {
      name: decrypted.name || 'Guest',
      email: decrypted.email || undefined,
      phone: decrypted.phone || undefined,
      mailing_address: decrypted.mailing_address || undefined,
      ...tokenPatch(crypto.randomUUID(), false),
    });
    await adminFetch('PUT', `/apps/${BASE44_APP_ID}/entities/GuestContactSubmission/${submissionId}`, { status: 'approved' });
    return res.status(200).json({ ok: true });
  }

  // action === 'merge' — Guest.read is null (open) too, so the same
  // explicit ownership check applies before writing to an arbitrary id.
  const target = await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/Guest/${mergeGuestId}`).catch(() => null);
  if (!target || target.created_by_id !== caller.id) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  const fill = {};
  if (!target.email && decrypted.email) fill.email = decrypted.email;
  if (!target.phone && decrypted.phone) fill.phone = decrypted.phone;
  if (!target.mailing_address && decrypted.mailing_address) fill.mailing_address = decrypted.mailing_address;
  if (Object.keys(fill).length > 0) {
    await callerFetch('PUT', `/apps/${BASE44_APP_ID}/entities/Guest/${mergeGuestId}`, callerToken, fill);
  }
  await adminFetch('PUT', `/apps/${BASE44_APP_ID}/entities/GuestContactSubmission/${submissionId}`, { status: 'approved' });
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'guest-contact-review', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[guest-contact-review] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') return await handleGet(req, res, caller);
    if (req.method === 'POST') {
      const callerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      return await handlePost(req, res, caller, callerToken);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[guest-contact-review] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
