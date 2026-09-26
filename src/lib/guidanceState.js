/**
 * src/lib/guidanceState.js — what the guidance system remembers, as pure functions.
 *
 * ── THE SHAPE, AS LIVE DECLARES IT ─────────────────────────────────────────
 *
 *   WeddingDetails.guidanceState = {
 *     tourSeenAt: string | null,   // ISO timestamp, or null for never shown
 *     dismissed:  string[]         // page paths whose panel is closed for good
 *   }
 *
 * Declared in Base44 on 2026-09-25. `tourSeenAt` is a timestamp rather than a
 * boolean so "has it been shown" and "when" are one field instead of two that
 * can disagree.
 *
 * ── WHY THIS FILE IS PURE ──────────────────────────────────────────────────
 *
 * The thing that has to be right here is the DECISION — has this couple seen
 * the tour, is this page's panel dismissed, what does the next state look like
 * — and every one of those is a function of a plain object. Put in the hook it
 * would only be reachable through a signed-in browser; here a test asserts it
 * against real record shapes, including the ones a live record actually arrives
 * in: absent, null, half-written by an older client.
 *
 * ── ABSENT IS NOT THE SAME AS EMPTY, AND BOTH MEAN "NOT YET" ───────────────
 *
 * A record written before this field existed has no `guidanceState` at all. One
 * written by a client that only ever dismissed a panel has `dismissed` and no
 * `tourSeenAt`. Neither is corrupt and neither should throw; both mean the tour
 * has not been seen. Every reader below treats a missing field as "not yet"
 * rather than trusting the shape.
 */

/** The empty state, for a record that has never carried one. */
export const EMPTY_GUIDANCE_STATE = { tourSeenAt: null, dismissed: [] };

/**
 * Read a record's guidance state into the full shape, whatever it arrives as.
 *
 * NEVER THROWS. This is read on every dashboard page load; a malformed value
 * from an older client must degrade to "not yet", not take the page down.
 */
export function readGuidanceState(record) {
  const raw = record && typeof record === 'object' ? record.guidanceState : null;
  if (!raw || typeof raw !== 'object') return { ...EMPTY_GUIDANCE_STATE };
  const seen = typeof raw.tourSeenAt === 'string' && raw.tourSeenAt ? raw.tourSeenAt : null;
  const dismissed = Array.isArray(raw.dismissed)
    ? raw.dismissed.filter((p) => typeof p === 'string' && p)
    : [];
  return { tourSeenAt: seen, dismissed };
}

/** Has this couple seen the tour? A timestamp means yes, whatever its value. */
export function hasSeenTour(state) {
  return !!readGuidanceState({ guidanceState: state }).tourSeenAt;
}

/** Is this page's panel closed for good? */
export function isDismissed(state, path) {
  if (!path) return false;
  return readGuidanceState({ guidanceState: state }).dismissed.includes(path);
}

/**
 * The state after the tour has been completed or skipped.
 *
 * IDEMPOTENT, AND THE FIRST TIME WINS. The goal says the timestamp is written
 * "the first time the tour completes or is skipped" — so a second call is a
 * no-op rather than moving the date. That matters for the guarantee this whole
 * field exists for: a couple who has seen it must never see it again, and an
 * overwrite on every visit would be indistinguishable from never writing at all
 * if the write later failed.
 *
 * @returns {object|null} the next state, or null when nothing needs writing
 */
export function tourSeen(state, now = new Date()) {
  const current = readGuidanceState({ guidanceState: state });
  if (current.tourSeenAt) return null;
  return { ...current, tourSeenAt: now.toISOString() };
}

/**
 * The state after a page's panel is dismissed.
 *
 * Appends, never replaces, and never duplicates — the array is a set in a
 * field that has no set type.
 *
 * @returns {object|null} the next state, or null when nothing needs writing
 */
export function panelDismissed(state, path) {
  if (!path) return null;
  const current = readGuidanceState({ guidanceState: state });
  if (current.dismissed.includes(path)) return null;
  return { ...current, dismissed: [...current.dismissed, path] };
}
