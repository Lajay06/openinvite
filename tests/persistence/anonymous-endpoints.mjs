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
import weddingGuestbookHandler from '../../api/wedding-guestbook.js';

/** Runs a handler with TURNSTILE_SECRET_KEY temporarily unset, isolating a
 *  test from needing a real Cloudflare challenge/response pair. */
async function withTurnstileFailOpen(fn) {
  const saved = process.env.TURNSTILE_SECRET_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
  try {
    return await fn();
  } finally {
    if (saved !== undefined) process.env.TURNSTILE_SECRET_KEY = saved;
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
        turnstileToken: 'test-token',
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

  // ── wedding-poll-vote.js increments the correct wedding's poll ──────────────
  console.log('\n  wedding-poll-vote.js — scoped vote increment:\n');
  let pollWeddingId = null;
  try {
    const wedding = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam',
      slug: `test-poll-wedding-${Date.now()}`,
      polls: [{ id: 'poll-1', title: 'Test poll', isActive: true, options: [{ id: 'opt-a', label: 'A', votes: 0 }, { id: 'opt-b', label: 'B', votes: 0 }] }],
    }, token);
    pollWeddingId = wedding.id;

    const { req, res } = mockReqRes({
      method: 'POST',
      body: { weddingSlug: wedding.slug, pollId: 'poll-1', optionId: 'opt-a', turnstileToken: 'test-token' },
    });
    await withTurnstileFailOpen(() => weddingPollVoteHandler(req, res));

    results.push(res._status === 200
      ? pass('wedding-poll-vote.js — accepts a valid vote', `200 ${JSON.stringify(res._json)}`)
      : fail('wedding-poll-vote.js — accepts a valid vote', 200, `${res._status} ${JSON.stringify(res._json)}`));

    const after = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${pollWeddingId}`, undefined, token);
    const votedOption = after.polls?.[0]?.options?.find(o => o.id === 'opt-a');
    results.push(votedOption?.votes === 1
      ? pass('wedding-poll-vote.js — increments the correct option on the correct wedding', String(votedOption?.votes))
      : fail('wedding-poll-vote.js — increments the correct option on the correct wedding', 1, votedOption?.votes));
  } catch (err) {
    console.log(`  ❌ FAIL  wedding-poll-vote.js test — error: ${err.message}`);
    results.push(false, false);
  } finally {
    if (pollWeddingId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${pollWeddingId}`, undefined, token); }
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

  return results;
}
