/**
 * tests/persistence/rsvp.mjs
 *
 * Per-event RSVP mechanics: the Guest.event_responses matrix, its survival
 * across a WeddingDetails events-array reorder (needs the shared
 * WeddingDetails sentinel's id, passed in by the runner), the guest-side
 * RSVP form write path (RSVPPage.jsx handleSubmit) including the derived
 * rsvp_status "attending"/"declined" branches, and editing an already-
 * invited guest's events later (SetEventsModal.handleSave).
 */

import { APP_ID, api, pass, fail, deepEqual, cleanupEntity } from './_shared.mjs';
import { getGuestEventResponse, toggleEventInvite } from '../../src/lib/weddingEvents.js';

export async function runRsvp(token, weddingDetailsRecordId) {
  const results = [];

  // ── Guest.event_responses — Smart RSVP per-event matrix (PR 2) ─────────────
  console.log('\n  Guest.event_responses field persistence tests (per-event RSVP matrix):\n');
  let guestEventRespId = null;
  try {
    const eventResponsesPayload = [
      {
        event_id:        'reorder-test-event-A',
        invited:         true,
        status:          'yes',
        meal_choice:     'chicken',
        plus_ones:       1,
        plus_one_names:  ['Jane Doe'],
        responded_at:    new Date().toISOString(),
      },
      {
        event_id:        'reorder-test-event-B',
        invited:         true,
        status:          'pending',
        meal_choice:     null,
        plus_ones:       0,
        plus_one_names:  [],
        responded_at:    null,
      },
    ];

    const geCreated = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_EVENT_RESPONSES__', is_test: true }, token);
    guestEventRespId = geCreated.id;
    if (!guestEventRespId) throw new Error('No id on created Guest');

    await api('PUT', `/apps/${APP_ID}/entities/Guest/${guestEventRespId}`,
      { name: '__PERSISTENCE_TEST_EVENT_RESPONSES__', event_responses: eventResponsesPayload }, token);

    const geBack = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestEventRespId}`, undefined, token);
    const gotResponses = geBack.event_responses || [];

    // Round-trip every nested field individually (write → fresh read → assert not undefined)
    for (const written of eventResponsesPayload) {
      const got = gotResponses.find(r => r.event_id === written.event_id);
      const label = `event_responses[event_id=${written.event_id}]`;

      results.push(got !== undefined
        ? pass(`${label} entry exists`, `found`)
        : fail(`${label} entry exists`, written, got));

      results.push(got?.invited !== undefined && got.invited === written.invited
        ? pass(`${label}.invited`, String(got?.invited))
        : fail(`${label}.invited`, written.invited, got?.invited));

      results.push(got?.status !== undefined && got.status === written.status
        ? pass(`${label}.status`, got?.status)
        : fail(`${label}.status`, written.status, got?.status));

      results.push('meal_choice' in (got || {}) && got.meal_choice === written.meal_choice
        ? pass(`${label}.meal_choice`, JSON.stringify(got?.meal_choice))
        : fail(`${label}.meal_choice`, written.meal_choice, got?.meal_choice));

      results.push(got?.plus_ones !== undefined && got.plus_ones === written.plus_ones
        ? pass(`${label}.plus_ones`, String(got?.plus_ones))
        : fail(`${label}.plus_ones`, written.plus_ones, got?.plus_ones));

      results.push('plus_one_names' in (got || {}) && deepEqual(got.plus_one_names, written.plus_one_names)
        ? pass(`${label}.plus_one_names`, JSON.stringify(got?.plus_one_names))
        : fail(`${label}.plus_one_names`, written.plus_one_names, got?.plus_one_names));

      results.push('responded_at' in (got || {}) && got.responded_at === written.responded_at
        ? pass(`${label}.responded_at`, JSON.stringify(got?.responded_at))
        : fail(`${label}.responded_at`, written.responded_at, got?.responded_at));
    }
  } catch (err) {
    console.log(`  ❌ FAIL  Guest.event_responses — error: ${err.message}`);
    for (let i = 0; i < 14; i++) results.push(false);
  }

  // ── event_responses survives a WeddingDetails events-array reorder ─────────
  // event_responses references events by stable event_id, never array index — a
  // couple reordering the events list must not corrupt which guest response maps
  // to which event. See SMART_RSVP_MODEL.md "Base44 gotchas".
  console.log('\n  event_responses survives events-array reorder:\n');
  try {
    const eventA = { id: 'reorder-test-event-A', event_id: 'reorder-test-event-A', name: 'Welcome Drinks', type: 'Welcome Party', date: '2025-11-13' };
    const eventB = { id: 'reorder-test-event-B', event_id: 'reorder-test-event-B', name: 'Send-off Brunch', type: 'Brunch', date: '2025-11-15' };

    // Write events in order [A, B]
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${weddingDetailsRecordId}`,
      { couple1Name: '__PERSISTENCE_TEST__', couple2Name: 'DO_NOT_USE', preWeddingEvents: [eventA], postWeddingEvents: [eventB] }, token);

    // Reorder: swap so B comes before A in a unified read (simulate the chronological sort)
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${weddingDetailsRecordId}`,
      { couple1Name: '__PERSISTENCE_TEST__', couple2Name: 'DO_NOT_USE', preWeddingEvents: [eventB], postWeddingEvents: [eventA] }, token);

    const wdBack = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${weddingDetailsRecordId}`, undefined, token);
    const allEventsAfterReorder = [...(wdBack.preWeddingEvents || []), ...(wdBack.postWeddingEvents || [])];
    const foundA = allEventsAfterReorder.find(e => e.event_id === 'reorder-test-event-A');
    const foundB = allEventsAfterReorder.find(e => e.event_id === 'reorder-test-event-B');

    const eventsSurvivedReorder = foundA?.name === eventA.name && foundB?.name === eventB.name;
    results.push(eventsSurvivedReorder
      ? pass('WeddingDetails events survive reorder', 'event_id still resolves to correct event after position swap')
      : fail('WeddingDetails events survive reorder', { eventA, eventB }, { foundA, foundB }));

    // The Guest's event_responses (written before the reorder) must still resolve
    // to the correct events purely by event_id, regardless of the position swap.
    const geAfterReorder = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestEventRespId}`, undefined, token);
    const respA = (geAfterReorder.event_responses || []).find(r => r.event_id === 'reorder-test-event-A');
    const respB = (geAfterReorder.event_responses || []).find(r => r.event_id === 'reorder-test-event-B');
    const responsesStillMapCorrectly =
      respA?.event_id === foundA?.event_id && respA?.status === 'yes' &&
      respB?.event_id === foundB?.event_id && respB?.status === 'pending';
    results.push(responsesStillMapCorrectly
      ? pass('Guest.event_responses survives reorder', 'event_id references unaffected by WeddingDetails array reorder')
      : fail('Guest.event_responses survives reorder', { respA, respB }, { foundA, foundB }));
  } catch (err) {
    console.log(`  ❌ FAIL  events-array reorder — error: ${err.message}`);
    results.push(false); results.push(false);
  } finally {
    if (guestEventRespId) {
      await cleanupEntity(token, 'Guest', guestEventRespId);
    }
  }

  // ── Per-event RSVP — guest-side write path (SMART_RSVP_MODEL.md PR 3+4) ──
  // Mirrors RSVPPage.jsx's handleSubmit exactly: seed a guest with pending
  // event_responses for two invited events (one plus-one eligible), then
  // build the same Map-keyed-by-event_id merge the form submits, write it,
  // and assert every nested field round-trips on a fresh read.
  console.log('\n  Per-event RSVP guest-side write path (RSVPPage.jsx handleSubmit):\n');
  let guestEventRsvpId = null;
  try {
    const seededResponses = [
      { event_id: 'test-event-ceremony', invited: true, status: 'pending', meal_choice: null, plus_ones: 0, plus_one_names: [], responded_at: null },
      { event_id: 'test-event-reception', invited: true, status: 'pending', meal_choice: null, plus_ones: 0, plus_one_names: [], responded_at: null },
    ];

    const created = await api('POST', `/apps/${APP_ID}/entities/Guest`, {
      name: '__PERSISTENCE_TEST_EVENT_RSVP__',
      rsvp_link_id: 'test-per-event-rsvp-token',
      plus_one: true,
      event_responses: seededResponses,
      is_test: true,
    }, token);
    guestEventRsvpId = created.id;
    if (!guestEventRsvpId) throw new Error('No id on created Guest');

    // ── Simulate the guest's form submission exactly as handleSubmit does ──
    const now = new Date().toISOString();
    const eventForm = {
      'test-event-ceremony': { status: 'yes', meal_choice: 'chicken', plus_one_attending: false, plus_one_name: '' },
      'test-event-reception': { status: 'yes', meal_choice: 'vegetarian', plus_one_attending: true, plus_one_name: 'Jamie Guest' },
    };
    const invitedEvents = [{ event_id: 'test-event-ceremony' }, { event_id: 'test-event-reception' }];

    const existingResponses = seededResponses; // guest.event_responses at load time
    const updatedByEventId = new Map(existingResponses.map(r => [r.event_id, r]));
    for (const ev of invitedEvents) {
      const form = eventForm[ev.event_id];
      updatedByEventId.set(ev.event_id, {
        event_id: ev.event_id,
        invited: true,
        status: form.status,
        meal_choice: form.status === 'yes' ? (form.meal_choice || null) : null,
        plus_ones: (form.status === 'yes' && form.plus_one_attending) ? 1 : 0,
        plus_one_names: (form.status === 'yes' && form.plus_one_attending && form.plus_one_name) ? [form.plus_one_name] : [],
        responded_at: now,
      });
    }
    const nextEventResponses = Array.from(updatedByEventId.values());

    // Mirror RSVPPage.jsx's derived rsvp_status logic exactly.
    const invitedResponses = nextEventResponses.filter(r => r.invited);
    const anyYes = invitedResponses.some(r => r.status === 'yes');
    const allNo = invitedResponses.length > 0 && invitedResponses.every(r => r.status === 'no');
    const derivedRsvpStatus = anyYes ? 'attending' : allNo ? 'declined' : 'pending';

    await api('PUT', `/apps/${APP_ID}/entities/Guest/${guestEventRsvpId}`, {
      event_responses: nextEventResponses,
      rsvp_status: derivedRsvpStatus,
      song_request: 'Uptown Funk',
      rsvp_note: 'Cannot wait!',
      dietary_restrictions: 'Gluten free',
      rsvp_date: now.split('T')[0],
    }, token);

    const back = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestEventRsvpId}`, undefined, token);
    const backResponses = back.event_responses || [];
    const ceremony = backResponses.find(r => r.event_id === 'test-event-ceremony');
    const reception = backResponses.find(r => r.event_id === 'test-event-reception');

    results.push(ceremony?.status === 'yes'
      ? pass('event_responses[ceremony].status', ceremony?.status)
      : fail('event_responses[ceremony].status', 'yes', ceremony?.status));
    results.push(ceremony?.meal_choice === 'chicken'
      ? pass('event_responses[ceremony].meal_choice', ceremony?.meal_choice)
      : fail('event_responses[ceremony].meal_choice', 'chicken', ceremony?.meal_choice));
    results.push(ceremony?.plus_ones === 0
      ? pass('event_responses[ceremony].plus_ones', String(ceremony?.plus_ones))
      : fail('event_responses[ceremony].plus_ones', 0, ceremony?.plus_ones));
    results.push(Array.isArray(ceremony?.plus_one_names) && ceremony.plus_one_names.length === 0
      ? pass('event_responses[ceremony].plus_one_names', JSON.stringify(ceremony?.plus_one_names))
      : fail('event_responses[ceremony].plus_one_names', [], ceremony?.plus_one_names));
    results.push(!!ceremony?.responded_at
      ? pass('event_responses[ceremony].responded_at', ceremony?.responded_at)
      : fail('event_responses[ceremony].responded_at', now, ceremony?.responded_at));

    results.push(reception?.status === 'yes'
      ? pass('event_responses[reception].status', reception?.status)
      : fail('event_responses[reception].status', 'yes', reception?.status));
    results.push(reception?.meal_choice === 'vegetarian'
      ? pass('event_responses[reception].meal_choice', reception?.meal_choice)
      : fail('event_responses[reception].meal_choice', 'vegetarian', reception?.meal_choice));
    results.push(reception?.plus_ones === 1
      ? pass('event_responses[reception].plus_ones', String(reception?.plus_ones))
      : fail('event_responses[reception].plus_ones', 1, reception?.plus_ones));
    results.push(JSON.stringify(reception?.plus_one_names) === JSON.stringify(['Jamie Guest'])
      ? pass('event_responses[reception].plus_one_names', JSON.stringify(reception?.plus_one_names))
      : fail('event_responses[reception].plus_one_names', ['Jamie Guest'], reception?.plus_one_names));
    results.push(!!reception?.responded_at
      ? pass('event_responses[reception].responded_at', reception?.responded_at)
      : fail('event_responses[reception].responded_at', now, reception?.responded_at));

    // Wedding-level fields written alongside — render once, not per event
    results.push(back.song_request === 'Uptown Funk'
      ? pass('Guest.song_request (per-event submit)', back.song_request)
      : fail('Guest.song_request (per-event submit)', 'Uptown Funk', back.song_request));
    results.push(back.rsvp_note === 'Cannot wait!'
      ? pass('Guest.rsvp_note (per-event submit)', back.rsvp_note)
      : fail('Guest.rsvp_note (per-event submit)', 'Cannot wait!', back.rsvp_note));
    results.push(back.dietary_restrictions === 'Gluten free'
      ? pass('Guest.dietary_restrictions (per-event submit)', back.dietary_restrictions)
      : fail('Guest.dietary_restrictions (per-event submit)', 'Gluten free', back.dietary_restrictions));

    // Both invited events answered "yes" → derived rsvp_status must be "attending",
    // so Dashboard's RSVPChart / InvitationsTab badges / GuestList badge all reflect
    // this guest correctly instead of showing them stuck on "pending".
    results.push(back.rsvp_status === 'attending'
      ? pass('Guest.rsvp_status derived from event_responses (any yes → attending)', back.rsvp_status)
      : fail('Guest.rsvp_status derived from event_responses (any yes → attending)', 'attending', back.rsvp_status));
  } catch (err) {
    console.log(`  ❌ FAIL  Per-event RSVP write path — error: ${err.message}`);
    for (let i = 0; i < 14; i++) results.push(false);
  } finally {
    if (guestEventRsvpId) {
      await cleanupEntity(token, 'Guest', guestEventRsvpId);
    }
  }

  // ── Per-event RSVP — derived rsvp_status covers the "declined" branch ──
  // The block above only exercises "any yes → attending". This proves the other
  // branch: every invited event answered "no" → rsvp_status must be "declined",
  // not left on the default "pending".
  console.log('\n  Per-event RSVP derived rsvp_status — all-declined case:\n');
  let guestAllDeclinedId = null;
  try {
    const declinedResponses = [
      { event_id: 'test-event-ceremony', invited: true, status: 'no', meal_choice: null, plus_ones: 0, plus_one_names: [], responded_at: new Date().toISOString() },
      { event_id: 'test-event-reception', invited: true, status: 'no', meal_choice: null, plus_ones: 0, plus_one_names: [], responded_at: new Date().toISOString() },
    ];
    const invitedOnly = declinedResponses.filter(r => r.invited);
    const anyYes2 = invitedOnly.some(r => r.status === 'yes');
    const allNo2 = invitedOnly.length > 0 && invitedOnly.every(r => r.status === 'no');
    const derived2 = anyYes2 ? 'attending' : allNo2 ? 'declined' : 'pending';

    const created2 = await api('POST', `/apps/${APP_ID}/entities/Guest`, {
      name: '__PERSISTENCE_TEST_EVENT_RSVP_DECLINED__',
      event_responses: declinedResponses,
      rsvp_status: derived2,
      is_test: true,
    }, token);
    guestAllDeclinedId = created2.id;
    if (!guestAllDeclinedId) throw new Error('No id on created Guest');

    const back2 = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestAllDeclinedId}`, undefined, token);
    results.push(back2.rsvp_status === 'declined'
      ? pass('Guest.rsvp_status derived from event_responses (all no → declined)', back2.rsvp_status)
      : fail('Guest.rsvp_status derived from event_responses (all no → declined)', 'declined', back2.rsvp_status));
  } catch (err) {
    console.log(`  ❌ FAIL  Per-event RSVP declined-derivation — error: ${err.message}`);
    results.push(false);
  } finally {
    if (guestAllDeclinedId) {
      await cleanupEntity(token, 'Guest', guestAllDeclinedId);
    }
  }

  // ── Editing invites later — invite-set edit round-trip + RSVP-form
  //    visibility (fix/send-flow-details #3) ─────────────────────────────
  // Simulates exactly what SetEventsModal.handleSave does when a couple edits
  // an already-invited guest's events later: reuses toggleEventInvite the
  // same way, adding a brand-new event the guest was never invited to before.
  // Then proves two things on a fresh read: (a) the new event round-trips as
  // invited:true/status:'pending', and (b) getGuestEventResponse — the exact
  // function RSVPPage.jsx uses to build the guest's invitedEvents list — now
  // reports it invited, meaning the guest's RSVP form would show it.
  console.log('\n  Editing invites later — invite-set edit round-trip:\n');
  let editInvitesGuestId = null;
  try {
    const WEDDING_EVENTS_SHAPE = [
      { event_id: 'test-event-ceremony', name: 'Ceremony', isMain: true },
      { event_id: 'test-event-reception', name: 'Reception', isMain: true },
      { event_id: 'test-event-afterparty', name: 'Afterparty', isMain: false },
    ];
    const [ceremonyEv, receptionEv, afterpartyEv] = WEDDING_EVENTS_SHAPE;

    // Guest already invited to ceremony+reception (already RSVP'd yes to
    // ceremony), never invited to the afterparty — the state a real guest
    // would be in before the couple decides to add them to a newly-created
    // event.
    const seededResponses = [
      { event_id: ceremonyEv.event_id, invited: true, status: 'yes', meal_choice: 'vegetarian', plus_ones: 0, plus_one_names: [], responded_at: new Date().toISOString() },
      { event_id: receptionEv.event_id, invited: true, status: 'yes', meal_choice: 'vegetarian', plus_ones: 0, plus_one_names: [], responded_at: new Date().toISOString() },
    ];

    const created = await api('POST', `/apps/${APP_ID}/entities/Guest`, {
      name: '__PERSISTENCE_TEST_EDIT_INVITES__',
      event_responses: seededResponses,
      is_test: true,
    }, token);
    editInvitesGuestId = created.id;
    if (!editInvitesGuestId) throw new Error('No id on created Guest');

    // Mirror SetEventsModal.handleSave: for each event in the wedding,
    // toggleEventInvite with the desired invited state — ceremony/reception
    // stay invited (unchanged), afterparty newly becomes invited.
    const guestBeforeEdit = { event_responses: seededResponses };
    let responses = guestBeforeEdit.event_responses;
    responses = toggleEventInvite({ event_responses: responses }, ceremonyEv, true);
    responses = toggleEventInvite({ event_responses: responses }, receptionEv, true);
    responses = toggleEventInvite({ event_responses: responses }, afterpartyEv, true); // the edit: newly invited

    await api('PUT', `/apps/${APP_ID}/entities/Guest/${editInvitesGuestId}`, {
      event_responses: responses,
    }, token);

    const back = await api('GET', `/apps/${APP_ID}/entities/Guest/${editInvitesGuestId}`, undefined, token);
    const afterpartyBack = (back.event_responses || []).find(r => r.event_id === afterpartyEv.event_id);

    results.push(afterpartyBack?.invited === true
      ? pass('Edited guest — newly-added event round-trips invited:true', String(afterpartyBack?.invited))
      : fail('Edited guest — newly-added event round-trips invited:true', true, afterpartyBack?.invited));
    results.push(afterpartyBack?.status === 'pending'
      ? pass('Edited guest — newly-added event round-trips status:pending', afterpartyBack?.status)
      : fail('Edited guest — newly-added event round-trips status:pending', 'pending', afterpartyBack?.status));

    // Existing responses (ceremony's prior "yes"/meal choice) must survive
    // the edit untouched — editing invites must not clobber real RSVP data.
    const ceremonyBack = (back.event_responses || []).find(r => r.event_id === ceremonyEv.event_id);
    results.push(ceremonyBack?.status === 'yes' && ceremonyBack?.meal_choice === 'vegetarian'
      ? pass('Edited guest — pre-existing RSVP (ceremony) untouched by the edit', `${ceremonyBack?.status}/${ceremonyBack?.meal_choice}`)
      : fail('Edited guest — pre-existing RSVP (ceremony) untouched by the edit', 'yes/vegetarian', `${ceremonyBack?.status}/${ceremonyBack?.meal_choice}`));

    // The exact function RSVPPage.jsx calls to build a guest's invitedEvents
    // — if this reports the afterparty as invited, the guest's RSVP form
    // will show it after this edit, with no further code path to verify.
    const rsvpFormWouldShowAfterparty = WEDDING_EVENTS_SHAPE
      .filter(ev => getGuestEventResponse(back, ev).invited)
      .some(ev => ev.event_id === afterpartyEv.event_id);
    results.push(rsvpFormWouldShowAfterparty
      ? pass('RSVP form event list (getGuestEventResponse) includes the newly-added event', 'included')
      : fail('RSVP form event list (getGuestEventResponse) includes the newly-added event', 'included', 'missing'));
  } catch (err) {
    console.log(`  ❌ FAIL  Editing invites later — error: ${err.message}`);
    results.push(false, false, false, false);
  } finally {
    if (editInvitesGuestId) {
      await cleanupEntity(token, 'Guest', editInvitesGuestId);
    }
  }

  return results;
}
