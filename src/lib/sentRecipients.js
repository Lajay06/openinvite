/**
 * src/lib/sentRecipients.js
 *
 * WHO WAS ACTUALLY SENT TO. One answer, derived once.
 *
 * ── THE BUG THIS EXISTS FOR ────────────────────────────────────────────────
 *
 * SendInvitesModal built its recipient list from the invitations that HAVE an
 * address, and then stamped `invite_sent_at` over every selected guest. A guest
 * with no email was marked invited by a send that never included them, and in
 * the worst case, a selection of only no-email guests, the modal skipped the
 * network call entirely (`if (recipients.length > 0)`) and still stamped every
 * one of them. The screen already knew better: it computes
 * `invitationsNoEmail` and renders a red "No email" beside those rows. Only the
 * write path disagreed with the screen.
 *
 * ── THE RULE, OWNER RULINGS 2026-10-12 ────────────────────────────────────
 *
 * 1. A household member with no address of their own IS invited when the
 *    invitation was emailed. One email per household is the product's model
 *    ("3 people, one email"), so the invitation reached them. Stamping only the
 *    lead would show the rest as not invited when they were.
 *
 * 2. A guest alone on an invitation with no address gets NOTHING: no stamp, no
 *    send_history entry. The list keeps showing them as not yet invited, with
 *    the "No email" reason already on screen.
 *
 * A send_history entry for a message that was never sent is worse than a gap,
 * which is why the same set governs both writes rather than each deciding for
 * itself.
 *
 * ── WHY A MODULE AND NOT A LOCAL CONST ────────────────────────────────────
 *
 * The server applies this same rule independently: api/send-invites.js skips
 * opted-out and bounced guests from the database, because a client-side filter
 * is editable by whoever runs the client. Two implementations of one rule drift,
 * and the drift is invisible until a guest is stamped for an email the server
 * declined to send. The held follow-up points that endpoint at this module so
 * the rule is written once and both ends import it.
 */

/**
 * The guest ids an actual send covered.
 *
 * @param {object} args
 * @param {Array<{members?: Array<{id?: string}>, lead?: {id?: string}}>} args.emailedInvitations
 *   invitations that really were addressed and sent, NOT every selected one
 * @param {Array<{id?: string}>} args.plusOneGuests
 *   guests whose plus-one was emailed at their own address. The invitation
 *   reached that guest's party, so rule 1 applies to them too
 * @returns {Set<string>} ids, empty when nothing went out
 */
export function sentGuestIds({ emailedInvitations = [], plusOneGuests = [] } = {}) {
  const ids = new Set();

  for (const invitation of Array.isArray(emailedInvitations) ? emailedInvitations : []) {
    // EVERY MEMBER, not the lead alone: rule 1. `members` is the household as
    // invitationsFor built it; a household of one still arrives as a
    // one-element array, and the lead is the fallback only if members is
    // missing entirely, so a malformed invitation cannot silently stamp nobody.
    const members = Array.isArray(invitation?.members) && invitation.members.length
      ? invitation.members
      : (invitation?.lead ? [invitation.lead] : []);
    for (const member of members) {
      if (member?.id) ids.add(member.id);
    }
  }

  for (const guest of Array.isArray(plusOneGuests) ? plusOneGuests : []) {
    if (guest?.id) ids.add(guest.id);
  }

  return ids;
}

/**
 * @param {Array<{id?: string}>} guests every guest the send considered
 * @param {Set<string>} sentIds from sentGuestIds
 * @returns {Array} only those an email actually reached
 */
export function guestsActuallySent(guests = [], sentIds = new Set()) {
  return (Array.isArray(guests) ? guests : []).filter(g => g?.id && sentIds.has(g.id));
}
