/**
 * src/lib/emailGreeting.js
 *
 * WHO THE EMAIL IS ADDRESSED TO, AND WHEN IT IS ADDRESSED TO NOBODY.
 *
 * Owner report: the welcome email greeted him with his email address —
 * "Welcome, la.jay06@gmail.com." Not a name, an address, in the first sentence
 * of the first email the product ever sends.
 *
 * WHERE IT COMES FROM. api/on-signup.js:116 reads `user.full_name` from Base44
 * and hands it to the template, and the template took the first
 * space-separated word of it (onboarding-day1.js:11). Base44 populates
 * `full_name` at signup, and for an account created without a name it carries
 * the address — so `full_name.split(' ')[0]` is the whole address, and the
 * greeting prints it. The template's `: 'there'` branch never fires, because
 * the field is not empty; it is wrong.
 *
 * THE RULE, and it is the owner's: never print an address where a name goes.
 * A missing name means the greeting has no name in it — not a placeholder
 * standing in for one. "Welcome." is a complete sentence and it is true;
 * "Welcome, there." is a small fiction about knowing who you are talking to,
 * and "Welcome, la.jay06@gmail.com." is the product reading its own database
 * out loud.
 *
 * WHY A SHARED MODULE FOR SIX LINES. Four templates take a `name` and each
 * derived a first name its own way — the same defect four times, and a fix in
 * one would have left three. It is also a plain .js module so a Node guard can
 * import it without rendering an email.
 */

/**
 * Anything with an @ between two non-space runs is an address, not a name.
 * Deliberately loose: the cost of treating an odd name as an address is a
 * greeting with no name in it, and the cost of the other mistake is the bug.
 */
const LOOKS_LIKE_EMAIL = /^\S+@\S+$/;

/**
 * A usable first name, or null when there is none.
 *
 * @param {string|null|undefined} fullName as stored on the User record
 * @returns {string|null}
 */
/**
 * A name shape: letters, and the punctuation real names carry. No digits, no
 * dots, no plus tags. This is what separates "isla" from "la.jay06" when both
 * happen to be the local part of the address.
 */
const LOOKS_LIKE_A_NAME = /^[A-Za-z][A-Za-z'\u2019-]*$/;

/** The part before the @, lowercased. Null when there is no address to read. */
function localPartOf(email) {
  const at = String(email ?? '').indexOf('@');
  return at > 0 ? String(email).slice(0, at).trim().toLowerCase() : null;
}

export function firstNameOrNull(fullName, email) {
  const raw = String(fullName ?? '').trim();
  if (!raw) return null;

  // AN ADDRESS ANYWHERE IN THE FIELD DISQUALIFIES IT, not just in the first
  // word. The check used to read the first word alone, which was enough while
  // the only known shape was a full_name that WAS the address. "Smith
  // la.jay06@gmail.com" got through it and greeted as Smith, which is a name
  // the product never knew.
  if (raw.includes('@')) return null;

  const first = raw.split(/\s+/)[0];
  if (!first || LOOKS_LIKE_EMAIL.test(first)) return null;

  // THE LOCAL PART WEARING A NAME'S CLOTHES. Base44 sometimes stores the part
  // before the @ as full_name, so the field holds no address and still is one:
  // "la.jay06" reads as a name to every check above and is the database spoken
  // out loud.
  //
  // The equality test alone would be too eager, and the owner said so: a
  // person actually called Isla at isla@ matches it exactly. So the shape
  // decides. A local part that reads as a plain word is allowed to be a name,
  // because it probably is one and the cost of being wrong is a correct
  // greeting to someone with a tidy address. One carrying dots, digits or a
  // plus tag is not a name anyone chose, and it is dropped.
  const local = localPartOf(email);
  if (local && raw.toLowerCase() === local && !LOOKS_LIKE_A_NAME.test(raw)) return null;

  return first;
}

/**
 * A greeting line, with the name only if there is one.
 *
 * @param {string} template a sentence containing `{name}` where the name goes,
 *                          e.g. "Welcome, {name}." — the comma belongs to the
 *                          template so the nameless form can drop it cleanly
 * @param {string} bare     what to say when there is no name, e.g. "Welcome."
 * @param {string|null|undefined} fullName
 * @param {string|null|undefined} email the address on the same record, so a
 *                 full_name that is only its local part can be recognized
 */
export function greeting(template, bare, fullName, email) {
  const first = firstNameOrNull(fullName, email);
  return first ? template.replace('{name}', first) : bare;
}
