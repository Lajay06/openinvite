/**
 * POST /api/rsvp-poll-vote
 *
 * Public, unauthenticated endpoint backing RSVPPage.jsx's post-RSVP poll
 * step. Validates the rsvp_link_id token server-side (resolving the guest
 * exactly as api/rsvp-lookup.js does), then writes one PollVote record per
 * submitted answer — replacing the previous dual write of
 * WeddingDetails.polls (vote-count increment/decrement) and
 * Guest.poll_votes (this guest's current answers), both of which required
 * an admin-key UPDATE on records the admin key doesn't own and broke
 * outright once WeddingDetails/Guest gained owner-scoped update RLS rules
 * the admin key structurally cannot satisfy. PollVote's create:null RLS
 * has no such problem — same pattern already proven by GuestbookEntry/
 * SongRequest.
 *
 * The append-only PollVote model means a guest changing their vote simply
 * writes a new row; aggregation (src/lib/pollAggregation.js) keeps only
 * each voter's latest row per poll, so there's no need to look up or
 * compare against a guest's previous answer before writing.
 *
 * Body: { token: string, votes: { [pollId]: optionId } }
 * Response: 200 { ok: true }
 *        or 404 { error: 'This link has expired or is invalid.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { resolveGuestByToken } from './_lib/rsvpAuth.js';
import { hashGuestIdentifier } from './_lib/pollAuth.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
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

    const guestIdentifier = hashGuestIdentifier(guest.id);
    const entries = Object.entries(votes).filter(([, optionId]) => !!optionId);

    await Promise.all(entries.map(([pollId, optionId]) =>
      fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/PollVote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
        body: JSON.stringify({
          wedding_id: wedding.id,
          poll_id: pollId,
          option_id: optionId,
          guest_identifier: guestIdentifier,
        }),
      }).then(async (r) => {
        if (!r.ok) {
          const body = await r.text().catch(() => '');
          throw new Error(`Base44 PollVote create failed (${r.status}): ${body.slice(0, 200)}`);
        }
      })
    ));

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[rsvp-poll-vote] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
