/**
 * base44/functions/collaboratorRead/entry.ts
 *
 * A COLLABORATOR READS THE OWNER'S OWNER-SCOPED ROWS, AND NOTHING ELSE.
 *
 * Item 7 of goals/2026-10-10-collaborators-safe-and-truthful.md. Nine entities
 * have owner-scoped read (create null; read, update and delete
 * {created_by_id: "{{user.id}}"}), so the admin key that api/collaborator-data.js
 * reads with gets an empty list from every one of them, and collaborators saw
 * empty pages. asServiceRole is the only read that passes that rule without
 * widening it, and it exists only inside a Base44-hosted function
 * (BASE44_PLATFORM_NOTES.md, "Hosted functions"). This is that function. It
 * reads; it never writes.
 *
 * ── OWNER CONDITIONS, 2026-10-12 ────────────────────────────────────────────
 *
 * 1. It verifies the collaborator's grant on EVERY call and never trusts the
 *    caller's claim. The collaborator is whoever Base44 says the forwarded
 *    token belongs to (auth.me()), not anything in the body. ownerUserId is
 *    only a lookup key: the latest CollaboratorGrant event for that owner and
 *    that collaborator must be a grant with view on the page.
 * 2. It reads only through the field allowlist below. System fields other
 *    than id, created_date and updated_date never leave it, nor does any field
 *    a schema push adds before this list does.
 * 3. It logs counts, never ids.
 * 4. Its two secrets, COLLAB_FN_SECRET and COLLAB_HASH_KEY, are set by the
 *    owner with `base44 secrets set` and are never printed. COLLAB_FN_SECRET
 *    must arrive in the X-Collab-Fn-Secret header, so only the Vercel caller
 *    (api/collaborator-data.js, PR 2) can call this, never a browser.
 *    COLLAB_HASH_KEY is the key api/_lib/collaboratorAuth.js hashes with.
 *
 * Missing either secret is a 503 that says "not configured", and nothing is
 * read.
 *
 * ── DEPLOYING ───────────────────────────────────────────────────────────────
 *
 * Owner only, and only this function: `base44 functions deploy collaboratorRead`
 * with the app id. NEVER a bare `base44 deploy`, which pushes the entity
 * mirrors and the site as well. The file is self-contained, so it can also be
 * deployed through the platform's redeploy-function route as one source.
 *
 * ── KEEPING IN STEP ─────────────────────────────────────────────────────────
 *
 * PAGE_ENTITIES mirrors the owner-scoped entities of src/lib/collaboratorPageMap.js,
 * ENTITY_FIELDS mirrors base44/entities/*.jsonc, and the grant rules mirror
 * collaboratorAuth.js's latestEvent and hasPagePermission. A Deno function
 * cannot import those files, so tests/persistence/collaborator-read-function.mjs
 * fails when any of them drifts.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@^0.8.48';
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Permission key to the owner-scoped entities its page reads. Open entities stay with the admin-key read. */
export const PAGE_ENTITIES: Record<string, string[]> = {
  Dashboard: ['Budget', 'Schedule'],
  Budget: ['Budget'],
  Schedule: ['Schedule'],
  Music: ['Music'],
  Invitations: ['Invitation'],
  Seating: ['Table', 'VenueAsset'],
  Registry: ['RegistryItem'],
  Vendors: ['Vendor'],
  Moodboard: ['MoodboardItem'],
};

