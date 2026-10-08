/**
 * THOUSANDS SEPARATORS IN A FIELD THE COUPLE TYPES INTO.
 *
 * Owner walkthrough, 2026-10-08, item 10: the budget planner's amounts read as
 * a wall of digits. "50000" and "500000" differ by one character and by an
 * order of magnitude, and the plan total is the number the whole page hangs
 * off. Every COMPUTED figure on the Budget page already groups, because those
 * go through formatCurrency; the planner's own inputs did not, because an
 * `<input type="number">` cannot hold a comma.
 *
 * So the planner's fields become text, and these functions are the whole
 * conversion. They are here, not inside the component, because the thing worth
 * proving is the round trip: whatever a couple types, the number that reaches
 * the record is the number they meant.
 *
 * WHAT THIS DELIBERATELY IS NOT.
 *
 * It is not formatCurrency. formatCurrency multiplies by the couple's exchange
 * rate and reads minor units, which is correct for the expense ledger and
 * wrong for the plan: the plan stores whole currency units. Pointing the
 * planner at formatCurrency would render every figure times the rate. The unit
 * mismatch between the saved plan and the expense cards is real and is a
 * separate decision; this file does not touch it, and does not care which way
 * it goes, because it only ever formats the number it is handed.
 *
 * It is not a locale formatter either. `toLocaleString` groups by the RUNTIME's
 * locale, so the same plan would read "50,000" in CI and "50.000" on a German
 * machine, and a couple who typed a decimal point would watch it become a
 * thousands separator. The grouping below is an explicit comma, which is what
 * the product uses everywhere else: it sells to the US in USD.
 */

/**
 * Everything a planner field will NOT keep on screen as it is typed.
 *
 * What it does keep: digits, a decimal point, and the separators a couple
 * might type or paste. A comma. A plain space. The three Unicode spaces a
 * formatted number arrives with when it is copied out of a spreadsheet or a
 * web page, written out as escapes rather than pasted in as invisible
 * characters. An apostrophe, the Swiss grouping mark, which costs nothing to
 * accept. `\s` already covers the three spaces; they are listed anyway so the
 * next reader does not have to look that up.
 */
const NOT_TYPEABLE = /[^0-9.,\s   ']/g;

/**
 * What the couple typed, reduced to the number they meant.
 *
 * "50,000" and "50 000" and "50000" all come back "50000". A field cleared to
 * nothing comes back '', which is the same empty the planner stored before
 * this change and the same empty its save path turns into null. Anything with
 * no digits in it at all also comes back '' rather than NaN or a partial
 * string, so a stray keystroke cannot write junk into a money field.
 *
 * A SECOND DECIMAL POINT IS DROPPED, not kept. "1.2.3" is not a number and
 * parseFloat would silently read it as 1.2; dropping the tail means the field
 * shows exactly what will be stored.
 */
export function cleanAmountText(text) {
  if (text === null || text === undefined) return '';
  const digitsAndDots = String(text).replace(/[^0-9.]/g, '');
  const firstDot = digitsAndDots.indexOf('.');
  if (firstDot === -1) return digitsAndDots;
  const head = digitsAndDots.slice(0, firstDot + 1);
  const tail = digitsAndDots.slice(firstDot + 1).replace(/\./g, '');
  return head + tail;
}

/** The subset of typed characters the field keeps on screen as they are typed. */
export function keepTypedAmountChars(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(NOT_TYPEABLE, '');
}

/**
 * The number, grouped, for a field that is not being typed into.
 *
 * Empty stays empty: a planner field the couple has not filled shows its
 * placeholder, not a zero. A trailing decimal point survives, because "50000."
 * is a real intermediate state and a field that deleted the point the instant
 * focus left would be fighting the person using it.
 */
export function formatAmountWithSeparators(value) {
  const cleaned = cleanAmountText(value);
  if (cleaned === '') return '';
  const dot = cleaned.indexOf('.');
  const whole = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const rest = dot === -1 ? '' : cleaned.slice(dot);
  // \B so a three-digit number gets no leading comma, and the lookahead counts
  // digits in threes from the right.
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + rest;
}
