/**
 * base44/functions/collaboratorWrite/entry.ts
 *
 * A COLLABORATOR WITH EDIT ON A PAGE CHANGES THE OWNER'S ROWS ON THAT PAGE,
 * AND NOTHING ELSE.
 *
 * Item 7's writes, goals/2026-10-10-collaborators-safe-and-truthful.md. The
 * owner-scoped entities refuse every write that is not the owner's own, so
 * asServiceRole, which exists only inside a Base44-hosted function, is the one
 * write path that does not widen RLS. base44/functions/collaboratorRead stays
 * read only; this is its write twin, on the same conditions (owner, 2026-10-12):
 *
 * 1. The grant is checked on EVERY call, from the forwarded token's own
 *    identity (auth.me()), never from the body. The latest CollaboratorGrant
 *    event for that owner and that collaborator must be a grant with edit on
 *    the page, and the page must be on EDIT_PAGES, which mirrors
 *    COLLABORATOR_EDIT_PAGES in src/lib/collaboratorPageMap.js.
 * 2. Only the page's allowlisted fields are written. An update or delete
 *    touches a row only after reading it and finding it is the owner's.
 * 3. It logs counts and outcomes, never ids.
 * 4. Both secrets are required, and X-Collab-Fn-Secret must match, so only
 *    api/collaborator-write.js can call it.
 *
 * A CREATE CHECKS ITS OWN STAMP. The row is created with created_by_id set to
 * the owner and read back. If Base44 stamped anyone else, the row is deleted
 * at once, by its id, and the call answers 409: a row the owner cannot see is
 * never left behind.
 *
 * ── THE PROBE, AND ITS ONE EXCEPTION (owner ruling 2026-10-13) ──────────────
 *
 * action "probe" is the only action without the secret header. It requires
 * auth.me().role === 'admin', acts only on RlsExperimentThrowaway, creates one
 * row asking for a created_by_id that is not the caller, reads back what
 * Base44 stamped, deletes that row by its id, and answers booleans only. A
 * follow-up PR removes it as soon as the owner reports the result.
 *
 * Deploy, owner only: `base44 functions deploy collaboratorWrite` with the app
 * id. Never a bare `base44 deploy`.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@^0.8.48';
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Pages a collaborator may change, and the one entity and the fields each writes. */
export const EDIT_PAGES: Record<string, { entity: string; fields: string[] }> = {
  Schedule: {
    entity: 'Schedule',
    fields: ['event_name', 'event_date', 'start_time', 'end_time', 'location', 'description', 'responsible_person', 'category', 'notes'],
  },
};

export const ACTIONS = ['create', 'update', 'delete'];
export const NOT_CONFIGURED = 'collaborator writes not configured';
export const PROBE_ENTITY = 'RlsExperimentThrowaway';

