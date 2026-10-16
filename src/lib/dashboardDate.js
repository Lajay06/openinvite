/**
 * src/lib/dashboardDate.js
 *
 * NUMERIC DATES ON THE DASHBOARD, IN THE FORMAT THE ACCOUNT CHOSE.
 *
 * Item 5 of goals/2026-10-08-site-fixes-batch-1.md: the dashboard's written
 * dates ("18 May 2026") become numeric in the account's chosen format,
 * day/month/year by default. Guest-facing pages and every email keep their
 * written dates, and this module is deliberately not imported by any of them.
 *
 * ── WHY ONE FORMATTER AND NOT A FLAG AT EACH CALL SITE ─────────────────────
 *
 * There were six `toLocaleDateString('en-AU', { day, month, year })` calls
 * across five dashboard files, each with its own month style: 'short' in
 * EventDetails, GuestList and Admin, 'long' in SendInvitesModal and
 * DatePicker. Threading a preference through five files would have left five
 * places for the next person to forget. This is the one place that knows.
 *
 * ── THE PREFERENCE IS READ FROM THE CACHE AuthContext ALREADY WRITES ───────
 *
 * Two of these call sites are module-level helpers, not components, so they
 * cannot call useAuth. src/lib/AuthContext.jsx:34 writes the signed-in user to
 * localStorage under `oi_user`, and src/pages/Account.jsx mirrors a preference
 * change into the same key as it saves, so the cache is the established source
 * rather than a second one invented here. A component that already holds the
 * user can pass the format explicitly instead, and SendInvitesModal does.
 *
 * ── NO STATED PREFERENCE MEANS THE BROWSER'S LOCALE, NOT day/month/year ────
 *
 * Lane D's finding, fixed 2026-10-16. This module used to fall back to "dmy"
 * on every path, so a US couple who had never opened the setting read their
 * own wedding as 16/10/2026. The product sells to the US in USD, so the single
 * most likely reader of an unset preference is the one the old default served
 * worst.
 *
 * The fallback is now the order the BROWSER'S OWN locale puts a numeric date
 * in, read from Intl rather than from a list of countries kept by hand. An
 * account that HAS chosen still wins: the locale is consulted only when there
 * is nothing to honor.
 *
 * "dmy" survives as the LAST RESORT, for when Intl cannot answer at all. No
 * cache, unparseable JSON, no field, localStorage throwing in a private
 * window, Intl throwing on a malformed locale tag: every one of those still
 * yields a date rather than an empty cell. A date is never rendered as the
 * empty string because a preference could not be found.
 */

// The formatter's own body needs these two; the re-export below is a separate
// thing and does NOT bring them into local scope.
import { DATE_FORMATS, accountDateFormat } from './dateFormatPreference.js';

// ── THE ORDER RULE LIVES IN ITS OWN MODULE ─────────────────────────────────
//
// Owner ruling 2026-10-16(a): one function answers "which order does this
// couple read dates in", for the web and the app alike. It moved to
// src/lib/dateFormatPreference.js because this module is the NUMERIC dashboard
// formatter, which guest-facing files are forbidden to import
// (tests/persistence/dashboard-date-format.mjs), and the invitation preview
// needs the question without the numeric answer.
//
// Re-exported here, unchanged, so the sixteen modules that already import from
// this file keep working and there is still one definition.
export {
  DATE_FORMATS, DEFAULT_DATE_FORMAT, normalizeDateFormat,
  isUnresolvedLocale, localeDateFormat, accountDateFormat,
} from './dateFormatPreference.js';

/**
 * A date as the dashboard shows it: zero-padded numerals, four-digit year,
 * slashes.
 *
 * @param {string|number|Date} value  an ISO string, a date-only string, a
 *   timestamp or a Date. A date-only string ("2026-05-18") is read as LOCAL
 *   midnight rather than UTC, which is why the 'T00:00:00' is appended: UTC
 *   would render the day before for every account west of Greenwich, and
 *   EventDetails was already doing this by hand for exactly that reason.
 * @param {'dmy'|'mdy'} [format]  defaults to the account's choice, which
 *   defaults to the browser's locale
 * @returns {string} the formatted date, or '' when there is no date to show
 */
export function formatDashboardDate(value, format) {
  if (value === null || value === undefined || value === '') return '';
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear()).padStart(4, '0');
  // An explicit, valid format wins. Anything else defers to the account, which
  // defers to the locale. normalizeDateFormat is NOT used here on purpose: it
  // coerces to 'dmy', which is the behavior this fix exists to remove.
  const chosen = DATE_FORMATS.includes(format) ? format : accountDateFormat();
  return chosen === 'mdy'
    ? `${mm}/${dd}/${yyyy}`
    : `${dd}/${mm}/${yyyy}`;
}

/** The label a settings control uses, so the two cannot disagree. */
export const DATE_FORMAT_LABELS = {
  dmy: 'Day/month/year',
  mdy: 'Month/day/year',
};

/** A worked example beside each choice, built by the same formatter. */
export function dateFormatExample(format) {
  return formatDashboardDate('2026-05-18', format);
}
