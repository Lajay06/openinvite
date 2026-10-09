/**
 * src/lib/rsvpDeadline.js
 *
 * THE REPLY-BY DATE: ONE PLACE FOR THE RULE, THE FORMAT AND THE WORDS.
 *
 * Item 2 of goals/2026-10-09-reply-lifecycle.md. The couple sets a date, the
 * guest site stops offering the two buttons after it, and the server refuses a
 * status write with the same sentence the guest was shown.
 *
 * ── WHY THE SERVER IMPORTS THIS TOO ───────────────────────────────────────
 *
 * The goal's ruling is that a form which only LOOKS closed is not closed. So
 * api/rsvp-submit.js imports this module (api/ already imports from src/lib in
 * five places, so this is the established direction, not a new one). One
 * function decides open or closed and one function writes the sentence, which
 * is the only way the page and the endpoint cannot drift apart: a refusal
 * worded differently from the screen that caused it reads like a bug to the
 * guest, and a client-only check is not a rule at all.
 *
 * ── THE STORED FORMAT IS A CALENDAR DATE, AND IT HAS TO BE ────────────────
 *
 * Stored as YYYY-MM-DD with no time, per the owner's decision, in
 * WeddingDetails.rsvpContent.rsvpDeadline, the field the guest site already
 * read in nine places.
 *
 * A DEADLINE IS A DAY, NOT AN INSTANT, and the nine existing readers proved
 * why that distinction has teeth. They did
 * `new Date(value).toLocaleDateString()`, and `new Date('2027-05-01')` is
 * parsed as UTC midnight while toLocaleDateString renders in the viewer's own
 * zone. In Los Angeles that prints 4/30/2027: the guest is told a deadline one
 * day EARLIER than the couple typed. Measured, not assumed. Every reader goes
 * through formatDeadline now, which builds the date in local time so the
 * calendar day survives.
 *
 * ── THE OLD SHAPE STILL PARSES ────────────────────────────────────────────
 *
 * Nothing ever wrote this field (no editor existed, and all 19 sample-content
 * files set it to null), but a record could hold a full ISO timestamp from
 * some earlier path, so normalizeDeadline accepts both. A timestamp is read
 * for its UTC calendar date, because the shape that would have produced one is
 * a date picker's midnight-UTC value, and that is the day the couple picked.
 *
 * ── CLOSING TIME IS END OF DAY, UTC, AND THAT IS A STOPGAP ────────────────
 *
 * The goal says midnight at the end of the date in the wedding's time zone,
 * falling back to the venue's or to UTC, with the choice recorded. THERE IS NO
 * WEDDING TIME ZONE FIELD AND NO VENUE ONE EITHER: src/lib/ics.js says so in
 * its own header, that the venue's zone "isn't captured". So this closes at
 * 00:00:00Z on the day after the deadline, and GOAL 6 ADDS THE FIELD that
 * makes it exact.
 *
 * What that costs until then: a guest west of Greenwich can be refused while
 * it is still the deadline day where they are, by up to the offset, and a
 * guest east of it keeps the form a few hours past their own midnight. The
 * couple can always clear or move the date, which reopens the form, so no
 * guest is stuck behind this.
 */

/** Accepts a bare calendar date or a full ISO timestamp. @returns {string|null} YYYY-MM-DD */
export function normalizeDeadline(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  // ITS UTC CALENDAR DATE, for the reason in the header: a timestamp in this
  // field came from a date picker's midnight, and the UTC day is the day that
  // was picked.
  return parsed.toISOString().slice(0, 10);
}

/**
 * The deadline as a Date at LOCAL midnight, so formatting it cannot move the
 * calendar day. Never use this for comparisons; use deadlineHasPassed.
 * @returns {Date|null}
 */
export function deadlineDate(value) {
  const iso = normalizeDeadline(value);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * The date as the guest reads it, in their own locale, on the day the couple
 * actually picked. Returns '' when there is no deadline, so a caller can
 * render it unguarded.
 */
export function formatDeadline(value, locale = undefined) {
  const d = deadlineDate(value);
  return d ? d.toLocaleDateString(locale) : '';
}

/**
 * Whether replies have closed: true from 00:00:00Z on the day after the
 * deadline. No deadline, or an unreadable one, is always open.
 */
export function deadlineHasPassed(value, now = new Date()) {
  const iso = normalizeDeadline(value);
  if (!iso) return false;
  const [y, m, d] = iso.split('-').map(Number);
  return now.getTime() >= Date.UTC(y, m - 1, d + 1);
}

/** The heading the guest sees. Verbatim from the goal file. */
export const CLOSED_HEADING = 'Replies have closed.';

/**
 * The sentence the guest sees, and the one the server returns when it refuses
 * a status write. Verbatim from the goal file. One function so the two cannot
 * say different things.
 *
 * @param {string} coupleNames how the couple is named on their own site
 * @param {string} value       the stored deadline
 * @param {string} [locale]    the reader's locale, for the date
 */
export function closedBody(coupleNames, value, locale = undefined) {
  const names = (coupleNames || '').trim() || 'The couple';
  return `${names} needed final numbers by ${formatDeadline(value, locale)}, `
    + 'so this form is now closed. If your plans have changed, or you did not '
    + 'get the chance to reply, send them a note below and they will see it '
    + 'straight away.';
}
