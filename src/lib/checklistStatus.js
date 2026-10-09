/**
 * src/lib/checklistStatus.js
 *
 * WHICH CHECKLIST ITEMS ARE DONE, DECIDED FROM RECORDS.
 *
 * ── WHY THIS IS A LIB AND NOT A FUNCTION ON THE PAGE ──────────────────────
 *
 * It lived in src/pages/Checklist.jsx, which is auth-gated and is a .jsx file,
 * so nothing could exercise it: a guard cannot import JSX under plain Node,
 * and the page cannot be reached without a session. Extracted for the same
 * reason todoSort.js and guestRsvpTally.js were, and the extraction is what
 * makes the fix below provable rather than merely plausible.
 *
 * ── THE BUG IT WAS EXTRACTED TO FIX ───────────────────────────────────────
 *
 * "Wedding date set" was `!!localStorage.getItem('oi_wedding_date')`. The
 * date lives on WeddingDetails.weddingDate and that key is a cache, so a
 * couple whose date was saved saw the item as NOT DONE on any browser that
 * had not happened to write it: a new device, a private window, cleared site
 * data, or a session that never passed through the screen that sets it. The
 * dashboard header reads the record, so the checklist reads the same record.
 *
 * Found by lane B's fixture audit, 2026-10-09.
 *
 * ── WHAT IS STILL WRONG HERE, STATED RATHER THAN QUIETLY FIXED ────────────
 *
 * `wedding_city` has exactly the same bug one line below, reading
 * `oi_wedding_city`. It is left alone because the owner's instruction named
 * the date, and because the right record field is not obvious: WeddingDetails
 * has no top-level city, only a nested `location` on an event. Fixing it is a
 * decision about which field means "the wedding's location", not a typo.
 * The localStorage read is made SAFE rather than correct, so this module
 * imports under Node without throwing.
 */

/**
 * localStorage is absent under Node and can throw in a private window or with
 * site data blocked, so every read goes through here and a failure reads as
 * "not set" rather than taking the whole checklist down.
 */
function cached(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * @param {object} args
 * @param {object|null} args.wedding   the WeddingDetails record, or null
 * @param {Array} args.guests
 * @param {Array} args.budgets
 * @param {Array} args.vendors
 * @param {Array} args.schedules
 * @param {Array} args.notes
 * @returns {Record<string, boolean>} keyed by checklist item key
 */
export function evaluateStatus({ wedding, guests = [], budgets = [], vendors = [], schedules = [], notes = [] }) {
  return {
    wedding_date:         !!wedding?.weddingDate,
    guests_started:       guests.length > 0,
    budget_setup:         budgets.length > 0,
    venue_sourced:        vendors.some(v => v.category === 'venue'),
    photographer_sourced: vendors.some(v => v.category === 'photography'),
    caterer_sourced:      vendors.some(v => v.category === 'catering'),
    rsvps_tracked:        guests.some(g => g.rsvp_status && g.rsvp_status !== 'pending'),
    schedule_created:     schedules.length > 0,
    music_sourced:        vendors.some(v => v.category === 'music'),
    florist_sourced:      vendors.some(v => v.category === 'flowers'),
    notes_added:          notes.length > 0,
    videographer_sourced: vendors.some(v => v.category === 'videography'),
    transport_arranged:   vendors.some(v => v.category === 'transportation'),
    beauty_sourced:       vendors.some(v => v.category === 'beauty'),
    wedding_city:         !!cached('oi_wedding_city'),
  };
}
