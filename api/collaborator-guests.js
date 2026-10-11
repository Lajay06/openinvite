/**
 * /api/collaborator-guests: GET (view), PUT and DELETE (refused)
 *
 * An accepted collaborator with view on 'Guests' reads that owner's guest
 * list. Item 6 of goals/2026-10-10-collaborators-safe-and-truthful.md.
 *
 * WHY GET WORKS NOW. This endpoint returned 503 to everything, parked when
 * Guest.read was briefly owner-scoped (fix/guest-rls-step1), which the admin
 * key cannot satisfy. Guest.read is open (null) in the live schema, verified
 * again on 2026-10-10, so the admin-key read below works. Every request is
 * still checked here: the caller's own bearer token, their current grant for
 * ownerUserId through CollaboratorGrant (never a client-claimed permission;
 * see api/_lib/collaboratorAuth.js), then view on 'Guests'.
 *
 * WHAT A COLLABORATOR RECEIVES is what the owner's own read returns
 * (api/my-guests.js) and nothing more: that owner's rows only, is_test rows
 * excluded, PII resolved through mergeGuestPii exactly as the owner's read
 * resolves it, and every derived field removed. That means the six RSVP token
 * columns and the encrypted blob are gone, with has_rsvp_token kept as the
 * owner's read keeps it. A collaborator never holds a live RSVP capability.
 *
 * WHY PUT AND DELETE ARE REFUSED. Guest update and delete are owner-scoped,
 * so the admin key gets a flat 403 from Base44, and an admin-key create would
 * stamp created_by_id as 'anonymous', invisible to the owner and undeletable.
 * A collaborator write path needs a Base44 hosted function using
 * asServiceRole (BASE44_PLATFORM_NOTES.md, "Hosted functions"). That is
 * phase 2 (item 7). Until then both methods answer 403 with the ruled copy,
 * and the old unreachable write code is gone rather than kept as a shape that
 * could never run.
 *
 * Query: ownerUserId (the wedding owner's Base44 User.id), since a
 * collaborator may help more than one couple.
 * Response: 200 { guests, coupleNames, canEdit: false }
 *        or 401, 403, 400, 405, 429, 500 { error }
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { getCollaborationFor, hasPagePermission } from './_lib/collaboratorAuth.js';
import { excludeTestRecords } from './_lib/productData.js';
import { mergeGuestPii } from './_lib/guestPii.js';
import { DERIVED_FIELDS } from './_lib/guestProtectedFields.js';
import { coupleDisplayName } from './_lib/coupleNames.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const PAGE = 'Guests';
export const READ_ONLY_MESSAGE = 'Collaborators can view the guest list but not change it.';

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function adminGet(path, adminKey) {
  const res = await fetch(`${BASE44_API}${path}`, {
    headers: { Authorization: `Bearer ${adminKey}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 GET ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

/** The owner's read, minus every derived field: tokens and the blob never leave the server. */
function forCollaborator(guest) {
  const out = { ...mergeGuestPii(guest), has_rsvp_token: !!guest.rsvp_link_id_enc };
  for (const f of DERIVED_FIELDS) delete out[f];
  return out;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'collaborator-guests', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  // Phase 1 is view only, whatever the grant says. See the header.
  if (req.method !== 'GET') {
    return res.status(403).json({ error: READ_ONLY_MESSAGE });
  }

  const adminKey = process.env.BASE44_ADMIN_KEY;
  if (!adminKey) {
    console.error('[collaborator-guests] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const ownerUserId = sanitizeString(req.query?.ownerUserId || '');
  if (!ownerUserId) {
    return res.status(400).json({ error: 'ownerUserId is required' });
  }

  try {
    const collaboration = await getCollaborationFor(caller.id, ownerUserId, adminKey);
    if (!collaboration) {
      return res.status(403).json({ error: 'You are not an accepted collaborator on this wedding.' });
    }
    if (!hasPagePermission(collaboration.permissions, PAGE, 'view')) {
      return res.status(403).json({ error: 'You do not have permission to view guests for this wedding.' });
    }

    const query = encodeURIComponent(JSON.stringify({ created_by_id: ownerUserId }));
    const [rows, weddings] = await Promise.all([
      adminGet(`/apps/${BASE44_APP_ID}/entities/Guest?q=${query}`, adminKey).then(unwrapList),
      adminGet(`/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${query}`, adminKey).then(unwrapList).then(excludeTestRecords),
    ]);
    const wedding = weddings.length > 0 ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] : null;

    // Ownership re-checked on every row, never trusted to the query filter.
    const guests = excludeTestRecords(rows.filter(g => g.created_by_id === ownerUserId)).map(forCollaborator);

    return res.status(200).json({ guests, coupleNames: coupleDisplayName(wedding), canEdit: false });
  } catch (err) {
    console.error('[collaborator-guests] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
