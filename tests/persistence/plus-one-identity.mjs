/**
 * tests/persistence/plus-one-identity.mjs
 *
 * Covers feat/plus-one-identity: a plus-one with their own plus_one_email
 * gets a separate rsvp token (plus_one_rsvp_link_id) and answers via the
 * REAL rsvp-lookup.js/rsvp-submit.js handlers — the same code path a real
 * guest hits — resolving to their own name/email/dietary and their own
 * RsvpResponse rows (is_plus_one: true), never colliding with the primary
 * guest's own rows under latest-wins aggregation. Also confirms the
 * no-email fallback (current behaviour: primary answers for both) is
 * untouched, and mergePlusOneEventResponses' pure default-pending logic.
 */

import { APP_ID, api, pass, fail, cleanupEntity } from './_shared.mjs';
import rsvpLookupHandler from '../../api/rsvp-lookup.js';
import rsvpSubmitHandler from '../../api/rsvp-submit.js';
import { latestEventResponses, latestGuestLevel, mergePlusOneEventResponses, deriveRsvpStatus } from '../../src/lib/rsvpAggregation.js';

function mockReqRes({ method = 'GET', query = {}, body = {} } = {}) {
  const req = { method, query, body, headers: { 'x-forwarded-for': '203.0.113.9' } };
  const res = {
    _status: 200, _json: null,
    setHeader() {}, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; }, end() { return this; },
  };
  return { req, res };
}

