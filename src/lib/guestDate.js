/**
 * guestDate — parsing a stored wedding date into a real Date.
 *
 * THE BUG THIS EXISTS FOR. Call sites did `new Date(d + 'T00:00:00')` to pin a
 * date-only string to local midnight instead of UTC. That is correct for
 * "2027-06-21". `weddingDetails.weddingDate` is stored as a FULL ISO timestamp,
 * so the same line produced "2027-06-21T10:21:16.314ZT00:00:00" — an Invalid
 * Date. Every guest of every wedding saw `Invalid Date` as the day header on the
 * celebration page, in all 20 universes.
 *
 * IT SURVIVED BECAUSE THE GUARD COULD NOT FIRE. The call was wrapped in
 * try/catch, but `toLocaleDateString` RETURNS the string "Invalid Date" rather
 * than throwing, so the catch never ran and the code read as defended.
 * Before trusting a try/catch, check that the failure mode throws.
 *
 * The length test is the pattern already used by src/lib/emailTemplate.js.
 */

/** Parse a stored date that may be date-only OR a full ISO timestamp. */
export function parseWeddingDate(value) {
  if (!value) return null;
  const s = String(value);
  // Date-only ("2027-06-21") is pinned to LOCAL midnight, so the calendar day
  // a couple picked is the day their guests read. A full timestamp already
  // carries its own time and must not have one appended.
  const d = new Date(s.length <= 10 ? `${s}T00:00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a stored date, or return '' — never the string "Invalid Date". */
export function formatWeddingDate(value, locale, options) {
  const d = parseWeddingDate(value);
  return d ? d.toLocaleDateString(locale, options) : '';
}
