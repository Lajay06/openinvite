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
 * Response: 200 { data: { [entityName]: [...], weddingDetails?: {...} }, coupleNames, canEdit }
 *        or 400 { error } if `page` isn't a real permission key
 *        or 403 { error } if not an accepted collaborator, or lacking view on this page
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { getCollaborationFor, hasPagePermission } from './_lib/collaboratorAuth.js';
import { excludeTestRecords } from './_lib/productData.js';
import { COLLABORATOR_PAGE_MAP } from '../src/lib/collaboratorPageMap.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
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
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
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

    const [entityResults, weddings] = await Promise.all([
      Promise.all(entitiesToFetch.map(entity =>
        adminFetch(`/apps/${BASE44_APP_ID}/entities/${entity}?q=${query}`).then(unwrapList).then(excludeTestRecords)
      )),
      adminFetch(`/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`).then(unwrapList).then(excludeTestRecords),
    ]);

    const data = {};
    entitiesToFetch.forEach((entity, i) => { data[entity] = entityResults[i]; });
    const wedding = weddings.length > 0
      ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;
    const coupleNames = wedding?.coupleNames || [wedding?.couple1Name, wedding?.couple2Name].filter(Boolean).join(' & ') || '';

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
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
