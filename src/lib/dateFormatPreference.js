/**
 * src/lib/dateFormatPreference.js
 *
 * WHAT ORDER DOES THIS COUPLE READ DATES IN? Asked once, answered here.
 *
 * Owner ruling 2026-10-16(a): the web and the app derive day/month order from
 * the SAME function, and a year-first locale resolves to month-first.
 *
 * ── WHY THIS IS ITS OWN MODULE ─────────────────────────────────────────────
 *
 * It began inside src/lib/dashboardDate.js, which is the NUMERIC dashboard
 * formatter. That made the order rule unreachable without importing the
 * numeric formatter too, and tests/persistence/dashboard-date-format.mjs
 * deliberately forbids guest-facing files from importing that module at all:
 * a numeric date on an invitation preview would misdescribe the email. So
 * SendInvitesModal could not ask the question without breaking a boundary that
 * exists for a good reason.
 *
 * The question and the numeric rendering are two different things. This file
 * is the question. dashboardDate.js imports it and keeps its own public API
 * unchanged, so the sixteen modules that already import from there are
 * untouched.
 *
 * ── THE ORDER RULE ─────────────────────────────────────────────────────────
 *
 * A stated preference wins. Otherwise the reader's own locale decides, read
 * from Intl rather than from a hand-kept list of countries that would be wrong
 * the day it was written. A locale that puts the YEAR first (en-CA, ja-JP,
 * zh-CN, hu-HU) still puts its month before its day, so it resolves to "mdy":
 * owner ruling, and of the two orders the product offers it is the one that
 * agrees with such a locale.
 *
 * "dmy" is the LAST RESORT, not the default for everyone. That distinction is
 * the whole point of the 2026-10-16 fix: the old code answered "dmy" on every
 * path, so a US couple who had never opened the setting read 16/10/2026.
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
 * The order a locale puts a numeric date in. THE one order function.
 *
 * @param {string} [locale] a BCP 47 tag; omitted means the reader's own.
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
 * The signed-in account's order: their choice when they made one, else their
 * browser's locale.
 *
 * src/lib/AuthContext.jsx writes the signed-in user to localStorage under
 * `oi_user`, and src/pages/Account.jsx mirrors a preference change into the
 * same key as it saves, so the cache is the established source rather than a
 * second one invented here.
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
