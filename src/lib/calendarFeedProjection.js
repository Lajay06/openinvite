/**
 * src/lib/calendarFeedProjection.js — WHAT THE SUBSCRIBE FEED IS ALLOWED TO
 * CARRY, computed once and stored where the feed can read it.
 *
 * ── WHY A PROJECTION EXISTS AT ALL ─────────────────────────────────────────
 *
 * Schedule.read is owner-scoped ({created_by_id: "{{user.id}}"}), and the
 * admin key is not a superuser: against an owner-scoped read it gets `200 []`,
 * silently (BASE44_PLATFORM_NOTES.md, "The admin key is not a superuser
 * bypass"). The feed is fetched by Google's and Apple's servers with no
 * session, so it can only ever hold the admin key — which is how production
 * served a valid, EMPTY calendar to a correct token on 2026-09-20.
 *
 * WeddingDetails.read is null, and the feed already reads the couple's
 * WeddingDetails row by id. So the six allowlisted fields of every schedule
 * row are copied onto that row, by the couple's own session at the moment
 * the schedule changes, and the feed never asks Schedule for anything.
 *
 * ── WHY NOT OPEN Schedule.read INSTEAD ─────────────────────────────────────
 *
 * read:null makes every couple's `notes` and `responsible_person` listable by
 * any signed-in user's own token. The projection exposes exactly the six
 * fields that are already public to anyone holding the link, on an entity
 * that is already read:null. Strictly narrower.
 *
 * ── AN ALLOWLIST, NOT A DENYLIST ───────────────────────────────────────────
 *
 * FEED_FIELDS is the whole contract. `notes`, `responsible_person`, the run
 * sheet and the category never enter the projection; neither does whatever
 * field is added to Schedule next. Both writers (the hub, Ava) and both
 * readers (api/my-wedding-details.js on write, api/schedule.ics.js on serve)
 * go through pickFeedFields(), so there is one list to get wrong.
 *
 * PURE. No imports, no client, no browser — so a guard can load it and assert
 * against real row shapes without a session.
 */

/** The only schedule fields that leave the server. */
export const FEED_FIELDS = ['event_name', 'event_date', 'start_time', 'end_time', 'location', 'description'];

/** Copies ONLY the allowlisted fields off a row. */
export function pickFeedFields(row) {
  const out = {};
  for (const f of FEED_FIELDS) if (row?.[f] != null) out[f] = row[f];
  return out;
}

const byDateTimeThenId = (a, b) =>
  String(a.event_date || '').localeCompare(String(b.event_date || ''))
  || String(a.start_time || '').localeCompare(String(b.start_time || ''))
  || String(a.id).localeCompare(String(b.id));

/**
 * The projection of a set of Schedule rows: `{ events, updatedAt }`, the
 * shape WeddingDetails.calendarFeed declares.
 *
 * The row id rides along for the VEVENT UID and nothing else — without it
 * every event carried the same UID and calendar clients deduped the whole
 * schedule down to one entry. Rows without an id cannot have a UID and are
 * left out; test-harness rows are left out for the same reason product
 * queries exclude them everywhere else.
 *
 * Sorted, so two projections of the same rows are byte-equal and the
 * "is the stored copy current?" check below is a plain comparison.
 *
 * @param {Array<object>} rows  Schedule rows, any shape
 * @param {Date} [now]
 * @returns {{ events: Array<object>, updatedAt: string }}
 */
export function projectScheduleForFeed(rows, now = new Date()) {
  const events = (Array.isArray(rows) ? rows : [])
    .filter((r) => r && r.id != null && !r.is_test)
    .map((r) => ({ id: String(r.id), ...pickFeedFields(r) }))
    .sort(byDateTimeThenId);
  return { events, updatedAt: now.toISOString() };
}

/**
 * Whether a stored calendarFeed already matches these rows, so the hub can
 * skip the write on an ordinary page load and self-heal only when something
 * actually differs. An absent feed and an empty schedule are the same thing:
 * a couple with no events yet is not owed a write.
 *
 * Compares events only — updatedAt is a timestamp, not content.
 */
export function calendarFeedIsCurrent(stored, rows) {
  const want = projectScheduleForFeed(rows).events;
  const have = projectScheduleForFeed(stored?.events).events;
  return JSON.stringify(want) === JSON.stringify(have);
}
