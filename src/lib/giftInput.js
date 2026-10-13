/**
 * src/lib/giftInput.js
 *
 * WHAT THE GIFT FLOW ACCEPTS, AND THE ONLY WORDS IT SHOWS WHEN SOMETHING FAILS.
 * Owner rulings 2026-10-13, after the first run on the gift-test preview:
 *
 *   1. A giver never sees a server's own error text. A refusal that read
 *      "APP_ENC_KEY is not set. Refusing to hash or encrypt..." reached the
 *      page; the server logs the technical reason, and the giver sees only
 *      GIFT_TRY_AGAIN, whatever went wrong.
 *   2. The couple's address is trimmed and checked before Pay is enabled. A
 *      trailing full stop ("...@gmail.com.") passed the old check; the domain
 *      is checked by the product's own validator, which refuses a stray dot,
 *      with the calm line EMAIL_CHECK under the field.
 *
 * Shared by the page and the server (api/_lib/giftDrafts.js), so the two can
 * never disagree about what an address is.
 */
import { isValidEmail } from '../../api/_lib/security.js';

/** The one line a giver sees when anything about paying or claiming fails. */
export const GIFT_TRY_AGAIN = 'That did not go through. Try again in a moment.';

/** Under the address field, when what is there is not an address. */
export const EMAIL_CHECK = 'Check the email address.';

/**
 * The address as it will be used: surrounding space removed, nothing else.
 * Deliberately NOT security.js's normalizeEmail, which repairs a trailing
 * stop: the ruling is that the giver sees EMAIL_CHECK and fixes it, so what
 * they typed is what is checked.
 */
export const normalizeGiftEmail = (value) => String(value ?? '').trim();

/**
 * THE PRODUCT'S ONE ADDRESS CHECK (api/_lib/security.js's isValidEmail): the
 * domain checked as a domain, so a trailing stop, a doubled dot or a missing
 * dot each leave an empty or missing label and fail. Built after the same
 * trailing-stop defect reached Resend twice; reused here rather than a second
 * pattern that could drift from it.
 */
export function isValidGiftEmail(value) {
  const v = normalizeGiftEmail(value);
  return v.length <= 200 && isValidEmail(v);
}
