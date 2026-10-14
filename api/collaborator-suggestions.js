/**
 * /api/collaborator-suggestions
 *
 * SUGGEST AND APPROVE (owner ruling 2026-10-14, route b). A collaborator never
 * adds to the couple's Moodboard or Schedule and never removes the couple's
 * items. They suggest; the couple approves from their own session, and the
 * approved item is created with the couple's own token, so it belongs to the
 * couple like anything else they made.
 *
 * Every row lives in CollaboratorSuggestion (create null, read null, update and
 * delete by the creator), as an append-only log:
 *   suggest   written by the collaborator, with their own token
 *   approve   written by the couple, after the item exists; carries its id
 *   decline   written by the couple
 * Ids are HMAC-SHA256 under COLLAB_HASH_KEY (api/_lib/collaboratorAuth.js
 * hashId); the item and the collaborator's name are AES-256-GCM under
 * APP_ENC_KEY (api/_lib/appKeys.js), with the row's own hashes and page as
 * additional data. Read is open, so nothing is readable in the clear.
 *
 * ── CREATE IS OPEN, SO ROWS ARE TRUSTED BY WHO WROTE THEM ───────────────────
 *
 * Anyone signed in can write any row. So (owner, 2026-10-14):
 *   - a suggest row counts only when its created_by_id hashes to its own
 *     collaborator_user_id_hash, and (for the couple) that collaborator's
 *     latest grant still lets them suggest on the page;
 *   - a decision row counts only when its created_by_id is the couple, the
 *     owner the hashes point to. A decision written by anyone else changes
 *     nothing: a collaborator's approve does not approve, and a collaborator's
 *     decline does not hide the suggestion;
 *   - an approve counts only when the item it names exists and was created by
 *     the couple. Checked before the couple's approve row is written, and again
 *     on every read.
 *
 * ── ACTIONS ─────────────────────────────────────────────────────────────────
 *
 * Collaborator (a grant from ownerUserId that lets them suggest on the page):
 *   GET  ?ownerUserId&page                    their own suggestions, with status
 *   POST { action: 'suggest',  ownerUserId, page, data }
 *   POST { action: 'edit',     ownerUserId, page, suggestionId, data }   own, pending
 *   POST { action: 'withdraw', ownerUserId, page, suggestionId }         own, pending
 * Couple (the caller is the owner):
 *   GET  ?page                                pending suggestions for their wedding
 *   POST { action: 'decide', page, suggestionId, decision: 'approve' | 'decline', itemId }
 *
 * Not configured (COLLAB_HASH_KEY or APP_ENC_KEY missing, as on Preview): a read
 * answers an empty list, calm; a write answers 503 with the ruled words. Every
 * failure says "That did not save. Try again." and logs no id.
 */

import crypto from 'crypto';
import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { getCollaborationFor, hasPagePermission, hashId, latestEvent, listGrantsForOwner } from './_lib/collaboratorAuth.js';
import { encKey } from './_lib/appKeys.js';
import { readOwnerScoped } from './collaborator-data.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const ENTITY = 'CollaboratorSuggestion';

export const SAVE_FAILED = 'That did not save. Try again.';
export const NOT_CONFIGURED = 'collaborator suggestions not configured';

/** The pages that take suggestions, the entity an approval creates, and the fields a suggestion may carry. */
export const SUGGEST_PAGES = {
  Moodboard: {
    entity: 'MoodboardItem',
    fields: ['title', 'image_url', 'source_url', 'category', 'tags', 'notes', 'board_name'],
  },
  Schedule: {
    entity: 'Schedule',
    fields: ['event_name', 'event_date', 'start_time', 'end_time', 'location', 'description', 'responsible_person', 'category', 'notes'],
  },
};

export function suggestionsConfigured() {
  return /^[0-9a-f]{64}$/i.test(process.env.COLLAB_HASH_KEY || '') && !!process.env.APP_ENC_KEY;
}

const aadFor = (row) => Buffer.from(`${row.owner_user_id_hash}:${row.collaborator_user_id_hash}:${row.page}`);

/** AES-256-GCM under APP_ENC_KEY, bound to the row's hashes and page. v1.<iv>.<tag>.<ct>, base64url. */
export function sealPayload(obj, row) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  cipher.setAAD(aadFor(row));
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), ct].map((p, i) => (i === 0 ? p : p.toString('base64url'))).join('.');
}

