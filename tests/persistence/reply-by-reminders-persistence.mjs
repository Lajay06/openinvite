/**
 * The three reminder keys survive a real round trip — LIVE CREDENTIAL, NEVER IN CI.
 *
 * Item 1 of goals/2026-10-11-reply-by-reminders.md, and the owner's own
 * condition on it: "add a persistence test that round-trips all three through
 * the real entity on the smoke account's wedding before item 1 merges."
 *
 * ── WHY IT HAS TO BE LIVE, AND WHY THE ARGUMENT IS NOT ENOUGH ──────────────
 *
 * reply-by-reminder-switch.mjs proves the DECISIONS: the dates, the
 * eligibility, the four lines, the object the switch writes. It cannot prove
 * the one thing this platform has got wrong before, which is that a field
 * actually persists.
 *
 * WeddingDetails.rsvpContent is declared as a bare `{"type": "object"}`, and
 * the reasoning that therefore anything inside it is kept is an ARGUMENT. Base44
 * silently drops what a custom entity does not declare, with a 200 and no
 * error (BASE44_PLATFORM_NOTES, confirmed empirically 2026-07), so a write that
 * was dropped looks exactly like a write that worked. remindersSent is the one
 * to worry about: an ARRAY OF OBJECTS inside an undeclared object is the
 * deepest thing this goal asks the platform to keep, and nothing in the mirror
 * says it will.
 *
 * ── READ, VERIFY, WRITE, RE-READ ───────────────────────────────────────────
 *
 * The same order guidance-persistence.mjs uses, for the same reason:
 *   READ    the sentinel back and confirm it is the sentinel
 *   VERIFY  it carries none of the three keys yet, so a pass cannot be a
 *           stale value from an earlier run
 *   WRITE   all three, including a two-entry remindersSent
 *   RE-READ on a fresh GET, never the PUT's response body, which can echo
 *           what was sent whether or not it landed
 *
 * ── SMOKE ACCOUNT ONLY, AND CLEANED UP ─────────────────────────────────────
 *
 * It creates its own sentinel record, refuses to write to anything that is not
 * the sentinel, and deletes it in a `finally`, so a failure anywhere still
 * leaves no fake wedding behind. It never touches a real couple's row, and it
 * never reads one.
 */

import { APP_ID, SENTINEL, api, login, pass, fail, cleanupWeddingDetails } from './_shared.mjs';

/** Exactly what item 1 writes, with the deepest shape the goal needs kept. */
const PAYLOAD = {
  rsvpDeadline: '2026-06-01',
  remindersOn: true,
  reminderTimezone: 'Australia/Sydney',
  remindersSent: [
    { send: 1, at: '2026-05-22T23:00:00.000Z', date: '2026-05-22', count: 14 },
    { send: 2, at: '2026-05-30T23:00:00.000Z', date: '2026-05-30', count: 3 },
  ],
};

export async function runReplyByRemindersPersistence() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const token = await login();
  let recordId = null;
  try {
    const created = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: SENTINEL,
      couple2Name: 'DO_NOT_USE',
      slug: `__reminders__${Date.now()}`,
      is_test: true,
    }, token);
    recordId = created?.id || null;
    ok('a sentinel wedding was created to write to', !!recordId, recordId || 'no id');
    if (!recordId) return results;

    // READ and VERIFY. Writing to anything that is not the sentinel is the one
    // thing this file must never do.
    const before = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token);
    ok('  and it is the sentinel, not a real wedding',
       before?.couple1Name === SENTINEL, String(before?.couple1Name));
    if (before?.couple1Name !== SENTINEL) return results;
    ok('  carrying none of the three keys yet, so a pass cannot be stale',
       !before?.rsvpContent?.remindersOn && !before?.rsvpContent?.reminderTimezone
         && !before?.rsvpContent?.remindersSent,
       JSON.stringify(before?.rsvpContent || {}));

    // WRITE.
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { rsvpContent: PAYLOAD }, token);

    // RE-READ on a separate request.
    const after = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token);
    const got = after?.rsvpContent || {};

    ok('remindersOn round-trips', got.remindersOn === true, JSON.stringify(got.remindersOn));
    ok('reminderTimezone round-trips as the exact string',
       got.reminderTimezone === 'Australia/Sydney', String(got.reminderTimezone));
    ok('the reply-by date beside them is untouched',
       got.rsvpDeadline === '2026-06-01', String(got.rsvpDeadline));

    // THE DEEP ONE. An array of objects inside an undeclared object.
    ok('remindersSent round-trips as an array',
       Array.isArray(got.remindersSent) && got.remindersSent.length === 2,
       `${Array.isArray(got.remindersSent) ? got.remindersSent.length : typeof got.remindersSent}`);
    const first = (got.remindersSent || [])[0] || {};
    ok('  with every field of an entry kept, not just the shape',
       first.send === 1 && first.date === '2026-05-22' && first.count === 14
         && first.at === '2026-05-22T23:00:00.000Z',
       JSON.stringify(first));
    ok('  and the second entry too, so it is not a one-element coincidence',
       ((got.remindersSent || [])[1] || {}).send === 2
         && ((got.remindersSent || [])[1] || {}).count === 3,
       JSON.stringify((got.remindersSent || [])[1] || {}));

    // AND THE SWITCH GOING OFF MUST NOT LOSE THE HISTORY, which is the one
    // state transition item 2's cron depends on being durable.
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { rsvpContent: { ...PAYLOAD, remindersOn: false } }, token);
    const offRead = (await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token))?.rsvpContent || {};
    ok('switching off persists as off',
       offRead.remindersOn === false, JSON.stringify(offRead.remindersOn));
    ok('  and the sent history survives it',
       Array.isArray(offRead.remindersSent) && offRead.remindersSent.length === 2,
       `${(offRead.remindersSent || []).length} entr(ies)`);
  } finally {
    if (recordId) await cleanupWeddingDetails(token, recordId);
  }

  return results;
}
