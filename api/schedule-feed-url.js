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

// THE ADMIN KEY GOES IN THE AUTHORIZATION HEADER, AND THE LIST COMES BACK
// WRAPPED. `?api_key=` on a LIST answers `200 []` for every entity — a
// successful-looking empty answer (BASE44_PLATFORM_NOTES.md, "not
// User-specific") — which is exactly how this endpoint said "no-wedding" to
// the owner on production with both env vars set. Same pattern as
// getMyWeddings() in api/my-wedding-details.js: Bearer, then unwrap
// {data:[…]} / {results:[…]} / bare array.
function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function adminFetch(fetchImpl, path, adminKey) {
  const res = await fetchImpl(`${BASE44_API}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 GET ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

/** The caller's newest real wedding, exactly as getMyWedding() picks it. */
export async function findMyWeddingId(callerId, adminKey, fetchImpl = fetch) {
  const q = encodeURIComponent(JSON.stringify({ created_by_id: callerId }));
  const weddings = unwrapList(await adminFetch(fetchImpl, `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${q}`, adminKey))
    .filter((w) => !w.is_test);
  return weddings.length > 0
    ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0].id
    : null;
}

export default async function handler(req, res, fetchImpl = fetch, verifyImpl = verifyBase44User) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const caller = await verifyImpl(req);
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
    weddingId = await findMyWeddingId(caller.id, adminKey, fetchImpl);
  } catch { /* falls through to the no-wedding answer below */ }

  if (!weddingId) return res.status(200).json({ url: null, reason: 'no-wedding' });

  const token = calendarFeedToken(weddingId, secret);
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'openinvite.com.au';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return res.status(200).json({
    url: `${proto}://${host}/api/schedule.ics?w=${encodeURIComponent(weddingId)}&t=${token}`,
  });
}
