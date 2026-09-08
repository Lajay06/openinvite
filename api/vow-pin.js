/**
 * POST /api/vow-pin
 *
 * The lock on one vow or speech: set it, open it, remove it. Three actions,
 * one endpoint, all on the CALLER'S OWN record.
 *
 * ── WHY THIS IS SERVER-SIDE AT ALL ─────────────────────────────────────────
 *
 * A 4-6 digit PIN has at most a million candidates. A hash the browser
 * computes is a hash an attacker recomputes offline against a value they can
 * already read, so hashing in the client would be theatre. The plaintext PIN
 * is posted here over TLS, hashed with scrypt, and never written to the
 * entity — `pin_hash` only ever receives `scrypt$<salt>$<digest>`.
 *
 * ── WHAT THIS LOCK IS, SAID PLAINLY ────────────────────────────────────────
 *
 * A SCREEN LOCK, not an access-control boundary, and the UI says so too.
 * VowSpeech RLS already scopes read to `created_by_id = {{user.id}}`, so the
 * text is private to the couple's account whatever the PIN does. The lock
 * exists for the other case — a partner leaning over the laptop — and the
 * page reads the record through the ordinary client path, so a determined
 * account-holder can reach the content through devtools. Claiming more than
 * that would be the dangerous part.
 *
 * That is also why `clear` needs no PIN. The ruling allows no recovery flow
 * beyond removing the lock from the couple's own dashboard, so removing it
 * IS the recovery, and demanding the forgotten PIN to forget the PIN would
 * strand the couple out of their own vows permanently. Being signed into the
 * account is the credential for that action, which is the same credential
 * that could read the row directly anyway.
 *
 * ── OWNERSHIP IS CHECKED, NOT ASSUMED ──────────────────────────────────────
 *
 * Every read and write here uses the CALLER'S OWN forwarded bearer token, so
 * Base44's owner-scoped RLS is the backstop, and `created_by_id` is compared
 * explicitly on top of it. A caller must never be able to name someone
 * else's vow id and lock, open, or unlock it.
 *
 * Body: { id, action: 'set' | 'unlock' | 'clear', pin? }
 *   set    — pin required. Stores the hash. 200 { locked: true }
 *   unlock — pin required. 200 { ok: true } or 401 { ok: false }
 *   clear  — no pin. Removes the lock. 200 { locked: false }
 */
import { verifyBase44User } from './_lib/auth.js';
import { hashPin, verifyPin, isValidPin, isLocked } from './_lib/vowPinHash.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

async function callerFetch(method, path, token, body) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const caller = await verifyBase44User(req);
  if (!caller) return res.status(401).json({ error: 'Unauthorized' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  const { id, action, pin } = req.body || {};
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id is required' });
  if (!['set', 'unlock', 'clear'].includes(action)) {
    return res.status(400).json({ error: "action must be 'set', 'unlock' or 'clear'" });
  }
  if ((action === 'set' || action === 'unlock') && !isValidPin(pin)) {
    return res.status(400).json({ error: 'A PIN is 4 to 6 digits' });
  }

  try {
    const item = await callerFetch('GET', `/apps/${BASE44_APP_ID}/entities/VowSpeech/${id}`, token);
    if (!item || item.created_by_id !== caller.id) {
      // 404, not 403: a caller who does not own this row should not learn
      // whether it exists.
      return res.status(404).json({ error: 'Not found' });
    }

    if (action === 'set') {
      await callerFetch('PUT', `/apps/${BASE44_APP_ID}/entities/VowSpeech/${id}`, token,
        { pin_hash: await hashPin(pin) });
      return res.status(200).json({ locked: true });
    }

    if (action === 'clear') {
      await callerFetch('PUT', `/apps/${BASE44_APP_ID}/entities/VowSpeech/${id}`, token, { pin_hash: null });
      return res.status(200).json({ locked: false });
    }

    // unlock
    if (!isLocked(item.pin_hash)) return res.status(200).json({ ok: true, locked: false });
    const ok = await verifyPin(item.pin_hash, pin);
    return res.status(ok ? 200 : 401).json({ ok });
  } catch (err) {
    console.error('[vow-pin] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
