/**
 * guidanceState survives a real round trip — LIVE CREDENTIAL, NEVER IN CI.
 *
 * ── WHY THIS ONE HAS TO BE LIVE ────────────────────────────────────────────
 *
 * guidance-remembered.mjs proves the DECISIONS: given a state, has the tour
 * been seen, what is the next state. It cannot prove the one thing that has
 * gone wrong before on this platform — that the field actually persists.
 *
 * Base44 silently drops any field a custom entity does not declare, with a 200
 * and no error (BASE44_PLATFORM_NOTES, confirmed empirically 2026-07). A write
 * of `guidanceState` against a schema that does not declare it looks exactly
 * like a write that worked. The only way to know is to write it and read it
 * back on a SEPARATE request, which is what this does.
 *
 * ── READ, VERIFY, WRITE, RE-READ ───────────────────────────────────────────
 *
 * The goal's wording. In order:
 *   READ    the sentinel back and confirm it is the sentinel
 *   VERIFY  it carries no guidanceState yet, so a pass cannot be a stale value
 *   WRITE   a known state
 *   RE-READ on a fresh GET — never the PUT's response body, which can echo
 *           what was sent whether or not it landed
 *
 * ── SMOKE ACCOUNT ONLY, AND RESTORED AFTER ─────────────────────────────────
 *
 * It creates its own sentinel record, refuses to write to anything that is not
 * the sentinel, and deletes it in a `finally` — so a failure anywhere still
 * cleans up rather than leaving a fake wedding in the data.
 *
 * Registered in LIVE_CREDENTIAL_GUARDS: GitHub Actions holds no production
 * credential, and a CI run writing to the live database would collide with
 * whatever a local run is doing.
 */
import { APP_ID, SENTINEL, api, pass, fail, cleanupWeddingDetails } from './_shared.mjs';
import { readGuidanceState, hasSeenTour, isDismissed } from '../../src/lib/guidanceState.js';

const SEEN_AT = '2026-09-26T10:00:00.000Z';
const DISMISSED = ['/Guests', '/Schedule'];

export async function runGuidancePersistence(token) {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  guidanceState — read, verify, write, re-read (live):\n');

  let recordId = null;
  try {
    const created = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`,
      { couple1Name: SENTINEL, couple2Name: 'DO_NOT_USE', slug: `__guidance__${Date.now()}`, is_test: true },
      token);
    recordId = created.id;
    if (!recordId) throw new Error('no id returned from create');

    // READ + VERIFY — it is the sentinel, and it carries nothing yet.
    const before = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token);
    if (before.couple1Name !== SENTINEL) {
      throw new Error(`SAFETY ABORT — ${recordId} is not the sentinel. Refusing to write.`);
    }
    check('a fresh record carries no guidanceState',
      before.guidanceState === undefined || before.guidanceState === null,
      JSON.stringify(before.guidanceState));
    check('  so it reads as "not yet", not as seen',
      !hasSeenTour(readGuidanceState(before)), 'tourSeenAt null');

    // WRITE
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { guidanceState: { tourSeenAt: SEEN_AT, dismissed: DISMISSED } }, token);

    // RE-READ — a separate request, never the PUT's echo.
    const after = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token);
    check('guidanceState survived the round trip — the field is really declared',
      !!after.guidanceState && typeof after.guidanceState === 'object',
      JSON.stringify(after.guidanceState));
    const state = readGuidanceState(after);
    check('  tourSeenAt came back byte-exact', state.tourSeenAt === SEEN_AT, state.tourSeenAt);
    check('  dismissed came back in order',
      JSON.stringify(state.dismissed) === JSON.stringify(DISMISSED), JSON.stringify(state.dismissed));
    check('  and the couple now reads as having seen it', hasSeenTour(state), 'true');
    check('  with both pages dismissed',
      isDismissed(state, '/Guests') && isDismissed(state, '/Schedule'), 'both');

    // APPEND — the shape a second dismissal writes, which must not replace.
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { guidanceState: { tourSeenAt: SEEN_AT, dismissed: [...DISMISSED, '/Budget'] } }, token);
    const third = readGuidanceState(
      await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token));
    check('appending a third page keeps the first two',
      JSON.stringify(third.dismissed) === JSON.stringify([...DISMISSED, '/Budget']),
      JSON.stringify(third.dismissed));
    check('  and does not disturb the tour timestamp', third.tourSeenAt === SEEN_AT, third.tourSeenAt);

    // NULL — the never-shown state has to be writable, which is why live
    // declares tourSeenAt as ["string","null"] rather than "string".
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { guidanceState: { tourSeenAt: null, dismissed: [] } }, token);
    const reset = readGuidanceState(
      await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token));
    check('tourSeenAt can be written back to null — the nullable type is real',
      reset.tourSeenAt === null, JSON.stringify(reset.tourSeenAt));
    check('  and an empty dismissed list round-trips',
      Array.isArray(reset.dismissed) && reset.dismissed.length === 0, JSON.stringify(reset.dismissed));
  } catch (err) {
    check('the live round trip completed', false, err.message);
  } finally {
    await cleanupWeddingDetails(token, recordId);
  }

  return results;
}
