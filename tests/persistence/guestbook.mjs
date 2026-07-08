/**
 * tests/persistence/guestbook.mjs
 *
 * GuestbookEntry round-trip + is_test display-exclusion (roadmap D4).
 * Self-contained: creates its own two sentinel entries tagged with a fake
 * wedding_id and cleans them up.
 */

import { APP_ID, api, pass, fail } from './_shared.mjs';

export async function runGuestbook(token) {
  const results = [];

  console.log('\n  GuestbookEntry persistence tests (round-trip + is_test exclusion):\n');
  let realEntryId = null;
  let testEntryId = null;
  const GUESTBOOK_TEST_WEDDING_ID = 'test-guestbook-wedding-id';
  try {
    const payload = {
      wedding_id: GUESTBOOK_TEST_WEDDING_ID,
      guest_name: '__PERSISTENCE_TEST_GUESTBOOK_GUEST__',
      message: 'Congratulations to you both — wishing you a lifetime of happiness!',
    };
    const created = await api('POST', `/apps/${APP_ID}/entities/GuestbookEntry`, payload, token);
    realEntryId = created.id;
    if (!realEntryId) throw new Error('No id on created GuestbookEntry');

    const back = await api('GET', `/apps/${APP_ID}/entities/GuestbookEntry/${realEntryId}`, undefined, token);

    results.push(back.wedding_id === payload.wedding_id
      ? pass('GuestbookEntry.wedding_id', back.wedding_id)
      : fail('GuestbookEntry.wedding_id', payload.wedding_id, back.wedding_id));
    results.push(back.guest_name === payload.guest_name
      ? pass('GuestbookEntry.guest_name', back.guest_name)
      : fail('GuestbookEntry.guest_name', payload.guest_name, back.guest_name));
    results.push(back.message === payload.message
      ? pass('GuestbookEntry.message', back.message)
      : fail('GuestbookEntry.message', payload.message, back.message));
    results.push(!!back.created_date
      ? pass('GuestbookEntry.created_date (Base44 system field)', back.created_date)
      : fail('GuestbookEntry.created_date (Base44 system field)', '<any timestamp>', back.created_date));

    // Second entry, explicitly tagged is_test:true — same wedding_id as the
    // "real" entry above, so the exclusion filter is actually exercised
    // against a mixed result set, not just an empty one.
    const testPayload = {
      wedding_id: GUESTBOOK_TEST_WEDDING_ID,
      guest_name: '__PERSISTENCE_TEST_GUESTBOOK_TESTFLAG__',
      message: 'This entry must never be visible in a real guestbook.',
      is_test: true,
    };
    const createdTest = await api('POST', `/apps/${APP_ID}/entities/GuestbookEntry`, testPayload, token);
    testEntryId = createdTest.id;
    if (!testEntryId) throw new Error('No id on created is_test GuestbookEntry');

    const testBack = await api('GET', `/apps/${APP_ID}/entities/GuestbookEntry/${testEntryId}`, undefined, token);
    results.push(testBack.is_test === true
      ? pass('GuestbookEntry.is_test', String(testBack.is_test))
      : fail('GuestbookEntry.is_test', true, testBack.is_test));

    // Display-exclusion check: fetch all entries for this wedding_id and apply
    // the EXACT filter predicate WeddingGuestbookPage.jsx and Guestbook.jsx use
    // (`.filter(e => !e.is_test)`) — assert the is_test entry never survives it.
    const allForWedding = await api(
      'GET',
      `/apps/${APP_ID}/entities/GuestbookEntry?q=${encodeURIComponent(JSON.stringify({ wedding_id: GUESTBOOK_TEST_WEDDING_ID }))}`,
      undefined, token,
    );
    const allList = Array.isArray(allForWedding) ? allForWedding : (allForWedding?.data || allForWedding?.results || []);
    const displayed = allList.filter(e => !e.is_test);
    const realEntryShown = displayed.some(e => e.id === realEntryId);
    const testEntryHidden = !displayed.some(e => e.id === testEntryId);

    results.push(realEntryShown
      ? pass('Guestbook display filter — real entry visible', 'shown')
      : fail('Guestbook display filter — real entry visible', 'shown', 'hidden'));
    results.push(testEntryHidden
      ? pass('Guestbook display filter — is_test entry excluded', 'hidden')
      : fail('Guestbook display filter — is_test entry excluded', 'hidden', 'shown'));
  } catch (err) {
    console.log(`  ❌ FAIL  GuestbookEntry — error: ${err.message}`);
    for (let i = 0; i < 6; i++) results.push(false);
  } finally {
    for (const id of [realEntryId, testEntryId]) {
      if (!id) continue;
      try { await api('DELETE', `/apps/${APP_ID}/entities/GuestbookEntry/${id}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  return results;
}
