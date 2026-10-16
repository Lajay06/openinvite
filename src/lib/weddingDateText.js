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
 * api/send-invites.js formatted the same merge tag with weekday INCLUDED, so
 * the email said "Monday 18 May 2026" while the preview beside it said
 * "18 May 2026". A preview that misdescribes the email is worse than no
 * preview, because the couple approves it.
 *
 * ── ONE WRITTEN STYLE, IN THE COUPLE'S OWN ORDER ───────────────────────────
 *
 * Owner ruling 2026-10-16(b). This module is now the ONE written-date source
 * for the invitation: the email body (through emailTemplate.js), the merge tag
 * the server expands, and the preview the couple approves all come through
 * here. Weekday, month as a word, day, year, ordered by the couple's format:
 *
 *   mdy   Monday, June 14, 2027     (en-US)
 *   dmy   Monday 14 June 2027       (en-AU)
 *
 * The order is the couple's CHOSEN format, which is why callers pass it in
 * rather than this module reading a cache: the server has no browser to read.
 * The client sends the format it actually resolved for the preview, so the
 * preview and the email are formatted from the same input, and an absent
 * format means "dmy" rather than a guess.
 *
 * The previous question, whether the email should speak en-AU to a couple in
 * Denver, is answered: it should not. A US couple's guests now read US order.
 * That is a deliberate change to outbound copy.
 *
 * ── WHY NOT dashboardDate.js ───────────────────────────────────────────────
 *
 * Because that formatter is NUMERIC and account-scoped, and this is a written,
 * guest-facing date. tests/persistence/dashboard-date-format.mjs holds
 * SendInvitesModal on a list of files that must never import it, for exactly
 * this reason, and that boundary is left intact.
 */

/** The order used when a caller states none. Owner ruling: never a guess. */
export const DEFAULT_WRITTEN_FORMAT = 'dmy';

/**
 * The locale that writes each order. en-US gives "Monday, June 14, 2027";
 * en-AU gives "Monday 14 June 2027". These two shapes ARE the ruling, so they
 * are named here once and read by the guard rather than retyped at call sites.
 */
export const WRITTEN_DATE_LOCALES = { mdy: 'en-US', dmy: 'en-AU' };

/** The parts every written invitation date asks for, weekday included. */
export const WEDDING_DATE_PARTS = {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
};

/**
 * The same date without its weekday, for a STARTER INVITATION's date block.
 *
 * Owner ruling 2026-10-16(c), and the one place the written style is not
 * identical everywhere. An email is a sentence a guest reads, so it names the
 * day: "Monday 14 June 2027". A starter invitation's date block is artwork on
 * a card, and the app's starter has never carried a weekday. Matching the app
 * is the explicit requirement, and adding a weekday to invitation artwork is a
 * design change nobody asked for, so the weekday is dropped here and ONLY
 * here. The order is still the couple's.
 */
export const STARTER_DATE_PARTS = {
  day: 'numeric', month: 'long', year: 'numeric',
};

/**
 * The locale for a couple's chosen order. Anything that is not 'mdy' is the
 * default, so a missing or malformed format can never produce a third style.
 */
export function writtenDateLocale(format) {
  return WRITTEN_DATE_LOCALES[format === 'mdy' ? 'mdy' : DEFAULT_WRITTEN_FORMAT];
}

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
 * The wedding date as the invitation writes it, in the couple's order. The
 * email, the merge tag and the preview all call this one function.
 *
 * @param {string|number|Date} value
 * @param {'dmy'|'mdy'} [format] the couple's chosen order; absent means dmy
 * @param {{weekday?: boolean}} [opts] weekday: false for a starter
 *   invitation's date block, which is artwork rather than a sentence
 * @returns {string} the written date, or '' when there is no date to write
 */
export function formatWeddingDateText(value, format, { weekday = true } = {}) {
  const d = weddingCalendarDate(value);
  if (!d) return '';
  try {
    return d.toLocaleDateString(writtenDateLocale(format),
      weekday ? WEDDING_DATE_PARTS : STARTER_DATE_PARTS);
  } catch {
    // Intl throws on a malformed locale tag. A merge tag that cannot be
    // written falls back to its own placeholder upstream, never to a crash.
    return '';
  }
}
