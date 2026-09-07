/**
 * GET /api/schedule-feed-url
 *
 * The couple's own subscribe link, for the Calendar tab to show and copy.
 *
 * THE BROWSER CANNOT DERIVE IT. The token is an HMAC under
 * CALENDAR_FEED_SECRET, which is server-only and must never reach a bundle —
 * so the page asks for the finished URL rather than being given the ingredients
 * to build one. This endpoint is authenticated with the couple's own session
 * and only ever answers for their own wedding.
 *
 * A LINK, NOT THE SECRET. The response carries the URL and nothing else. The
 * secret is read, used and discarded inside this process.
 */
import { verifyBase44User } from './_lib/auth.js';
import { calendarFeedToken } from './_lib/calendarFeedToken.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

export default async function handler(req, res, fetchImpl = fetch) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const caller = await verifyBase44User(req);
  if (!caller?.id) return res.status(401).json({ error: 'Not signed in' });

  const secret = process.env.CALENDAR_FEED_SECRET;
  // NOT CONFIGURED IS SAID PLAINLY HERE, because the caller is the couple
  // themselves and a silent empty answer would look like a broken button.
  // The public feed endpoint still says nothing to a stranger.
  if (!secret) return res.status(200).json({ url: null, reason: 'not-configured' });

  const adminKey = process.env.BASE44_ADMIN_KEY;
  if (!adminKey) return res.status(200).json({ url: null, reason: 'not-configured' });

  let weddingId = null;
  try {
    const q = encodeURIComponent(JSON.stringify({ created_by_id: caller.id }));
    const r = await fetchImpl(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${q}&api_key=${adminKey}`);
    if (r.ok) {
      const rows = await r.json();
      weddingId = (Array.isArray(rows) ? rows : [])[0]?.id || null;
    }
  } catch { /* falls through to the no-wedding answer below */ }

  if (!weddingId) return res.status(200).json({ url: null, reason: 'no-wedding' });

  const token = calendarFeedToken(weddingId, secret);
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'openinvite.com.au';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return res.status(200).json({
    url: `${proto}://${host}/api/schedule.ics?w=${encodeURIComponent(weddingId)}&t=${token}`,
  });
}
