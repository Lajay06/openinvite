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
 * cannot. The list is src/lib/calendarFeedProjection.js's FEED_FIELDS, shared
 * with every writer of the projection, and applied again here on the way out.
 *
 * ── THE EVENTS COME FROM THE WEDDING ROW, NOT FROM SCHEDULE ────────────────
 *
 * Schedule.read is owner-scoped ({created_by_id: "{{user.id}}"}) and the admin
 * key is not a superuser: an owner-scoped list answers `200 []`, silently
 * (BASE44_PLATFORM_NOTES.md). This handler has no session — Google and Apple
 * fetch it — so it can only ever hold the admin key, and on 2026-09-20 it
 * served a valid, EMPTY calendar to a correct token on production. The six
 * allowlisted fields are therefore projected onto WeddingDetails.calendarFeed
 * by the couple's own session whenever the schedule changes (the hub's load
 * path and Ava's create_schedule, both through src/lib/calendarFeedSync.js),
 * and this handler reads that row — which is read:null, and which it already
 * read to find the wedding. Schedule is never asked for anything here.
 *
 * ── READ-SIDE ONLY ─────────────────────────────────────────────────────────
 *
 * Nothing is ever written to the couple's Google account, and this endpoint
 * accepts nothing but GET.
 */
import { buildIcsCalendar } from '../src/lib/ics.js';
import { calendarFeedTokenMatches } from './_lib/calendarFeedToken.js';
import { FEED_FIELDS, pickFeedFields } from '../src/lib/calendarFeedProjection.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

/** The only fields that leave this server — one list, shared with the writers. */
export { FEED_FIELDS, pickFeedFields };

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

  // ONE READ, of the wedding row. Bearer, not `?api_key=`: the query form
  // answers `200 []` on every LIST (BASE44_PLATFORM_NOTES.md, "not
  // User-specific"). The row carries the projection the couple's own session
  // wrote (see the header); a wedding that has none yet is an empty calendar,
  // not a refusal — a 404 here would tell a subscribed client the link died.
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` };
  let events = [];
  try {
    const w = await fetchImpl(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails/${encodeURIComponent(weddingId)}`, { method: 'GET', headers });
    if (!w.ok) return notFound(res);
    const wedding = await w.json();
    if (!wedding?.id) return notFound(res);
    events = Array.isArray(wedding.calendarFeed?.events) ? wedding.calendarFeed.events : [];
  } catch {
    return notFound(res);
  }

  // The row id rides along for the UID and nothing else. pickFeedFields()
  // drops it (it is not a feed field), and without it every VEVENT carried
  // UID schedule-undefined@ — one identical UID for the whole schedule, which
  // a calendar client dedupes down to a single event. That is the "only the
  // after party arrived". An opaque record id in a UID is not one of the
  // fields the allowlist exists to keep in. The pick is applied again HERE,
  // on stored events, so a projection written by an older or hand-rolled
  // writer still cannot carry a disallowed field out.
  const ics = buildIcsCalendar(
    events.filter((e) => e && e.id != null).map((e) => ({ id: e.id, ...pickFeedFields(e) })),
    'Wedding schedule',
  );
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  // PRIVATE. A shared cache in front of this would serve one couple's schedule
  // to the next request for the same URL, which is fine, and to a proxy that
  // strips the query string, which is not. An hour matches how often Google
  // actually re-reads a subscription.
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.status(200).send(ics);
}
