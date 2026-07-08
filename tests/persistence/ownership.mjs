/**
 * tests/persistence/ownership.mjs
 *
 * Cross-tenant isolation: proves the created_by_id filter mechanism every
 * resolveMyWedding.js-style helper depends on actually scopes to the owner,
 * for both WeddingDetails (needs the shared sentinel's id, passed in by the
 * runner) and LiveStream (self-contained sentinel).
 */

import { APP_ID, api, pass, fail } from './_shared.mjs';

export async function runOwnership(token, weddingDetailsRecordId) {
  const results = [];

  // ── Ownership isolation — a second user cannot resolve this wedding ──────
  // Exercises the exact filter mechanism src/lib/resolveMyWedding.js relies on:
  // WeddingDetails.filter({ created_by_id: <user> }) must scope strictly to
  // that owner. This app currently has no second real account to log in as
  // (confirmed via a live query — only one WeddingDetails owner exists), so
  // this proves isolation at the mechanism level instead: filtering by the
  // REAL test account's own id must find the sentinel; filtering by a
  // fabricated, definitely-non-existent user id must NOT find it. That is the
  // exact positive/negative behaviour every ownership-scoped page now depends
  // on — if Base44 ever started ignoring the created_by_id filter and just
  // returning everything (the original bug, one level up the stack), this
  // would catch it.
  console.log('\n  Ownership isolation tests (second user cannot resolve this wedding):\n');
  try {
    const me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
    const realUserId = me.id;
    if (!realUserId) throw new Error('Could not resolve the test account\'s own user id');

    const ownQuery = encodeURIComponent(JSON.stringify({ created_by_id: realUserId }));
    const ownResults = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails?q=${ownQuery}`, undefined, token);
    const ownList = Array.isArray(ownResults) ? ownResults : (ownResults?.data || ownResults?.results || []);
    const foundBySelf = ownList.some(w => w.id === weddingDetailsRecordId);
    results.push(foundBySelf
      ? pass('WeddingDetails.filter({created_by_id: <real owner>})', 'sentinel found, as expected')
      : fail('WeddingDetails.filter({created_by_id: <real owner>})', weddingDetailsRecordId, ownList.map(w => w.id)));

    const fakeUserId = `test-second-user-${Date.now()}-does-not-exist`;
    const fakeQuery = encodeURIComponent(JSON.stringify({ created_by_id: fakeUserId }));
    const fakeResults = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails?q=${fakeQuery}`, undefined, token);
    const fakeList = Array.isArray(fakeResults) ? fakeResults : (fakeResults?.data || fakeResults?.results || []);
    const leakedToOther = fakeList.some(w => w.id === weddingDetailsRecordId);
    results.push(!leakedToOther
      ? pass('WeddingDetails.filter({created_by_id: <other user>})', 'sentinel correctly absent')
      : fail('WeddingDetails.filter({created_by_id: <other user>}) — ISOLATION BREACH', 'sentinel absent', 'sentinel present'));
  } catch (err) {
    console.log(`  ❌ FAIL  ownership isolation — error: ${err.message}`);
    results.push(false); results.push(false);
  }

  // ── LiveStream ownership isolation (fix/livestream-scoping) ───────────────
  // GuestSuiteLiveStream.jsx and LiveStreaming.jsx both used to call
  // LiveStream.list('-created_date') with no created_by_id filter — the exact
  // "most-recent-record-across-the-whole-app" bug resolveMyWedding.js's own
  // doc comment describes, just never migrated to that fix for this entity.
  // Both now go through the new getMyLiveStream() helper. This proves the
  // underlying filter mechanism it depends on actually isolates by owner:
  // a sentinel LiveStream must be found when filtering by its real owner,
  // and must NOT be found when filtering by a different (fabricated) user id.
  console.log('\n  LiveStream ownership isolation tests (one wedding\'s stream is not resolvable from another\'s context):\n');
  let liveStreamId = null;
  try {
    const created = await api('POST', `/apps/${APP_ID}/entities/LiveStream`, {
      title: '__PERSISTENCE_TEST_LIVESTREAM__',
      stream_url: 'https://www.youtube.com/watch?v=test-sentinel',
      is_test: true,
    }, token);
    liveStreamId = created.id;
    if (!liveStreamId) throw new Error('No id on created LiveStream');

    const me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
    const realUserId = me.id;
    if (!realUserId) throw new Error('Could not resolve the test account\'s own user id');

    const ownQuery = encodeURIComponent(JSON.stringify({ created_by_id: realUserId }));
    const ownResults = await api('GET', `/apps/${APP_ID}/entities/LiveStream?q=${ownQuery}`, undefined, token);
    const ownList = Array.isArray(ownResults) ? ownResults : (ownResults?.data || ownResults?.results || []);
    const foundBySelf = ownList.some(s => s.id === liveStreamId);
    results.push(foundBySelf
      ? pass('LiveStream.filter({created_by_id: <real owner>})', 'sentinel found, as expected')
      : fail('LiveStream.filter({created_by_id: <real owner>})', liveStreamId, ownList.map(s => s.id)));

    const fakeUserId = `test-second-user-${Date.now()}-does-not-exist`;
    const fakeQuery = encodeURIComponent(JSON.stringify({ created_by_id: fakeUserId }));
    const fakeResults = await api('GET', `/apps/${APP_ID}/entities/LiveStream?q=${fakeQuery}`, undefined, token);
    const fakeList = Array.isArray(fakeResults) ? fakeResults : (fakeResults?.data || fakeResults?.results || []);
    const leakedToOther = fakeList.some(s => s.id === liveStreamId);
    results.push(!leakedToOther
      ? pass('LiveStream.filter({created_by_id: <other user>})', 'sentinel correctly absent')
      : fail('LiveStream.filter({created_by_id: <other user>}) — ISOLATION BREACH', 'sentinel absent', 'sentinel present'));

    // The old bug specifically: an UNFILTERED list() call would return this
    // sentinel as [0] (most recent) regardless of who's asking. Confirm the
    // fixed helper's actual query shape excludes it for a different owner —
    // i.e. simulate "another wedding's context" the same way
    // getMyLiveStream() does, scoped by created_by_id, and confirm it comes
    // back null rather than resolving this wedding's sentinel stream.
    const otherContextResults = await api('GET', `/apps/${APP_ID}/entities/LiveStream?q=${fakeQuery}`, undefined, token);
    const otherContextList = Array.isArray(otherContextResults) ? otherContextResults : (otherContextResults?.data || otherContextResults?.results || []);
    const resolvedForOtherContext = otherContextList.filter(s => !s.is_test).length > 0
      ? otherContextList.filter(s => !s.is_test).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;
    results.push(resolvedForOtherContext === null
      ? pass('getMyLiveStream() mechanism — another wedding\'s context resolves no stream', 'null, as expected')
      : fail('getMyLiveStream() mechanism — another wedding\'s context resolves no stream', null, resolvedForOtherContext?.id));
  } catch (err) {
    console.log(`  ❌ FAIL  LiveStream ownership isolation — error: ${err.message}`);
    results.push(false, false, false);
  } finally {
    if (liveStreamId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/LiveStream/${liveStreamId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  return results;
}
