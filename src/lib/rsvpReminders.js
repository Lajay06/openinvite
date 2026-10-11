/**
 * src/lib/rsvpReminders.js
 *
 * WHEN THE TWO REMINDERS GO, AND WHETHER THE SWITCH CAN BE TURNED ON.
 *
 * Item 1 of goals/2026-10-11-reply-by-reminders.md. The couple sets a reply-by
 * date; a switch beside it emails anyone still to reply, ten days before and
 * two days before, at 9 am in their own timezone.
 *
 * ── ALL OF IT IS PURE, AND THAT IS THE POINT ───────────────────────────────
 *
 * The component around this renders; the cron in item 2 decides what is due.
 * Both need the same answers to "which dates" and "is it too late", and a
 * second copy of that arithmetic is how a switch comes to promise a send the
 * cron will never make. So the dates, the eligibility and the four lines live
 * here, where a guard drives them with a fixed clock.
 *
 * ── DATES ARE CALENDAR DAYS, NOT INSTANTS ──────────────────────────────────
 *
 * rsvpContent.rsvpDeadline is YYYY-MM-DD, a day rather than a moment, which is
 * src/lib/rsvpDeadline.js's own decision and the reason it is kept here: ten
 * days before a DAY is another day, and 9 am on that day in the couple's
 * timezone is what the cron looks for. Doing this in UTC instants would drift
 * a day either side of the dateline for no gain.
 */

/** The two sends, in order. 1 goes first. */
export const SEND_OFFSETS = Object.freeze([
  { send: 1, daysBefore: 10 },
  { send: 2, daysBefore: 2 },
]);

/** The hour, local to the couple, that the cron aims at. */
export const SEND_HOUR = 9;

/**
 * The timezone used when a wedding has none stored.
 *
 * Owner ruling 2026-10-11: a switch turned on by an old client leaves no
 * reminderTimezone, and the cron treats those as Australia/Sydney and logs a
 * COUNT of them. A default is a guess, so it is one place and it is named.
 */
