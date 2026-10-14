/**
 * api/_lib/professionalData.js
 *
 * THE ONE ROAD TO PRO ROWS. Every Pro entity is owner-scoped on all four RLS
 * operations (RLS is never opened), so the admin key cannot read them. The
 * server reaches them through the Base44-hosted function professionalData
 * (asServiceRole), in the shape of collaboratorRead: a shared-secret header,
 * the caller's own token forwarded so the function can re-check membership.
 *
 * Until the owner deploys the function and sets PRO_FN_SECRET, every call
 * answers "not configured" (503) and nothing is read or written.
 *
 * FIELDS is the allowlist both ways: what a client may write, and what a
 * response may carry. *_enc fields are encrypted here and decrypted here;
 * the client only ever sees the plain name.
 */
import { encryptPayload, decryptPayload } from './questionnaireCrypto.js';

const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const FN_URL = `https://base44.app/api/apps/${APP_ID}/functions/professionalData`;

/** Plain name the client uses, to the encrypted column that stores it. */
export const ENC = {
  ProEvent: { couple_names: 'couple_names_enc' },
  ProMember: { name: 'name_enc' },
  ProGuest: { name: 'name_enc', dietary: 'dietary_enc' },
  RunSheetRow: { notes: 'notes_enc' },
  VendorContact: { contact: 'contact_enc', phone: 'phone_enc', email: 'email_enc', notes: 'notes_enc' },
  ProQuestionnaire: { answers: 'answers_enc' },
  ProNote: { body: 'body_enc' },
};

/** What a client may send and receive, per collection (system fields id and created_date always return). */
export const FIELDS = {
  ProEvent: ['workspace_id', 'couple_names', 'event_date', 'venue', 'status', 'kind', 'guest_estimate', 'assigned_member_ids', 'template_id', 'frozen_totals'],
  RunSheetRow: ['event_id', 'sheet', 'start_minute', 'duration_minutes', 'item', 'location', 'owner_ref', 'cue', 'notes', 'status', 'sort'],
  ProGuest: ['event_id', 'name', 'dietary', 'meal', 'table', 'plus_one', 'child', 'status'],
  ProTask: ['event_id', 'title', 'owner_id', 'due_date', 'done', 'months_out'],
  ProVendorBooking: ['event_id', 'vendor_id', 'role', 'fee', 'deposit', 'contract_file', 'arrive_minute', 'finish_minute', 'link_expires_at', 'link_revoked'],
  PaymentDue: ['event_id', 'booking_id', 'label', 'amount', 'due_date', 'payer', 'status'],
  ProCost: ['event_id', 'kind', 'label', 'amount'],
  ProQuestionnaire: ['event_id', 'title', 'questions', 'answers', 'status'],
  ProDocument: ['event_id', 'kind', 'name', 'file_url'],
  ProNote: ['event_id', 'author_member_id', 'body', 'kind'],
  VendorContact: ['workspace_id', 'role', 'company', 'contact', 'phone', 'email', 'insurance_expires', 'notes'],
  ProTemplate: ['workspace_id', 'kind', 'name', 'body'],
  ProMember: ['workspace_id', 'name', 'role', 'assigned_event_ids', 'event_type'],
  PartnerCode: ['workspace_id', 'code', 'label', 'status'],
  PartnerReward: ['code_id', 'plan', 'amount', 'status', 'earn_after'],
  ProWorkspace: ['name', 'plan', 'plan_status', 'event_limit', 'seat_limit', 'brand_logo_url', 'brand_name', 'trial_ends_at'],
};

/** Client data in, stored row out: only allowed fields, sensitive ones encrypted. */
export function toStored(collection, data) {
  const allowed = new Set(FIELDS[collection] || []);
  const enc = ENC[collection] || {};
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (!allowed.has(k)) continue;
    if (enc[k]) out[enc[k]] = v === null || v === undefined || v === '' ? null : encryptPayload({ v });
    else out[k] = v;
  }
  return out;
}

/** Stored row in, client row out: decrypted, allowlisted. A row that will not decrypt throws (standing rule 3: stop). */
export function fromStored(collection, row) {
  if (!row) return null;
  const enc = ENC[collection] || {};
  const out = { id: row.id, created_date: row.created_date };
  for (const k of FIELDS[collection] || []) {
    if (enc[k]) out[k] = row[enc[k]] ? decryptPayload(row[enc[k]]).v : null;
    else if (k in row) out[k] = row[k];
  }
  return out;
}

export function isConfigured(env = process.env) {
  return !!(env.PRO_FN_SECRET && env.APP_HASH_KEY && env.APP_ENC_KEY);
}

/** Call the hosted function. Throws { status } on anything but a clean answer. */
export async function proFn(op, payload, callerToken, env = process.env) {
  if (!isConfigured(env)) { const e = new Error('not configured'); e.status = 503; throw e; }
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${callerToken}`, 'X-Pro-Fn-Secret': env.PRO_FN_SECRET },
    body: JSON.stringify({ op, ...payload }),
  });
  if (!res.ok) { const e = new Error(`professionalData ${res.status}`); e.status = res.status; throw e; }
  return res.json();
}
