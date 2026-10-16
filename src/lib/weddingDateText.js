/**
 * src/lib/weddingDateText.js
 *
 * THE WEDDING DATE IN WORDS, ON ITS OWN CALENDAR DAY.
 *
 * Lane D's finding, launch fix 2. src/components/guests/SendInvitesModal.jsx
 * built the [Wedding date] merge tag for the invitation PREVIEW with
 *
 *   new Date(weddingDate).toLocaleDateString('en-AU', { day, month, year })
 *
 * which is wrong twice over.
 *
 * ── ONE: A DATE-ONLY STRING IS NOT AN INSTANT ──────────────────────────────
 *
 * `weddingDate` is a calendar date, "2026-05-18". `new Date()` reads a bare
 * date-only string as UTC MIDNIGHT, and toLocaleDateString then renders it in
 * the reader's own zone. Every zone west of Greenwich therefore reads the day
 * BEFORE: a couple in Los Angeles or New York previewing an 18 May wedding was
 * shown "17 May 2026". Measured, both zones, before this module existed.
 *
 * A wedding day is a day, not a moment. Appending 'T00:00:00' reads it as
 * local midnight, so the date a couple typed is the date they see, in every
 * zone. src/lib/dashboardDate.js already does this for the same reason, and
 * says so in its own doc comment.
 *
 * ── TWO: THE PREVIEW HAS TO MATCH THE SEND ─────────────────────────────────
 *
 * api/send-invites.js formats the same merge tag with weekday INCLUDED, so the
 * email said "Monday 18 May 2026" while the preview beside it said
 * "18 May 2026". A preview that misdescribes the email is worse than no
 * preview, because the couple approves it.
 *
 * WEDDING_DATE_LOCALE and WEDDING_DATE_PARTS are exported so a guard can read
 * them against api/send-invites.js's own call and fail when the two drift.
 * They are deliberately the server's values, not better ones: matching the
 * email is this module's whole job. Whether the EMAIL should speak en-AU to a
 * couple in Denver is a real question, and a different one, for the owner.
 *
 * ── WHY NOT dashboardDate.js ───────────────────────────────────────────────
 *
 * Because that formatter is NUMERIC and account-scoped, and this is a written,
 * guest-facing date. tests/persistence/dashboard-date-format.mjs holds
 * SendInvitesModal on a list of files that must never import it, for exactly
 * this reason, and that boundary is left intact.
 */

/** The locale api/send-invites.js speaks. Matching it is the point. */
export const WEDDING_DATE_LOCALE = 'en-AU';

/** The parts api/send-invites.js asks for, weekday included. */
export const WEDDING_DATE_PARTS = {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
};

/** A bare date-only string, "2026-05-18". */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The wedding's own calendar day as a Date, read as LOCAL midnight when the
 * value is date-only so no zone can move it.
 *
 * @param {string|number|Date} value
 * @returns {Date|null} null when there is no usable date
 */
export function weddingCalendarDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = typeof value === 'string' && DATE_ONLY.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The wedding date as the invitation writes it, matching what
 * api/send-invites.js sends.
 *
 * @param {string|number|Date} value
 * @returns {string} the written date, or '' when there is no date to write
 */
export function formatWeddingDateText(value) {
  const d = weddingCalendarDate(value);
  if (!d) return '';
  try {
    return d.toLocaleDateString(WEDDING_DATE_LOCALE, WEDDING_DATE_PARTS);
  } catch {
    // Intl throws on a malformed locale tag. A merge tag that cannot be
    // written falls back to its own placeholder upstream, never to a crash.
    return '';
  }
}
