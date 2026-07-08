/**
 * tests/persistence/guest.mjs
 *
 * Guest-entity field persistence, independent of any WeddingDetails record:
 * RSVP extras (song request, note, poll votes) and invite-tracking
 * timestamps. Each block creates and cleans up its own sentinel Guest.
 */

import { APP_ID, api, pass, fail } from './_shared.mjs';

export async function runGuest(token) {
  const results = [];

  // ── Guest RSVP fields — previously silently dropped, now registered ─────────
  console.log('\n  Guest RSVP field persistence tests (song_request, rsvp_note, poll_votes):\n');
  let guestSentinelId = null;
  try {
    const gCreated = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_GUEST__', rsvp_link_id: 'test-sentinel-rsvp', is_test: true }, token);
    guestSentinelId = gCreated.id;
    if (!guestSentinelId) throw new Error('No id on created Guest');

    const guestPayload = {
      name: '__PERSISTENCE_TEST_GUEST__',
      song_request: 'September - Earth Wind & Fire',
      rsvp_note:    'So excited to celebrate with you both!',
      poll_votes:   { 'poll-test-1': 'opt-b', 'poll-test-2': 'opt-a' },
    };
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${guestSentinelId}`, guestPayload, token);
    const gBack = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestSentinelId}`, undefined, token);

    results.push(gBack.song_request === guestPayload.song_request
      ? pass('Guest.song_request', `"${gBack.song_request}"`)
      : fail('Guest.song_request', guestPayload.song_request, gBack.song_request));

    results.push(gBack.rsvp_note === guestPayload.rsvp_note
      ? pass('Guest.rsvp_note', `"${gBack.rsvp_note}"`)
      : fail('Guest.rsvp_note', guestPayload.rsvp_note, gBack.rsvp_note));

    const pvOk = gBack.poll_votes?.['poll-test-1'] === 'opt-b'
              && gBack.poll_votes?.['poll-test-2'] === 'opt-a';
    results.push(pvOk
      ? pass('Guest.poll_votes', JSON.stringify(gBack.poll_votes))
      : fail('Guest.poll_votes', guestPayload.poll_votes, gBack.poll_votes));
  } catch (err) {
    console.log(`  ❌ FAIL  Guest RSVP fields — error: ${err.message}`);
    results.push(false); results.push(false); results.push(false);
  } finally {
    if (guestSentinelId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${guestSentinelId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── Guest invite-tracking fields — previously silently dropped, now registered ──
  console.log('\n  Guest invite-tracking field persistence tests (invite_sent_at, invite_channel, reminder_sent_at):\n');
  let guestInviteId = null;
  try {
    const gi = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_INVITE__', is_test: true }, token);
    guestInviteId = gi.id;
    if (!guestInviteId) throw new Error('No id on created Guest');

    const sentAt = new Date().toISOString();

    // Write invite fields exactly as SendInvitesModal does
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${guestInviteId}`,
      { name: '__PERSISTENCE_TEST_INVITE__', invite_sent_at: sentAt, invite_channel: 'email' }, token);
    // Reminder written in a separate PUT (mirrors the real reminder code path)
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${guestInviteId}`,
      { name: '__PERSISTENCE_TEST_INVITE__', reminder_sent_at: sentAt }, token);

    const giBack = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestInviteId}`, undefined, token);

    results.push(giBack.invite_sent_at === sentAt
      ? pass('Guest.invite_sent_at', `"${giBack.invite_sent_at}"`)
      : fail('Guest.invite_sent_at', sentAt, giBack.invite_sent_at));

    results.push(giBack.invite_channel === 'email'
      ? pass('Guest.invite_channel', `"${giBack.invite_channel}"`)
      : fail('Guest.invite_channel', 'email', giBack.invite_channel));

    results.push(giBack.reminder_sent_at === sentAt
      ? pass('Guest.reminder_sent_at', `"${giBack.reminder_sent_at}"`)
      : fail('Guest.reminder_sent_at', sentAt, giBack.reminder_sent_at));
  } catch (err) {
    console.log(`  ❌ FAIL  Guest invite-tracking fields — error: ${err.message}`);
    results.push(false); results.push(false); results.push(false);
  } finally {
    if (guestInviteId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${guestInviteId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  return results;
}
