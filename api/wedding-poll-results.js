/**
 * GET  /api/wedding-poll-results?weddingSlug=<slug>
 * POST /api/wedding-poll-results   { weddingSlug, password? }
 *
 * Public, unauthenticated endpoint backing WeddingPollsPage.jsx's results
 * display. Resolves the wedding by slug using the server-side admin key,
 * reads every PollVote/PollComment for that wedding_id, and returns
 * aggregated per-poll vote counts + comments — the live equivalent of the
 * old static WeddingDetails.polls[].options[].votes/.comments[], which
 * froze the moment votes/comments moved to their own entities.
 *
 * HONOURS THE WEBSITE PASSWORD GATE. Until 2026-08-17 it did not, and that
 * was a real disclosure hole: this endpoint returns every poll comment's
 * TEXT, so anyone who knew a slug could read a password-protected wedding's
 * guest comments without the password. A slug is not a secret — it is printed
 * in every invitation. Same class as the ?preview=true bypass fixed in #447,
 * different door: that was a flag overriding the gate, this was an endpoint
 * that never consulted it.
 *
 * The candidate password travels in a POST body, never the query string —
 * same transport decision as #449, for the same reasons (access logs, browser
 * history, referrer, shared-cache keys). GET remains for unprotected
 * weddings, which is the common case and is unchanged.
 *
 * A protected wedding with a wrong or missing password returns
 * { polls: {}, passwordProtected: true, locked: true } — the same shape, empty.
 * locked is the lockout signal; passwordProtected only ever means "this site
 * has a password" and is true on a successful unlock too. Same two-flag
 * contract as wedding-by-slug, which see. It does not
 * error: the gated response is deliberately indistinguishable from a wedding
 * that simply has no poll data, and it matches what wedding-by-slug already
 * discloses about a protected site.
 *
 * Response: 200 { polls: { [pollId]: { counts: { [optionId]: number }, comments: string[] } } }
 *        or 200 { polls: {}, passwordProtected: true, locked: true }   (gated)
 *        or 404 { error: 'Wedding not found.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { aggregateVotes } from './_lib/pollAuth.js';
import { websiteGateIsOn, verifyWeddingPassword } from './_lib/guestSafeWedding.js';

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

  // POST exists only so a candidate password never has to ride in the URL.
  // Everything else about the two methods is identical.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // This response can carry a protected wedding's guest comments. Never let an
  // intermediary store it.
  res.setHeader('Cache-Control', 'private, no-store');

  const ip = getClientIp(req);
  // Generous limit — every poll page load fetches this once.
  const { limited, remaining } = checkRateLimit(ip, 'wedding-poll-results', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const src = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const weddingSlug = sanitizeString(src.weddingSlug || '');
  // Accepted ONLY from a POST body — see the transport note in the header.
  const candidatePassword = req.method === 'POST' && typeof src.password === 'string' ? src.password : '';
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

    // The gate, consulted exactly as api/wedding-by-slug.js consults it.
    const { on: passwordProtected, failedOpen } = websiteGateIsOn(wedding);
    if (failedOpen) {
      console.error(`[wedding-poll-results] websitePasswordEnabled is true but no credential is stored for slug "${weddingSlug}" — gate FAILED OPEN, poll results served publicly. See scratchpad/DECISION-LOG.md.`);
    }
    if (passwordProtected && !(await verifyWeddingPassword(wedding, candidatePassword))) {
      // Same shape, empty. Not an error: a gated response must not be
      // distinguishable from a wedding with no poll activity.
      return res.status(200).json({ polls: {}, passwordProtected: true, locked: true });
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

    return res.status(200).json({ polls, locked: false });
  } catch (err) {
    console.error('[wedding-poll-results] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
