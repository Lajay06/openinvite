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
export function firstNameOrNull(fullName) {
  const raw = String(fullName ?? '').trim();
  if (!raw) return null;
  // ONE CHECK, ON THE WORD ACTUALLY USED. There were two — this and the same
  // test against the untrimmed whole field — and a planted failure showed the
  // first one was dead: every input it would have caught is caught here as
  // well, because the address IS the first word. A line no plant can make
  // matter is a line that reads as protection and is not.
  const first = raw.split(/\s+/)[0];
  if (!first || LOOKS_LIKE_EMAIL.test(first)) return null;
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
 */
export function greeting(template, bare, fullName) {
  const first = firstNameOrNull(fullName);
  return first ? template.replace('{name}', first) : bare;
}
