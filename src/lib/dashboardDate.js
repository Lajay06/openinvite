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
 * EVERY FAILURE PATH IS "dmy". No cache, unparseable JSON, no field, a value
 * that is not one of the two, localStorage throwing in a private window: all
 * of them fall back to day/month/year, which is the item's default and what
 * every existing account reads as. A date is never rendered as the empty
 * string because a preference could not be found.
 */

/** The two the schema allows. User.dateFormat is enum ["dmy","mdy"]. */
export const DATE_FORMATS = ['dmy', 'mdy'];

export const DEFAULT_DATE_FORMAT = 'dmy';

/** Anything that is not one of the two is the default. */
export function normalizeDateFormat(value) {
  return DATE_FORMATS.includes(value) ? value : DEFAULT_DATE_FORMAT;
}

/**
 * The signed-in account's choice, from the cache AuthContext writes.
 *
 * Wrapped in try/catch because localStorage throws rather than returning null
 * in a private window with site data blocked, and a thrown date formatter
 * takes the page with it.
 */
export function accountDateFormat() {
  try {
    const raw = localStorage.getItem('oi_user');
    if (!raw) return DEFAULT_DATE_FORMAT;
    return normalizeDateFormat(JSON.parse(raw)?.dateFormat);
  } catch {
    return DEFAULT_DATE_FORMAT;
  }
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
 * @param {'dmy'|'mdy'} [format]  defaults to the account's choice
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
  return normalizeDateFormat(format ?? accountDateFormat()) === 'mdy'
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
