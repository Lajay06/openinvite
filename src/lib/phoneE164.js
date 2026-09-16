/**
 * src/lib/phoneE164.js — ONE PLACE THAT KNOWS WHAT A PHONE NUMBER IS.
 *
 * ── THE DEFECT ─────────────────────────────────────────────────────────────
 *
 * Owner report: WhatsApp answers "this number is not on WhatsApp" for a guest
 * whose number was typed without a country code. It is right to. `wa.me` takes
 * an E.164 number and nothing else, and the product built that string three
 * different ways, none of them correct:
 *
 *   SendInvitesModal.jsx:44   strip non-digits, send as-is
 *                             "0412 345 678" -> wa.me/0412345678
 *   WhatsAppCompose.jsx:109   strip, then prefix "61" unless it already starts
 *                             with "61" or "1"
 *                             "0412 345 678" -> wa.me/610412345678
 *                             which is still not the number: E.164 drops the
 *                             trunk 0, so the answer is 61412345678. And a US
 *                             number "2125550123" starts with neither, so it
 *                             became 612125550123 — an Australian country code
 *                             on a US number, in a product priced in USD.
 *   WhatsAppQRCode.jsx:8      no normalisation at all
 *
 * And nothing stored a country. `E164`, `countryCode` and `dialCode` returned
 * zero matches across src/ and api/ before this file.
 *
 * ── THE RULES, AND WHY EACH ONE IS HERE ────────────────────────────────────
 *
 * 1. A NUMBER THAT ALREADY DECLARES ITS COUNTRY IS NOT TOUCHED. A leading "+"
 *    means the person typed the country themselves; prefixing a default over
 *    the top of it is how "+44 7700 900123" becomes an Australian number.
 * 2. THE TRUNK ZERO GOES. Every country that uses one drops it in E.164 —
 *    0412 345 678 in Australia is +61 412 345 678, never +61 0412 345 678.
 *    This is the bug shape B had.
 * 3. AN UNPARSEABLE NUMBER IS RETURNED AS NULL, NOT AS A GUESS. "12345" is not
 *    a phone number in any country, and a wa.me link built from it produces
 *    exactly the message the owner saw. The caller flags the row instead.
 * 4. NOTHING IS REWRITTEN ON A RECORD. These functions read; the country
 *    picker writes E.164 for numbers entered from now on, and a stored number
 *    with no country is SHOWN as needing one rather than silently changed.
 *
 * Deliberately not a library. `libphonenumber-js` is 145 kB for a product that
 * needs "does this have a country code, and if not put one on it" — and its
 * per-country validation would reject real numbers we have no business
 * rejecting. The lengths below are a sanity floor, not a validator.
 */
import { COUNTRIES } from './countryCodes.generated.js';


/**
 * The countries the product sells to first, plus the ones a wedding's guests
 * most often come from. `dial` is what goes after the "+"; `trunk` is the
 * digit dropped from a local number, where the country uses one.
 */
// THE FULL ISO LIST, GENERATED (Run 5 T5). This was fourteen countries, typed
// by hand, in a native <select> — so a couple anywhere else picked the wrong
// country or gave up, and the CSV import assumed Australia for everyone. The
// table is built by scripts/build-country-data.mjs from libphonenumber-js and
// Intl.DisplayNames; the fourteen entries that were here are kept verbatim
// inside the generator, because toE164()'s behaviour on them is covered by the
// owner's own cases and this was not the package to move any of it.
//
// Order: Australia, New Zealand, United Kingdom, United States pinned, then
// alphabetical by displayed name.
export const COUNTRY_CODES = COUNTRIES;

export const DEFAULT_COUNTRY = 'AU';
export { COUNTRIES };

const countryOf = (iso) => COUNTRY_CODES.find((c) => c.iso === iso) || COUNTRY_CODES.find((c) => c.iso === DEFAULT_COUNTRY);

/** Digits only, the "+" kept if it was the first character. */
function clean(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return '';
  const plus = s.startsWith('+');
  return (plus ? '+' : '') + s.replace(/[^\d]/g, '');
}

/**
 * A number in E.164 — "+61412345678" — or null if it cannot be made into one.
 *
 * @param {string} raw        what the couple typed
 * @param {string} [iso]      the country to assume when the number declares none
 * @returns {string|null}
 */
export function toE164(raw, iso = DEFAULT_COUNTRY) {
  const c = clean(raw);
  if (!c) return null;

  // RULE 1: it already says which country it is.
  if (c.startsWith('+')) {
    const digits = c.slice(1);
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  const country = countryOf(iso);
  let digits = c;

  // A number already carrying its dial code without the "+", which is what the
  // old shape-B branch was fumbling towards.
  if (digits.startsWith(country.dial) && digits.length >= country.dial.length + 8) {
    return `+${digits}`;
  }

  // RULE 2: the trunk zero goes.
  if (country.trunk && digits.startsWith(country.trunk)) digits = digits.slice(country.trunk.length);

  // RULE 3: a sanity floor, not a validator. Shorter than this is not a phone
  // number anywhere, and "12345" is the case the owner's report came from.
  if (digits.length < 6 || digits.length > 14) return null;
  return `+${country.dial}${digits}`;
}

/** The digits wa.me wants: E.164 with the "+" removed. Null stays null. */
export function toWaMe(raw, iso = DEFAULT_COUNTRY) {
  const e = toE164(raw, iso);
  return e ? e.slice(1) : null;
}

/**
 * True when there is something typed that cannot be made into a number — the
 * state a guest row is flagged in, and the one thing that must never be sent.
 * An EMPTY field is not unparseable; it is simply empty.
 */
export function needsCountryCode(raw, iso = DEFAULT_COUNTRY) {
  const c = clean(raw);
  if (!c) return false;
  return toE164(raw, iso) === null;
}