/** The payload, or null for anything that does not open under this row. */
export function openPayload(row) {
  try {
    const [v, iv, tag, ct] = String(row?.payload_enc || '').split('.');
    if (v !== 'v1' || !iv || !tag || !ct) return null;
    const d = crypto.createDecipheriv('aes-256-gcm', encKey(), Buffer.from(iv, 'base64url'));
    d.setAAD(aadFor(row));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8'));
  } catch {
    return null;
  }
}

/** Only the page's fields, only those present, strings trimmed. */
export function allowlisted(page, data) {
  const out = {};
  for (const f of SUGGEST_PAGES[page].fields) {
    if (!data || !Object.prototype.hasOwnProperty.call(data, f)) continue;
    const v = data[f];
    out[f] = typeof v === 'string' ? v.slice(0, 2000) : Array.isArray(v) ? v.slice(0, 20).map(x => String(x).slice(0, 60)) : v;
  }
  return out;
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function base44(method, path, token, body) {
  const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`Base44 ${method} failed (${res.status})`);
  return res.status === 204 ? null : res.json();
}

async function rowsForOwner(ownerHash, page) {
  const q = encodeURIComponent(JSON.stringify({ owner_user_id_hash: ownerHash, page }));
  return unwrapList(await base44('GET', `/entities/${ENTITY}?q=${q}`, process.env.BASE44_ADMIN_KEY))
    .filter(r => r.owner_user_id_hash === ownerHash && r.page === page && !r.is_test);
}

/** A suggest row counts only when its writer is the collaborator its hash names. */
const genuineSuggestion = (r) => r.event_type === 'suggest' && !!r.created_by_id && hashId(r.created_by_id) === r.collaborator_user_id_hash;

/**
 * The status of one suggestion: 'approved', 'declined' or 'pending'. Only
 * decision rows the couple wrote count; the latest counting one wins; an
 * approve counts only when its item is in `ownerItemIds` (the couple's own
 * items of the page's entity).
 */
export function statusOf(suggestion, rows, ownerUserId, ownerItemIds) {
  const decisions = rows
    .filter(r => (r.event_type === 'approve' || r.event_type === 'decline')
      && r.suggestion_id === suggestion.id && r.created_by_id === ownerUserId)
    .filter(r => {
      if (r.event_type !== 'approve') return true;
      const p = openPayload(r);
      return !!p?.itemId && ownerItemIds.has(p.itemId);
    });
  const latest = latestEvent(decisions);
  if (!latest) return 'pending';
  return latest.event_type === 'approve' ? 'approved' : 'declined';
}

