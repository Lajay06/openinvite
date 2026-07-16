/**
 * POST /api/send-collaborator-invite
 *
 * Authenticated as the COUPLE (the wedding owner). Creates or resends a
 * Collaborator invite: writes/updates the Collaborator record via the
 * caller's own bearer token (its create/update RLS is scoped to
 * created_by_id === caller, so no admin key is needed for this write —
 * unlike accepting the invite, which the collaborator's own token can't do),
 * generates a fresh invite_token, and sends the on-brand invite email via
 * the existing Resend setup (src/lib/collaboratorEmailTemplate.js).
 *
 * A fresh token is generated every send (including resends), so an old
 * copy of the email can never be replayed after a resend.
 *
 * Body: {
 *   collaboratorId?: string,   // omit to create a new collaborator
 *   name: string, email: string, permissions: object,
 *   origin: string,            // window.location.origin, to build the accept link
 * }
 * Response: 200 { collaborator: {...} }
 */

import { Resend } from 'resend';
import { applyCors, checkRateLimit, getClientIp, sanitizeString, isValidEmail } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { renderCollaboratorInviteEmail } from '../src/lib/collaboratorEmailTemplate.js';
import { signInvite } from './_lib/collaboratorInviteToken.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Openinvite <hello@openinvite.com.au>';
const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'collaborator-invite', 20, 60_000);
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const callerToken = (req.headers.authorization || '').slice(7);
  const { collaboratorId, name, email, permissions, origin } = req.body || {};

  const cleanName = sanitizeString(name || '').slice(0, 200);
  const cleanEmail = sanitizeString(email || '').trim();
  if (!cleanName || !cleanEmail || !isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'A valid name and email are required.' });
  }
  if (!origin || typeof origin !== 'string') {
    return res.status(400).json({ error: 'origin is required.' });
  }

  try {
    // The couple's own wedding, read with their own token (Collaborator
    // invites are always sent in the context of the caller's own wedding).
    const weddingQuery = encodeURIComponent(JSON.stringify({ created_by_id: caller.id }));
    const weddingRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`, {
      headers: { Authorization: `Bearer ${callerToken}` },
    });
    const weddings = weddingRes.ok ? unwrapList(await weddingRes.json()).filter(w => !w.is_test) : [];
    const wedding = weddings.length > 0
      ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;
    const coupleNames = wedding?.coupleNames || [wedding?.couple1Name, wedding?.couple2Name].filter(Boolean).join(' & ') || '';

    // Stored on the Collaborator record for display/dedup purposes only — the
    // actual accept link below never looks this up in Base44 (the admin key
    // can't read Collaborator at all; see collaboratorAuth.js's header).
    const inviteToken = crypto.randomUUID();
    const payload = { name: cleanName, email: cleanEmail, permissions: permissions || {}, status: 'pending', invite_token: inviteToken };

    let collaborator;
    if (collaboratorId) {
      const updateRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Collaborator/${collaboratorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${callerToken}` },
        body: JSON.stringify(payload),
      });
      if (!updateRes.ok) throw new Error(`Collaborator update failed (${updateRes.status})`);
      collaborator = await updateRes.json();
    } else {
      const createRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Collaborator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${callerToken}` },
        body: JSON.stringify(payload),
      });
      if (!createRes.ok) throw new Error(`Collaborator create failed (${createRes.status})`);
      collaborator = await createRes.json();
    }

    // The accept link carries a signed payload, not a lookup key — the
    // accept page (and collaborator-accept.js) verify it and read the
    // owner id/permissions straight out of it, with zero Collaborator reads.
    const signedInvite = signInvite({
      ownerUserId: caller.id, email: cleanEmail, name: cleanName, permissions: permissions || {}, iat: Date.now(),
    });
    const acceptUrl = `${origin}/collaborate/accept/${signedInvite}`;
    const { subject, html } = renderCollaboratorInviteEmail({
      collaboratorName: cleanName, coupleNames, acceptUrl, permissions: permissions || {},
    });

    if (process.env.RESEND_API_KEY) {
      const { error } = await resend.emails.send({ from: FROM, to: cleanEmail, subject, html });
      if (error) throw new Error(error.message || 'Resend send failed');
    } else {
      console.warn('[send-collaborator-invite] RESEND_API_KEY not set — invite record saved, email not sent');
    }

    return res.status(200).json({ collaborator, acceptUrl });
  } catch (err) {
    console.error('[send-collaborator-invite] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
