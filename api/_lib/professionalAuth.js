/**
 * api/_lib/professionalAuth.js
 *
 * EVERY PROFESSIONAL ENDPOINT ASKS THIS FILE, AND ONLY THIS FILE, WHETHER THE
 * CALLER MAY DO WHAT THEY ASKED. goals/2026-10-14-professional.md, Team and
 * access: "server-side role checks on every endpoint".
 *
 * The roles table is src/lib/professionalAccess.js, the same one the Team page
 * reads its words from, so the server and the screen cannot disagree. This
 * file maps a request (collection, operation, the fields it touches) to an
 * area of that table. A collection or operation it does not name is refused:
 * the default is no.
 */
import { can, ROLES } from '../../src/lib/professionalAccess.js';

/** On in preview and wherever the owner sets PROFESSIONAL=1; off in production until then. */
export function professionalOnServer(env = process.env) {
  return env.PROFESSIONAL === '1' || env.VERCEL_ENV === 'preview';
}

/**
 * Collection to areas. `scope: 'event'` collections are checked against the
 * row's event; `scope: 'workspace'` against the workspace.
 * `tick` names the only fields a tick-only role may change.
 */
export const AREA_MAP = {
  ProEvent: { scope: 'event', read: 'event.view', write: 'event.edit', create: 'workspace.events.create' },
  RunSheetRow: { scope: 'event', read: 'runsheet.view', write: 'runsheet.edit', tick: { area: 'runsheet.tick', fields: ['status'] } },
  ProGuest: { scope: 'event', read: 'guests.view', write: 'guests.edit' },
  ProTask: { scope: 'event', read: 'tasks.view', write: 'tasks.edit' },
  ProVendorBooking: { scope: 'event', read: 'vendors.view', write: 'vendors.edit' },
  PaymentDue: { scope: 'event', read: 'money.view', write: 'money.edit' },
  ProCost: { scope: 'event', read: 'money.view', write: 'money.edit' },
  ProQuestionnaire: { scope: 'event', read: 'questionnaires.edit', write: 'questionnaires.edit' },
  ProDocument: { scope: 'event', read: 'documents.view', write: 'documents.edit' },
  ProNote: { scope: 'event', read: 'notes.view', write: 'notes.edit' },
  PlannerLink: { scope: 'event', read: 'guests.view', write: 'link.invite' },
  VendorContact: { scope: 'workspace', read: 'workspace.templates', write: 'workspace.templates', readAlso: 'vendors.view' },
  ProTemplate: { scope: 'workspace', read: 'workspace.templates', write: 'workspace.templates' },
  ProMember: { scope: 'workspace', read: 'workspace.team', write: 'workspace.team' },
  PartnerCode: { scope: 'workspace', read: 'workspace.codes', write: 'workspace.codes' },
  PartnerReward: { scope: 'workspace', read: 'workspace.codes', write: null },
  ProWorkspace: { scope: 'workspace', read: 'workspace.billing', write: 'workspace.billing' },
};

export const OPS = ['list', 'get', 'create', 'update', 'remove'];

/**
 * The area a request needs, or null when nothing may do it.
 * An update that only changes tick fields needs only the tick area.
 */
export function areaFor(collection, op, patch = null) {
  const m = AREA_MAP[collection];
  if (!m || !OPS.includes(op)) return null;
  if (op === 'list' || op === 'get') return m.read;
  if (op === 'create' && m.create) return m.create;
  if (op === 'update' && m.tick && patch && Object.keys(patch).length && Object.keys(patch).every((k) => m.tick.fields.includes(k))) return m.tick.area;
  return m.write || null;
}

/**
 * The decision. `member` is the caller's live ProMember row (resolved
 * server-side from their token, never from the request), `event` the row's
 * event when the collection is event-scoped.
 */
export function authorize({ member, collection, op, patch = null, event = null }) {
  const area = areaFor(collection, op, patch);
  if (!area || !member) return { ok: false, status: 403 };
  const m = AREA_MAP[collection];
  if (m.scope === 'event' && !event && op !== 'list') return { ok: false, status: 404 };
  const allowed = can(member, area, m.scope === 'event' ? event : null)
    || (m.readAlso && (op === 'list' || op === 'get') && can(member, m.readAlso, event));
  return allowed ? { ok: true, area } : { ok: false, status: 403 };
}

/**
 * The caller's membership, from the append-only ProMember log: the newest
 * row per member decides, and a "remove" ends it. Matched on the caller's
 * hashed user id, or on the hashed email for an invite not yet accepted.
 */
export function liveMember(rows, { userHash, emailHash }) {
  const latest = new Map();
  for (const r of rows || []) {
    const key = r.member_email_hash || r.member_user_id_hash;
    const prev = latest.get(key);
    if (!prev || String(r.created_date) > String(prev.created_date)) latest.set(key, r);
  }
  for (const r of latest.values()) {
    if (r.event_type === 'remove' || !ROLES[r.role]) continue;
    if ((userHash && r.member_user_id_hash === userHash) || (emailHash && r.member_email_hash === emailHash && r.event_type !== 'remove')) return r;
  }
  return null;
}
