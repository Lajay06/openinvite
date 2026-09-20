/**
 * src/lib/calendarFeedSync.js — THE ONE PLACE THE PROJECTION IS WRITTEN.
 *
 * Five things change a couple's schedule: the hub's delete, update and create,
 * its run-sheet swap, and Ava's create_schedule. The first four all end in
 * ScheduleHub's loadItems(), which calls syncCalendarFeed() with the rows it
 * just loaded and the wedding it just read; Ava calls syncMyCalendarFeed()
 * after the row is written. Nothing else writes calendarFeed.
 *
 * SELF-HEALING, BY CONSTRUCTION. Because the hub syncs on load and not only on
 * write, a couple whose schedule predates this file gets their projection the
 * first time they open Schedule, and a write that failed (a closed tab, a lost
 * connection) is repaired on the next visit. The write is skipped when the
 * stored feed already matches, so an ordinary page load costs nothing.
 *
 * THROUGH /api/my-wedding-details, WITH THE COUPLE'S OWN TOKEN. WeddingDetails
 * .update is owner-scoped, so only the owner's session can write it — and the
 * endpoint re-projects the value, so the allowlist holds server-side too.
 * Never a raw base44.entities.WeddingDetails.update.
 *
 * A COUPLE WITH NO WEDDING RECORD IS NOT OWED ONE. putMyWeddingDetails creates
 * a record when none exists; a feed sync must never be the thing that does
 * that, or onboarding meets a half-made wedding. No record, no write — they
 * have no feed link to mint anyway (api/schedule-feed-url.js says no-wedding).
 */
import { getMyRecords, getMyWeddingDetails, putMyWeddingDetails } from './resolveMyWedding';
import { projectScheduleForFeed, calendarFeedIsCurrent } from './calendarFeedProjection';

/**
 * Writes the projection of `rows` onto `wedding` when it differs from what is
 * stored there.
 *
 * @param {Array<object>} rows     the couple's Schedule rows, as the hub holds them
 * @param {object|null} wedding    the couple's WeddingDetails record (with calendarFeed)
 * @param {(fields: object) => Promise<string>} [put]  injectable for tests
 * @returns {Promise<boolean>} true when a write happened
 */
export async function syncCalendarFeed(rows, wedding, put = putMyWeddingDetails) {
  if (!wedding?.id) return false;
  if (calendarFeedIsCurrent(wedding.calendarFeed, rows)) return false;
  await put({ calendarFeed: projectScheduleForFeed(rows) });
  return true;
}

/**
 * The same, loading both halves itself — for a writer that does not already
 * hold the rows and the wedding (Ava). Failure is the caller's to report;
 * the next hub load repairs it regardless.
 */
export async function syncMyCalendarFeed() {
  const [rows, wedding] = await Promise.all([getMyRecords('Schedule'), getMyWeddingDetails()]);
  return syncCalendarFeed(rows, wedding);
}
