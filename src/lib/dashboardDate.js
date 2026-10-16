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

/** The two the schema allows. User.dateFormat is enum ["dmy","mdy"]. */
export const DATE_FORMATS = ['dmy', 'mdy'];

export const DEFAULT_DATE_FORMAT = 'dmy';

/** Anything that is not one of the two is the default. */
export function normalizeDateFormat(value) {
  return DATE_FORMATS.includes(value) ? value : DEFAULT_DATE_FORMAT;
}

/**
 * Is this resolved locale tag the root locale, meaning Intl had no locale
 * information to work from?
 *
 * Exported so it can be asserted directly. Passing 'und' INTO
 * Intl.DateTimeFormat does not reproduce the condition, because ICU resolves
 * an explicit 'und' to the runtime default and reports that instead, which is
 * how a first attempt at asserting this passed on one machine and failed on
 * another.
 */
export function isUnresolvedLocale(resolved) {
  return /^und\b/.test(String(resolved ?? ''));
}

/**
 * The order the reader's own locale puts a numeric date in, used ONLY when the
 * account has stated no preference.
 *
 * Read from Intl, by asking for a numeric date and seeing which part comes
 * first, rather than from a hand-kept list of countries that would be wrong
 * the day it was written. A locale that puts the year first (en-CA, ja-JP,
 * zh-CN, hu-HU) still puts its month before its day, so it reads as "mdy":
 * of the two orders this module offers, that is the one that agrees with it.
 *
 * @param {string} [locale] a BCP 47 tag; omitted means the browser's own.
 * @returns {'dmy'|'mdy'}
 */
export function localeDateFormat(locale) {
  try {
    const fmt = new Intl.DateTimeFormat(locale, {
      day: 'numeric', month: 'numeric', year: 'numeric',
    });
    // AN UNRESOLVED LOCALE IS NOT A LOCALE. A runtime with no locale at all,
    // which is the normal state of a CI runner and of a server with no LANG
    // set, resolves to the root locale "und". Root is year-month-day, so its
    // month precedes its day and the naive reading of the parts below would
    // call it "mdy" and quietly change the answer for every account on an
    // unlocalized runtime. There is no locale information here, so this defers
    // to the documented last resort instead of inventing one. A browser always
    // reports a real locale, so this path is not reachable from the product.
    if (isUnresolvedLocale(fmt.resolvedOptions().locale)) return DEFAULT_DATE_FORMAT;
    // A fixed date whose day and month cannot be confused for one another.
    const parts = fmt.formatToParts(new Date(Date.UTC(2026, 4, 18)));
    const month = parts.findIndex((part) => part.type === 'month');
    const day = parts.findIndex((part) => part.type === 'day');
    if (month === -1 || day === -1) return DEFAULT_DATE_FORMAT;
    return month < day ? 'mdy' : 'dmy';
  } catch {
    // Intl throws RangeError on a malformed tag, and this must not take the
    // page with it.
    return DEFAULT_DATE_FORMAT;
  }
}

/**
 * The signed-in account's choice, from the cache AuthContext writes, falling
 * back to the browser's locale when the account has not chosen.
 *
 * Wrapped in try/catch because localStorage throws rather than returning null
 * in a private window with site data blocked, and is simply absent in Node,
 * and a thrown date formatter takes the page with it.
 */
export function accountDateFormat() {
  let stored;
  try {
    const raw = localStorage.getItem('oi_user');
    stored = raw ? JSON.parse(raw)?.dateFormat : undefined;
  } catch {
    stored = undefined;
  }
  // A STATED preference wins. Anything else, including a value outside the
  // enum, means nothing was stated, so the locale answers.
  return DATE_FORMATS.includes(stored) ? stored : localeDateFormat();
}

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
