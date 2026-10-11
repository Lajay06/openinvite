/**
 * tests/persistence/ownership.mjs
 *
 * Cross-tenant isolation. For the open-read entities, WeddingDetails (needs
 * the shared sentinel's id, passed in by the runner) and Guest, it proves the
 * created_by_id filter every resolveMyWedding.js-style helper depends on
 * actually scopes to the owner. For LiveStream, whose read is owner-scoped,
 * it proves isolation with a second real account instead, because a
 * fabricated id in q proves nothing there.
 */

import { APP_ID, api, pass, fail, cleanupEntity } from './_shared.mjs';

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

  // ── LiveStream: a second real account cannot read this wedding's stream ──
  // LiveStream's read rule is owner-scoped ({created_by_id: "{{user.id}}"}),
  // unlike WeddingDetails and Guest above, whose read is open. On an
  // owner-scoped entity a fabricated created_by_id in q proves nothing: the
  // rule's own created_by_id appears to take its place, so the caller gets its
  // OWN rows back whatever id the q names (inferred, see
  // BASE44_PLATFORM_NOTES.md). This block used to do exactly that with the
  // owner's token and reported its own sentinel as a breach.
  //
  // Owner ruling 2026-10-11: isolation on an owner-scoped-read entity is proved
  // with a second real account, never with a fabricated id in q. The runner's
  // account writes the sentinel; the second account (BASE44_TEST_EMAIL_2, see
  // BASE44_PLATFORM_NOTES.md, "Registration requires real email-OTP
  // verification") reads it three ways and must get nothing every time. The
  // same applies to StreamChat if it is ever added here.
  //
  // LiveStream declares no is_test field, so the sentinel is marked by its
  // title alone, and the finally deletes it by the id this run created.
  console.log('\n  LiveStream isolation (a second real account cannot read this wedding\'s stream):\n');
  const LIVESTREAM_CHECKS = 4;
  const email2 = process.env.BASE44_TEST_EMAIL_2;
  const password2 = process.env.BASE44_TEST_PASSWORD_2;
  const liveStreamStart = results.length;
  let liveStreamId = null;
  try {
    if (!email2 || !password2) {
      throw new Error('BASE44_TEST_EMAIL_2 and BASE44_TEST_PASSWORD_2 are not set; isolation on an owner-scoped entity needs a second real account, so nothing was written');
    }
    const auth2 = await api('POST', `/apps/${APP_ID}/auth/login`, { email: email2, password: password2 });
    const token2 = auth2?.access_token;
    if (!token2) throw new Error('the second account did not log in; nothing was written');
    const [me, other] = await Promise.all([
      api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token),
      api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token2),
    ]);
    if (!me?.id || !other?.id) throw new Error('could not resolve both accounts\' user ids; nothing was written');
    if (me.id === other.id) throw new Error('the second account is the same user as the first; nothing was written');

    const created = await api('POST', `/apps/${APP_ID}/entities/LiveStream`, {
      title: '__PERSISTENCE_TEST_LIVESTREAM__',
      stream_url: 'https://www.youtube.com/watch?v=test-sentinel',
    }, token);
    liveStreamId = created?.id;
    if (!liveStreamId) throw new Error('No id on created LiveStream');

    const asList = (r) => Array.isArray(r) ? r : (r?.data || r?.results || []);
    const ownQuery = encodeURIComponent(JSON.stringify({ created_by_id: me.id }));

    // The positive half, so the negatives below cannot pass on an empty read.
    const ownList = asList(await api('GET', `/apps/${APP_ID}/entities/LiveStream?q=${ownQuery}`, undefined, token));
    results.push(ownList.some(s => s.id === liveStreamId)
      ? pass('LiveStream: the owner reads its own stream', 'sentinel found, as expected')
      : fail('LiveStream: the owner reads its own stream', liveStreamId, ownList.map(s => s.id)));

    const namedList = asList(await api('GET', `/apps/${APP_ID}/entities/LiveStream?q=${ownQuery}`, undefined, token2));
    results.push(!namedList.some(s => s.id === liveStreamId)
      ? pass('LiveStream: a second account filtering on the owner\'s id gets nothing', `${namedList.length} row(s), none the sentinel`)
      : fail('LiveStream: a second account filtering on the owner\'s id gets nothing, ISOLATION BREACH', 'sentinel absent', 'sentinel present'));

    const allList = asList(await api('GET', `/apps/${APP_ID}/entities/LiveStream`, undefined, token2));
    results.push(!allList.some(s => s.id === liveStreamId)
      ? pass('LiveStream: a second account listing with no filter gets nothing of the owner\'s', `${allList.length} row(s), none the sentinel`)
      : fail('LiveStream: a second account listing with no filter, ISOLATION BREACH', 'sentinel absent', 'sentinel present'));

    let byId = null;
    try {
      byId = await api('GET', `/apps/${APP_ID}/entities/LiveStream/${liveStreamId}`, undefined, token2);
    } catch (err) {
      if (!/HTTP 40[34]/.test(err.message)) throw err;
    }
    results.push(!byId?.id
      ? pass('LiveStream: a second account reading the sentinel by its id gets nothing', 'refused or not found')
      : fail('LiveStream: a second account reading the sentinel by its id, ISOLATION BREACH', 'nothing', byId.id));
  } catch (err) {
    console.log(`  ❌ FAIL  LiveStream isolation, error: ${err.message}`);
    while (results.length < liveStreamStart + LIVESTREAM_CHECKS) results.push(false);
  } finally {
    if (liveStreamId) {
      await cleanupEntity(token, 'LiveStream', liveStreamId);
    }
  }

  // ── getMyRecords() mechanism — Guest ownership isolation (fix/dashboard-scoping) ──
  // ~63 unscoped dashboard/builder queries (Guest, Budget, Vendor, Schedule,
  // Photo, Note, Task, StoryMilestone, SongRequest, ReceivedGift, Hotel,
  // Restaurant, RegistryItem, RegistryProduct, CustomGift, CustomEventPage,
  // WebsiteTheme, Table, VenueAsset, WeddingDetails) were
  // migrated to the new getMyRecords(entityName, sort, limit) helper in
  // src/lib/resolveMyWedding.js — every one of them resolves through the same
  // base44.entities[entityName].filter({ created_by_id: me.id }) call, so
  // proving the mechanism in isolation for one representative entity proves
  // it for all of them. Guest is chosen because it has no server-side RLS
  // (per base44/entities/Guest.jsonc) — getMyRecords() is its ONLY isolation
  // boundary, unlike the ~26 entities the base44-builder[bot] RLS commit
  // already backstops server-side.
  console.log('\n  getMyRecords() mechanism — Guest ownership isolation:\n');
  let guestId = null;
  try {
    const created = await api('POST', `/apps/${APP_ID}/entities/Guest`, {
      name: '__PERSISTENCE_TEST_GUEST_OWNERSHIP__',
      email: 'ownership-sentinel@example.com',
      is_test: true,
    }, token);
    guestId = created.id;
    if (!guestId) throw new Error('No id on created Guest');

    const me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
    const realUserId = me.id;
    if (!realUserId) throw new Error('Could not resolve the test account\'s own user id');

    const ownQuery = encodeURIComponent(JSON.stringify({ created_by_id: realUserId }));
    const ownResults = await api('GET', `/apps/${APP_ID}/entities/Guest?q=${ownQuery}`, undefined, token);
    const ownList = Array.isArray(ownResults) ? ownResults : (ownResults?.data || ownResults?.results || []);
    const foundBySelf = ownList.some(g => g.id === guestId);
    results.push(foundBySelf
      ? pass('Guest.filter({created_by_id: <real owner>}) — getMyRecords() mechanism', 'sentinel found, as expected')
      : fail('Guest.filter({created_by_id: <real owner>}) — getMyRecords() mechanism', guestId, ownList.map(g => g.id)));

    // The exact bug class this migration fixed: a second user's dashboard
    // (e.g. Guests.jsx, ImportGuestModal.jsx's dedup check, Seating.jsx,
    // WeddingWebsite.jsx) must never see this sentinel guest.
    const fakeUserId = `test-second-user-${Date.now()}-does-not-exist`;
    const fakeQuery = encodeURIComponent(JSON.stringify({ created_by_id: fakeUserId }));
    const fakeResults = await api('GET', `/apps/${APP_ID}/entities/Guest?q=${fakeQuery}`, undefined, token);
    const fakeList = Array.isArray(fakeResults) ? fakeResults : (fakeResults?.data || fakeResults?.results || []);
    const leakedToOther = fakeList.some(g => g.id === guestId);
    results.push(!leakedToOther
      ? pass('Guest.filter({created_by_id: <other user>}) — getMyRecords() mechanism', 'sentinel correctly absent')
      : fail('Guest.filter({created_by_id: <other user>}) — ISOLATION BREACH', 'sentinel absent', 'sentinel present'));
  } catch (err) {
    console.log(`  ❌ FAIL  Guest ownership isolation — error: ${err.message}`);
    results.push(false, false);
  } finally {
    if (guestId) {
      await cleanupEntity(token, 'Guest', guestId);
    }
  }

  return results;
}
