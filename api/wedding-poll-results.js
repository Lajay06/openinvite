/**
 * GET /api/wedding-poll-results?weddingSlug=<slug>
 *
 * Public, unauthenticated endpoint backing WeddingPollsPage.jsx's results
 * display. Resolves the wedding by slug using the server-side admin key,
 * reads every PollVote/PollComment for that wedding_id, and returns
 * aggregated per-poll vote counts + comments — the live equivalent of the
 * old static WeddingDetails.polls[].options[].votes/.comments[], which
 * froze the moment votes/comments moved to their own entities.
 *
 * Response: 200 { polls: { [pollId]: { counts: { [optionId]: number }, comments: string[] } } }
 *        or 404 { error: 'Wedding not found.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { aggregateVotes } from './_lib/pollAuth.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  // Generous limit — every poll page load fetches this once.
  const { limited, remaining } = checkRateLimit(ip, 'wedding-poll-results', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const weddingSlug = sanitizeString(req.query?.weddingSlug || '');
  if (!weddingSlug) {
    return res.status(400).json({ error: 'weddingSlug is required' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[wedding-poll-results] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const weddingQuery = encodeURIComponent(JSON.stringify({ slug: weddingSlug }));
    const findRes = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`, {
      headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    });
    if (!findRes.ok) {
      const body = await findRes.text().catch(() => '');
      throw new Error(`Base44 WeddingDetails lookup failed (${findRes.status}): ${body.slice(0, 200)}`);
    }
    const wedding = unwrapList(await findRes.json()).find(w => w.slug === weddingSlug && !w.is_test);
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found.' });
    }

    const votesQuery = encodeURIComponent(JSON.stringify({ wedding_id: wedding.id }));
    const [votesRes, commentsRes] = await Promise.all([
      fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/PollVote?q=${votesQuery}`, {
        headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
      }),
      fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/PollComment?q=${votesQuery}`, {
        headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
      }),
    ]);
    if (!votesRes.ok || !commentsRes.ok) {
      throw new Error(`Base44 PollVote/PollComment read failed (${votesRes.status}/${commentsRes.status})`);
    }

    const votes = unwrapList(await votesRes.json()).filter(v => !v.is_test);
    const comments = unwrapList(await commentsRes.json()).filter(c => !c.is_test);

    const votesByPoll = new Map();
    for (const v of votes) {
      if (!votesByPoll.has(v.poll_id)) votesByPoll.set(v.poll_id, []);
      votesByPoll.get(v.poll_id).push(v);
    }

    const commentsByPoll = new Map();
    for (const c of comments.slice().sort((a, b) => new Date(a.created_date) - new Date(b.created_date))) {
      if (!commentsByPoll.has(c.poll_id)) commentsByPoll.set(c.poll_id, []);
      commentsByPoll.get(c.poll_id).push(c.text);
    }

    const polls = {};
    const pollIds = new Set([...votesByPoll.keys(), ...commentsByPoll.keys()]);
    for (const pollId of pollIds) {
      polls[pollId] = {
        counts: aggregateVotes(votesByPoll.get(pollId) || []),
        comments: commentsByPoll.get(pollId) || [],
      };
    }

    return res.status(200).json({ polls });
  } catch (err) {
    console.error('[wedding-poll-results] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
