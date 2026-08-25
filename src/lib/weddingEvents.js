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
 * getWeddingEvents() intentionally strips venue/date for main events (they
 * aren't stored on the event itself — ceremony/reception venue lives on
 * wedding.mainCeremony/wedding.reception, and both share wedding.weddingDate
 * since neither has its own date field). Custom events DO carry their own
 * date/venueName directly. This looks those back up from the wedding record
 * for callers (e.g. invitation emails) that need venue + date per event.
 *
 * F-F: also returns address and mapsUrl. The RSVP event card showed name and
 * time only — a guest deciding whether they can make the ceremony needs to
 * know WHERE it is. Additive: existing callers destructure { venue, date }.
 */
export function getEventVenueAndDate(weddingDetails, event) {
  if (event.event_id === MAIN_CEREMONY_EVENT_ID) {
    return {
      venue: weddingDetails?.mainCeremony?.venueName || '',
      address: weddingDetails?.mainCeremony?.address || '',
      mapsUrl: weddingDetails?.mainCeremony?.mapsUrl || '',
      date: weddingDetails?.weddingDate || null,
    };
  }
  if (event.event_id === RECEPTION_EVENT_ID) {
    return {
      venue: weddingDetails?.reception?.venueName || '',
      address: weddingDetails?.reception?.address || '',
      mapsUrl: weddingDetails?.reception?.mapsUrl || '',
      date: weddingDetails?.weddingDate || null,
    };
  }
  const custom = [...(weddingDetails?.preWeddingEvents || []), ...(weddingDetails?.postWeddingEvents || [])]
    .find(e => (e.event_id || e.id) === event.event_id);
  return {
    venue: custom?.venueName || custom?.venue || '',
    address: custom?.address || '',
    mapsUrl: custom?.mapsUrl || '',
    date: custom?.date || null,
  };
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

/**
 * Picks one representative meal choice out of a guest's per-event
 * event_responses[] — for the flat, event-agnostic surfaces (CSV export,
 * seating chart / place card exports, Ava's context) that show one guest
 * per row and have no per-event breakdown, unlike GuestList.jsx's own
 * PRECEDENCE, in order:
 *   1. the reception response's meal_choice
 *   2. any invited event's response with a meal_choice
 *   3. `flatFallback` — Guest.meal_choice / Guest.plus_one_meal_choice, the
 *      value the COUPLE typed in the guest editor
 *   4. null
 *
 * The flat column ranks LAST on purpose: the person eating the meal outranks
 * the person recording it. This is deliberately the `derived ?? flat` shape
 * used for dietary_restrictions (api/my-guests-rsvp.js:163) and NOT the
 * `eventRows ? derived : flat` shape used for rsvp_status (:160). A guest can
 * respond without picking a meal, and the rows-presence rule would blank the
 * couple's entry the moment that happened; value-fallback keeps it until an
 * actual meal answer replaces it. Meal and dietary — the two caterer-facing
 * fields — now have identical semantics.
 *
 * NOTE the flat column is NOT dead any more. It was, for the whole period when
 * nothing wrote it; the guest editor writes it now. Read it through this
 * function and never directly, so the ordering above is applied every time.
 *
 * per-event detail row which already reads event_responses[].meal_choice
 * directly, one row per event. Prefers the reception's answer (the event
 * these surfaces are conventionally about); falls back to the first
 * invited event with a non-null meal_choice for guests without a
 * reception entry (e.g. all-custom-events weddings).
 *
 * @param {Array} eventResponses  guest.event_responses (or the plus-one
 *   equivalent) — may be undefined for a guest who hasn't RSVP'd yet
 * @returns {string|null}
 */
export function effectiveMealChoice(eventResponses, flatFallback = null) {
  const responses = eventResponses || [];
  const reception = responses.find(r => r.event_id === RECEPTION_EVENT_ID && r.meal_choice);
  if (reception) return reception.meal_choice;
  const anyAnswered = responses.find(r => r.invited && r.meal_choice);
  if (anyAnswered) return anyAnswered.meal_choice;
  return flatFallback || null;
}

/**
 * Default meal choices for a wedding that hasn't defined its own menu (Pro,
 * or an Ultra wedding that hasn't visited Food & beverage → Menu yet — see
 * FoodBeveragePage.jsx's "Guest meal options" section, Menu Phase 1). id
 * matches Guest.meal_choice's original hardcoded enum values, so
 * pre-Phase-1 RsvpResponse rows still resolve to a real label via
 * mealOptionLabel() below, not a raw id. kids_meal was previously missing
 * from RSVPPage.jsx's own copy of this list (5 of the enum's 6 values).
 */
export const DEFAULT_MEAL_OPTIONS = [
  { id: 'chicken', label: 'Chicken' },
  { id: 'beef', label: 'Beef' },
  { id: 'fish', label: 'Fish' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'kids_meal', label: 'Kids meal' },
];

/**
 * Resolves a stored meal_choice (an id into either the wedding's own
 * mealOptions or DEFAULT_MEAL_OPTIONS) back to a human-readable label for
 * display — GuestList, CSV export, Ava's context. Falls back to the raw
 * stored value itself (never blank) if it doesn't match any known option —
 * e.g. a menu option the couple has since edited or removed, or an older
 * RsvpResponse row written before this wedding ever had mealOptions set.
 *
 * @param {string|null} mealChoiceId
 * @param {Array} [mealOptions]  the wedding's own WeddingDetails.mealOptions
 * @returns {string|null}
 */
export function mealOptionLabel(mealChoiceId, mealOptions) {
  if (!mealChoiceId) return null;
  const options = (mealOptions && mealOptions.length) ? mealOptions : DEFAULT_MEAL_OPTIONS;
  const match = options.find(o => o.id === mealChoiceId);
  return match ? match.label : mealChoiceId;
}
