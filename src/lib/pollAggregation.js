/**
 * src/lib/pollAggregation.js
 *
 * Pure, isomorphic vote-tally aggregation for the PollVote entity —
 * importable from both server code (api/_lib/pollAuth.js, Vercel functions)
 * and client code (the couple's dashboard, reading their own poll results
 * directly via PollVote's read:null RLS). No Node-only APIs, so it's safe
 * in a browser bundle.
 */

/**
 * Aggregates PollVote rows into per-option counts, keeping only each
 * voter's LATEST vote (by created_date, tie-broken by id for full
 * determinism when two rows share a timestamp) — the vote model is
 * append-only (a guest changing their vote writes a new row rather than
 * mutating an old one), so naive summing would double-count a guest who
 * voted more than once. Rows with no guest_identifier (can't be deduped)
 * are all counted individually, matching the original wedding-poll-vote.js
 * always-increment behavior for that edge case.
 *
 * @param {Array<{option_id: string, guest_identifier: string|null, created_date: string, id: string}>} votes
 * @returns {Record<string, number>} option_id -> vote count
 */
export function aggregateVotes(votes) {
  const latestByVoter = new Map(); // guest_identifier -> vote row
  const undeduped = [];

  for (const v of (votes || [])) {
    if (!v.guest_identifier) { undeduped.push(v); continue; }
    const existing = latestByVoter.get(v.guest_identifier);
    if (!existing) { latestByVoter.set(v.guest_identifier, v); continue; }
    const vTime = new Date(v.created_date).getTime();
    const existingTime = new Date(existing.created_date).getTime();
    if (vTime > existingTime || (vTime === existingTime && v.id > existing.id)) {
      latestByVoter.set(v.guest_identifier, v);
    }
  }

  const counts = {};
  for (const v of [...latestByVoter.values(), ...undeduped]) {
    counts[v.option_id] = (counts[v.option_id] || 0) + 1;
  }
  return counts;
}
