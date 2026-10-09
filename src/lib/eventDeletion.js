/**
 * src/lib/eventDeletion.js
 *
 * WHAT DELETING A WEDDING EVENT HAS TO TAKE WITH IT.
 *
 * Removing a custom event used to be one line: filter it out of
 * preWeddingEvents or postWeddingEvents and stop. Everything keyed to that
 * event_id stayed behind, pointing at something that no longer existed:
 * every guest's event_responses entry for it, and every RsvpResponse row.
 * Nothing failed, because nothing reads those by joining; they are simply
 * orphaned, and they come back as soon as a future event is given the same id.
 *
 * TWO ANSWERS, AND THE COUNT DECIDES WHICH.
 *
 *   Replies exist  -> refuse, and say how many. An event somebody has answered
 *                     is not a mistake to be swept up; deleting it would throw
 *                     away what they said with no way to get it back.
 *   No replies     -> delete it, and clear its entry from every guest in the
 *                     same operation.
 *
 * A REPLY IS AN ANSWER, NOT AN INVITATION. `invited: true` with status pending
 * is the couple's own doing and is theirs to undo; a yes or a no came from the
 * guest. That is the line this file draws, and it is why a wedding that has
 * invited 200 people to an event nobody has answered yet can still delete it.
 *
 * SCHEDULE ITEMS ARE NOT TOUCHED, AND CANNOT BE. The Schedule entity carries
 * event_name, event_date and category and NO event_id
 * (base44/entities/Schedule.jsonc), so there is no link from a schedule row to
 * a wedding event to break. Matching on the name would be a guess, and the
 * thing it would be guessing about is whether to delete a couple's own rows.
 * Giving Schedule an event_id is a schema change, which this goal excludes.
 */

/**
 * How many guests have ANSWERED for this event, and who they are.
 *
 * Reads the stored entries only. An absent entry cannot be an answer: the
 * defaulting rule in weddingEvents.js resolves it to invited-or-not, never to
 * a yes or a no.
 *
 * @param {Array} guests
 * @param {string} eventId
 * @returns {{ count: number, names: string[] }}
 */
export function repliesForEvent(guests = [], eventId) {
  const names = [];
  for (const g of guests) {
    const entry = (g?.event_responses || []).find((r) => r?.event_id === eventId);
    // A MAYBE COUNTS AS A REPLY HERE, which is the point of this warning: it
    // names the people whose answer deleting the event would throw away, and a
    // maybe the couple recorded after a conversation is exactly such an answer.
    if (entry && (entry.status === 'yes' || entry.status === 'no' || entry.status === 'maybe')) {
      names.push(g.name || 'A guest');
    }
  }
  return { count: names.length, names };
}

/**
 * The guests whose event_responses mention this event, each with the array to
 * persist once it is gone. Pure: the caller does the writing.
 *
 * A guest with no entry for the event is not returned at all, so deleting an
 * event nobody was ever explicitly set for writes nothing.
 *
 * @returns {Array<{ id: string, event_responses: Array }>}
 */
export function guestsToClear(guests = [], eventId) {
  const out = [];
  for (const g of guests) {
    const responses = g?.event_responses;
    if (!Array.isArray(responses) || !responses.some((r) => r?.event_id === eventId)) continue;
    out.push({ id: g.id, event_responses: responses.filter((r) => r?.event_id !== eventId) });
  }
  return out;
}
