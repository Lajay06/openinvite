/**
 * src/lib/scheduleOrder.js — one chronological order for schedule items.
 *
 * THE DEFECT THIS CLOSES. Schedule.jsx:105 and ScheduleHub.jsx:94 were the
 * identical line:
 *
 *     .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
 *
 * `event_date` was not a sort key at all — the entity declares it and REQUIRES
 * it, and the comparator ignored it. So items ordered by time-of-day across
 * every day at once: a 09:00 breakfast on 1 January sorted above a 17:00 dinner
 * on 31 December. Days appeared to descend while times ascended. Every couple
 * with more than one day of events saw it.
 *
 * WHY IT LIVES HERE. The guest-facing WeddingCelebrationPage already sorted
 * correctly — by date, then time, with undated items last. The rule existed and
 * was right; it was simply not the one the dashboard used. Two of the three
 * places agreeing was never going to be enough, so there is now one.
 *
 * ISO STRINGS, NEVER `new Date()`. A stored event_date is a CALENDAR date, not
 * an instant. `new Date('2027-01-01')` parses as UTC midnight and reads back in
 * local time, which is 31 December 2026 anywhere west of Greenwich — the same
 * defect that gave a US couple the address `-2026`. Lexicographic comparison of
 * `YYYY-MM-DD` is chronological, and carries no timezone to get wrong.
 */

/** Undated items sort last, in both directions — a missing day is not day zero. */
const NO_DAY = '9999-12-31';

/**
 * Compare two schedule items chronologically: day first, then time.
 *
 * @param {string} aDay  ISO calendar date (YYYY-MM-DD), or falsy
 * @param {string} aTime 24-hour time (HH:MM), or falsy
 */
export function compareDayThenTime(aDay, aTime, bDay, bTime) {
  const da = aDay || NO_DAY;
  const db = bDay || NO_DAY;
  if (da !== db) return da.localeCompare(db);
  return minutes(aTime) - minutes(bTime);
}

/**
 * Time as minutes past midnight.
 *
 * NOT a string comparison. The two dashboard lists compared start_time with
 * localeCompare, which is only correct while every value is zero-padded —
 * "9:00" sorts AFTER "17:00" lexicographically. WeddingDayTimelineBuilder had
 * always parsed to minutes instead, and it was right to. Taking the more
 * careful of the two rather than the more common one.
 *
 * An unparseable or missing time sorts last within its day, for the same
 * reason an undated item sorts last overall: absent is not zero.
 */
function minutes(t) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** The Schedule entity's own field names, for the dashboard's lists. */
export function compareScheduleItems(a, b) {
  return compareDayThenTime(a?.event_date, a?.start_time, b?.event_date, b?.start_time);
}

/** Sorted copy. Never sorts in place — these arrays come from query caches. */
export function sortScheduleItems(items) {
  return (items || []).slice().sort(compareScheduleItems);
}