function view(suggestion, status) {
  const p = openPayload(suggestion) || {};
  return { id: suggestion.id, status, from: p.from || 'A collaborator', data: p.data || {}, created_date: suggestion.created_date };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'collaborator-suggestions', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) return res.status(429).json({ error: SAVE_FAILED });

  const caller = await verifyBase44User(req);
  if (!caller) return res.status(401).json({ error: 'Authentication required.' });
  const callerToken = String(req.headers.authorization || '').replace(/^Bearer /, '');

  const src = req.method === 'GET' ? (req.query || {}) : (req.body || {});
  const page = typeof src.page === 'string' ? src.page : '';
  if (!Object.prototype.hasOwnProperty.call(SUGGEST_PAGES, page)) return res.status(400).json({ error: SAVE_FAILED });
  const ownerUserId = sanitizeString(src.ownerUserId || '');
  const action = req.method === 'GET' ? 'list' : String(src.action || '');

  if (!suggestionsConfigured()) {
    console.log(NOT_CONFIGURED);
    return req.method === 'GET' ? res.status(200).json({ suggestions: [] }) : res.status(503).json({ error: SAVE_FAILED });
  }

  try {
    // ── THE COUPLE ─────────────────────────────────────────────────────────
    if (!ownerUserId) {
      if (action !== 'list' && action !== 'decide') return res.status(400).json({ error: SAVE_FAILED });
      const ownerHash = hashId(caller.id);
      const rows = await rowsForOwner(ownerHash, page);
      const { entity } = SUGGEST_PAGES[page];
      const q = encodeURIComponent(JSON.stringify({ created_by_id: caller.id }));
      const mine = unwrapList(await base44('GET', `/entities/${entity}?q=${q}`, callerToken)).filter(r => r.created_by_id === caller.id);
      const ownerItemIds = new Set(mine.map(r => r.id));

      // A suggestion shows only while its writer can still suggest here.
      const grants = await listGrantsForOwner(caller.id, process.env.BASE44_ADMIN_KEY);
      const canSuggest = (collabHash) => {
        const latest = latestEvent(grants.filter(g => g.collaborator_user_id_hash === collabHash && !g.is_test));
        return latest?.event_type === 'grant' && hasPagePermission(latest.permissions, page, 'suggest');
      };
      const suggestions = rows.filter(r => genuineSuggestion(r) && canSuggest(r.collaborator_user_id_hash));

      if (action === 'list') {
        const pending = suggestions
          .map(s => ({ s, status: statusOf(s, rows, caller.id, ownerItemIds) }))
          .filter(x => x.status === 'pending')
          .map(x => view(x.s, x.status));
        return res.status(200).json({ suggestions: pending });
      }

      const suggestionId = sanitizeString(src.suggestionId || '');
      const decision = src.decision === 'approve' || src.decision === 'decline' ? src.decision : '';
      const s = suggestions.find(r => r.id === suggestionId);
      if (!s || !decision || statusOf(s, rows, caller.id, ownerItemIds) !== 'pending') return res.status(404).json({ error: SAVE_FAILED });
      const row = { owner_user_id_hash: ownerHash, collaborator_user_id_hash: s.collaborator_user_id_hash, page };
      if (decision === 'approve') {
        // The item must already exist and be the couple's own.
        const itemId = sanitizeString(src.itemId || '');
        if (!itemId || !ownerItemIds.has(itemId)) return res.status(409).json({ error: SAVE_FAILED });
        row.payload_enc = sealPayload({ itemId }, row);
      }
      await base44('POST', `/entities/${ENTITY}`, callerToken, { ...row, event_type: decision, suggestion_id: s.id });
      console.log(JSON.stringify({ fn: 'collaborator-suggestions', page, action: decision }));
      return res.status(200).json({ ok: true });
    }

    // ── THE COLLABORATOR ───────────────────────────────────────────────────
    const collaboration = await getCollaborationFor(caller.id, ownerUserId, process.env.BASE44_ADMIN_KEY);
    if (!collaboration || !hasPagePermission(collaboration.permissions, page, 'suggest')) {
      return res.status(403).json({ error: SAVE_FAILED });
    }
    const ownerHash = hashId(ownerUserId);
    const collabHash = hashId(caller.id);
    const rows = await rowsForOwner(ownerHash, page);
    const own = rows.filter(r => genuineSuggestion(r) && r.created_by_id === caller.id && r.collaborator_user_id_hash === collabHash);

    // The couple's items, through the hosted read, so an approve is checked here too.
    const { entity } = SUGGEST_PAGES[page];
    const ownerItems = (await readOwnerScoped({ callerToken, ownerUserId, page, entities: [entity] }))[entity] || [];
    const ownerItemIds = new Set(ownerItems.map(r => r.id));

    if (action === 'list') {
      return res.status(200).json({ suggestions: own.map(s => view(s, statusOf(s, rows, ownerUserId, ownerItemIds))) });
    }

    const row = { owner_user_id_hash: ownerHash, collaborator_user_id_hash: collabHash, page };
    if (action === 'suggest') {
      const data = allowlisted(page, src.data);
      if (!Object.keys(data).length) return res.status(400).json({ error: SAVE_FAILED });
      const from = String(caller.full_name || '').trim().split(/\s+/)[0] || 'A collaborator';
      await base44('POST', `/entities/${ENTITY}`, callerToken, { ...row, event_type: 'suggest', payload_enc: sealPayload({ from, data }, row) });
      console.log(JSON.stringify({ fn: 'collaborator-suggestions', page, action }));
      return res.status(200).json({ ok: true });
    }

    if (action === 'edit' || action === 'withdraw') {
      const suggestionId = sanitizeString(src.suggestionId || '');
      const s = own.find(r => r.id === suggestionId);
      if (!s || statusOf(s, rows, ownerUserId, ownerItemIds) !== 'pending') return res.status(404).json({ error: SAVE_FAILED });
      if (action === 'withdraw') {
        await base44('DELETE', `/entities/${ENTITY}/${s.id}`, callerToken);
      } else {
        const data = allowlisted(page, src.data);
        if (!Object.keys(data).length) return res.status(400).json({ error: SAVE_FAILED });
        const from = (openPayload(s) || {}).from || 'A collaborator';
        await base44('PUT', `/entities/${ENTITY}/${s.id}`, callerToken, { payload_enc: sealPayload({ from, data }, row) });
      }
      console.log(JSON.stringify({ fn: 'collaborator-suggestions', page, action }));
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: SAVE_FAILED });
  } catch {
    console.error(`[collaborator-suggestions] failed on ${page} ${action}`);
    return res.status(500).json({ error: SAVE_FAILED });
  }
}
