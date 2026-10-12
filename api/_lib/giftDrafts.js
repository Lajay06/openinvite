/**
 * api/_lib/giftDrafts.js
 *
 * THE GIVER'S DRAFT, HELD SERVER SIDE FOR 60 MINUTES BETWEEN CHECKOUT AND
 * STRIPE'S CONFIRMATION. goals/2026-10-11-gifting-v2.md, item 6 and the item 0
 * ruling: v2 checkout carries no Stripe custom fields. Everything the giver
 * chose is checked here, encrypted whole into GiftDraft.draft_enc, and the
 * Stripe session carries only its id (metadata gift_draft_id). The webhook
 * (item 7) reads it back with readGiftDraft and refuses one that has expired.
 *
 * Encrypted under APP_ENC_KEY with the shared AES-256-GCM JSON construction
 * (questionnaireCrypto's encryptPayload); the buyer, when signed in, is an
 * HMAC under APP_HASH_KEY. Never BASE44_ADMIN_KEY, which is a bearer
 * credential only (owner ruling 2026-10-12).
 *
 * A draft is the only copy of what it holds for at most an hour, until the
 * webhook writes the PlanGift row from it. The standing rule against rotating
 * a key that encrypts the only copy of data (BASE44_PLATFORM_NOTES.md,
 * 2026-10-12) therefore applies to APP_ENC_KEY for that hour: an unclaimed
 * draft read under a rotated key is a paid gift with no details.
 */
import { encryptPayload, decryptPayload } from './questionnaireCrypto.js';
import { hmacHex } from './appKeys.js';
import { GIFT_PHOTOS, HEADLINES, NOTE_STYLES, NOTE_MAX } from '../../src/lib/giftingV2.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
export const DRAFT_TTL_MS = 60 * 60 * 1000;

const PHOTO_IDS = new Set(GIFT_PHOTOS.map((p) => p.id));
const HEADLINE_KEYS = new Set(HEADLINES.map((h) => h.key));
const STYLE_KEYS = new Set(NOTE_STYLES.map((s) => s.key));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const IANA = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/;

const text = (v, max) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null);

/**
 * The draft as the server will keep it, or the first thing wrong with it.
 * The plan is not taken from here: checkout resolves it from the price.
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function validateGiftDraft(draft, { today = new Date() } = {}) {
  const d = draft && typeof draft === 'object' ? draft : {};
  const names = text(d.names, 120);
  if (!names) return { ok: false, error: 'names' };
  const email = text(d.email, 200);
  if (!email || !EMAIL.test(email)) return { ok: false, error: 'email' };
  const giver = text(d.giver, 80);
  if (!giver) return { ok: false, error: 'giver' };
  const note = text(d.note, NOTE_MAX);
  if (!note) return { ok: false, error: 'note' };
  if (!STYLE_KEYS.has(d.noteStyle)) return { ok: false, error: 'noteStyle' };
  if (!HEADLINE_KEYS.has(d.headlineKey)) return { ok: false, error: 'headlineKey' };
  if (!PHOTO_IDS.has(d.photoId)) return { ok: false, error: 'photoId' };
  const value = { names, email, giver, note, noteStyle: d.noteStyle, headlineKey: d.headlineKey, photoId: d.photoId, when: 'now' };
  if (d.when === 'date') {
    if (!DATE.test(String(d.date || ''))) return { ok: false, error: 'date' };
    // A morning that has not passed anywhere yet: today or later, in UTC terms.
    if (String(d.date) < today.toISOString().slice(0, 10)) return { ok: false, error: 'date' };
    const timezone = String(d.timezone || '');
    if (!IANA.test(timezone)) return { ok: false, error: 'timezone' };
    Object.assign(value, { when: 'date', date: String(d.date), timezone });
  } else if (d.when !== 'now') {
    return { ok: false, error: 'when' };
  }
  return { ok: true, value };
}

/**
 * Writes the GiftDraft row and returns its id. PlanGift's sibling: RLS create
 * null, so the admin key can create it.
 * @returns {Promise<{ ok: true, id: string } | { ok: false, status?: number }>}
 */
export async function createGiftDraft(value, { plan, userId = null, isTest = false, adminKey, now = new Date(), fetchImpl = fetch }) {
  const record = {
    draft_enc: encryptPayload({ ...value, plan }),
    expires_at: new Date(now.getTime() + DRAFT_TTL_MS).toISOString(),
    ...(userId ? { buyer_user_id_hash: hmacHex(userId) } : {}),
    is_test: !!isTest,
  };
  try {
    const res = await fetchImpl(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/GiftDraft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(record),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const created = await res.json();
    return created?.id ? { ok: true, id: created.id } : { ok: false };
  } catch {
    return { ok: false };
  }
}

/**
 * The draft a session points at, decrypted, or why not. For the webhook
 * (item 7): an expired draft is refused, never quietly used.
 * @returns {Promise<{ ok: true, draft: object, isTest: boolean } | { ok: false, reason: 'missing'|'expired'|'unreadable' }>}
 */
export async function readGiftDraft(id, { adminKey, now = new Date(), fetchImpl = fetch }) {
  if (!id) return { ok: false, reason: 'missing' };
  const res = await fetchImpl(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/GiftDraft/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${adminKey}` },
  }).catch(() => null);
  if (!res || !res.ok) return { ok: false, reason: 'missing' };
  const row = await res.json().catch(() => null);
  if (!row?.draft_enc) return { ok: false, reason: 'missing' };
  if (!(Date.parse(row.expires_at) > now.getTime())) return { ok: false, reason: 'expired' };
  try {
    return { ok: true, draft: decryptPayload(row.draft_enc), isTest: row.is_test === true };
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
}
