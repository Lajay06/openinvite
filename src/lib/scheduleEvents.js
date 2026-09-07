/**
 * src/lib/scheduleEvents.js — ONE SET OF EVENTS, FOR BOTH WAYS OF LOOKING AT IT.
 *
 * The Schedule page used to show four things and they did not agree about what
 * an event was. The run sheet listed Schedule records only; the calendar
 * aggregated five sources — the Schedule records, the wedding day itself, the
 * RSVP deadline, and three vendor dates (contract, booking, meeting) — plus
 * anything the couple typed into the calendar's own add-event form.
 *
 * So "the list shows every event the calendar shows" was not a property anyone
 * could have asserted: the two views were reading different things and the
 * counts differed by design. A list and a calendar that disagree are two
 * answers to one question, which is the state this page was asked to leave.
 *
 * THE UNION IS THE SHARED SOURCE, and that is a decision worth naming. The
 * other option was to narrow both views to Schedule records, which would have
 * been simpler and would have deleted information the couple can see today —
 * their wedding day, their RSVP deadline, and every vendor date — from the
 * only place that shows them. Nothing disappears; the list simply carries the
 * same events the calendar already carried.
 *
 * WHAT A NORMALIZED EVENT IS. Every source is flattened to the same shape, so
 * neither view has to know which source a row came from to render it:
 *
 *   { id, title, date, time, location, description, type }
 *
 * `location` is empty for the derived rows, because a vendor contract date and
 * an RSVP deadline do not happen anywhere. The list omits the line rather than
 * printing a blank label.
 */

/** Normalized events from every source the Schedule page reads. Pure. */
export function buildScheduleEvents({ scheduleItems = [], vendors = [], invitation = null, customEvents = [] } = {}) {
  const events = [];

  if (invitation?.wedding_date) {
    events.push({
      id: 'wedding-day',
      title: `Wedding day: ${invitation.couple_names || 'Your wedding'}`,
      date: invitation.wedding_date, time: '', location: '',
      description: 'Your special day!', type: 'wedding',
    });
    if (invitation.rsvp_deadline) {
      events.push({
        id: 'rsvp-deadline', title: 'RSVP deadline',
        date: invitation.rsvp_deadline, time: '', location: '',
        description: 'Last day for guest RSVPs', type: 'wedding',
      });
    }
  }

  for (const item of scheduleItems) {
    // A row with no date is still the couple's event. event_date is required
    // by the entity AND by the form, so this should not happen — but "should
    // not happen" is how rows go missing, and the old run sheet listed every
    // Schedule record whether or not it had a date. It is carried through with
    // an empty date; the list gives it a "No date yet" group at the end and
    // the calendar, which has nowhere to draw it, does not.
    events.push({
      id: `schedule-${item.id}`,
      title: item.event_name,
      date: item.event_date || '',
      time: item.start_time || '',
      endTime: item.end_time || '',
      location: item.location || '',
      description: item.description || '',
      category: item.category || '',
      responsible: item.responsible_person || '',
      type: 'schedule',
      sourceId: item.id,
    });
  }

  for (const vendor of vendors) {
    if (vendor.contract_date) {
      events.push({
        id: `vendor-${vendor.id}`, title: `${vendor.name} contract`,
        date: vendor.contract_date, time: '', location: '',
        description: `${vendor.category} vendor contract signed`, type: 'vendor',
      });
    }
    // booking_date/meeting_date were Photographer-only fields before the PR3b
    // consolidation — now on Vendor, so this picks them up for any category
    // that sets them, not just photography/videography.
    if (vendor.booking_date) {
      events.push({
        id: `vendor-booking-${vendor.id}`, title: `${vendor.name} booking`,
        date: vendor.booking_date, time: vendor.start_time || '', location: '',
        description: `${vendor.category} session`, type: 'photography',
      });
    }
    if (vendor.meeting_date) {
      events.push({
        id: `vendor-meeting-${vendor.id}`, title: `Meeting: ${vendor.name}`,
        date: vendor.meeting_date.split('T')[0],
        time: vendor.meeting_date.split('T')[1]?.substring(0, 5) || '',
        location: '',
        description: 'Consultation meeting', type: 'photography',
      });
    }
  }

  return [...events, ...customEvents];
}

/**
 * The same events, grouped into days in date order, each day's events in time
 * order. An event with no time sorts before the timed ones — a deadline that
 * has no hour belongs at the top of its day, not at midnight in the middle of
 * a run of morning events.
 */
export function groupEventsByDay(events = []) {
  const byDate = new Map();
  const undated = [];
  for (const e of events) {
    if (!e) continue;
    if (!e.date) { undated.push(e); continue; }
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }
  const days = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, items]) => ({
      date,
      events: items.slice().sort((a, b) => {
        if (!a.time && b.time) return -1;
        if (a.time && !b.time) return 1;
        return String(a.time).localeCompare(String(b.time));
      }),
    }));
  // Last, and only when there is one — an empty "No date yet" heading over
  // nothing is noise on every well-formed wedding.
  if (undated.length) days.push({ date: null, events: undated });
  return days;
}
