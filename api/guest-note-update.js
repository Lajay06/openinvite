/**
 * POST /api/guest-note-update
 *
 * Mark a guest note read or unread, or record the couple's reply against it.
 *
 * WHY NOT GuestMessage.update FROM THE BROWSER. Every note is created by the
 * admin key on behalf of an anonymous guest, so `created_by_id` is the literal
 * string "anonymous" and no real session can match it — an owner-scoped update
 * rule 403s for the wedding's actual owner, which is the defect that broke
 * api/song-request-review.js until 2026-08-17. GuestMessage.update RLS is now
 * null, which removes the 403 and removes the platform's ownership check with
 * it. This endpoint is what replaces that check: it resolves the caller's own
 * wedding and refuses any note whose wedding_id does not match, and it is the
 * only write path, so the browser never needs to be able to touch the entity.
 *
 * Body: { noteId: string, action: 'read' | 'unread' | 'reply' | 'delete', replyText?: string }
 *   'read' / 'unread' — sets the read flag. Idempotent.
 *   'reply'           — sets reply, replied and reply_sent_at. The EMAIL is
 *                       sent separately by api/send-guest-reply.js, which the
 *                       page calls first and this endpoint does not touch:
 *                       reply_sent_at means "the email went out", so writing it
 *                       here without a successful send would be a lie, and the
 *                       page orders the two accordingly.
 *   'delete'          — removes the row, for good. Item 5 of
 *                       goals/2026-10-10-bounces-and-notes.md. It rides this
 *                       endpoint rather than a new one because the boundary it
 *                       needs is the boundary already written here: the
 *                       caller's own wedding_id, checked before anything is
 *                       touched. A delete on its own route would be a second
 *                       copy of that check, and the second copy is the one
 *                       that goes wrong.
 * Response: 200 { ok: true }
 *        or 400 { error } (bad action, empty reply)
 *        or 401 { error: 'Unauthorized' }
 *        or 404 { error } (no wedding, or not this couple's note)
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { adminList, adminGetOne, adminUpdate, adminDelete, hasAdminKey } from './_lib/base44Entities.js';

const MAX_REPLY_LENGTH = 4000;
const ACTIONS = ['read', 'unread', 'reply', 'delete'];

/** The caller's own wedding — the same resolution api/guest-notes.js uses. */
async function getMyWedding(callerId, list = adminList) {
  const weddings = (await list('WeddingDetails', { created_by_id: callerId })).filter(w => !w.is_test);
  return weddings.length > 0
    ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
    : null;
}

/**
 * `deps` is a test seam, defaulted so production reads exactly as before.
 * Item 5 needs to prove that one account cannot delete another's note, and
 * the only honest way to prove it is to drive this handler and watch whether
 * a delete reaches the entity at all.
 */
export default async function handler(req, res, deps = {}) {
  const verify = deps.verify || verifyBase44User;
  const list = deps.list || adminList;
  const getOne = deps.getOne || adminGetOne;
  const update = deps.update || adminUpdate;
  const remove = deps.remove || adminDelete;
  const hasKey = deps.hasKey || hasAdminKey;
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'guest-note-update', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  if (!hasKey()) {
    console.error('[guest-note-update] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const caller = await verify(req);
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const noteId = typeof req.body?.noteId === 'string' ? req.body.noteId : '';
  const action = req.body?.action;
  if (!noteId || !ACTIONS.includes(action)) {
    return res.status(400).json({ error: 'noteId and a valid action are required' });
  }

  const replyText = sanitizeString(req.body?.replyText || '').slice(0, MAX_REPLY_LENGTH);
  if (action === 'reply' && !replyText.trim()) {
    return res.status(400).json({ error: 'A reply cannot be empty.' });
  }

  try {
    const wedding = await getMyWedding(caller.id, list);
    if (!wedding?.id) return res.status(404).json({ error: 'No wedding found for this account' });

    // THE OWNERSHIP CHECK. GuestMessage.read is null, so fetching by id proves
    // nothing at all — the wedding_id match is the whole of the boundary. A
    // note belonging to someone else is reported as missing, not as forbidden:
    // a 403 would confirm the id exists.
    const note = await getOne('GuestMessage', noteId);
    if (!note || note.wedding_id !== wedding.id) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (action === 'read' || action === 'unread') {
      await update('GuestMessage', noteId, { read: action === 'read' });
      return res.status(200).json({ ok: true });
    }

    // AFTER THE wedding_id MATCH, NEVER BEFORE IT. This is the only
    // irreversible action on the endpoint, so it sits below the one check that
    // decides whose note this is, and it reports the same 404 as the others
    // for a note that is not the caller's: a 403 would confirm the id exists.
    if (action === 'delete') {
      await remove('GuestMessage', noteId);
      console.log(`[guest-note-update] note deleted by ${caller.id}`);
      return res.status(200).json({ ok: true });
    }

    await update('GuestMessage', noteId, {
      reply: replyText,
      replied: true,
      reply_sent_at: new Date().toISOString(),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[guest-note-update] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
