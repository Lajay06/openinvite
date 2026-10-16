/**
 * src/mobile/lib/dates.js
 *
 * EVERY DATE THE APP WRITES COMES THROUGH HERE, in the order the couple chose
 * and, when they have not chosen, in the order their phone uses.
 *
 * The couple's choice is User.dateFormat, "dmy" or "mdy", set on the web's
 * Account page and cached by AuthContext under `oi_user`, the same cache
 * src/lib/dashboardDate.js reads. That module USED TO fall back to
 * day/month/year when no choice was made, which was wrong on a phone in the
 * US: a couple who never opened the setting read 16/10/2026 for October 16.
 * That is the reason this module reads the raw value itself, and only a real
 * "dmy" or "mdy" counts as a choice; anything else asks the device locale,
 * through Intl, which month or day comes first.
 *
 * The web has since been fixed the same way (#1098), so dashboardDate.js now
 * asks the browser's locale too and the two agree on the question. They still
 * differ on ONE answer, deliberately and worth knowing: for a YEAR-FIRST
 * locale such as ja-JP or en-CA, deviceDateFormat below looks at whichever of
 * month or day comes first and says "dmy", while dashboardDate.js compares
 * their positions and says "mdy". Nothing here can diverge because of it,
 * since formatAppDate always passes an explicit format, but a couple on a
 * Japanese device would read a different order on the web than in the app.
 * For the owner to rule on.
 *
 * Two shapes, as the web has them:
 *   - formatAppDate: numeric, for everything the couple reads in the app
 *     (mobile parity 6). 10/16/2026 or 16/10/2026.
 *   - formatAppDateWritten: the month as a word, for text that leaves the
 *     app and is read by guests (an invitation's [Wedding date], the date on
 *     a starter invitation design). October 16, 2026 or 16 October 2026.
 *
 * A date-only string ("2026-10-16") is read as LOCAL midnight. `new Date()`
 * on it alone is UTC midnight, which is the day before for every couple west
 * of Greenwich; SendInvitesScreen did exactly that.
 *
 * No other file in src/mobile calls toLocaleDateString, toLocaleString with a
 * date, Intl.DateTimeFormat or formatDashboardDate:
 * tests/persistence/mobile-app-dates.mjs holds that line.
 */

import { DATE_FORMATS, formatDashboardDate } from '../../lib/dashboardDate.js';

/** "mdy" when the locale writes the month before the day, else "dmy". */
export function deviceDateFormat(locale) {
  try {
    const parts = new Intl.DateTimeFormat(locale || undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date(2026, 4, 18));
    const first = parts.find((p) => p.type === 'month' || p.type === 'day');
    return first?.type === 'month' ? 'mdy' : 'dmy';
  } catch {
    return 'dmy';
  }
}

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
 * The month as a word, in the couple's order: "October 16, 2026" or
 * "16 October 2026". `month: 'short'` gives "Oct 16, 2026".
 */
export function formatAppDateWritten(value, { month = 'long', format } = {}) {
  const d = toDate(value);
  if (!d) return '';
  const locale = (format || appDateFormat()) === 'mdy' ? 'en-US' : 'en-GB';
  return d.toLocaleDateString(locale, { day: 'numeric', month, year: 'numeric' });
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
