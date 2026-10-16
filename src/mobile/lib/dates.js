/**
 * src/mobile/lib/dates.js
 *
 * EVERY DATE THE APP WRITES COMES THROUGH HERE, in the order the couple chose
 * and, when they have not chosen, in the order their phone uses.
 *
 * The couple's choice is User.dateFormat, "dmy" or "mdy", set on the web's
 * Account page and cached by AuthContext under `oi_user`. Only a real "dmy"
 * or "mdy" counts as a choice; anything else asks the phone's locale.
 *
 * ONE RULE, ONE WRITTEN STYLE, SHARED WITH THE WEB (owner rulings 2026-10-16a
 * and b). The phone's order is localeDateFormat from
 * src/lib/dateFormatPreference.js, the same function the web asks, so a
 * year-first locale (ja-JP, en-CA) reads month-first in both. deviceDateFormat
 * stays exported under its old name because the app's callers and
 * tests/persistence/date-order-one-rule.mjs name it; it is that function now,
 * not a copy of it.
 *
 * The written date is formatWeddingDateText from src/lib/weddingDateText.js,
 * which writes the invitation email, so the app's preview of an invitation
 * equals what the guest receives, weekday included:
 *   mdy   Monday, June 14, 2027
 *   dmy   Monday 14 June 2027
 * The email is written in whatever order the client sends, so
 * SendInvitesScreen resolves the order once and passes the same value to the
 * preview and to /api/send-invites.
 *
 * Two shapes, as the web has them:
 *   - formatAppDate: numeric, for everything the couple reads in the app
 *     (mobile parity 6). 10/16/2026 or 16/10/2026.
 *   - formatAppDateWritten: the invitation's written date, for text that
 *     leaves the app and is read by guests (an invitation's [Wedding date],
 *     the date on a starter invitation design, which has no weekday).
 *
 * A date-only string ("2026-10-16") is read as LOCAL midnight. `new Date()`
 * on it alone is UTC midnight, which is the day before for every couple west
 * of Greenwich; SendInvitesScreen did exactly that.
 *
 * No other file in src/mobile calls toLocaleDateString, toLocaleString with a
 * date, Intl.DateTimeFormat or formatDashboardDate:
 * tests/persistence/mobile-app-dates.mjs holds that line.
 */

import { formatDashboardDate } from '../../lib/dashboardDate.js';
import { DATE_FORMATS, localeDateFormat } from '../../lib/dateFormatPreference.js';
import { formatWeddingDateText } from '../../lib/weddingDateText.js';

/** "mdy" when the phone's locale writes the month before the day, else "dmy". The web's rule. */
export const deviceDateFormat = (locale) => localeDateFormat(locale || undefined);

/** The couple's choice when they made one, else the phone's. */
export function appDateFormat(locale) {
  try {
    const raw = localStorage.getItem('oi_user');
    const chosen = raw ? JSON.parse(raw)?.dateFormat : null;
    if (DATE_FORMATS.includes(chosen)) return chosen;
  } catch { /* private mode or bad JSON: ask the phone */ }
  return deviceDateFormat(locale);
}

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Numeric, in the couple's order: 10/16/2026 or 16/10/2026. '' for no date. */
export function formatAppDate(value, format) {
  return formatDashboardDate(value, format || appDateFormat());
}

/**
 * The invitation email's written date, in the couple's order: "Monday, June
 * 14, 2027" or "Monday 14 June 2027". '' for no date. `weekday: false` is the
 * starter invitation design's form, "June 14, 2027" or "14 June 2027", the
 * same string the web's starter writes (lane A's ruling, accepted).
 */
export function formatAppDateWritten(value, { format, weekday = true } = {}) {
  return formatWeddingDateText(value, format || appDateFormat(), { weekday });
}

/** "3:05pm", the app's time style, the same on every phone. */
export function formatAppTime(value) {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, '').toLowerCase();
}

/** A numeric date and its time: "10/16/2026, 3:05pm". */
export function formatAppDateTime(value, format) {
  const d = toDate(value);
  if (!d) return '';
  return `${formatAppDate(d, format)}, ${formatAppTime(d)}`;
}
