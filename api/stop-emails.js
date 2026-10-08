/**
 * POST /api/stop-emails   { token }
 *
 * SETS User.lifecycleEmails FALSE, FOR A VISITOR WITH NO SESSION.
 *
 * Item 3 of goals/2026-10-08-retention-emails.md. The footer link in both
 * retention emails lands on /stop-emails/<token>, a public page, and that page
 * calls this. There is no login: someone who has stopped caring about their
 * wedding account is exactly the person who will not sign in to be left alone.
 *
 * ── WHY A POST AND NOT THE GET THE LINK ITSELF PERFORMS ────────────────────
 *
 * Mail clients, link scanners and corporate security proxies FETCH the URLs in
 * an email before any human sees them. A GET that performed the write would be
 * triggered by those fetches, and couples would find themselves unsubscribed
 * from mail they never opened. The link therefore lands on a client-rendered
 * page, and the write happens in a POST that page makes with JavaScript, which
 * a prefetcher does not run.
 *
 * ── WHAT IT WILL AND WILL NOT DO ───────────────────────────────────────────
 *
 * It writes ONE field, false, on the one account the signed token names. It
 * never reads a record back to the caller, never accepts a field name from the
 * request, and never turns the flag back ON: re-enabling is a thing you do
 * signed in, on the Account page, which is the only place that can prove it is
 * you. So the worst a forged request can achieve, if the signature somehow
 * held, is silence for the account it named.
 *
 * A bad token is a 404 with no detail, the same answer as a token for an
 * account that no longer exists, because telling the two apart tells an
 * attacker which half of a guess was right.
 */

import { verifyStopToken } from './_lib/stopEmailsToken.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[stop-emails] FAILURE — BASE44_ADMIN_KEY is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const token = typeof req.body === 'object' && req.body ? req.body.token : undefined;
  const userId = verifyStopToken(token);
  if (!userId) {
    // NOT LOGGED WITH THE TOKEN IN IT. A rejected token in a log is a rejected
    // token someone can read later; the count is what is useful operationally.
    console.warn('[stop-emails] rejected a token that did not verify');
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    // ONE FIELD, ONE VALUE, NOTHING FROM THE REQUEST BODY. The field name and
    // the value are literals here on purpose: a shape that forwarded a patch
    // from the caller would be an unauthenticated write to any User field.
    const url = `${BASE44_API}/apps/${BASE44_APP_ID}/entities/User/${encodeURIComponent(userId)}?api_key=${BASE44_ADMIN_KEY}`;
    const write = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lifecycleEmails: false }),
    });
    if (!write.ok) {
      const body = await write.text().catch(() => '');
      console.error(`[stop-emails] Base44 write failed (${write.status}): ${body.slice(0, 200)}`);
      // A FAILED WRITE IS A 502, NOT A 200. The page says "done" on a 200 and
      // nothing else; answering 200 here would promise silence this request
      // did not deliver, and the couple would keep getting mail they asked to
      // stop and believe they had stopped it.
      return res.status(502).json({ error: 'Could not save' });
    }
  } catch (err) {
    console.error('[stop-emails] write threw:', err.message);
    return res.status(502).json({ error: 'Could not save' });
  }

  console.log('[stop-emails] lifecycleEmails set false for one account');
  // NO RECORD IN THE RESPONSE. The caller proved it holds a signed link, which
  // is not the same as proving it is the account owner, so it learns only that
  // the write succeeded.
  return res.status(200).json({ ok: true });
}
