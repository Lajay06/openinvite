/**
 * src/lib/lastUpdated.js
 *
 * HOW LONG AGO THE LIST WAS LOADED, AND WHAT TO SAY WHEN IT WAS NOT.
 *
 * Item 4 of goals/2026-10-09-reply-lifecycle.md. The Guests page fetches once
 * on mount and again after every write, and never told the couple when. On a
 * page whose whole job is "who have I not heard from", a list of unknown age
 * is a list you cannot trust.
 *
 * ── FROM THE LOAD, NOT FROM A TIMER ──────────────────────────────────────
 *
 * The owner's words: driven by the time of the last SUCCESSFUL load, not by
 * the page's own clock. So every label here is a function of two instants, the
 * load and now, and nothing accumulates. A counter started at mount would
 * survive a failed refresh and keep counting, which is exactly the lie this
 * replaces: the page would claim to be fresh while showing stale rows.
 *
 * ── A FAILED REFRESH IS NOT A FRESH LOAD ─────────────────────────────────
 *
 * It must not move the timestamp, and the list must stay exactly as it was. A
 * refresh that failed and then showed an empty list would read as "every guest
 * is gone", which is worse than showing nothing new.
 *
 * ── EXTRACTED SO IT CAN BE ASSERTED ──────────────────────────────────────
 *
 * Guests.jsx is auth-gated and is JSX, so a Node guard cannot reach the logic
 * in place. Same reason checklistStatus.js and guestRsvpTally.js were pulled
 * out, and the same reason this file takes `now` as an argument rather than
 * reading the clock itself: a guard that cannot fix the clock cannot test a
 * boundary.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** A plain 12-hour clock time, built from parts so no locale can vary it. */
export function clockTime(value) {
  // NULL IS NOT A TIME, AND new Date(null) IS THE EPOCH. It parses to
  // 1970-01-01T00:00:00Z, which is a perfectly valid Date, so a NaN check
  // alone let it through and the failed-refresh line read "Showing the list
  // from 10:00 am" when nothing had ever loaded. Caught by the guard.
  if (value === null || value === undefined || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'pm' : 'am'}`;
}

/**
 * "Updated just now", "Updated 1 minute ago", "Updated 7 minutes ago", and the
 * coarser forms a long session needs. The owner specified the first two shapes;
 * hours and days follow rather than letting a page that has been open all day
 * say "Updated 480 minutes ago", which no one reads as a duration.
 *
 * @param {Date|string|number|null} lastLoadedAt  when the last load succeeded
 * @param {Date|string|number} [now]
 * @returns {string} '' when nothing has loaded yet, so a caller can render it
 *   unguarded and show nothing before the first load lands
 */
export function updatedLabel(lastLoadedAt, now = new Date()) {
  if (lastLoadedAt === null || lastLoadedAt === undefined || lastLoadedAt === '') return '';
  const then = lastLoadedAt instanceof Date ? lastLoadedAt : new Date(lastLoadedAt);
  const at = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(then.getTime()) || Number.isNaN(at.getTime())) return '';

  // A CLOCK THAT WENT BACKWARDS READS AS JUST NOW, not as a negative age.
  // Daylight saving and a corrected system clock both do this, and "Updated
  // -3 minutes ago" is the kind of thing a person screenshots.
  const ms = Math.max(0, at.getTime() - then.getTime());

  if (ms < MINUTE) return 'Updated just now';
  if (ms < HOUR) {
    const n = Math.floor(ms / MINUTE);
    return `Updated ${n} minute${n === 1 ? '' : 's'} ago`;
  }
  if (ms < DAY) {
    const n = Math.floor(ms / HOUR);
    return `Updated ${n} hour${n === 1 ? '' : 's'} ago`;
  }
  const n = Math.floor(ms / DAY);
  return `Updated ${n} day${n === 1 ? '' : 's'} ago`;
}

/**
 * What the page says when a refresh failed. The time is the LAST SUCCESSFUL
 * load, which is the whole point: it tells the couple how old what they are
 * looking at is, rather than that something went wrong and nothing else.
 */
export function refreshFailedLine(lastLoadedAt) {
  const t = clockTime(lastLoadedAt);
  return t
    ? `Could not refresh. Showing the list from ${t}.`
    : 'Could not refresh. Please try again.';
}
