/**
 * GET /api/collaborator-data?ownerUserId=<id>&page=<permission key>
 *
 * Generic, read-only collaborator data endpoint covering every permission
 * key in COLLABORATOR_PAGE_MAP except 'Guests' and 'Budget', which keep
 * their own dedicated endpoints (collaborator-guests.js has real write
 * support already; collaborator-budget.js predates this file and there's
 * no reason to churn it). Adding a page here only ever means adding one
 * entry to collaboratorPageMap.js — no new endpoint file, no new
 * permission-check boilerplate to copy-paste and drift.
 *
 * Which Base44 entities `page` is allowed to read comes ONLY from
 * COLLABORATOR_PAGE_MAP, never from anything the client supplies — a
 * caller can't send `page=Music` and expect anything but Music's own
 * mapped entities back, and can't request an arbitrary entity name at all.
 *
 * WeddingDetails is a special case: it's one shared record with plenty of
 * fields no permission key covers (emergencyContacts, websitePassword,
 * dayVendorContacts, weddingPolicies…), so it's never returned whole.
 * `weddingDetailsFields` in the map is an explicit ALLOWLIST — only those
 * sub-fields are copied into the response, for the pages that declare it.
 *
 * OWNER-SCOPED ENTITIES go through the hosted function (item 7, PR 2). Nine
 * entities have owner-scoped read, and the admin key gets an empty list from
 * every one of them. base44/functions/collaboratorRead reads them with
 * asServiceRole, checking the grant again itself, and readOwnerScoped below is
 * the one caller. Open entities and WeddingDetails stay on the admin key.
 *
 * NOT CONFIGURED FAILS CALM (owner, 2026-10-12): with COLLAB_FN_SECRET or a
 * valid COLLAB_HASH_KEY missing, as on Preview, nothing is read and nothing is
 * called, the log says "collaborator reads not configured" with no ids, and
 * the page gets its empty lists: the calm empty state, never an error. A
 * failed function call is the same: its entities come back empty.
 *
 * Response: 200 { data: { [entityName]: [...], weddingDetails?: {...} }, coupleNames, canEdit }
 *        or 400 { error } if `page` isn't a real permission key
 *        or 403 { error } if not an accepted collaborator, or lacking view on this page
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { getCollaborationFor, hasPagePermission } from './_lib/collaboratorAuth.js';
import { excludeTestRecords } from './_lib/productData.js';
import { COLLABORATOR_PAGE_MAP } from '../src/lib/collaboratorPageMap.js';

import { coupleDisplayName } from './_lib/coupleNames.js';
import { TOO_MANY_TRIES, DID_NOT_GO_THROUGH } from './_lib/calmErrors.js';
const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

/** The nine entities whose read is owner-scoped; the admin key cannot read them. */
export const OWNER_SCOPED_ENTITIES = new Set([
  'Budget', 'Schedule', 'Music', 'Invitation', 'Table', 'VenueAsset', 'RegistryItem', 'Vendor', 'MoodboardItem',
]);

export const NOT_CONFIGURED = 'collaborator reads not configured';

/** Both secrets present, the hash key in its one valid shape. Read per call, never printed. */
export function collabReadsConfigured() {
  return !!process.env.COLLAB_FN_SECRET && /^[0-9a-f]{64}$/i.test(process.env.COLLAB_HASH_KEY || '');
}

/** Every entity a page reads, as an empty list: what a page shows when there is nothing to show. */
export function emptyLists(entities) {
  return Object.fromEntries(entities.filter(e => e !== 'WeddingDetails').map(e => [e, []]));
}

/**
 * The owner's rows of owner-scoped entities, through the hosted function, as
 * the collaborator. The caller's own token goes with it, so the function knows
 * who is asking from Base44 rather than from us. Any failure is logged without
 * ids and answers empty lists.
 */
