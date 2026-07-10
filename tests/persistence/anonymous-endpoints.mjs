/**
 * tests/persistence/anonymous-endpoints.mjs
 *
 * Covers the fix/anonymous-endpoints server-mediation work
 * (ANONYMOUS_ACCESS_MATRIX.md): the wedding-by-slug endpoint never leaks a
 * disallowed field, the RSVP token lookup returns only the matching
 * guest's own data, and song-request submissions land with the correct
 * server-stamped wedding linkage.
 *
 * Imports _shared.mjs first so its .env.local side-effect (populating
 * process.env) runs before any api/*.js module-level env reads.
 */

import { APP_ID, api, pass, fail, login } from './_shared.mjs';
import { pickGuestSafeFields, NEVER_RETURN_FIELDS } from '../../api/_lib/guestSafeWedding.js';
import weddingBySlugHandler from '../../api/wedding-by-slug.js';
import rsvpLookupHandler from '../../api/rsvp-lookup.js';
import songRequestSubmitHandler from '../../api/song-request-submit.js';
import weddingPollVoteHandler from '../../api/wedding-poll-vote.js';
import weddingPollCommentHandler from '../../api/wedding-poll-comment.js';
import rsvpPollVoteHandler from '../../api/rsvp-poll-vote.js';
import weddingPollResultsHandler from '../../api/wedding-poll-results.js';
import weddingGuestbookHandler from '../../api/wedding-guestbook.js';
import rsvpSubmitHandler from '../../api/rsvp-submit.js';
import { aggregateEventTallies, latestEventResponses } from '../../src/lib/rsvpAggregation.js';

// Cloudflare's official "always passes" Turnstile test keypair — documented
// for exactly this purpose (automated tests with no real browser widget).
// verifyTurnstileToken now fails closed when TURNSTILE_SECRET_KEY is unset
// (fix/endpoint-auth), so tests can no longer bypass the check by deleting
// the env var — this swaps in the real test secret + test token pair
// instead, which still exercises the actual Cloudflare siteverify call.
const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';
const TURNSTILE_TEST_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

/** Runs a handler with the Cloudflare test Turnstile secret temporarily
 *  substituted, so its wedding-linkage/vote-scoping logic (not Turnstile
 *  itself) is what's under test. */
async function withTurnstileFailOpen(fn) {
  const saved = process.env.TURNSTILE_SECRET_KEY;
  process.env.TURNSTILE_SECRET_KEY = TURNSTILE_TEST_SECRET;
  try {
    return await fn();
  } finally {
    if (saved !== undefined) process.env.TURNSTILE_SECRET_KEY = saved;
    else delete process.env.TURNSTILE_SECRET_KEY;
  }
}

/** Minimal Vercel-shaped req/res mock — handlers only touch this surface. */
function mockReqRes({ method = 'GET', query = {}, body = {}, headers = {} } = {}) {
  const req = { method, query, body, headers: { 'x-forwarded-for': '203.0.113.7', ...headers } };
  const res = {
    _status: 200,
    _json: null,
    setHeader() {},
    status(code) { this._status = code; return this; },
    json(obj) { this._json = obj; return this; },
    end() { return this; },
  };
  return { req, res };
}

