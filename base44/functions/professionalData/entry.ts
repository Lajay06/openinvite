/**
 * base44/functions/professionalData/entry.ts
 *
 * THE ONE ROAD TO PRO ROWS. goals/2026-10-14-professional.md, item 0: rows stay
 * owned by their owner's account, RLS is never opened, and access across a
 * team goes through a server that checks a grant. Every Pro entity is
 * owner-scoped on all four operations, so this asServiceRole function is the
 * only reader and writer, called only by api/professional/data.js.
 *
 * ── WHAT IT CHECKS, ON EVERY CALL ──────────────────────────────────────────
 *
 * 1. PRO_FN_SECRET in the X-Pro-Fn-Secret header: only the Vercel server can
 *    call it, never a browser.
 * 2. The caller is whoever Base44 says the forwarded token belongs to
 *    (auth.me()), hashed with APP_HASH_KEY, and must be a live member of the
 *    workspace named (the newest ProMember row for them is not a remove).
 *    The ROLE check is api/_lib/professionalAuth.js, before this is called;
 *    this function re-checks only membership, so a leaked secret alone still
 *    cannot read a workspace the token's owner is not on.
 * 3. Every row it returns or touches belongs to that workspace: directly
 *    (workspace_id) or through its event.
 * 4. Only the collections below. It logs counts, never ids or content.
 *
 * Missing either secret is a 503, and nothing is read.
 *
 * ── DEPLOYING ──────────────────────────────────────────────────────────────
 *
 * Owner only: `base44 functions deploy professionalData` with the app id,
 * after the entities in goals/2026-10-14-professional-item0.md exist and
 * `base44 secrets set` has PRO_FN_SECRET and APP_HASH_KEY. NEVER a bare
 * `base44 deploy`.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@^0.8.48';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const EVENT_SCOPED = ['ProEvent', 'RunSheetRow', 'ProGuest', 'ProTask', 'ProVendorBooking', 'PaymentDue', 'ProCost', 'ProQuestionnaire', 'ProDocument', 'ProNote', 'PlannerLink'];
export const WORKSPACE_SCOPED = ['ProWorkspace', 'ProMember', 'VendorContact', 'ProTemplate', 'PartnerCode', 'PartnerReward'];
export const COLLECTIONS = [...EVENT_SCOPED, ...WORKSPACE_SCOPED];
export const OPS = ['members', 'bootstrap', 'list', 'get', 'create', 'update', 'remove'];
export const MAX_ROWS = 2000;

type Deps = { client: any; getSecret: (n: string) => string | undefined | Promise<string | undefined>; log: (l: string) => void };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
function sameSecret(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** professionalAuth.js liveMember, for one user hash. */
export function isLiveMember(rows: any[], userHash: string): boolean {
  const mine = (rows || []).filter((r: any) => r.member_user_id_hash === userHash && !r.is_test);
  if (!mine.length) return false;
  const latest = mine.reduce((a: any, b: any) => (String(b.created_date) > String(a.created_date) ? b : a));
  return latest.event_type !== 'remove';
}

