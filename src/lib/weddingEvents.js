/**
 * src/lib/weddingEvents.js
 *
 * Shared "list of invitable wedding events" builder for per-event RSVP
 * (SMART_RSVP_MODEL.md). Ceremony and reception are always-present fixed
 * categories in this app (EventDetails.jsx treats them as base structure,
 * not optional custom events), so they get fixed, stable event_ids —
 * there's only ever one of each per wedding, so a constant string is a safe
 * key with no reorder risk. Custom pre/post-wedding events use their own
 * stable event_id (added in the earlier stable-event-id PR) — never array
 * index, since the chronological sort can reorder that array.
 */

export const MAIN_CEREMONY_EVENT_ID = 'main-ceremony';
export const RECEPTION_EVENT_ID = 'reception';

function safeDateMs(d) {
  if (!d) return Infinity;
  const t = Date.parse(d + 'T00:00:00');
  return isNaN(t) ? Infinity : t;
}

function cmpTime(ta, tb) {
  if (!ta && !tb) return 0;
  if (!ta) return 1;
  if (!tb) return -1;
  return ta.localeCompare(tb);
}

/**
 * @param {object} weddingDetails
 * @returns {Array<{event_id: string, name: string, date: string|null, startTime: string, isMain: boolean, dressCode: string}>}
 *   Chronologically sorted (main events by start time, custom events by date then start time —
 *   same ordering EventDetails.jsx uses).
 */
export function getWeddingEvents(weddingDetails) {
  const mc = weddingDetails?.mainCeremony || {};
  const rc = weddingDetails?.reception || {};
  const pre = weddingDetails?.preWeddingEvents || [];
  const post = weddingDetails?.postWeddingEvents || [];

  const main = [
    { event_id: MAIN_CEREMONY_EVENT_ID, name: 'Ceremony', date: null, startTime: mc.startTime || '', isMain: true, dressCode: mc.dressCode || '' },
    { event_id: RECEPTION_EVENT_ID, name: 'Reception', date: null, startTime: rc.startTime || '', isMain: true, dressCode: rc.dressCode || '' },
  ].sort((a, b) => cmpTime(a.startTime, b.startTime));

  const custom = [...pre, ...post]
    .filter(e => e.event_id || e.id) // must have a stable id to be individually invitable
    .map(e => ({
      event_id: e.event_id || e.id,
      name: e.name || 'Event',
      date: e.date || null,
      startTime: e.startTime || e.time || '',
      isMain: false,
      dressCode: e.dressCode || '',
    }))
    .sort((a, b) => {
      const da = safeDateMs(a.date), db = safeDateMs(b.date);
      if (da !== db) return da - db;
      return cmpTime(a.startTime, b.startTime);
    });

  return [...main, ...custom];
}

/**
 * Default event_responses for a brand-new guest: invited to main events
 * (ceremony + reception) only, pending. Custom events are opt-in.
 */
export function defaultEventResponses(events) {
  return events.filter(e => e.isMain).map(e => ({
    event_id: e.event_id,
    invited: true,
    status: 'pending',
    meal_choice: null,
    plus_ones: 0,
    plus_one_names: [],
    responded_at: null,
  }));
}

/**
 * Resolves one event's response for a guest, synthesizing a sane default if
 * the guest has no event_responses at all yet (pre-existing guests from
 * before this feature) or no entry for this specific event. Guests with a
 * totally empty event_responses array are treated as invited to main events
 * — never shown a blank "not invited to anything" form.
 */
export function getGuestEventResponse(guest, event) {
  const responses = guest?.event_responses || [];
  const existing = responses.find(r => r.event_id === event.event_id);
  if (existing) return existing;

  const hasAnyResponses = responses.length > 0;
  return {
    event_id: event.event_id,
    invited: hasAnyResponses ? false : event.isMain,
    status: 'pending',
    meal_choice: null,
    plus_ones: 0,
    plus_one_names: [],
    responded_at: null,
  };
}

/**
 * Toggles a guest's invited flag for one event, returning the full
 * event_responses array to persist (creating the entry if it didn't exist).
 * Caller is responsible for persisting the result — this is pure.
 */
export function toggleEventInvite(guest, event, invited) {
  const responses = guest?.event_responses || [];
  const idx = responses.findIndex(r => r.event_id === event.event_id);
  if (idx === -1) {
    return [...responses, {
      event_id: event.event_id,
      invited,
      status: 'pending',
      meal_choice: null,
      plus_ones: 0,
      plus_one_names: [],
      responded_at: null,
    }];
  }
  return responses.map((r, i) => i === idx ? { ...r, invited } : r);
}
