/**
 * GET /api/schedule.ics?w=<weddingId>&t=<token>
 *
 * A SUBSCRIBE FEED, not a download. Google fetches this on its own schedule
 * and re-renders the couple's calendar, so an edit made here reaches their
 * phone without them exporting anything again. The existing .ics button stays
 * and is now labelled a snapshot, because that is what it is.
 *
 * ── WHY THERE IS NO SESSION HERE ───────────────────────────────────────────
 *
 * The request comes from Google's servers, not the couple's browser. There is
 * no cookie and no bearer token to check, so the URL carries its own
 * authority: an HMAC of the wedding id under a server-only secret
 * (api/_lib/calendarFeedToken.js). Unguessable, derived rather than stored,
 * and compared in constant time.
 *
 * ── 404, NEVER 401 ─────────────────────────────────────────────────────────
 *
 * A wrong token, a missing token, a missing secret and a wedding that does not
 * exist all return the same empty 404. A 401 would confirm that the wedding
 * IS there, which turns a guessed id into a yes-or-no oracle about whose
 * weddings are on the platform.
 *
 * ── A FIELD ALLOWLIST, NOT A FIELD DENYLIST ────────────────────────────────
 *
 * The feed carries event_name, event_date, start_time, end_time, location and
 * description. Nothing else — not notes, not responsible_person, not the run
 * sheet. A subscribed calendar is readable by anyone the couple has ever
 * shared their phone's calendar with, and by anyone who obtains the link. A
 * denylist would leak the next field somebody adds to the entity; an allowlist
 * cannot.
 *
 * ── READ-SIDE ONLY ─────────────────────────────────────────────────────────
 *
 * Nothing is ever written to the couple's Google account, and this endpoint
 * accepts nothing but GET.
 */
import { buildIcsCalendar } from '../src/lib/ics.js';
import { calendarFeedTokenMatches } from './_lib/calendarFeedToken.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

/** The only fields that leave this server. */
export const FEED_FIELDS = ['event_name', 'event_date', 'start_time', 'end_time', 'location', 'description'];

/** Copies ONLY the allowlisted fields off a row. */
export function pickFeedFields(row) {
  const out = {};
  for (const f of FEED_FIELDS) if (row?.[f] != null) out[f] = row[f];
  return out;
}

/** The same empty answer for every reason to refuse. */
function notFound(res) {
  res.status(404).end();
}

export default async function handler(req, res, fetchImpl = fetch) {
  if (req.method !== 'GET') return notFound(res);

  const weddingId = String(req.query?.w || '');
  const token = String(req.query?.t || '');
  const secret = process.env.CALENDAR_FEED_SECRET;

  // An absent secret is a misconfiguration, and a stranger is not owed that
  // fact either — it answers exactly as a wrong token does.
  if (!weddingId || !secret || !calendarFeedTokenMatches(weddingId, secret, token)) {
    return notFound(res);
  }

  const adminKey = process.env.BASE44_ADMIN_KEY;
  if (!adminKey) return notFound(res);

  let rows = [];
  try {
    const url = `${BASE44_API}/apps/${BASE44_APP_ID}/entities/Schedule?api_key=${adminKey}&limit=500`;
    const r = await fetchImpl(url);
    if (!r.ok) return notFound(res);
    const all = await r.json();
    // Scoped to this wedding. The admin key is not a superuser bypass and
    // does not scope a list for us, so the filter is ours to apply.
    rows = (Array.isArray(all) ? all : []).filter((x) => x?.wedding_id === weddingId || x?.created_by_id === weddingId);
  } catch {
    return notFound(res);
  }

  const ics = buildIcsCalendar(rows.map(pickFeedFields), 'Wedding schedule');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  // PRIVATE. A shared cache in front of this would serve one couple's schedule
  // to the next request for the same URL, which is fine, and to a proxy that
  // strips the query string, which is not. An hour matches how often Google
  // actually re-reads a subscription.
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.status(200).send(ics);
}
