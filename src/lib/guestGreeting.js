/**
 * src/lib/guestGreeting.js
 *
 * The one rule for greeting a guest by name.
 *
 * A Guest's `name` is a single free-text field, typed by the couple. Most of
 * the time it is a person: "Nora Kelly". Some of the time it is a household
 * the couple invited as one line: "The Smith Family", "Nora & Sam", "Mr & Mrs
 * Kelly". And an unnamed plus-one reaches the client as the literal 'Guest'
 * (api/rsvp-lookup.js) — a placeholder, not a name.
 *
 * `split(' ')[0]` greeted every one of those: "Hi The,", "Hi Nora," to two
 * people, "Hi Guest,". This helper answers the only question a greeting can
 * ask — is there a first name here that ONE person would recognise as their
 * own? — and says null when there is not. Callers render nothing on null.
 * There is deliberately no generic fallback ("there", "friend"): a family
 * addressed as "Hi there," reads as a form letter, and no line reads as a
 * site that simply knows better than to guess.
 *
 * Lives in src/lib because both consumers — the RSVP form
 * (components/rsvp/RSVPPage.jsx, rendered standalone and embedded in the
 * guest site) and any guest-website component — already import their shared
 * logic from here, and because it is plain JS a Node test can import
 * directly. Not api/_lib: the server never greets anyone.
 */

/** The API's stand-in for a plus-one the couple never named. */
const PLACEHOLDER = 'Guest';

/**
 * A name that is a household, not a person. Each pattern names a way two or
 * more people get typed on one line.
 */
const HOUSEHOLD = [
  /^the\b/i,             // "The Smith Family", "The Smiths"
  /\bfamily\b/i,         // "Smith Family"
  /\bhousehold\b/i,      // "Kelly Household"
  /&/,                   // "Nora & Sam", "Mr & Mrs Kelly"
  /\band\b/i,            // "Nora and Sam" — \b keeps "Andrea" a person
  /\+/,                  // "Nora + Sam"
  /\//,                  // "Nora / Sam"
];

/**
 * @param {unknown} name the Guest's `name` as the API returned it
 * @returns {string|null} a first name to greet, or null for "do not greet"
 */
export function greetableFirstName(name) {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed === PLACEHOLDER) return null;
  if (HOUSEHOLD.some((re) => re.test(trimmed))) return null;
  const first = trimmed.split(/\s+/)[0];
  return first || null;
}