export async function handle(req: Request, { client, getSecret, log }: Deps): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const fnSecret = String((await getSecret('PRO_FN_SECRET')) || '');
  const hashKey = String((await getSecret('APP_HASH_KEY')) || '');
  if (!fnSecret || !hashKey) { log('professionalData not configured'); return json(503, { error: 'Not configured' }); }
  if (!sameSecret(req.headers.get('X-Pro-Fn-Secret') || '', fnSecret)) return json(401, { error: 'Unauthorized' });

  let body: any = {};
  try { body = await req.json(); } catch { /* refused below */ }
  const op = String(body?.op || '');
  const workspaceId = String(body?.workspace_id || '');
  const collection = String(body?.collection || '');
  if (!OPS.includes(op) || (op !== 'bootstrap' && !workspaceId) || (['list', 'get', 'create', 'update', 'remove'].includes(op) && !COLLECTIONS.includes(collection))) {
    return json(400, { error: 'Bad request' });
  }

  let me: any = null;
  try { me = await client.auth.me(); } catch { /* refused below */ }
  if (!me?.id) return json(401, { error: 'Unauthorized' });
  const userHash = createHmac('sha256', hashKey).update(String(me.id)).digest('hex');
  const db = client.asServiceRole.entities;

  if (op === 'bootstrap') {
    // A new professional account's first workspace, owned by them, with them as owner.
    const existing = (await db.ProWorkspace.filter({ owner_user_id_hash: userHash })) || [];
    if (existing.length) return json(200, { workspace_id: existing[0].id });
    const ws = await db.ProWorkspace.create({ owner_user_id_hash: userHash, name: String(body?.name || 'My workspace').slice(0, 120), plan: 'trial', plan_status: 'trialing', event_limit: 2, seat_limit: 1, trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(), is_test: false });
    await db.ProMember.create({ workspace_id: ws.id, member_user_id_hash: userHash, member_email_hash: createHmac('sha256', hashKey).update(String(me.email || '').toLowerCase()).digest('hex'), role: 'owner', assigned_event_ids: [], event_type: 'accept', is_test: false });
    log(JSON.stringify({ fn: 'professionalData', op }));
    return json(200, { workspace_id: ws.id });
  }

  const members: any[] = (await db.ProMember.filter({ workspace_id: workspaceId }, '-created_date', MAX_ROWS)) || [];
  if (!isLiveMember(members, userHash)) return json(403, { error: 'Forbidden' });
  if (op === 'members') return json(200, { rows: members.filter((r: any) => !r.is_test) });

  const events: any[] = (await db.ProEvent.filter({ workspace_id: workspaceId }, '-created_date', MAX_ROWS)) || [];
  const eventIds = new Set(events.map((e: any) => e.id));
  const inWorkspace = (row: any) => {
    if (!row) return false;
    if (collection === 'ProEvent' || WORKSPACE_SCOPED.includes(collection)) return collection === 'ProWorkspace' ? row.id === workspaceId : row.workspace_id === workspaceId;
    return eventIds.has(row.event_id);
  };

  if (op === 'list') {
    const filter = collection === 'ProWorkspace' ? { id: workspaceId }
      : EVENT_SCOPED.includes(collection) && collection !== 'ProEvent' ? (body.event_id ? { event_id: String(body.event_id) } : null)
      : { workspace_id: workspaceId };
    let rows: any[] = [];
    if (filter) rows = (await db[collection].filter(filter, '-created_date', MAX_ROWS)) || [];
    else for (const id of eventIds) rows.push(...((await db[collection].filter({ event_id: id }, '-created_date', MAX_ROWS)) || []));
    const kept = rows.filter(inWorkspace).filter((r: any) => !r.is_test);
    log(JSON.stringify({ fn: 'professionalData', op, collection, count: kept.length }));
    return json(200, { rows: kept });
  }

  const id = String(body?.id || '');
  if (op === 'get' || op === 'update' || op === 'remove') {
    const found = id ? ((await db[collection].filter({ id })) || [])[0] : null;
    if (!inWorkspace(found)) return json(op === 'get' ? 200 : 404, op === 'get' ? { row: null } : { error: 'Not found' });
    if (op === 'get') return json(200, { row: found });
    if (op === 'remove') { await db[collection].delete(id); log(JSON.stringify({ fn: 'professionalData', op, collection })); return json(200, { ok: true }); }
    const updated = await db[collection].update(id, body.data || {});
    log(JSON.stringify({ fn: 'professionalData', op, collection }));
    return json(200, { row: updated });
  }

  // create: the new row must land inside this workspace.
  const data = { ...(body.data || {}), is_test: false };
  if (collection !== 'ProEvent' && EVENT_SCOPED.includes(collection) && !eventIds.has(data.event_id)) return json(404, { error: 'Not found' });
  if (WORKSPACE_SCOPED.includes(collection) || collection === 'ProEvent') data.workspace_id = workspaceId;
  const row = await db[collection].create(data);
  log(JSON.stringify({ fn: 'professionalData', op, collection }));
  return json(200, { row });
}

async function getSecret(name: string): Promise<string | undefined> {
  const fromEnv = (globalThis as any).Deno?.env?.get(name);
  if (fromEnv) return fromEnv;
  try {
    const specifier = ['base44', 'runtime'].join(':');
    const runtime: any = await import(specifier);
    return runtime.secrets.get(name);
  } catch {
    return undefined;
  }
}

const deno = (globalThis as any).Deno;
if (deno && typeof deno.serve === 'function') {
  deno.serve(async (req: Request) => {
    try {
      return await handle(req, { client: createClientFromRequest(req), getSecret, log: (l) => console.log(l) });
    } catch {
      console.log(JSON.stringify({ fn: 'professionalData', error: 'failed' }));
      return json(500, { error: 'Failed' });
    }
  });
}
