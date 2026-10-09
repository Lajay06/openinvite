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
 * ── AND "WEDDING LOCATION SET", THE SAME BUG ONE LINE BELOW ───────────────
 *
 * It read `oi_wedding_city`, another cache, and fails the same way. The owner
 * ruled on 2026-10-09 which record answers it: the main ceremony's venue, and
 * the reception's if the ceremony has none. Either one with a value means the
 * couple has set their location.
 *
 * VENUE NAME OR ADDRESS, not the name alone. A couple who typed only the full
 * address has set their location as surely as one who typed a venue name, and
 * telling them otherwise would be the very bug being fixed here. Both fields
 * exist on both objects (base44/entities/WeddingDetails.jsonc), and
 * InteractiveMap.jsx already reads them as a pair.
 *
 * NO localStorage IS READ ANY MORE, by either item.
 */

/** Whether an event object carries somewhere a guest could be sent. */
const hasPlace = (ev) => !!(ev?.venueName || ev?.address);

/**
 * Where the wedding is, as the checklist asks the question: the ceremony's
 * venue, or the reception's when the ceremony has none. Owner ruling
 * 2026-10-09. Returns a boolean rather than a place, because the only caller
 * asks "has this been set".
 */
export function hasWeddingLocation(wedding) {
  return hasPlace(wedding?.mainCeremony) || hasPlace(wedding?.reception);
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
    wedding_city:         hasWeddingLocation(wedding),
  };
}