type Deps = {
  client: any;
  getSecret: (name: string) => string | undefined | Promise<string | undefined>;
  log: (line: string) => void;
  randomId?: () => string;
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

function sameSecret(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** collaboratorAuth.js latestEvent: latest created_date wins, a tie goes to the revoke. */
export function latestEvent(rows: any[]): any {
  return rows.reduce((best: any, r: any) => {
    if (!best) return r;
    const a = new Date(r.created_date).getTime();
    const b = new Date(best.created_date).getTime();
    if (a > b) return r;
    if (a === b && r.event_type === 'revoke') return r;
    return best;
  }, null);
}

/** Only the page's allowlisted fields, and only those present. */
export function allowlisted(page: string, data: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of EDIT_PAGES[page].fields) if (data && Object.hasOwn(data, f)) out[f] = data[f];
  return out;
}

async function rowById(client: any, entity: string, id: string): Promise<any> {
  const rows: any[] = await client.asServiceRole.entities[entity].filter({ id });
  return (rows || []).find((r: any) => r?.id === id) || null;
}

/** The admin-only probe: one throwaway row, its stamp read back, deleted by id, booleans out. */
async function probe(client: any, me: any, log: (l: string) => void, randomId: () => string): Promise<Response> {
  if (me?.role !== 'admin') return json(403, { error: 'Forbidden' });
  const requested = `probe-not-a-user-${randomId()}`;
  const entity = client.asServiceRole.entities[PROBE_ENTITY];
  const created = await entity.create({ marker: 'create-stamp probe', created_by_id: requested });
  let back: any = null;
  try { back = created?.id ? await rowById(client, PROBE_ENTITY, created.id) : null; } finally {
    if (created?.id) await entity.delete(created.id);
  }
  const stamped = back?.created_by_id ?? created?.created_by_id ?? null;
  const result = {
    honored_requested_owner: stamped === requested,
    stamped_as_caller: stamped === me.id,
    stamped_anonymous: stamped === 'anonymous',
    stamped_something_else: !!stamped && stamped !== requested && stamped !== me.id && stamped !== 'anonymous',
    row_deleted: !!created?.id,
  };
  log(JSON.stringify({ fn: 'collaboratorWrite', action: 'probe', ...result }));
  return json(200, result);
}

export async function handle(req: Request, { client, getSecret, log, randomId = () => crypto.randomUUID() }: Deps): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  let body: any = {};
  try { body = await req.json(); } catch { /* refused below */ }

  // The one exception to the header, and only for the admin.
  if (body?.action === 'probe') {
    let me: any = null;
    try { me = await client.auth.me(); } catch { /* refused in probe */ }
    return probe(client, me, log, randomId);
  }

  const fnSecret = String((await getSecret('COLLAB_FN_SECRET')) || '');
  const hashKey = String((await getSecret('COLLAB_HASH_KEY')) || '');
  if (!fnSecret || !/^[0-9a-f]{64}$/i.test(hashKey)) {
    log(NOT_CONFIGURED);
    return json(503, { error: 'Not configured' });
  }
  if (!sameSecret(req.headers.get('X-Collab-Fn-Secret') || '', fnSecret)) {
    return json(401, { error: 'Unauthorized' });
  }

  const ownerUserId = typeof body?.ownerUserId === 'string' ? body.ownerUserId.trim() : '';
  const page = typeof body?.page === 'string' ? body.page : '';
  const action = typeof body?.action === 'string' ? body.action : '';
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!ownerUserId || ownerUserId.length > 100 || !Object.hasOwn(EDIT_PAGES, page) || !ACTIONS.includes(action)) {
    return json(400, { error: 'Bad request' });
  }
  if (action !== 'create' && (!id || id.length > 100)) return json(400, { error: 'Bad request' });

  // Condition 1: who is asking comes from Base44, never from the body.
  let me: any = null;
  try { me = await client.auth.me(); } catch { /* refused below */ }
  if (!me?.id) return json(401, { error: 'Unauthorized' });
  if (me.id === ownerUserId) return json(403, { error: 'Forbidden' });

  const hash = (raw: string) => createHmac('sha256', hashKey).update(String(raw)).digest('hex');
  const ownerHash = hash(ownerUserId);
  const collabHash = hash(me.id);
  const grants: any[] = await client.asServiceRole.entities.CollaboratorGrant.filter({
    owner_user_id_hash: ownerHash, collaborator_user_id_hash: collabHash,
  });
  const latest = latestEvent((grants || []).filter((r: any) =>
    r.owner_user_id_hash === ownerHash && r.collaborator_user_id_hash === collabHash && !r.is_test));
  if (latest?.event_type !== 'grant' || !latest.permissions?.[page]?.edit) return json(403, { error: 'Forbidden' });

  // Condition 2: the page's one entity, its allowlisted fields, the owner's rows only.
  const { entity } = EDIT_PAGES[page];
  const api = client.asServiceRole.entities[entity];
  const data = allowlisted(page, body?.data);

  if (action === 'create') {
    if (!Object.keys(data).length) return json(400, { error: 'Bad request' });
    const created = await api.create({ ...data, created_by_id: ownerUserId });
    const back = created?.id ? await rowById(client, entity, created.id) : null;
    if (!back || back.created_by_id !== ownerUserId) {
      if (created?.id) await api.delete(created.id);
      log(JSON.stringify({ fn: 'collaboratorWrite', page, action, outcome: 'not stamped as the owner, removed' }));
      return json(409, { error: 'Not stamped' });
    }
    log(JSON.stringify({ fn: 'collaboratorWrite', page, action, outcome: 'ok', fields: Object.keys(data).length }));
    return json(200, { ok: true });
  }

  const row = await rowById(client, entity, id);
  if (!row || row.created_by_id !== ownerUserId || row.is_test) return json(404, { error: 'Not found' });
  if (action === 'update') {
    if (!Object.keys(data).length) return json(400, { error: 'Bad request' });
    await api.update(id, data);
  } else {
    await api.delete(id);
  }
  log(JSON.stringify({ fn: 'collaboratorWrite', page, action, outcome: 'ok', fields: Object.keys(data).length }));
  return json(200, { ok: true });
}

/** Builder functions read Deno.env; CLI functions read base44:runtime. Either, never printed. */
async function getSecret(name: string): Promise<string | undefined> {
  const fromEnv = (globalThis as any).Deno?.env?.get(name);
  if (fromEnv) return fromEnv;
  try {
    // Built at run time so a builder deploy never tries to resolve it.
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
      console.log(JSON.stringify({ fn: 'collaboratorWrite', error: 'write failed' }));
      return json(500, { error: 'Write failed' });
    }
  });
}