export const FALLBACK_TIMEZONE = 'Australia/Sydney';

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD, or null. Never a locale string: this is a stored key. */
function toKey(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** A YYYY-MM-DD key read as a calendar day, at UTC midnight. */
function fromKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const d = new Date(`${key}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Both send days for a deadline, whether or not they are still ahead.
 *
 * @param {string} deadline YYYY-MM-DD
 * @returns {Array<{send: number, date: string}>} empty for an unreadable date
 */
export function reminderSendDates(deadline) {
  const day = fromKey(deadline);
  if (!day) return [];
  return SEND_OFFSETS.map(({ send, daysBefore }) => ({
    send,
    date: toKey(new Date(day.getTime() - daysBefore * DAY_MS)),
  }));
}

/**
 * The sends still ahead of `now`.
 *
 * A SEND DAY COUNTS AS AHEAD WHILE IT IS STILL TODAY, which is the boundary
 * this got wrong first time. The filter was `date > today`, so on the morning
 * of the tenth day before, with the 9 am send still hours away, that send was
 * reported as already gone: a couple turning the switch on at breakfast would
 * have been told only the second reminder would go. `>=` is the fix, and it is
 * safe against doubling because the per-guest stamp in Guest.send_history is
 * what makes a send idempotent, not this comparison.
 *
 * ONE EDGE THIS CANNOT SEE, AND IT IS REPORTED RATHER THAN GUESSED. Day
 * granularity cannot tell 8 am on the send day from 10 am on the send day, and
 * at 10 am that day's 9 am window has passed. Such a send is counted as ahead
 * here and the hourly cron in item 2 will simply never find it due. The couple
 * would be told about a reminder that does not go, on one day, for one send.
 * The hour lives in the cron, which is held, so this is for the owner.
 *
 * @param {string} deadline YYYY-MM-DD
 * @param {Date} now
 * @returns {Array<{send: number, date: string}>}
 */
export function upcomingSends(deadline, now = new Date()) {
  const today = toKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
  if (!today) return [];
  return reminderSendDates(deadline).filter(({ date }) => date >= today);
}

/**
 * Whether the switch may be turned on at all.
 *
 * Two reasons it may not, and they are different sentences on screen: no date
 * at all, and a date so close that neither send is still ahead. The owner's
 * ruling spells the second one out: "if none, the switch says so and stays
 * off".
 *
 * @returns {{ok: boolean, reason: null | 'no-date' | 'too-late', sends: Array}}
 */
export function switchAvailability(deadline, now = new Date()) {
  if (!fromKey(deadline)) return { ok: false, reason: 'no-date', sends: [] };
  const sends = upcomingSends(deadline, now);
  if (sends.length === 0) return { ok: false, reason: 'too-late', sends: [] };
  return { ok: true, reason: null, sends };
}

/** The couple's own timezone, as the browser reports it at switch-on. */
export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

/** The timezone a wedding's reminders run in, stored or fallen back. */
export function reminderTimezoneOf(rsvpContent) {
  const tz = rsvpContent?.reminderTimezone;
  return typeof tz === 'string' && tz.trim() ? tz.trim() : FALLBACK_TIMEZONE;
}

/** The sends already stamped as gone, as an ascending list of send numbers. */
export function sentSends(rsvpContent) {
  const rows = Array.isArray(rsvpContent?.remindersSent) ? rsvpContent.remindersSent : [];
  return [...new Set(rows.map((r) => Number(r?.send)).filter((n) => n === 1 || n === 2))].sort();
}

/** One stamped send, or undefined. */
function sentRow(rsvpContent, send) {
  const rows = Array.isArray(rsvpContent?.remindersSent) ? rsvpContent.remindersSent : [];
  return rows.find((r) => Number(r?.send) === send);
}

export const LABEL = 'Remind guests who have not replied';
export const NO_DATE_LINE = 'Set a reply-by date first.';
export const OFF_LINE = 'Off. No more reminders will go.';
export const BOTH_SENT_LINE = 'Both reminders sent.';

/**
 * A date as the couple reads it. The same written form the guest site uses for
 * the deadline, so the two never disagree about which day is meant.
 */
export function writtenDay(key) {
  const d = fromKey(key);
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

/**
 * The line under the switch, whatever state it is in.
 *
 * Every sentence is the owner's, verbatim. The placeholders are the only
 * substitutions: the two dates, the count, and the timezone.
 *
 * @param {object} rsvpContent the couple's stored rsvpContent
 * @param {Date} now
 * @returns {string}
 */
export function reminderLine(rsvpContent, now = new Date()) {
  const deadline = rsvpContent?.rsvpDeadline;
  const avail = switchAvailability(deadline, now);
  if (!rsvpContent?.remindersOn) {
    if (avail.reason === 'no-date') return NO_DATE_LINE;
    return OFF_LINE;
  }

  const all = reminderSendDates(deadline);
  const sent = sentSends(rsvpContent);
  if (sent.length >= 2) return BOTH_SENT_LINE;

  if (sent.length === 1) {
    const first = sentRow(rsvpContent, sent[0]);
    const next = all.find((s) => s.send !== sent[0]);
    const n = Number(first?.count);
    return `Sent ${writtenDay(first?.date || all.find((s) => s.send === sent[0])?.date)} to ${Number.isFinite(n) ? n : 0} guests. Next on ${writtenDay(next?.date)}.`;
  }

  const [one, two] = all;
  return `We will email anyone still to reply on ${writtenDay(one?.date)} and ${writtenDay(two?.date)}, at 9 am ${reminderTimezoneOf(rsvpContent)}.`;
}

/**
 * The rsvpContent to write when the switch is turned on or off.
 *
 * ON CAPTURES THE TIMEZONE, because nothing in this product stores one: no
 * entity mirror mentions a timezone and the only one in the server tree is a
 * hardcoded UTC in an email formatter. The browser's is therefore the source,
 * and it is captured at the moment of the decision rather than read later,
 * when the couple might be somewhere else.
 *
 * OFF KEEPS remindersSent, because what has already gone is history and
 * turning the switch off does not unsend it. It cancels what is still to come,
 * which is what `remindersOn: false` means to the cron.
 *
 * @param {object} rsvpContent
 * @param {boolean} on
 * @param {string} [timezone] defaults to the browser's
 * @returns {object} never mutating the input
 */
export function withRemindersSwitch(rsvpContent, on, timezone) {
  const base = { ...(rsvpContent || {}) };
  if (!on) return { ...base, remindersOn: false };
  return {
    ...base,
    remindersOn: true,
    reminderTimezone: (typeof timezone === 'string' && timezone.trim()) || browserTimezone(),
    remindersSent: Array.isArray(base.remindersSent) ? base.remindersSent : [],
  };
}
