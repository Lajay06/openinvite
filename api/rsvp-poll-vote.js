/**
 * POST /api/rsvp-poll-vote
 *
 * Public, unauthenticated endpoint backing RSVPPage.jsx's post-RSVP poll
 * step. Validates the rsvp_link_id token server-side (resolving the guest
 * exactly as api/rsvp-lookup.js does), re-fetches the guest's wedding
 * fresh (never trusting a client-cached polls array, which could be stale
 * relative to other guests' votes), recomputes the per-option vote-count
 * deltas, and writes both WeddingDetails.polls and Guest.poll_votes with
 * the server-side admin key.
 *
 * Body: { token: string, votes: { [pollId]: optionId } }
 * Response: 200 { ok: true }
 *        or 404 { error: 'This link has expired or is invalid.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { resolveGuestByToken, updateGuest, updateWeddingDetails } from './_lib/rsvpAuth.js';

const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'rsvp-poll-vote', 15, 60_000);
  res.setHeader('X-RateLimit-Limit', '15');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const token = sanitizeString(req.body?.token || '');
  const votes = req.body?.votes && typeof req.body.votes === 'object' ? req.body.votes : {};

  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[rsvp-poll-vote] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const resolved = await resolveGuestByToken(token);
    if (!resolved || !resolved.wedding) {
      return res.status(404).json({ error: 'This link has expired or is invalid.' });
    }
    const { guest, wedding } = resolved;

    const currentPolls = wedding.polls || [];
    const existingVotes = guest.poll_votes || {};
    const mergedVotes = { ...existingVotes, ...votes };

    // Adjust vote counts only for polls where this guest's vote actually
    // changed — mirrors RSVPPage.jsx's prior client-side logic exactly,
    // just against a freshly-fetched wedding record instead of a
    // potentially-stale client-cached one.
    const updatedPolls = currentPolls.map(poll => {
      const newVote = votes[poll.id];
      const oldVote = existingVotes[poll.id];
      if (!newVote || newVote === oldVote) return poll;
      return {
        ...poll,
        options: (poll.options || []).map(opt => {
          if (opt.id === newVote) return { ...opt, votes: (opt.votes || 0) + 1 };
          if (opt.id === oldVote) return { ...opt, votes: Math.max(0, (opt.votes || 0) - 1) };
          return opt;
        }),
      };
    });

    const hasNewVotes = Object.entries(votes).some(
      ([pollId, optId]) => optId && existingVotes[pollId] !== optId
    );

    if (hasNewVotes) {
      await Promise.all([
        updateWeddingDetails(wedding.id, { polls: updatedPolls }),
        updateGuest(guest.id, { poll_votes: mergedVotes }),
      ]);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[rsvp-poll-vote] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
