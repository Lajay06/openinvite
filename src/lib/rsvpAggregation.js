/**
 * src/lib/rsvpAggregation.js
 *
 * Pure, isomorphic aggregation for RsvpResponse rows — append-only, same
 * reason as PollVote: Guest's update RLS blocks admin-key updates to an
 * existing row, so a guest re-submitting their RSVP writes a NEW row rather
 * than mutating one. "Latest wins" per (guest_id, event_id) determines a
 * guest's current per-event status; per (guest_id, null) determines their
 * current guest-level song_request/dietary_restrictions/note.
 *
 * A row is either a per-event row (event_id set) or a guest-level row
 * (event_id null) — never both — enforced by the writers, relied on here.
 */

function dedupKey(row) {
  return `${row.guest_id}::${row.event_id ?? '__guest_level__'}`;
}

function isLater(a, b) {
  const aTime = new Date(a.created_date).getTime();
  const bTime = new Date(b.created_date).getTime();
  if (aTime !== bTime) return aTime > bTime;
  return String(a.id) > String(b.id);
}

/** Keeps only the latest row per (guest_id, event_id) — the current state. */
export function latestPerGuestEvent(rows) {
  const latest = new Map();
  for (const row of rows || []) {
    const key = dedupKey(row);
    const existing = latest.get(key);
    if (!existing || isLater(row, existing)) latest.set(key, row);
  }
  return [...latest.values()];
}

/** Per-event rows only (event_id set), deduped to each guest's latest response. */
export function latestEventResponses(rows) {
  return latestPerGuestEvent(rows).filter(r => r.event_id !== null && r.event_id !== undefined);
}

/** Guest-level rows only (event_id null), deduped to each guest's latest submission. */
export function latestGuestLevel(rows) {
  return latestPerGuestEvent(rows).filter(r => r.event_id === null || r.event_id === undefined);
}

/** { [event_id]: { [status]: count } } — per-event attendance tally across all guests. */
export function aggregateEventTallies(rows) {
  const tallies = {};
  for (const r of latestEventResponses(rows)) {
    if (!tallies[r.event_id]) tallies[r.event_id] = {};
    tallies[r.event_id][r.status] = (tallies[r.event_id][r.status] || 0) + 1;
  }
  return tallies;
}

/**
 * Mirrors RSVPPage.jsx's / rsvp-submit.js's overall-status derivation: a
 * guest is "attending" if they said yes to any invited event, "declined" if
 * they said no to every invited event, otherwise "pending".
 */
export function deriveRsvpStatus(eventResponses) {
  const invited = (eventResponses || []).filter(r => r.invited);
  const anyYes = invited.some(r => r.status === 'yes');
  const allNo = invited.length > 0 && invited.every(r => r.status === 'no');
  return anyYes ? 'attending' : allNo ? 'declined' : 'pending';
}

/**
 * Reshapes deduped RsvpResponse rows for one guest back into the
 * Guest.event_responses[] shape the rest of the app already expects
 * (event_id/invited/status/meal_choice/plus_ones/plus_one_names/responded_at).
 */
export function toEventResponsesShape(rows) {
  return (rows || []).map(r => ({
    event_id: r.event_id,
    invited: true,
    status: r.status,
    meal_choice: r.meal_choice || null,
    plus_ones: r.plus_ones || 0,
    plus_one_names: r.plus_one_names || [],
    responded_at: r.created_date,
  }));
}
