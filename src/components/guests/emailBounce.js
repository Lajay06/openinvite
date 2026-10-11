/**
 * src/components/guests/emailBounce.js
 *
 * ONE ANSWER TO "HAS THIS ADDRESS BOUNCED", shared by the three surfaces that
 * ask it: the guest row's label, the Bounced filter on the Guests page, and
 * the send modal's count.
 *
 * Item 3 of goals/2026-10-10-bounces-and-notes.md.
 *
 * WHY A PLAIN MODULE BESIDE THE COMPONENTS. The predicate and the clear rule
 * are the only parts of this item that can be wrong in a way a reader cannot
 * see, so they live in a file a guard can import and drive for real. The .jsx
 * files around it can only be read as text.
 *
 * THE PREDICATE IS THE SERVER'S PREDICATE. api/send-invites.js skips a guest
 * whose email_bounce.kind is 'permanent' and nothing else. If these two ever
 * disagree, the page labels a guest the server still mails, or stays silent
 * about one it refuses. There is exactly one enum value today, and matching it
 * by equality is what keeps a second value from silently meaning "bounced" on
 * the page before anyone has decided that it should.
 */

/**
 * @param {object} guest
 * @returns {boolean} true when this guest carries a permanent bounce stamp.
 */
export function isBounced(guest) {
  return guest?.email_bounce?.kind === 'permanent';
}

/** The label on the row, in the cell that already answers "was this guest mailed". */
export const BOUNCE_ROW_LABEL = 'Email bounced';

/** Shown under the address, where the fix happens. */
export const BOUNCE_FIX_SENTENCE = 'This address bounced. Fix it, then resend.';

/**
 * The send modal's line. Invitations are counted as invitations elsewhere in
 * that modal; this one counts GUESTS, because the stamp is on a guest and a
 * household's other members are still mailable.
 *
 * @param {number} n
 * @returns {string}
 */
export function bouncedSkippedSentence(n) {
  return `${n} bounced, not sent.`;
}

/**
 * Adds the clear to a guest update when that update changes the address.
 *
 * CHANGING THE ADDRESS CLEARS THE STAMP, IN THE SAME SAVE. A separate write
 * would leave a window in which the new address carries the old address's
 * failure, and a couple who fixed a typo would be told their correction had
 * bounced. The goal's ruling is "in the same save" for that reason.
 *
 * ONLY WHEN IT ACTUALLY CHANGED, and only when there is something to clear.
 * An unrelated edit, a re-save of the same address, or a guest with no stamp
 * must not add a key to the payload: an update that always carries
 * email_bounce would wipe a stamp that arrived between loading the page and
 * saving an unrelated field.
 *
 * @param {object} updates the fields about to be written
 * @param {object} guest the guest as currently held
 * @returns {object} the same fields, plus email_bounce: null when the address
 *   changed on a guest that carries a stamp. Does not mutate either input.
 */
export function withBounceCleared(updates, guest) {
  const fields = { ...(updates || {}) };
  if (!('email' in fields)) return fields;
  if (!isBounced(guest)) return fields;
  const before = guest?.email == null ? '' : String(guest.email).trim();
  const after = fields.email == null ? '' : String(fields.email).trim();
  if (before === after) return fields;
  return { ...fields, email_bounce: null };
}
