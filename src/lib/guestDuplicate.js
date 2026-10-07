/**
 * src/lib/guestDuplicate.js
 *
 * IS THIS PERSON ALREADY ON THE LIST?
 *
 * C12 from the essentials sweep. The single-add form happily created a second
 * "Priya Patel" beside the first, and a couple building a list over months
 * types the same name twice more often than anyone expects: once from memory,
 * once off a reply. The import has reported duplicates since it was written
 * (ImportGuestModal skips on email and says how many); the form that adds one
 * person at a time said nothing at all.
 *
 * ── A WARNING, NEVER A REFUSAL ─────────────────────────────────────────────
 *
 * Two real guests can share a name. "Add anyway" is the second half of this
 * feature and not a concession: a wedding with two Priya Patels is ordinary,
 * and a product that cannot record it is worse than one that asks. So this
 * module answers "who does this look like" and never "no".
 *
 * ── WHAT COUNTS AS THE SAME NAME ───────────────────────────────────────────
 *
 * Case, surrounding space and runs of inner space are noise: "priya  patel"
 * and "Priya Patel" are the same typing. Everything else is kept, including
 * accents and punctuation, because stripping them is where a match turns into
 * a wrong match: "Rene" and "René" are plausibly two people, and a couple who
 * meant one of them can say so.
 *
 * AN EMAIL IS A STRONGER CLAIM THAN A NAME, so it is checked first and
 * reported as the reason. Two rows with one address are nearly always one
 * person entered twice.
 */

/**
 * The comparable form of a typed name: trimmed, inner runs of space collapsed,
 * lower case. Exported because the guard asserts on it directly.
 */
export function normalizeName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** The comparable form of an address. Case only; an address has no spaces. */
export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

/**
 * The guest this one looks like, or null.
 *
 * @param {object} candidate      the row about to be created
 * @param {Array}  guests         the existing list
 * @param {string} [excludeId]    a row to ignore, so editing is never a
 *                                duplicate of itself
 * @returns {{ guest: object, on: 'email'|'name' }|null}
 */
export function findDuplicate(candidate, guests = [], excludeId = null) {
  const list = (Array.isArray(guests) ? guests : []).filter((g) => g && g.id !== excludeId);
  const email = normalizeEmail(candidate?.email);
  // EMAIL FIRST, because it is the stronger claim and because the reason is
  // shown to the couple: "already on your list" about a shared address reads
  // very differently from one about a shared name.
  if (email) {
    const byEmail = list.find((g) => normalizeEmail(g.email) === email);
    if (byEmail) return { guest: byEmail, on: 'email' };
  }
  const name = normalizeName(candidate?.name);
  if (!name) return null;
  const byName = list.find((g) => normalizeName(g.name) === name);
  return byName ? { guest: byName, on: 'name' } : null;
}