export async function runPlusOneIdentity(token) {
  const results = [];

  console.log('\n  Plus-one identity — separate token, separate RsvpResponse rows, no collision with the primary:\n');

  let weddingId = null;
  let guestId = null;
  const rsvpResponseIds = [];
  try {
    const wedding = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam', slug: `test-plus-one-${Date.now()}`,
    }, token);
    weddingId = wedding.id;

    const primaryToken = `test-plus-one-primary-${Date.now()}`;
    const plusOneToken = `test-plus-one-po-${Date.now()}`;
    const guest = await api('POST', `/apps/${APP_ID}/entities/Guest`, {
      name: '__PERSISTENCE_TEST_PLUS_ONE_PRIMARY__',
      is_test: true,
      rsvp_link_id: primaryToken,
      plus_one: true,
      plus_one_name: '__PERSISTENCE_TEST_PLUS_ONE_GUEST__',
      plus_one_email: 'plus-one-sentinel@example.com',
      plus_one_rsvp_link_id: plusOneToken,
      event_responses: [
        { event_id: 'po-test-event', invited: true, status: 'pending', meal_choice: null, plus_ones: 0, plus_one_names: [], responded_at: null },
      ],
    }, token);
    guestId = guest.id;

    // ── Primary submits "yes" via their own token ──────────────────────────
    const { req: primaryReq, res: primaryRes } = mockReqRes({
      method: 'POST',
      body: {
        token: primaryToken,
        event_responses: [{ event_id: 'po-test-event', status: 'yes', meal_choice: 'chicken' }],
        song_request: 'Primary song',
        rsvp_note: 'Primary note',
        dietary_restrictions: 'Primary dietary',
      },
    });
    await rsvpSubmitHandler(primaryReq, primaryRes);
    results.push(primaryRes._status === 200
      ? pass('rsvp-submit.js — primary guest submission accepted', `200 ${JSON.stringify(primaryRes._json)}`)
      : fail('rsvp-submit.js — primary guest submission accepted', 200, `${primaryRes._status} ${JSON.stringify(primaryRes._json)}`));

    // ── Plus-one submits "no" via THEIR OWN token — must not overwrite the primary's "yes" ──
    const { req: poReq, res: poRes } = mockReqRes({
      method: 'POST',
      body: {
        token: plusOneToken,
        event_responses: [{ event_id: 'po-test-event', status: 'no' }],
        song_request: 'Plus-one song',
        rsvp_note: 'Plus-one note',
        dietary_restrictions: 'Plus-one dietary',
      },
    });
    await rsvpSubmitHandler(poReq, poRes);
    results.push(poRes._status === 200
      ? pass('rsvp-submit.js — plus-one submission (own token) accepted', `200 ${JSON.stringify(poRes._json)}`)
      : fail('rsvp-submit.js — plus-one submission (own token) accepted', 200, `${poRes._status} ${JSON.stringify(poRes._json)}`));

    // ── Fetch all RsvpResponse rows for this guest_id, confirm both sets exist distinctly ──
    const rowsQuery = encodeURIComponent(JSON.stringify({ wedding_id: weddingId, guest_id: guestId }));
    const rows = await api('GET', `/apps/${APP_ID}/entities/RsvpResponse?q=${rowsQuery}`, undefined, token);
    const rowList = Array.isArray(rows) ? rows : (rows?.data || rows?.results || []);
    rsvpResponseIds.push(...rowList.map(r => r.id));

    const primaryEventRows = latestEventResponses(rowList, { plusOne: false });
    const plusOneEventRows = latestEventResponses(rowList, { plusOne: true });
    const primaryGuestLevel = latestGuestLevel(rowList, { plusOne: false })[0];
    const plusOneGuestLevel = latestGuestLevel(rowList, { plusOne: true })[0];

    results.push(primaryEventRows.find(r => r.event_id === 'po-test-event')?.status === 'yes'
      ? pass('Primary guest\'s own event row: status "yes" survives, unaffected by the plus-one\'s submission', 'yes')
      : fail('Primary guest\'s own event row: status "yes" survives', 'yes', primaryEventRows.find(r => r.event_id === 'po-test-event')?.status));
    results.push(plusOneEventRows.find(r => r.event_id === 'po-test-event')?.status === 'no'
      ? pass('Plus-one\'s own event row: status "no" recorded distinctly, never colliding with the primary\'s row', 'no')
      : fail('Plus-one\'s own event row: status "no" recorded distinctly', 'no', plusOneEventRows.find(r => r.event_id === 'po-test-event')?.status));
    results.push(primaryGuestLevel?.song_request === 'Primary song' && plusOneGuestLevel?.song_request === 'Plus-one song'
      ? pass('Guest-level rows (song_request) stay distinct per is_plus_one', `primary="${primaryGuestLevel?.song_request}", plus-one="${plusOneGuestLevel?.song_request}"`)
      : fail('Guest-level rows (song_request) stay distinct per is_plus_one', 'Primary song / Plus-one song', `${primaryGuestLevel?.song_request} / ${plusOneGuestLevel?.song_request}`));

    // ── rsvp-lookup.js resolves each token to the correct, distinct perspective ──
    const { req: lookupPrimaryReq, res: lookupPrimaryRes } = mockReqRes({ query: { token: primaryToken } });
    await rsvpLookupHandler(lookupPrimaryReq, lookupPrimaryRes);
    results.push(lookupPrimaryRes._json?.guest?.name === '__PERSISTENCE_TEST_PLUS_ONE_PRIMARY__'
      ? pass('rsvp-lookup.js (primary token) — resolves the primary guest\'s own name', lookupPrimaryRes._json?.guest?.name)
      : fail('rsvp-lookup.js (primary token) — resolves the primary guest\'s own name', '__PERSISTENCE_TEST_PLUS_ONE_PRIMARY__', lookupPrimaryRes._json?.guest?.name));
    results.push(lookupPrimaryRes._json?.guest?.event_responses?.find(r => r.event_id === 'po-test-event')?.status === 'yes'
      ? pass('rsvp-lookup.js (primary token) — shows the primary\'s own "yes", not the plus-one\'s "no"', 'yes')
      : fail('rsvp-lookup.js (primary token) — shows the primary\'s own "yes"', 'yes', lookupPrimaryRes._json?.guest?.event_responses?.find(r => r.event_id === 'po-test-event')?.status));

    const { req: lookupPoReq, res: lookupPoRes } = mockReqRes({ query: { token: plusOneToken } });
    await rsvpLookupHandler(lookupPoReq, lookupPoRes);
    results.push(lookupPoRes._json?.guest?.name === '__PERSISTENCE_TEST_PLUS_ONE_GUEST__'
      ? pass('rsvp-lookup.js (plus-one token) — resolves the PLUS-ONE\'s own name, not the primary\'s', lookupPoRes._json?.guest?.name)
      : fail('rsvp-lookup.js (plus-one token) — resolves the plus-one\'s own name', '__PERSISTENCE_TEST_PLUS_ONE_GUEST__', lookupPoRes._json?.guest?.name));
    results.push(lookupPoRes._json?.guest?.email === 'plus-one-sentinel@example.com'
      ? pass('rsvp-lookup.js (plus-one token) — resolves the plus-one\'s own email', lookupPoRes._json?.guest?.email)
      : fail('rsvp-lookup.js (plus-one token) — resolves the plus-one\'s own email', 'plus-one-sentinel@example.com', lookupPoRes._json?.guest?.email));
    results.push(lookupPoRes._json?.guest?.event_responses?.find(r => r.event_id === 'po-test-event')?.status === 'no'
      ? pass('rsvp-lookup.js (plus-one token) — shows the plus-one\'s own "no", not the primary\'s "yes"', 'no')
      : fail('rsvp-lookup.js (plus-one token) — shows the plus-one\'s own "no"', 'no', lookupPoRes._json?.guest?.event_responses?.find(r => r.event_id === 'po-test-event')?.status));
    results.push(lookupPoRes._json?.guest?.plus_one === false
      ? pass('rsvp-lookup.js (plus-one token) — plus_one:false (a plus-one doesn\'t get their own plus-one)', 'false')
      : fail('rsvp-lookup.js (plus-one token) — plus_one:false', false, lookupPoRes._json?.guest?.plus_one));

    // ── deriveRsvpStatus on each side reflects their own answer ──────────────
    results.push(deriveRsvpStatus(primaryEventRows.map(r => ({ invited: true, status: r.status }))) === 'attending'
      ? pass('Primary guest\'s derived overall status: attending', 'attending')
      : fail('Primary guest\'s derived overall status', 'attending', deriveRsvpStatus(primaryEventRows.map(r => ({ invited: true, status: r.status })))));
    results.push(deriveRsvpStatus(plusOneEventRows.map(r => ({ invited: true, status: r.status }))) === 'declined'
      ? pass('Plus-one\'s derived overall status: declined', 'declined')
      : fail('Plus-one\'s derived overall status', 'declined', deriveRsvpStatus(plusOneEventRows.map(r => ({ invited: true, status: r.status })))));
  } catch (err) {
    console.log(`  ❌ FAIL  plus-one identity — error: ${err.message}`);
    for (let i = 0; i < 11; i++) results.push(false);
  } finally {
    for (const id of rsvpResponseIds) await cleanupEntity(token, 'RsvpResponse', id);
    if (guestId) await cleanupEntity(token, 'Guest', guestId);
    if (weddingId) await cleanupEntity(token, 'WeddingDetails', weddingId);
  }

  // ── mergePlusOneEventResponses — defaults an unanswered inherited event to pending ──
  console.log('\n  mergePlusOneEventResponses — pure logic:\n');
  {
    const primaryEventResponses = [
      { event_id: 'ev-a', invited: true, status: 'yes' },
      { event_id: 'ev-b', invited: true, status: 'yes' },
      { event_id: 'ev-c', invited: false, status: 'pending' }, // not invited — must not appear for the plus-one either
    ];
    const plusOneRows = [
      { guest_id: 'g1', event_id: 'ev-a', status: 'no', is_plus_one: true, created_date: new Date().toISOString(), id: 'r1' },
      // ev-b: plus-one hasn't answered yet
      // a PRIMARY row for ev-b (is_plus_one unset) must be ignored, not leak into the plus-one's merge
      { guest_id: 'g1', event_id: 'ev-b', status: 'yes', created_date: new Date().toISOString(), id: 'r2' },
    ];
    const merged = mergePlusOneEventResponses(primaryEventResponses, plusOneRows);
    const evA = merged.find(r => r.event_id === 'ev-a');
    const evB = merged.find(r => r.event_id === 'ev-b');
    results.push(merged.length === 2
      ? pass('mergePlusOneEventResponses — only inherits invited:true events', `${merged.length} event(s)`)
      : fail('mergePlusOneEventResponses — only inherits invited:true events', 2, merged.length));
    results.push(evA?.status === 'no'
      ? pass('mergePlusOneEventResponses — plus-one\'s own answered event uses their own status', 'no')
      : fail('mergePlusOneEventResponses — plus-one\'s own answered event', 'no', evA?.status));
    results.push(evB?.status === 'pending'
      ? pass('mergePlusOneEventResponses — unanswered event defaults to pending, ignoring the primary\'s own row for it', 'pending')
      : fail('mergePlusOneEventResponses — unanswered event defaults to pending', 'pending', evB?.status));
  }

  // ── No-email fallback: current behaviour (primary answers for both) is untouched ──
  console.log('\n  Plus-one with no email — current (primary-answers-for-both) behaviour untouched:\n');
  let noEmailGuestId = null;
  try {
    const created = await api('POST', `/apps/${APP_ID}/entities/Guest`, {
      name: '__PERSISTENCE_TEST_PLUS_ONE_NO_EMAIL__',
      is_test: true,
      plus_one: true,
      plus_one_name: 'No Email Plus One',
      // no plus_one_email, no plus_one_rsvp_link_id
    }, token);
    noEmailGuestId = created.id;
    results.push(!created.plus_one_rsvp_link_id
      ? pass('Guest with no plus_one_email never gets a plus_one_rsvp_link_id stamped', 'absent')
      : fail('Guest with no plus_one_email never gets a plus_one_rsvp_link_id', 'absent', created.plus_one_rsvp_link_id));
  } catch (err) {
    console.log(`  ❌ FAIL  no-email fallback — error: ${err.message}`);
    results.push(false);
  } finally {
    if (noEmailGuestId) await cleanupEntity(token, 'Guest', noEmailGuestId);
  }

  return results;
}
