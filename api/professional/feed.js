/**
 * api/professional/feed.js
 *
 * GET ?workspace_id=&event_id=   The live Guests panel for a linked event.
 *
 * In order, on every call:
 *   1. The flag: off is a 404.
 *   2. The caller from their own token; their live seat in the workspace; the
 *      event, read server-side; authorize() for guests.view on that event.
 *      Linked guest data follows the event: any seat on it sees what the
 *      couple shared, and nothing more.
 *   3. The event's PlannerLink log (append-only, newest wins). Not live, or
 *      revoked: the response is { feed: null } and nothing of the couple's is
 *      read at all.
 *   4. The couple is the account that made the approval (created_by_id of
 *      the approve row, the couple's own create), checked against the hashed
 *      id on the row. Never a value from the request.
 *   5. Their rows are read and decrypted server-side (professionalCoupleRead),
 *      projected by the allowlist (professionalFeed), and checked once more
 *      by forbiddenInFeed before the response leaves. A hit is a 500 and a
 *      log line, never a partial send.
 *   6. The read is logged (PlannerLinkView): who, which event, when. A read
 *      that cannot be logged is refused.
 */
import { applyCors, checkRateLimit, getClientIp, sanitizeString } from '../_lib/security.js';
import { verifyBase44User } from '../_lib/auth.js';
import { hmacHex } from '../_lib/appKeys.js';
import { TOO_MANY_TRIES, DID_NOT_GO_THROUGH } from '../_lib/calmErrors.js';
import { professionalOnServer, authorize, liveMember } from '../_lib/professionalAuth.js';
import { proFn, isConfigured } from '../_lib/professionalData.js';
import { buildLinkedFeed, latestLinkEvent, isLinkLive, forbiddenInFeed } from '../_lib/professionalFeed.js';
import { readCouple, toFeedGuests } from '../_lib/professionalCoupleRead.js';

const BASE = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

async function admin(path, init = {}) {
  const res = await fetch(`${BASE}/apps/${APP_ID}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.BASE44_ADMIN_KEY}`, ...(init.headers || {}) } });
  if (!res.ok) { const e = new Error(`base44 ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  return Array.isArray(j) ? j : j?.items || j?.data || j;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!professionalOnServer()) return res.status(404).json({ error: 'Not found' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { limited } = checkRateLimit(getClientIp(req), 'professional-feed', 120, 60_000);
  if (limited) return res.status(429).json({ error: TOO_MANY_TRIES });

  const caller = await verifyBase44User(req);
  if (!caller) return res.status(401).json({ error: 'Sign in to continue.' });
  if (!isConfigured() || !process.env.BASE44_ADMIN_KEY) return res.status(503).json({ error: 'Professional is not switched on yet.' });

  const workspaceId = sanitizeString(req.query?.workspace_id || '');
  const eventId = sanitizeString(req.query?.event_id || '');
  if (!workspaceId || !eventId) return res.status(400).json({ error: DID_NOT_GO_THROUGH });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  try {
    const { rows: memberRows } = await proFn('members', { workspace_id: workspaceId }, token);
    const member = liveMember(memberRows, { userHash: hmacHex(caller.id) });
    const { row: event } = await proFn('get', { collection: 'ProEvent', id: eventId, workspace_id: workspaceId }, token);
    if (!event || event.workspace_id !== workspaceId) return res.status(404).json({ error: 'That is no longer here.' });
    const verdict = authorize({ member, collection: 'PlannerLink', op: 'list', event });
    if (!verdict.ok) return res.status(verdict.status).json({ error: 'Your role on this team does not include that.' });

    const linkRows = (await admin(`/entities/PlannerLink?q=${encodeURIComponent(JSON.stringify({ event_id: eventId }))}`))
      .filter((r) => r.event_id === eventId && r.workspace_id === workspaceId && !r.is_test);
    if (!isLinkLive(linkRows)) return res.status(200).json({ feed: null, frozen: event.frozen_totals || null });

    const approve = linkRows.filter((r) => r.event_type === 'approve').sort((a, b) => String(b.created_date).localeCompare(String(a.created_date)))[0];
    const coupleUserId = approve?.created_by_id;
    if (!coupleUserId || coupleUserId === 'anonymous' || hmacHex(coupleUserId) !== approve.couple_user_id_hash) {
      console.error('[professional-feed] approval not made by the couple', eventId.length);
      return res.status(200).json({ feed: null, frozen: event.frozen_totals || null });
    }
    const latest = latestLinkEvent(linkRows);
    const couple = await readCouple(coupleUserId);
    const feed = buildLinkedFeed({ linkRows: [...linkRows.filter((r) => r !== latest), latest], guests: toFeedGuests(couple), wedding: couple.wedding });

    const hits = forbiddenInFeed(feed);
    if (hits.length) {
      console.error('[professional-feed] allowlist breach refused', hits.length);
      return res.status(500).json({ error: DID_NOT_GO_THROUGH });
    }

    // Every read through a link is logged, or it does not happen: the log is
    // written before the panel is sent, and a failed write refuses the read.
    await admin('/entities/PlannerLinkView', { method: 'POST', body: JSON.stringify({ event_id: eventId, wedding_id_hash: hmacHex(couple.wedding?.id || coupleUserId), viewer_member_hash: hmacHex(member.member_user_id_hash || member.id), viewed_at: new Date().toISOString(), is_test: false }) });
    return res.status(200).json({ feed });
  } catch (err) {
    console.error('[professional-feed]', err?.status || 'error');
    if (err?.status === 503) return res.status(503).json({ error: 'Professional is not switched on yet.' });
    return res.status(500).json({ error: DID_NOT_GO_THROUGH });
  }
}