export async function readOwnerScoped({ callerToken, ownerUserId, page, entities }) {
  const out = emptyLists(entities);
  if (!entities.length) return out;
  try {
    const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/functions/collaboratorRead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${callerToken}`,
        'X-Collab-Fn-Secret': process.env.COLLAB_FN_SECRET,
      },
      body: JSON.stringify({ ownerUserId, page }),
    });
    if (!res.ok) {
      console.error(`[collaborator-data] collaborator read failed (${res.status})`);
      return out;
    }
    const body = await res.json();
    for (const entity of entities) {
      if (Array.isArray(body?.data?.[entity])) out[entity] = body.data[entity];
    }
    return out;
  } catch {
    console.error('[collaborator-data] collaborator read failed');
    return out;
  }
}

async function adminFetch(path) {
  const res = await fetch(`${BASE44_API}${path}`, {
    headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 GET ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'collaborator-data', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: TOO_MANY_TRIES });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[collaborator-data] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const ownerUserId = sanitizeString(req.query?.ownerUserId || '');
  const page = sanitizeString(req.query?.page || '');
  if (!ownerUserId || !page) {
    return res.status(400).json({ error: 'ownerUserId and page are required' });
  }

  const pageConfig = COLLABORATOR_PAGE_MAP[page];
  if (!pageConfig) {
    return res.status(400).json({ error: 'Unknown page' });
  }

  // Before the grant check, which needs COLLAB_HASH_KEY: nothing is read.
  if (!collabReadsConfigured()) {
    console.log(NOT_CONFIGURED);
    return res.status(200).json({ data: emptyLists(pageConfig.entities), coupleNames: null, canEdit: false });
  }

  try {
    const collaboration = await getCollaborationFor(caller.id, ownerUserId, BASE44_ADMIN_KEY);
    if (!collaboration) {
      return res.status(403).json({ error: 'You are not an accepted collaborator on this wedding.' });
    }
    if (!hasPagePermission(collaboration.permissions, page, 'view')) {
      return res.status(403).json({ error: `You do not have permission to view ${page} for this wedding.` });
    }

    // AUDIT_2026-07.md S9: these entities are independent of each other and
    // of the WeddingDetails fetch below — fired in parallel instead of one
    // await per entity, since each round trip is otherwise fully serial for
    // no reason (Seating/Registry/Music pages have 3 entities each).
    const query = encodeURIComponent(JSON.stringify({ created_by_id: ownerUserId }));
    const entitiesToFetch = pageConfig.entities.filter(e => e !== 'WeddingDetails');
    const weddingQuery = encodeURIComponent(JSON.stringify({ created_by_id: ownerUserId }));

    const openEntities = entitiesToFetch.filter(e => !OWNER_SCOPED_ENTITIES.has(e));
    const scopedEntities = entitiesToFetch.filter(e => OWNER_SCOPED_ENTITIES.has(e));
    const callerToken = String(req.headers.authorization || '').replace(/^Bearer /, '');

    const [entityResults, scoped, weddings] = await Promise.all([
      Promise.all(openEntities.map(entity =>
        adminFetch(`/apps/${BASE44_APP_ID}/entities/${entity}?q=${query}`).then(unwrapList).then(excludeTestRecords)
      )),
      readOwnerScoped({ callerToken, ownerUserId, page, entities: scopedEntities }),
      adminFetch(`/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`).then(unwrapList).then(excludeTestRecords),
    ]);

    const data = { ...scoped };
    openEntities.forEach((entity, i) => { data[entity] = entityResults[i]; });
    const wedding = weddings.length > 0
      ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;
    const coupleNames = coupleDisplayName(wedding);

    if (pageConfig.weddingDetailsFields && wedding) {
      data.weddingDetails = {};
      for (const field of pageConfig.weddingDetailsFields) {
        data.weddingDetails[field] = wedding[field] ?? null;
      }
    }

    return res.status(200).json({
      data,
      coupleNames,
      canEdit: hasPagePermission(collaboration.permissions, page, 'edit'),
    });
  } catch (err) {
    console.error('[collaborator-data] Error:', err.message);
    return res.status(500).json({ error: DID_NOT_GO_THROUGH });
  }
}
