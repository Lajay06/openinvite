/**
 * GET /api/guest-notes
 *
 * The couple's own guest notes, decrypted, for the Messages page.
 *
 * WHY THE PAGE CANNOT READ THEM DIRECTLY. api/guest-note-submit.js creates
 * each GuestMessage with the admin key on behalf of an anonymous guest, and
 * Base44 stamps every such row `created_by_id: "anonymous"` — its own value,
 * not one this app chooses, and confirmed twice not to honor a supplied one
 * (BASE44_PLATFORM_NOTES.md). So `getMyRecords('GuestMessage')`, which filters
 * `{created_by_id: me.id}`, can never return a single real note. Same reasoning
 * and same shape as api/song-request-review.js and the guest contact collector
 * before it: ownership is verified here in application code, by matching the
 * row's wedding_id against the caller's own resolved wedding.
 *
 * AND WHY THE TEXT IS DECRYPTED HERE. GuestMessage.read RLS is null (it has to
 * be — no session can match "anonymous"), so the address and the message live
 * in an AES blob instead of in their plaintext columns. This endpoint is the
 * only place that opens it, because the key is derived from BASE44_ADMIN_KEY
 * and the browser can never hold that.
 *
 * GET → { notes: GuestMessage[] }, newest first, is_test excluded, each row
 *   carrying guest_email and message as plain fields and NO encrypted_guest.
 *   An account with no wedding gets { notes: [] }, not an error — a couple who
 *   has not finished onboarding has no notes, which is an answer.
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { adminList, hasAdminKey } from './_lib/base44Entities.js';
import { decorateGuestNote } from './_lib/guestNotePii.js';

/**
 * The caller's own wedding, resolved with the admin key.
 *
 * Newest first when an account somehow holds more than one, matching
 * api/song-request-review.js's getMyWedding exactly rather than inventing a
 * second answer to "which wedding is mine".
 */
async function getMyWedding(callerId) {
  const weddings = (await adminList('WeddingDetails', { created_by_id: callerId })).filter(w => !w.is_test);
  return weddings.length > 0
    ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
    : null;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'guest-notes', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  if (!hasAdminKey()) {
    console.error('[guest-notes] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const caller = await verifyBase44User(req);
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const wedding = await getMyWedding(caller.id);
    if (!wedding?.id) return res.status(200).json({ notes: [] });

    const rows = (await adminList('GuestMessage', { wedding_id: wedding.id })).filter(r => !r.is_test);

    // SORTED HERE, not left to Base44's order. Messages.jsx used to pass
    // '-created_date' to getMyRecords and rendered whatever came back; the
    // endpoint owes it the same order rather than making the page re-sort.
    const notes = rows
      .slice()
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
      .map(decorateGuestNote);

    return res.status(200).json({ notes });
  } catch (err) {
    console.error('[guest-notes] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
