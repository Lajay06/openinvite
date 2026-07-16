/**
 * /api/collaborator-guests — GET / PUT / DELETE
 *
 * NOT YET FUNCTIONAL — depends on collaborator-accept.js actually being
 * able to record an acceptance, which is currently blocked (see that
 * file's own header). This endpoint's own logic (permission check, then
 * scoped admin-key read/write) is complete and will work once the
 * accept-side RLS decision is made — nothing here needs to change.
 *
 * Real, server-enforced Guest access for an accepted collaborator — not
 * menu-hiding. Every request is checked here regardless of what the client
 * UI would have allowed: verify the caller's own bearer token, resolve
 * their accepted Collaborator record for the given ownerUserId (never
 * trusting a client-claimed permission), then check the specific
 * view/edit permission for the 'Guests' page before touching any data.
 *
 * KNOWN LIMITATION — no create here: writes go through the admin key
 * (Collaborator's own bearer token can't reach another user's Guest
 * records at all, same as every other owner-scoped entity). Verified
 * empirically that the admin key always stamps a freshly-created record's
 * created_by_id as 'anonymous', never a chosen value — so a collaborator-
 * created Guest would be invisible on the owner's own dashboard (which
 * filters strictly by created_by_id === owner's own id) and permanently
 * undeletable by any credential (Guest's delete RLS requires
 * created_by_id === {{user.id}}, which 'anonymous' can never satisfy).
 * UPDATING an existing record is safe — created_by_id is stamped once at
 * creation and untouched by later admin-key updates — so collaborators can
 * fully view, edit, and remove existing guests; only adding a brand-new
 * guest is left to the account owner until Base44 offers a way to create a
 * record under a specific user's identity.
 *
 * Query/body always include ownerUserId — the wedding owner's Base44
 * User.id — since a collaborator may work with more than one couple.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { getCollaborationFor, hasPagePermission } from './_lib/collaboratorAuth.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;
const PAGE = 'Guests';

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function adminFetch(method, path, body) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
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
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[collaborator-guests] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const ownerUserId = sanitizeString(req.method === 'GET' ? (req.query?.ownerUserId || '') : (req.body?.ownerUserId || ''));
  if (!ownerUserId) {
    return res.status(400).json({ error: 'ownerUserId is required' });
  }

  try {
    const collaboration = await getCollaborationFor(caller.id, ownerUserId, BASE44_ADMIN_KEY);
    if (!collaboration) {
      return res.status(403).json({ error: 'You are not an accepted collaborator on this wedding.' });
    }

    if (req.method === 'GET') {
      if (!hasPagePermission(collaboration.permissions, PAGE, 'view')) {
        return res.status(403).json({ error: 'You do not have permission to view guests for this wedding.' });
      }
      const query = encodeURIComponent(JSON.stringify({ created_by_id: ownerUserId }));
      const rows = unwrapList(await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/Guest?q=${query}`));

      const weddingQuery = encodeURIComponent(JSON.stringify({ created_by_id: ownerUserId }));
      const weddings = unwrapList(await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`)).filter(w => !w.is_test);
      const wedding = weddings.length > 0 ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] : null;
      const coupleNames = wedding?.coupleNames || [wedding?.couple1Name, wedding?.couple2Name].filter(Boolean).join(' & ') || '';

      return res.status(200).json({
        guests: rows.filter(g => !g.is_test),
        coupleNames,
        canEdit: hasPagePermission(collaboration.permissions, PAGE, 'edit'),
      });
    }

    // PUT / DELETE both require edit permission
    if (!hasPagePermission(collaboration.permissions, PAGE, 'edit')) {
      return res.status(403).json({ error: 'You do not have permission to edit guests for this wedding.' });
    }

    const guestId = sanitizeString(req.method === 'PUT' ? (req.body?.guestId || '') : (req.query?.guestId || ''));
    if (!guestId) {
      return res.status(400).json({ error: 'guestId is required' });
    }

    // Confirm the guest actually belongs to this owner before touching it —
    // never trust a client-supplied guestId in isolation.
    const existing = await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/Guest/${guestId}`);
    if (!existing || existing.created_by_id !== ownerUserId) {
      return res.status(404).json({ error: 'Guest not found for this wedding.' });
    }

    if (req.method === 'PUT') {
      const updates = req.body?.updates && typeof req.body.updates === 'object' ? req.body.updates : {};
      const updated = await adminFetch('PUT', `/apps/${BASE44_APP_ID}/entities/Guest/${guestId}`, updates);
      return res.status(200).json({ guest: updated });
    }

    // DELETE
    await adminFetch('DELETE', `/apps/${BASE44_APP_ID}/entities/Guest/${guestId}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[collaborator-guests] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