export async function runAnonymousEndpoints() {
  const results = [];
  let token = null;

  try {
    token = await login();
  } catch (err) {
    console.log(`  ❌ FAIL  anonymous-endpoints setup — login failed: ${err.message}`);
    return [false];
  }

  // ── pickGuestSafeFields never includes a disallowed field (pure) ───────────
  console.log('\n  wedding-by-slug field allowlist (pure function):\n');
  {
    const kitchenSink = {
      id: 'test-id', slug: 'test-slug', coupleNames: 'Alex & Sam',
      websitePassword: 'super-secret', emergencyContacts: { primary: { name: 'Mum', phone: '000' } },
      dayVendorContacts: [{ name: 'DJ', phone: '111' }], contactPerson: { name: 'X', phone: '222' },
      celebrant: { name: 'Y', phone: '333' }, license: { licenseNumber: 'ABC123' },
    };
    const out = pickGuestSafeFields(kitchenSink);
    const leaked = NEVER_RETURN_FIELDS.filter(f => f in out);
    results.push(leaked.length === 0
      ? pass('pickGuestSafeFields — never includes a disallowed field', `checked ${NEVER_RETURN_FIELDS.join(', ')}`)
      : fail('pickGuestSafeFields — never includes a disallowed field', 'none present', leaked.join(', ')));
    results.push(out.passwordProtected === true
      ? pass('pickGuestSafeFields — computes passwordProtected, never the plaintext password', 'true')
      : fail('pickGuestSafeFields — computes passwordProtected, never the plaintext password', true, out.passwordProtected));
    results.push(out.coupleNames === 'Alex & Sam'
      ? pass('pickGuestSafeFields — still includes allowed fields', out.coupleNames)
      : fail('pickGuestSafeFields — still includes allowed fields', 'Alex & Sam', out.coupleNames));
  }

  // ── wedding-by-slug.js handler end-to-end never returns a disallowed field ──
  console.log('\n  wedding-by-slug.js handler — end-to-end field allowlist:\n');
  let slugWeddingId = null;
  try {
    const created = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam', coupleNames: 'Alex & Sam',
      slug: `test-slug-endpoint-${Date.now()}`,
      websitePassword: '', // not password-protected, so the full payload comes back
      emergencyContacts: { primary: { name: 'Mum', phone: '0400000000' } },
      dayVendorContacts: [{ name: 'DJ Test', phone: '0400000001', role: 'DJ' }],
      contactPerson: { name: 'Best Man', phone: '0400000002' },
    }, token);
    slugWeddingId = created.id;
    if (!slugWeddingId) throw new Error('No id on created sentinel WeddingDetails');

    const { req, res } = mockReqRes({ query: { slug: created.slug } });
    await weddingBySlugHandler(req, res);

    const leakedKeys = ['websitePassword', 'emergencyContacts', 'dayVendorContacts', 'contactPerson'].filter(f => f in (res._json || {}));
    results.push(res._status === 200 && leakedKeys.length === 0
      ? pass('wedding-by-slug.js — real response never includes a disallowed field', `200, none of ${leakedKeys.length ? leakedKeys.join(',') : '(checked list)'} present`)
      : fail('wedding-by-slug.js — real response never includes a disallowed field', 'none present', `status=${res._status}, leaked=${leakedKeys.join(',')}`));
    results.push(res._json?.coupleNames === 'Alex & Sam'
      ? pass('wedding-by-slug.js — real response includes allowed fields', res._json?.coupleNames)
      : fail('wedding-by-slug.js — real response includes allowed fields', 'Alex & Sam', res._json?.coupleNames));
  } catch (err) {
    console.log(`  ❌ FAIL  wedding-by-slug.js handler test — error: ${err.message}`);
    results.push(false, false);
  } finally {
    if (slugWeddingId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${slugWeddingId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── rsvp-lookup.js handler returns only the matching guest ──────────────────
  console.log('\n  rsvp-lookup.js handler — returns only the matching guest:\n');
  let lookupGuestAId = null;
  let lookupGuestBId = null;
  try {
    const tokenA = `test-rsvp-token-a-${Date.now()}`;
    const tokenB = `test-rsvp-token-b-${Date.now()}`;

    const guestA = await api('POST', `/apps/${APP_ID}/entities/Guest`, {
      name: '__PERSISTENCE_TEST_LOOKUP_A__', rsvp_link_id: tokenA,
      song_request: 'Guest A song — must not leak to guest B lookup',
    }, token);
    lookupGuestAId = guestA.id;

    const guestB = await api('POST', `/apps/${APP_ID}/entities/Guest`, {
      name: '__PERSISTENCE_TEST_LOOKUP_B__', rsvp_link_id: tokenB,
      song_request: 'Guest B song — must not appear when looking up token A',
    }, token);
    lookupGuestBId = guestB.id;

    const { req, res } = mockReqRes({ query: { token: tokenA } });
    await rsvpLookupHandler(req, res);

    results.push(res._status === 200 && res._json?.guest?.name === '__PERSISTENCE_TEST_LOOKUP_A__'
      ? pass('rsvp-lookup.js — resolves the guest matching the token', res._json?.guest?.name)
      : fail('rsvp-lookup.js — resolves the guest matching the token', '__PERSISTENCE_TEST_LOOKUP_A__', res._json?.guest?.name));
    results.push(res._json?.guest?.song_request?.startsWith('Guest A')
      ? pass('rsvp-lookup.js — returns that guest\'s own data', res._json?.guest?.song_request)
      : fail('rsvp-lookup.js — returns that guest\'s own data', 'Guest A song…', res._json?.guest?.song_request));
    const responseHasGuestBData = JSON.stringify(res._json || {}).includes('Guest B song');
    results.push(!responseHasGuestBData
      ? pass('rsvp-lookup.js — never includes a different guest\'s data', 'not present')
      : fail('rsvp-lookup.js — never includes a different guest\'s data', 'not present', 'Guest B data leaked'));
    results.push(!('id' in (res._json?.guest || {}))
      ? pass('rsvp-lookup.js — never returns the raw guest id (writes are token-scoped, not id-scoped)', 'absent')
      : fail('rsvp-lookup.js — never returns the raw guest id', 'absent', 'present'));
  } catch (err) {
    console.log(`  ❌ FAIL  rsvp-lookup.js handler test — error: ${err.message}`);
    results.push(false, false, false, false);
  } finally {
    for (const id of [lookupGuestAId, lookupGuestBId]) {
      if (!id) continue;
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${id}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── song-request-submit.js stamps the correct wedding linkage ───────────────
  console.log('\n  song-request-submit.js — correct wedding linkage:\n');
  let songWeddingId = null;
  let createdSongRequestId = null;
  try {
    const wedding = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam',
      slug: `test-song-wedding-${Date.now()}`,
      music: { guestRequestsEnabled: true, requestsRequireApproval: false },
    }, token);
    songWeddingId = wedding.id;

    const { req, res } = mockReqRes({
      method: 'POST',
      body: {
        weddingSlug: wedding.slug,
        title: 'Test Song Title', artist: 'Test Artist', submittedBy: 'Test Guest',
        turnstileToken: TURNSTILE_TEST_TOKEN,
      },
    });

    // Fail-open Turnstile path (TURNSTILE_SECRET_KEY unset) — isolates this
    // test from needing a real Cloudflare challenge/response pair; the
    // wedding-linkage logic under test doesn't depend on Turnstile at all.
    await withTurnstileFailOpen(() => songRequestSubmitHandler(req, res));

    results.push(res._status === 200
      ? pass('song-request-submit.js — accepts a valid submission', `200 ${JSON.stringify(res._json)}`)
      : fail('song-request-submit.js — accepts a valid submission', 200, `${res._status} ${JSON.stringify(res._json)}`));

    const query = encodeURIComponent(JSON.stringify({ title: 'Test Song Title', artist: 'Test Artist' }));
    const found = await api('GET', `/apps/${APP_ID}/entities/SongRequest?q=${query}`, undefined, token);
    const list = Array.isArray(found) ? found : (found?.data || found?.results || []);
    const record = list.find(r => r.submittedBy === 'Test Guest');
    createdSongRequestId = record?.id;

    results.push(record?.weddingId === songWeddingId
      ? pass('song-request-submit.js — stamps the correct weddingId server-side', record?.weddingId)
      : fail('song-request-submit.js — stamps the correct weddingId server-side', songWeddingId, record?.weddingId));
    results.push(record?.status === 'approved'
      ? pass('song-request-submit.js — status reflects requestsRequireApproval:false', record?.status)
      : fail('song-request-submit.js — status reflects requestsRequireApproval:false', 'approved', record?.status));
  } catch (err) {
    console.log(`  ❌ FAIL  song-request-submit.js test — error: ${err.message}`);
    results.push(false, false, false);
  } finally {
    if (createdSongRequestId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/SongRequest/${createdSongRequestId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
    if (songWeddingId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${songWeddingId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── wedding-poll-vote.js writes a PollVote record (fix/poll-entities-migration) ──
  // Votes/comments no longer live on WeddingDetails.polls (its owner-scoped
  // update RLS structurally can't be satisfied by the admin key) — they're
  // separate entities with create:null RLS, same pattern as GuestbookEntry.
  console.log('\n  wedding-poll-vote.js — writes a scoped PollVote record:\n');
  let pollWeddingId = null;
  const pollVoteIdsToClean = [];
  try {
    const wedding = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam',
      slug: `test-poll-wedding-${Date.now()}`,
    }, token);
    pollWeddingId = wedding.id;

    const { req, res } = mockReqRes({
      method: 'POST',
      body: { weddingSlug: wedding.slug, pollId: 'poll-1', optionId: 'opt-a', turnstileToken: TURNSTILE_TEST_TOKEN, voterId: 'sentinel-voter-anon' },
    });
    await withTurnstileFailOpen(() => weddingPollVoteHandler(req, res));

    results.push(res._status === 200
      ? pass('wedding-poll-vote.js — accepts a valid vote', `200 ${JSON.stringify(res._json)}`)
      : fail('wedding-poll-vote.js — accepts a valid vote', 200, `${res._status} ${JSON.stringify(res._json)}`));

    const votesQuery = encodeURIComponent(JSON.stringify({ wedding_id: pollWeddingId, poll_id: 'poll-1' }));
    const votes = await api('GET', `/apps/${APP_ID}/entities/PollVote?q=${votesQuery}`, undefined, token);
    const voteList = Array.isArray(votes) ? votes : (votes?.data || votes?.results || []);
    pollVoteIdsToClean.push(...voteList.map(v => v.id));
    const persisted = voteList.find(v => v.option_id === 'opt-a');
    results.push(!!persisted
      ? pass('wedding-poll-vote.js — PollVote persists with the correct wedding_id/poll_id/option_id', JSON.stringify(persisted))
      : fail('wedding-poll-vote.js — PollVote persists with the correct wedding_id/poll_id/option_id', 'a PollVote row for opt-a', JSON.stringify(voteList)));
  } catch (err) {
    console.log(`  ❌ FAIL  wedding-poll-vote.js test — error: ${err.message}`);
    results.push(false, false);
  } finally {
    for (const id of pollVoteIdsToClean) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/PollVote/${id}`, undefined, token); }
      catch { /* non-fatal */ }
    }
    if (pollWeddingId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${pollWeddingId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── wedding-poll-comment.js writes a PollComment record ─────────────────────
  console.log('\n  wedding-poll-comment.js — writes a scoped PollComment record:\n');
  let commentWeddingId = null;
  let pollCommentIdToClean = null;
  try {
    const wedding = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam',
      slug: `test-poll-comment-wedding-${Date.now()}`,
    }, token);
    commentWeddingId = wedding.id;

    const { req, res } = mockReqRes({
      method: 'POST',
      body: { weddingSlug: wedding.slug, pollId: 'poll-1', comment: 'A sentinel test comment', turnstileToken: TURNSTILE_TEST_TOKEN },
    });
    await withTurnstileFailOpen(() => weddingPollCommentHandler(req, res));

    results.push(res._status === 200
      ? pass('wedding-poll-comment.js — accepts a valid comment', `200 ${JSON.stringify(res._json)}`)
      : fail('wedding-poll-comment.js — accepts a valid comment', 200, `${res._status} ${JSON.stringify(res._json)}`));

    const commentsQuery = encodeURIComponent(JSON.stringify({ wedding_id: commentWeddingId, poll_id: 'poll-1' }));
    const comments = await api('GET', `/apps/${APP_ID}/entities/PollComment?q=${commentsQuery}`, undefined, token);
    const commentList = Array.isArray(comments) ? comments : (comments?.data || comments?.results || []);
    const persisted = commentList.find(c => c.text === 'A sentinel test comment');
    pollCommentIdToClean = persisted?.id || null;
    results.push(!!persisted
      ? pass('wedding-poll-comment.js — PollComment persists on the correct wedding\'s poll', JSON.stringify(persisted))
      : fail('wedding-poll-comment.js — PollComment persists on the correct wedding\'s poll', 'present', JSON.stringify(commentList)));
  } catch (err) {
    console.log(`  ❌ FAIL  wedding-poll-comment.js test — error: ${err.message}`);
    results.push(false, false);
  } finally {
    if (pollCommentIdToClean) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/PollComment/${pollCommentIdToClean}`, undefined, token); }
      catch { /* non-fatal */ }
    }
    if (commentWeddingId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${commentWeddingId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── rsvp-poll-vote.js — token-scoped PollVote, privacy-preserving identifier ──
  console.log('\n  rsvp-poll-vote.js — token-scoped PollVote with hashed guest_identifier:\n');
  let rsvpPollWeddingId = null;
  let rsvpPollGuestId = null;
  const rsvpPollVoteIdsToClean = [];
  try {
    const wedding = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam',
      slug: `test-rsvp-poll-wedding-${Date.now()}`,
    }, token);
    rsvpPollWeddingId = wedding.id;

    const rsvpToken = `test-rsvp-poll-token-${Date.now()}`;
    const guest = await api('POST', `/apps/${APP_ID}/entities/Guest`, {
      name: '__PERSISTENCE_TEST_RSVP_POLL_GUEST__', rsvp_link_id: rsvpToken,
    }, token);
    rsvpPollGuestId = guest.id;

    const { req, res } = mockReqRes({
      method: 'POST',
      body: { token: rsvpToken, votes: { 'poll-1': 'opt-a' } },
    });
    await rsvpPollVoteHandler(req, res);

    results.push(res._status === 200
      ? pass('rsvp-poll-vote.js — accepts a valid vote', `200 ${JSON.stringify(res._json)}`)
      : fail('rsvp-poll-vote.js — accepts a valid vote', 200, `${res._status} ${JSON.stringify(res._json)}`));

    const votesQuery = encodeURIComponent(JSON.stringify({ wedding_id: rsvpPollWeddingId, poll_id: 'poll-1' }));
    const votes = await api('GET', `/apps/${APP_ID}/entities/PollVote?q=${votesQuery}`, undefined, token);
    const voteList = Array.isArray(votes) ? votes : (votes?.data || votes?.results || []);
    rsvpPollVoteIdsToClean.push(...voteList.map(v => v.id));
    const persisted = voteList.find(v => v.option_id === 'opt-a');
    results.push(!!persisted
      ? pass('rsvp-poll-vote.js — PollVote persists with the correct wedding_id/poll_id/option_id', JSON.stringify(persisted))
      : fail('rsvp-poll-vote.js — PollVote persists with the correct wedding_id/poll_id/option_id', 'a PollVote row for opt-a', JSON.stringify(voteList)));

    // guest_identifier must never be the raw Guest.id — PollVote's read is
    // unrestricted (read: null, same structural reason as its create), so an
    // unhashed identifier would let anyone tie a vote back to a named guest.
    results.push(!!persisted && persisted.guest_identifier && persisted.guest_identifier !== guest.id && /^[0-9a-f]{64}$/.test(persisted.guest_identifier)
      ? pass('rsvp-poll-vote.js — guest_identifier is a non-reversible hash, never the raw Guest.id', persisted.guest_identifier)
      : fail('rsvp-poll-vote.js — guest_identifier is a non-reversible hash, never the raw Guest.id', '64-char hex digest ≠ guest.id', persisted?.guest_identifier));
  } catch (err) {
    console.log(`  ❌ FAIL  rsvp-poll-vote.js test — error: ${err.message}`);
    results.push(false, false, false);
  } finally {
    for (const id of rsvpPollVoteIdsToClean) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/PollVote/${id}`, undefined, token); }
      catch { /* non-fatal */ }
    }
    if (rsvpPollGuestId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${rsvpPollGuestId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
    if (rsvpPollWeddingId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${rsvpPollWeddingId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── wedding-poll-results.js — deterministic latest-wins aggregation ─────────
  // A guest who changes their vote must have only their LATEST choice
  // counted, never both — src/lib/pollAggregation.js's whole reason to exist.
  console.log('\n  wedding-poll-results.js — latest-wins aggregation on vote change:\n');
  let aggWeddingId = null;
  const aggVoteIdsToClean = [];
  try {
    const wedding = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam',
      slug: `test-poll-agg-wedding-${Date.now()}`,
    }, token);
    aggWeddingId = wedding.id;

    // Same voterId votes for opt-a, then changes their mind to opt-b.
    const firstVote = mockReqRes({
      method: 'POST',
      body: { weddingSlug: wedding.slug, pollId: 'poll-1', optionId: 'opt-a', turnstileToken: TURNSTILE_TEST_TOKEN, voterId: 'sentinel-voter-switcher' },
    });
    await withTurnstileFailOpen(() => weddingPollVoteHandler(firstVote.req, firstVote.res));

    // A different voter votes opt-a — this vote must still count, since it's
    // not a duplicate from the same voter.
    const otherVote = mockReqRes({
      method: 'POST',
      body: { weddingSlug: wedding.slug, pollId: 'poll-1', optionId: 'opt-a', turnstileToken: TURNSTILE_TEST_TOKEN, voterId: 'sentinel-voter-other' },
    });
    await withTurnstileFailOpen(() => weddingPollVoteHandler(otherVote.req, otherVote.res));

    // Ensure the second vote from the switching voter has a strictly later
    // created_date than their first (Base44 timestamps are second-resolution).
    await new Promise(r => setTimeout(r, 1100));

    const secondVote = mockReqRes({
      method: 'POST',
      body: { weddingSlug: wedding.slug, pollId: 'poll-1', optionId: 'opt-b', turnstileToken: TURNSTILE_TEST_TOKEN, voterId: 'sentinel-voter-switcher' },
    });
    await withTurnstileFailOpen(() => weddingPollVoteHandler(secondVote.req, secondVote.res));

    const votesQuery = encodeURIComponent(JSON.stringify({ wedding_id: aggWeddingId, poll_id: 'poll-1' }));
    const votes = await api('GET', `/apps/${APP_ID}/entities/PollVote?q=${votesQuery}`, undefined, token);
    const voteList = Array.isArray(votes) ? votes : (votes?.data || votes?.results || []);
    aggVoteIdsToClean.push(...voteList.map(v => v.id));
    results.push(voteList.length === 3
      ? pass('wedding-poll-results.js setup — all 3 append-only PollVote rows persisted', voteList.length)
      : fail('wedding-poll-results.js setup — all 3 append-only PollVote rows persisted', 3, voteList.length));

    const { req: resReq, res: resRes } = mockReqRes({ method: 'GET', query: { weddingSlug: wedding.slug } });
    await weddingPollResultsHandler(resReq, resRes);
    const counts = resRes._json?.polls?.['poll-1']?.counts || {};
    results.push(counts['opt-b'] === 1
      ? pass('wedding-poll-results.js — a changed vote counts only the latest choice', JSON.stringify(counts))
      : fail('wedding-poll-results.js — a changed vote counts only the latest choice', '{"opt-a":1,"opt-b":1}', JSON.stringify(counts)));
    results.push(counts['opt-a'] === 1
      ? pass('wedding-poll-results.js — a different voter\'s vote for the same option is still counted', JSON.stringify(counts))
      : fail('wedding-poll-results.js — a different voter\'s vote for the same option is still counted', '{"opt-a":1,"opt-b":1}', JSON.stringify(counts)));
  } catch (err) {
    console.log(`  ❌ FAIL  wedding-poll-results.js aggregation test — error: ${err.message}`);
    results.push(false, false, false);
  } finally {
    for (const id of aggVoteIdsToClean) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/PollVote/${id}`, undefined, token); }
      catch { /* non-fatal */ }
    }
    if (aggWeddingId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${aggWeddingId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── wedding-guestbook.js returns only this wedding's entries ────────────────
  console.log('\n  wedding-guestbook.js — scoped read:\n');
  let gbWeddingId = null;
  let gbOwnEntryId = null;
  let gbOtherEntryId = null;
  try {
    const wedding = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam', slug: `test-gb-wedding-${Date.now()}`,
    }, token);
    gbWeddingId = wedding.id;

    const ownEntry = await api('POST', `/apps/${APP_ID}/entities/GuestbookEntry`, {
      wedding_id: gbWeddingId, guest_name: 'Own Guest', message: 'This wedding\'s message',
    }, token);
    gbOwnEntryId = ownEntry.id;

    const otherEntry = await api('POST', `/apps/${APP_ID}/entities/GuestbookEntry`, {
      wedding_id: 'a-completely-different-wedding-id', guest_name: 'Other Guest', message: 'A different wedding\'s message',
    }, token);
    gbOtherEntryId = otherEntry.id;

    const { req, res } = mockReqRes({ query: { slug: wedding.slug } });
    await weddingGuestbookHandler(req, res);

    const entries = res._json?.entries || [];
    results.push(res._status === 200 && entries.some(e => e.guest_name === 'Own Guest')
      ? pass('wedding-guestbook.js — includes this wedding\'s own entry', entries.length)
      : fail('wedding-guestbook.js — includes this wedding\'s own entry', 'present', JSON.stringify(entries)));
    results.push(!entries.some(e => e.guest_name === 'Other Guest')
      ? pass('wedding-guestbook.js — never includes a different wedding\'s entry', 'absent')
      : fail('wedding-guestbook.js — never includes a different wedding\'s entry', 'absent', 'present'));
  } catch (err) {
    console.log(`  ❌ FAIL  wedding-guestbook.js test — error: ${err.message}`);
    results.push(false, false);
  } finally {
    for (const id of [gbOwnEntryId, gbOtherEntryId]) {
      if (!id) continue;
      try { await api('DELETE', `/apps/${APP_ID}/entities/GuestbookEntry/${id}`, undefined, token); }
      catch { /* non-fatal */ }
    }
    if (gbWeddingId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${gbWeddingId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── rsvp-submit.js — writes RsvpResponse rows (fix/rsvp-entities-migration) ──
  // Guest gained an owner-scoped update RLS rule the admin key structurally
  // cannot satisfy — the exact same wall that broke poll votes/comments —
  // so this endpoint 403'd on Guest.update() until this migration. Verifies
  // the previously-403ing flow now succeeds and persists as RsvpResponse rows,
  // never touching Guest itself.
  console.log('\n  rsvp-submit.js — token-scoped RsvpResponse writes:\n');
  let rsvpWeddingId = null;
  let rsvpGuestId = null;
  const rsvpResponseIdsToClean = [];
  try {
    const wedding = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam', slug: `test-rsvp-submit-wedding-${Date.now()}`,
    }, token);
    rsvpWeddingId = wedding.id;

    const rsvpToken = `test-rsvp-submit-token-${Date.now()}`;
    const guest = await api('POST', `/apps/${APP_ID}/entities/Guest`, {
      name: '__PERSISTENCE_TEST_RSVP_SUBMIT_GUEST__', rsvp_link_id: rsvpToken,
    }, token);
    rsvpGuestId = guest.id;

    const { req, res } = mockReqRes({
      method: 'POST',
      body: {
        token: rsvpToken,
        // A forged wedding_id in the body must never be trusted — the
        // endpoint doesn't even read this field, only the token-resolved
        // wedding, but this proves the created row is stamped correctly
        // regardless of anything a malicious client sends.
        wedding_id: 'a-forged-different-wedding-id',
        event_responses: [{ event_id: 'event-1', status: 'yes', meal_choice: 'chicken', plus_ones: 1, plus_one_names: ['Guest Plus One'] }],
        song_request: 'Sentinel song request',
        rsvp_note: 'Sentinel RSVP note',
        dietary_restrictions: 'Sentinel dietary note',
      },
    });
    await rsvpSubmitHandler(req, res);

    results.push(res._status === 200
      ? pass('rsvp-submit.js — accepts a valid submission (previously 403)', `200 ${JSON.stringify(res._json)}`)
      : fail('rsvp-submit.js — accepts a valid submission (previously 403)', 200, `${res._status} ${JSON.stringify(res._json)}`));

    const rowsQuery = encodeURIComponent(JSON.stringify({ wedding_id: rsvpWeddingId, guest_id: rsvpGuestId }));
    const rows = await api('GET', `/apps/${APP_ID}/entities/RsvpResponse?q=${rowsQuery}`, undefined, token);
    const rowList = Array.isArray(rows) ? rows : (rows?.data || rows?.results || []);
    rsvpResponseIdsToClean.push(...rowList.map(r => r.id));

    const eventRow = rowList.find(r => r.event_id === 'event-1');
    results.push(eventRow?.status === 'yes' && eventRow?.meal_choice === 'chicken'
      ? pass('rsvp-submit.js — per-event row persists with correct status/meal_choice', JSON.stringify(eventRow))
      : fail('rsvp-submit.js — per-event row persists with correct status/meal_choice', 'status:yes, meal_choice:chicken', JSON.stringify(eventRow)));
    results.push(eventRow?.wedding_id === rsvpWeddingId
      ? pass('rsvp-submit.js — ignores a forged wedding_id in the body, stamps the token-resolved wedding', eventRow?.wedding_id)
      : fail('rsvp-submit.js — ignores a forged wedding_id in the body, stamps the token-resolved wedding', rsvpWeddingId, eventRow?.wedding_id));

    const guestLevelRow = rowList.find(r => r.event_id === null || r.event_id === undefined);
    results.push(guestLevelRow?.song_request === 'Sentinel song request' && guestLevelRow?.note === 'Sentinel RSVP note' && guestLevelRow?.dietary_restrictions === 'Sentinel dietary note'
      ? pass('rsvp-submit.js — guest-level row (event_id: null) persists song_request/note/dietary_restrictions', JSON.stringify(guestLevelRow))
      : fail('rsvp-submit.js — guest-level row (event_id: null) persists song_request/note/dietary_restrictions', 'all three sentinel values', JSON.stringify(guestLevelRow)));

    // ── A guest changing their RSVP: resubmit the same event with a
    // different status — the tally must reflect only the latest choice.
    await new Promise(r => setTimeout(r, 1100));
    const { req: req2, res: res2 } = mockReqRes({
      method: 'POST',
      body: {
        token: rsvpToken,
        event_responses: [{ event_id: 'event-1', status: 'no' }],
      },
    });
    await rsvpSubmitHandler(req2, res2);
    results.push(res2._status === 200
      ? pass('rsvp-submit.js — accepts a resubmission (changed RSVP)', `200 ${JSON.stringify(res2._json)}`)
      : fail('rsvp-submit.js — accepts a resubmission (changed RSVP)', 200, `${res2._status} ${JSON.stringify(res2._json)}`));

    const rowsAfter = await api('GET', `/apps/${APP_ID}/entities/RsvpResponse?q=${rowsQuery}`, undefined, token);
    const rowListAfter = Array.isArray(rowsAfter) ? rowsAfter : (rowsAfter?.data || rowsAfter?.results || []);
    rsvpResponseIdsToClean.push(...rowListAfter.map(r => r.id).filter(id => !rsvpResponseIdsToClean.includes(id)));

    results.push(rowListAfter.length === 4
      ? pass('rsvp-submit.js — resubmission appends a new row rather than mutating (append-only)', rowListAfter.length)
      : fail('rsvp-submit.js — resubmission appends a new row rather than mutating (append-only)', 4, rowListAfter.length));

    const latestEvent1 = latestEventResponses(rowListAfter).find(r => r.event_id === 'event-1');
    results.push(latestEvent1?.status === 'no'
      ? pass('rsvp-submit.js — a guest changing their RSVP counts only the latest status', latestEvent1?.status)
      : fail('rsvp-submit.js — a guest changing their RSVP counts only the latest status', 'no', latestEvent1?.status));
  } catch (err) {
    console.log(`  ❌ FAIL  rsvp-submit.js test — error: ${err.message}`);
    results.push(false, false, false, false, false, false);
  } finally {
    for (const id of rsvpResponseIdsToClean) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/RsvpResponse/${id}`, undefined, token); }
      catch { /* non-fatal */ }
    }
    if (rsvpGuestId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${rsvpGuestId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
    if (rsvpWeddingId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${rsvpWeddingId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── RsvpResponse per-event tallies aggregate correctly across guests ────────
  console.log('\n  rsvp-submit.js — per-event tallies aggregate across multiple guests:\n');
  let tallyWeddingId = null;
  let tallyGuestAId = null;
  let tallyGuestBId = null;
  const tallyRowIdsToClean = [];
  try {
    const wedding = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam', slug: `test-rsvp-tally-wedding-${Date.now()}`,
    }, token);
    tallyWeddingId = wedding.id;

    const tokenA = `test-rsvp-tally-a-${Date.now()}`;
    const tokenB = `test-rsvp-tally-b-${Date.now()}`;
    const guestA = await api('POST', `/apps/${APP_ID}/entities/Guest`, { name: '__PERSISTENCE_TEST_TALLY_GUEST_A__', rsvp_link_id: tokenA }, token);
    const guestB = await api('POST', `/apps/${APP_ID}/entities/Guest`, { name: '__PERSISTENCE_TEST_TALLY_GUEST_B__', rsvp_link_id: tokenB }, token);
    tallyGuestAId = guestA.id;
    tallyGuestBId = guestB.id;

    const submitA = mockReqRes({ method: 'POST', body: { token: tokenA, event_responses: [{ event_id: 'event-tally', status: 'yes' }] } });
    await rsvpSubmitHandler(submitA.req, submitA.res);
    const submitB = mockReqRes({ method: 'POST', body: { token: tokenB, event_responses: [{ event_id: 'event-tally', status: 'no' }] } });
    await rsvpSubmitHandler(submitB.req, submitB.res);

    const rowsQuery = encodeURIComponent(JSON.stringify({ wedding_id: tallyWeddingId }));
    const rows = await api('GET', `/apps/${APP_ID}/entities/RsvpResponse?q=${rowsQuery}`, undefined, token);
    const rowList = Array.isArray(rows) ? rows : (rows?.data || rows?.results || []);
    tallyRowIdsToClean.push(...rowList.map(r => r.id));

    const tallies = aggregateEventTallies(rowList);
    results.push(tallies['event-tally']?.yes === 1 && tallies['event-tally']?.no === 1
      ? pass('rsvp-submit.js — per-event tally counts each guest\'s latest status correctly', JSON.stringify(tallies['event-tally']))
      : fail('rsvp-submit.js — per-event tally counts each guest\'s latest status correctly', '{"yes":1,"no":1}', JSON.stringify(tallies['event-tally'])));
  } catch (err) {
    console.log(`  ❌ FAIL  rsvp-submit.js tally test — error: ${err.message}`);
    results.push(false);
  } finally {
    for (const id of tallyRowIdsToClean) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/RsvpResponse/${id}`, undefined, token); }
      catch { /* non-fatal */ }
    }
    for (const id of [tallyGuestAId, tallyGuestBId]) {
      if (!id) continue;
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${id}`, undefined, token); }
      catch { /* non-fatal */ }
    }
    if (tallyWeddingId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${tallyWeddingId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  return results;
}