/** Every field a collaborator may receive, per entity: its declared fields, nothing more. */
export const ENTITY_FIELDS: Record<string, string[]> = {
  Budget: ['category', 'item_name', 'budgeted_amount', 'actual_amount', 'vendor', 'paid', 'payment_date', 'notes'],
  Schedule: ['event_name', 'event_date', 'start_time', 'end_time', 'location', 'description', 'responsible_person', 'category', 'notes'],
  Music: ['song_title', 'artist', 'sourceSongRequestId', 'spotify_track_id', 'source', 'embed_url', 'album', 'duration', 'preview_url', 'image_url', 'category', 'added_by', 'guest_suggestion', 'approved', 'notes', 'playlist', 'categoryOther'],
  Invitation: ['couple_names', 'wedding_date', 'rsvp_deadline', 'custom_message', 'personalized_messages', 'design', 'enabled_sections'],
  Table: ['name', 'capacity', 'shape', 'x', 'y', 'rotation', 'assigned_guests', 'event_id'],
  VenueAsset: ['name', 'type', 'x', 'y', 'width', 'height', 'rotation', 'event_id'],
  RegistryItem: ['store_name', 'url', 'description', 'image_url'],
  Vendor: ['name', 'category', 'contact_person', 'phone', 'email', 'website', 'address', 'latitude', 'longitude', 'rating', 'price_range', 'status', 'quoted_price', 'contract_date', 'payment_schedule', 'notes', 'google_place_id', 'google_rating', 'google_reviews_count', 'image_url', 'is_favourite', 'instagram', 'reviews_count', 'starting_price', 'package_selected', 'hours_booked', 'booking_date', 'start_time', 'end_time', 'meeting_date', 'contract_signed', 'deposit_paid', 'deposit_amount', 'style', 'portfolio_url', 'sample_work', 'services_offered', 'equipment', 'backup_equipment', 'second_shooter', 'delivery_timeline', 'image_count', 'video_length', 'editing_style', 'travel_fee', 'cancellation_policy', 'special_requests'],
  MoodboardItem: ['title', 'image_url', 'source_url', 'category', 'tags', 'notes', 'board_name', 'position_x', 'position_y', 'pinterest_id'],
};

export const SYSTEM_FIELDS = ['id', 'created_date', 'updated_date'];
export const MAX_ROWS = 1000;
export const NOT_CONFIGURED = 'collaborator reads not configured';

type Deps = {
  client: any;
  getSecret: (name: string) => string | undefined | Promise<string | undefined>;
  log: (line: string) => void;
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

/** Only the allowlisted fields of one row. */
export function project(entity: string, row: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of [...SYSTEM_FIELDS, ...ENTITY_FIELDS[entity]]) if (f in row) out[f] = row[f];
  return out;
}

export async function handle(req: Request, { client, getSecret, log }: Deps): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const fnSecret = String((await getSecret('COLLAB_FN_SECRET')) || '');
  const hashKey = String((await getSecret('COLLAB_HASH_KEY')) || '');
  if (!fnSecret || !/^[0-9a-f]{64}$/i.test(hashKey)) {
    log(NOT_CONFIGURED);
    return json(503, { error: 'Not configured' });
  }
  if (!sameSecret(req.headers.get('X-Collab-Fn-Secret') || '', fnSecret)) {
    return json(401, { error: 'Unauthorized' });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* refused below */ }
  const ownerUserId = typeof body?.ownerUserId === 'string' ? body.ownerUserId.trim() : '';
  const page = typeof body?.page === 'string' ? body.page : '';
  if (!ownerUserId || ownerUserId.length > 100 || !Object.hasOwn(PAGE_ENTITIES, page)) {
    return json(400, { error: 'Bad request' });
  }

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
  const perm = latest?.event_type === 'grant' ? latest.permissions?.[page] : null;
  if (!perm || !(perm.view || perm.edit)) return json(403, { error: 'Forbidden' });

  // Condition 2: the owner's rows only, test rows out, allowlisted fields only.
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const entity of PAGE_ENTITIES[page]) {
    const rows: any[] = await client.asServiceRole.entities[entity].filter({ created_by_id: ownerUserId }, '-created_date', MAX_ROWS);
    const kept = (rows || []).filter((r: any) => r?.created_by_id === ownerUserId && !r?.is_test);
    data[entity] = kept.map((r: any) => project(entity, r));
    counts[entity] = kept.length;
  }

  // Condition 3: counts, never ids.
  log(JSON.stringify({ fn: 'collaboratorRead', page, counts }));
  return json(200, { data });
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
      console.log(JSON.stringify({ fn: 'collaboratorRead', error: 'read failed' }));
      return json(500, { error: 'Read failed' });
    }
  });
}
