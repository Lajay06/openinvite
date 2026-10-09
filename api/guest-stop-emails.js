/**
 * api/guest-stop-emails.js
 *
 * SETS Guest.email_opt_out TRUE, FOR A GUEST WITH NO SESSION.
 *
 * Item 6 of goals/2026-10-09-reply-lifecycle.md. A guest clicks the footer line
 * in any email we sent them and is not emailed about this wedding again. There
 * is no login, because asking to be left alone must not require an account.
 *
 * ── WHAT IT WILL AND WILL NOT DO ─────────────────────────────────────────
 *
 * It writes TWO fields on the one guest the signed token names: the flag, true,
 * and the moment they asked. It never accepts a field name from the request,
 * never returns the guest record, and NEVER TURNS THE FLAG BACK OFF. Undoing
 * this is the couple's to do, from their own guest list, signed in, which is
 * the only place that can prove who is asking. So the worst a forged request
 * could achieve, if the signature somehow held, is silence for the guest it
 * named.
 *
 * A bad token is a 404 with no detail, the same answer as a token for a guest
 * who no longer exists, because telling those apart tells an attacker which
 * half of a guess was right.
 *
 * ── IT ANSWERS WITH THE COUPLE'S NAMES, AND NOTHING ELSE ABOUT THEM ──────
 *
 * The confirmation line the goal specifies names the couple, so the page needs
 * them. That is one display string resolved on the server and handed back, not
 * the wedding record: the guest already knows whose wedding it is, and this
 * endpoint is reachable by anyone holding a signed token, so the payload stays
 * at exactly what the sentence needs.
 *
 * A failure to resolve the names is NOT a failure of the request. The flag is
 * what the guest asked for; the names are decoration on the confirmation. So
 * the write happens first and a missing name falls back to wording that works
 * without one.
 */

import { verifyGuestStopToken } from './_lib/guestStopToken.js';
import { coupleDisplayName } from './_lib/coupleNames.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

const entityUrl = (entity, id) =>
  `${BASE44_API}/apps/${BASE44_APP_ID}/entities/${entity}/${encodeURIComponent(id)}?api_key=${BASE44_ADMIN_KEY}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[guest-stop-emails] FAILURE — BASE44_ADMIN_KEY is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const token = typeof req.body === 'object' && req.body ? req.body.token : undefined;
  const guestId = verifyGuestStopToken(token);
  if (!guestId) {
    // NOT LOGGED WITH THE TOKEN IN IT. A rejected token in a log is a rejected
    // token someone can read later; the count is what is useful.
    console.warn('[guest-stop-emails] rejected a token that did not verify');
    return res.status(404).json({ error: 'Not found' });
  }

  // THE GUEST MUST EXIST, and this read is also what makes a USER stop token
  // useless here: its body decodes to a user id, which is not a guest id, and
  // this lookup answers 404 for it exactly as it would for a guess.
  let guest = null;
  try {
    const read = await fetch(entityUrl('Guest', guestId));
    if (read.ok) guest = await read.json();
  } catch (err) {
    console.error(`[guest-stop-emails] guest read failed: ${err.message}`);
    return res.status(502).json({ error: 'Could not save' });
  }
  if (!guest || !guest.id) {
    console.warn('[guest-stop-emails] token verified but no such guest');
    return res.status(404).json({ error: 'Not found' });
  }

  // ── THE WRITE, FIRST ────────────────────────────────────────────────────
  //
  // TWO FIELDS, BOTH LITERALS. A shape that forwarded a patch from the caller
  // would be an unauthenticated write to any Guest field, including the ones
  // that carry PII.
  try {
    const write = await fetch(entityUrl('Guest', guestId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_opt_out: true, email_opt_out_at: new Date().toISOString() }),
    });
    if (!write.ok) {
      const body = await write.text().catch(() => '');
      console.error(`[guest-stop-emails] Base44 write failed (${write.status}): ${body.slice(0, 200)}`);
      // A FAILED WRITE IS A 502, NOT A 200. The page says "Done" on a 200 and
      // nothing else; a 200 here would promise silence this request did not
      // deliver, and the guest would stop looking while the mail kept coming.
      return res.status(502).json({ error: 'Could not save' });
    }
  } catch (err) {
    console.error(`[guest-stop-emails] Base44 write threw: ${err.message}`);
    return res.status(502).json({ error: 'Could not save' });
  }

  // ── THEN THE NAMES, WHICH MAY FAIL WITHOUT FAILING THE REQUEST ──────────
  let coupleNames = '';
  try {
    const q = encodeURIComponent(JSON.stringify({ created_by_id: guest.created_by_id }));
    const url = `${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails?api_key=${BASE44_ADMIN_KEY}&q=${q}`;
    const rows = await fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const wedding = Array.isArray(rows) ? rows[0] : null;
    if (wedding) coupleNames = coupleDisplayName(wedding) || '';
  } catch {
    coupleNames = '';
  }

  console.log('[guest-stop-emails] email_opt_out set true for one guest');
  return res.status(200).json({ ok: true, coupleNames });
}
