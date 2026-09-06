/**
 * src/lib/weddingCountdown.js
 *
 * HOW MANY DAYS, AND HOW TO SAY IT. One computation, one vocabulary, five
 * surfaces.
 *
 * ── WHAT WENT WRONG ────────────────────────────────────────────────────────
 *
 * Owner report: on the wedding day the daily brief read **"Happy 0 day"**.
 *
 * It is a generated sentence, and the reason it could be generated is in
 * DailyUpdate.jsx's prompt: the model was handed `(0 days away)` as a bare
 * number and asked for a "days headline", with nothing telling it what 0
 * means. The authored fallbacks beside it get 0 and 1 right, so the couples
 * who saw the bug were the ones with enough data for Ava to speak at all.
 *
 * The same family of defect was sitting in four other places, each computing
 * the number itself and each phrasing it differently:
 *
 *   Layout.jsx:224            `${daysToGo} days to go`   -> "1 days to go"
 *   Layout.jsx:225            'Your wedding day has arrived!'  — an exclamation
 *                             mark in product chrome, and it fires for every
 *                             day AFTER the wedding, forever
 *   NextUp.jsx:83             `${daysUntil} days to go`  -> "1 days to go",
 *                             "0 days to go", "-5 days to go"
 *   DailyUpdate.jsx:517       > 0 ? `${n} days to go` : "Today's the day"
 *                             -> "Today's the day" for the rest of the account
 *   weeklyDigestEmailTemplate subject line: "0 days to go"
 *
 * RSVPPage.jsx:671 already had it right, and its version is the one this
 * module generalises.
 *
 * ── TWO THINGS THAT HAVE TO BE RIGHT ───────────────────────────────────────
 *
 * 1. THE COUNT IS BETWEEN CALENDAR DAYS, NOT BETWEEN INSTANTS.
 *    `Math.ceil((new Date(dateStr) - new Date()) / 86400000)` was in three
 *    files. `new Date('2027-06-12')` is midnight UTC and `new Date()` is now,
 *    so the answer moves with the hour the couple happens to look: the same
 *    calendar day can read 1 in the morning and 0 in the evening. Both dates
 *    are floored to local midnight first, which is what a person means by
 *    "how many days until".
 *
 * 2. AFTER THE WEDDING IS A STATE, NOT A NEGATIVE NUMBER.
 *    Ava spec section 11: after the wedding date the briefing enters a
 *    wrap-up state, and then goes quiet on purpose. So `isPast` is exported
 *    and the labels return null rather than inventing a phrase — the caller
 *    decides what the wrap-up says, and none of it is a countdown.
 */

/** Local midnight for a Date or a YYYY-MM-DD string, or null. */
function localMidnight(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Whole calendar days from today to the wedding. 0 on the day, negative after.
 *
 * @param {string|Date|null} weddingDate
 * @param {Date} [now] injectable clock, so a test can plant a date without
 *                     waiting for one
 * @returns {number|null} null when there is no usable date
 */
export function daysUntilWedding(weddingDate, now = new Date()) {
  const target = localMidnight(weddingDate);
  const today = localMidnight(now);
  if (target === null || today === null) return null;
  return Math.round((target - today) / 86400000);
}

/** After the wedding: the wrap-up state (spec section 11), never a countdown. */
export function isPastWedding(days) {
  return typeof days === 'number' && days < 0;
}

/**
 * The short chip label — a top bar, a badge, an eyebrow.
 * Returns null when there is nothing to count: no date, or the day has passed.
 */
export function countdownLabel(days) {
  if (typeof days !== 'number' || days < 0) return null;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days to go`;
}

/**
 * The sentence form, for a headline. Same rules, terminal punctuation.
 *
 * No exclamation marks: the calm-pass rule, and the one this replaces
 * ("Your wedding day has arrived!") was in the top bar of every dashboard page.
 */
export function countdownSentence(days) {
  if (typeof days !== 'number' || days < 0) return null;
  if (days === 0) return 'Today is the day.';
  if (days === 1) return 'Tomorrow.';
  return `${days} days to go.`;
}

/**
 * What to tell a language model, instead of a bare number it has to interpret.
 *
 * THIS IS THE FIX FOR "Happy 0 day". The prompt said `(0 days away)` and asked
 * for a "days headline"; a model given a number and no vocabulary invents one.
 * It is given the resolved phrase and an explicit instruction now, so the only
 * way back to a numeral on the day itself is to ignore a sentence that names
 * the failure.
 */
export function countdownForPrompt(days) {
  if (typeof days !== 'number') return 'Wedding date not set. Do not invent a countdown.';
  if (days < 0) {
    return `The wedding was ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago. `
      + 'It is over. Do not count down, do not congratulate, and do not mention an anniversary.';
  }
  if (days === 0) {
    return 'THE WEDDING IS TODAY. Say "Today" or "Today is the day". '
      + 'Never write the numeral 0 anywhere near the word day.';
  }
  if (days === 1) return 'The wedding is TOMORROW. Say "Tomorrow", never "1 days".';
  return `${days} days until the wedding. Write it as "${days} days", plural.`;
}
